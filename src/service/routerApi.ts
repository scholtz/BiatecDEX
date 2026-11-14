import axios from 'axios'
import type { ISwapQuote, SwapQuoteMode } from '@/interface/ISwapQuote'
import { getAuthToken } from './authService'
import { useAppStore } from '@/stores/app'
import { biatecLegsToSwapQuote, type LegAmounts } from '@/scripts/swap/swapQuote'
import { withTimeout } from '@/scripts/common/withTimeout'

// ---------------------------------------------------------------------------
// Biatec Router REST client (`/api/v1/router`), ported from the `web/` app of
// scholtz/BiatecRouter (the `biatec-router` npm package is not used: it pulls in
// dotenv/form-data and types amounts as number). Amounts are bigint on our side and
// decimal strings on the wire. Every call carries an ARC-14 header with the realm
// `BiatecScan#ARC14`, which `getAuthToken()` already produces for the active network.
// ---------------------------------------------------------------------------

const viteEnv = (import.meta as { env?: Record<string, string | undefined> })?.env

const ROUTER_API_BY_NETWORK: Record<string, string | undefined> = {
  'mainnet-v1.0': viteEnv?.VITE_BIATEC_ROUTER_MAINNET || 'https://router.api.biatec.io',
  'testnet-v1.0': viteEnv?.VITE_BIATEC_ROUTER_TESTNET || 'https://testnet.router.api.biatec.io'
}

export const getBiatecRouterBaseUrl = (env: string): string | undefined =>
  ROUTER_API_BY_NETWORK[env]

/** Networks without a Biatec Router (Voi, Aramid, localnet) keep trading through Folks only. */
export const isBiatecRouterConfigured = (env: string): boolean => !!getBiatecRouterBaseUrl(env)

export const ROUTER_QUOTE_TIMEOUT_MS = 5_000
export const ROUTER_ROUTE_TXS_TIMEOUT_MS = 15_000
/** getAuthToken() needs an algod round trip; bound it so the router timeouts bound the call. */
export const ROUTER_AUTH_TIMEOUT_MS = 5_000
const MAX_HOPS = 3

/** Why a router call produced no usable answer. Every reason makes the caller use Folks. */
export type BiatecRouterErrorReason =
  /** No router for this network. */
  | 'not-configured'
  /** Fixed output requested from a router build that does not support it (no echo). */
  | 'unsupported'
  /** The router found no route (404, or an empty / zero answer). */
  | 'no-route'
  /** No HTTP answer: offline, CORS, timeout. */
  | 'network'
  /** Any other HTTP error status. */
  | 'http'
  /** The answer does not match the request. */
  | 'invalid'

export class BiatecRouterError extends Error {
  constructor(
    public readonly reason: BiatecRouterErrorReason,
    message: string,
    public readonly status?: number
  ) {
    super(message)
    this.name = 'BiatecRouterError'
  }
}

// `unknown`: a type guard over whatever a caught value is.
export const isBiatecRouterError = (error: unknown): error is BiatecRouterError =>
  error instanceof BiatecRouterError

// ---------------------------------------------------------------------------
// ARC-14 header cache. getAuthToken() does an algod round trip (suggested params) and a
// signature per call; the header stays valid for ~1000 rounds, so one per network per
// 5 minutes is plenty.
// ---------------------------------------------------------------------------
export const AUTH_HEADER_TTL_MS = 5 * 60 * 1000
const authCache = new Map<string, { header: string; expiresAt: number }>()
const authInFlight = new Map<string, Promise<string>>()

export const getRouterAuthHeader = async (env: string, now: number = Date.now()) => {
  // getAuthToken() signs for the ACTIVE network; a call for another one (a request started
  // before a network switch) must neither use nor poison that network's cached header.
  if (useAppStore().state.env !== env) {
    throw new BiatecRouterError('network', `Network switched away from ${env}`)
  }
  const cached = authCache.get(env)
  if (cached && cached.expiresAt > now) return cached.header
  const pending = authInFlight.get(env)
  if (pending) return pending
  // Bounded: a hung algod must neither hang the router call nor stay the shared in-flight
  // request forever (the timeout settles it, and `finally` clears it).
  const request = withTimeout(getAuthToken(), ROUTER_AUTH_TIMEOUT_MS, 'ARC-14 header timed out')
    .then((header) => {
      if (useAppStore().state.env === env) {
        authCache.set(env, { header, expiresAt: now + AUTH_HEADER_TTL_MS })
      }
      return header
    })
    .finally(() => authInFlight.delete(env))
  authInFlight.set(env, request)
  return request
}

export const clearBiatecRouterAuthCache = (env?: string): void => {
  if (env === undefined) {
    authCache.clear()
    authInFlight.clear()
  } else authCache.delete(env)
}

// ---------------------------------------------------------------------------
// Wire format. Hand-written (the Orval client covers only the trade API); every field is
// optional on the wire. uint64 amounts arrive as JSON numbers.
// ---------------------------------------------------------------------------
type WireAmount = number | string
/** The router serialises its SwapMode enum as a string; a number is accepted too. */
type WireSwapMode = string | number

interface WireQuoteRoute {
  fromAsset?: WireAmount
  toAsset?: WireAmount
  inputAmount?: WireAmount
  outputAmount?: WireAmount
  swapMode?: WireSwapMode
}

/** `GET route` answers a list of legs; an object form `{ swapMode, routes }` is accepted too. */
type WireRouteResponse = WireQuoteRoute[] | { swapMode?: WireSwapMode; routes?: WireQuoteRoute[] }

interface WireRouteOutput {
  route?: WireQuoteRoute
  txsToSign?: string[]
}

interface WireRouteOutputCover {
  input?: { swapMode?: WireSwapMode }
  routes?: WireRouteOutput[]
}

/** Amount fields whose values are read through `toAmount`. */
const BIG_AMOUNT_FIELDS =
  /(?<!\\)("(?:inputAmount|outputAmount|amountIn|amountOut|swapAmount|receiveMinimum|sendMaximum|fromAsset|toAsset)"\s*:\s*)(\d{16,})(?=\s*[,}])/g

/**
 * JSON.parse turns integers above 2^53 into imprecise floats. Before parsing, the amount
 * fields with 16+ digit values are quoted so they reach `toAmount` as exact strings. Only
 * those keys, and never inside a JSON string (an escaped `\"key\"` is skipped), so other
 * text cannot be corrupted into invalid JSON.
 */
export const parseRouterJson = <T>(text: string): T =>
  JSON.parse(text.replace(BIG_AMOUNT_FIELDS, '$1"$2"')) as T

/** Amount from the wire: a non-negative integer, or 0 when missing or malformed. */
export const toAmount = (value: WireAmount | undefined): bigint => {
  if (typeof value === 'number') {
    return Number.isFinite(value) && value > 0 ? BigInt(Math.trunc(value)) : 0n
  }
  if (typeof value === 'string' && /^\d+$/.test(value.trim())) return BigInt(value.trim())
  return 0n
}

const routerSwapMode = (mode: SwapQuoteMode): 'FixedInput' | 'FixedOutput' =>
  mode === 'FIXED_OUTPUT' ? 'FixedOutput' : 'FixedInput'

export const isFixedOutputEcho = (mode: WireSwapMode | undefined): boolean =>
  (typeof mode === 'string' && mode.toLowerCase() === 'fixedoutput') || mode === 1

/**
 * Fixed-output safety rule. A router build without fixed-output support ignores `swapMode`
 * and would treat the wanted output as an input amount - trading the wrong amount. Accept a
 * fixed-output answer only when it echoes the mode AND the summed output is within
 * `[requested, requested * 1.01]`.
 */
export const acceptFixedOutput = (
  echoed: WireSwapMode | undefined,
  requestedOutput: bigint,
  quotedOutput: bigint
): boolean =>
  isFixedOutputEcho(echoed) &&
  quotedOutput >= requestedOutput &&
  quotedOutput * 100n <= requestedOutput * 101n

const legAmounts = (route: WireQuoteRoute | undefined): LegAmounts => ({
  inputAmount: toAmount(route?.inputAmount),
  outputAmount: toAmount(route?.outputAmount)
})

export interface BiatecSwapParams {
  fromAssetId: number
  toAssetId: number
  /** Fixed input: amount sent. Fixed output: amount wanted. Base units. */
  amount: bigint
  swapMode: SwapQuoteMode
}

export interface BiatecRouteTxsParams extends BiatecSwapParams {
  sender: string
  /** Minimum total output (base units of `toAssetId`); the router splits it across legs. */
  receiveMinimum: bigint
  /** Fixed output only: maximum input (base units of `fromAssetId`). */
  sendMaximum?: bigint
}

export interface BiatecRouteQuote {
  quote: ISwapQuote
  legs: LegAmounts[]
}

/** One leg: an independent transaction group (base64 msgpack, unsigned). */
export interface BiatecTxLeg extends LegAmounts {
  txns: string[]
}

export interface BiatecRouteTxs {
  quote: ISwapQuote
  legs: BiatecTxLeg[]
}

// `unknown`: a caught value is untyped; it is classified right here.
const toRouterError = (error: unknown, env: string): BiatecRouterError => {
  if (error instanceof BiatecRouterError) return error
  if (axios.isAxiosError(error)) {
    const status = error.response?.status
    // No response at all: offline, blocked by CORS, or timed out.
    if (status === undefined) return new BiatecRouterError('network', error.message)
    if (status === 404) return new BiatecRouterError('no-route', 'No route found', status)
    // The cached ARC-14 header may have expired; fetch a fresh one next time.
    if (status === 401) clearBiatecRouterAuthCache(env)
    return new BiatecRouterError('http', `Biatec Router error ${status}`, status)
  }
  return new BiatecRouterError('network', error instanceof Error ? error.message : String(error))
}

/** Every leg must swap the requested pair (a missing field is tolerated: all are optional). */
const checkPair = (routes: Array<WireQuoteRoute | undefined>, params: BiatecSwapParams): void => {
  for (const route of routes) {
    const from = route?.fromAsset
    const to = route?.toAsset
    if (
      (from !== undefined && toAmount(from) !== BigInt(params.fromAssetId)) ||
      (to !== undefined && toAmount(to) !== BigInt(params.toAssetId))
    ) {
      throw new BiatecRouterError('invalid', 'Biatec Router answered for another asset pair')
    }
  }
}

const baseUrlOrThrow = (env: string): string => {
  const base = getBiatecRouterBaseUrl(env)
  if (!base) throw new BiatecRouterError('not-configured', `No Biatec Router for ${env}`)
  return base
}

const checkFixedOutput = (
  params: BiatecSwapParams,
  echoed: WireSwapMode | undefined,
  quote: ISwapQuote
): void => {
  if (params.swapMode !== 'FIXED_OUTPUT') return
  if (!acceptFixedOutput(echoed, params.amount, quote.outputAmount)) {
    throw new BiatecRouterError('unsupported', 'Biatec Router does not support fixed output')
  }
}

/** Quote (`GET route`) for a swap. Throws BiatecRouterError when there is no usable answer. */
export const fetchBiatecRoute = async (
  env: string,
  params: BiatecSwapParams
): Promise<BiatecRouteQuote> => {
  const base = baseUrlOrThrow(env)
  let routes: WireQuoteRoute[]
  let echoed: WireSwapMode | undefined
  try {
    const query: Record<string, string> = {
      fromAsset: params.fromAssetId.toString(),
      toAsset: params.toAssetId.toString(),
      amount: params.amount.toString(),
      maxRoutes: '1'
    }
    if (params.swapMode === 'FIXED_OUTPUT') query.swapMode = routerSwapMode(params.swapMode)
    const response = await axios.get<string>(`${base}/api/v1/router/route`, {
      params: query,
      headers: { Accept: 'application/json', Authorization: await getRouterAuthHeader(env) },
      timeout: ROUTER_QUOTE_TIMEOUT_MS,
      responseType: 'text',
      transformResponse: [(data: string) => data]
    })
    const body = parseRouterJson<WireRouteResponse | null>(response.data || 'null')
    if (Array.isArray(body)) {
      routes = body
      // Every leg must carry the echo for the list form to count as echoed.
      echoed =
        body.length > 0 && body.every((route) => isFixedOutputEcho(route.swapMode))
          ? body[0].swapMode
          : undefined
    } else {
      routes = body?.routes ?? []
      echoed = body?.swapMode
    }
    // The router (scholtz/BiatecRouter#9) echoes the mode of `quote`/`route` in a CORS-exposed
    // response header; that is the primary echo.
    const header = response.headers?.['x-swap-mode']
    if (typeof header === 'string' && header.length > 0) echoed = header
  } catch (error) {
    throw toRouterError(error, env)
  }
  checkPair(routes, params)
  const legs = routes.map(legAmounts).filter((leg) => leg.inputAmount > 0n)
  const quote = biatecLegsToSwapQuote(legs, params)
  if (legs.length === 0 || quote.outputAmount <= 0n) {
    throw new BiatecRouterError('no-route', 'Biatec Router returned no route')
  }
  checkFixedOutput(params, echoed, quote)
  return { quote, legs }
}

/** Route plus unsigned transactions (`POST routeTxs`) for `sender`. */
export const fetchBiatecRouteTxs = async (
  env: string,
  params: BiatecRouteTxsParams
): Promise<BiatecRouteTxs> => {
  const base = baseUrlOrThrow(env)
  let cover: WireRouteOutputCover | null
  try {
    const body: Record<string, string | number> = {
      sender: params.sender,
      fromAsset: params.fromAssetId.toString(),
      toAsset: params.toAssetId.toString(),
      swapAmount: params.amount.toString(),
      receiveMinimum: params.receiveMinimum.toString(),
      routesCount: 1,
      maxHops: MAX_HOPS
    }
    if (params.swapMode === 'FIXED_OUTPUT') {
      body.swapMode = routerSwapMode(params.swapMode)
      if (params.sendMaximum !== undefined) body.sendMaximum = params.sendMaximum.toString()
    }
    const response = await axios.post<string>(`${base}/api/v1/router/routeTxs`, body, {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: await getRouterAuthHeader(env)
      },
      timeout: ROUTER_ROUTE_TXS_TIMEOUT_MS,
      responseType: 'text',
      transformResponse: [(data: string) => data]
    })
    cover = parseRouterJson<WireRouteOutputCover | null>(response.data || 'null')
  } catch (error) {
    throw toRouterError(error, env)
  }
  checkPair(
    (cover?.routes ?? []).map((output) => output.route),
    params
  )
  const legs: BiatecTxLeg[] = (cover?.routes ?? []).map((output) => ({
    ...legAmounts(output.route),
    txns: (output.txsToSign ?? []).filter((txn) => typeof txn === 'string' && txn.length > 0)
  }))
  if (legs.length === 0) throw new BiatecRouterError('no-route', 'Biatec Router returned no route')
  if (legs.some((leg) => leg.txns.length === 0 || leg.inputAmount <= 0n)) {
    throw new BiatecRouterError('invalid', 'Biatec Router returned a leg without transactions')
  }
  const quote = biatecLegsToSwapQuote(legs, params)
  if (quote.outputAmount <= 0n) {
    throw new BiatecRouterError('no-route', 'Biatec Router returned no route')
  }
  checkFixedOutput(params, cover?.input?.swapMode, quote)
  // The legs of one swap spend exactly the order amount; anything else would leave part of
  // the order neither executed nor handed to the fallback.
  if (params.swapMode === 'FIXED_INPUT' && quote.inputAmount !== params.amount) {
    throw new BiatecRouterError('invalid', 'Biatec Router legs do not spend the order amount')
  }
  if (
    params.swapMode === 'FIXED_OUTPUT' &&
    params.sendMaximum !== undefined &&
    quote.inputAmount > params.sendMaximum
  ) {
    throw new BiatecRouterError('invalid', 'Biatec Router spends more than the maximum')
  }
  return { quote, legs }
}
