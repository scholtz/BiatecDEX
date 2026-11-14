import { beforeEach, describe, expect, it, vi } from 'vitest'
import axios, { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

vi.mock('@/service/authService', () => ({ getAuthToken: vi.fn(async () => 'SigTx header') }))
// The active network of the app (getAuthToken signs for it).
const activeNetwork = vi.hoisted(() => ({ env: 'mainnet-v1.0' }))
vi.mock('@/stores/app', () => ({ useAppStore: () => ({ state: activeNetwork }) }))
vi.mock('axios', async (importOriginal) => {
  const actual = await importOriginal<typeof import('axios')>()
  return {
    ...actual,
    default: { ...actual.default, get: vi.fn(), post: vi.fn(), isAxiosError: actual.isAxiosError }
  }
})

import { getAuthToken } from '@/service/authService'
import {
  AUTH_HEADER_TTL_MS,
  BiatecRouterError,
  acceptFixedOutput,
  clearBiatecRouterAuthCache,
  fetchBiatecRoute,
  fetchBiatecRouteTxs,
  getRouterAuthHeader,
  isBiatecRouterConfigured,
  parseRouterJson,
  toAmount
} from '../routerApi'

const MAINNET = 'mainnet-v1.0'
const get = vi.mocked(axios.get)
const post = vi.mocked(axios.post)
// `unknown`: any JSON value (or raw text) the router could answer.
const reply = (body: unknown): AxiosResponse<string> => ({
  data: typeof body === 'string' ? body : JSON.stringify(body),
  status: 200,
  statusText: 'OK',
  headers: {},
  config: { headers: {} } as InternalAxiosRequestConfig
})
const httpError = (status: number) =>
  new AxiosError('fail', 'ERR_BAD_REQUEST', undefined, undefined, {
    ...reply(''),
    status
  })

const reasonOf = async (promise: Promise<unknown>) => {
  try {
    await promise
  } catch (error) {
    return error instanceof BiatecRouterError ? error.reason : 'other'
  }
  return 'resolved'
}

beforeEach(() => {
  activeNetwork.env = 'mainnet-v1.0'
  vi.clearAllMocks()
  clearBiatecRouterAuthCache()
})

describe('configuration', () => {
  it('has routers for mainnet and testnet only', () => {
    expect(isBiatecRouterConfigured('mainnet-v1.0')).toBe(true)
    expect(isBiatecRouterConfigured('testnet-v1.0')).toBe(true)
    expect(isBiatecRouterConfigured('voimain-v1.0')).toBe(false)
    expect(isBiatecRouterConfigured('dockernet-v1')).toBe(false)
  })

  it('reports not-configured without calling the network', async () => {
    expect(
      await reasonOf(
        fetchBiatecRoute('voimain-v1.0', {
          fromAssetId: 0,
          toAssetId: 1,
          amount: 1n,
          swapMode: 'FIXED_INPUT'
        })
      )
    ).toBe('not-configured')
    expect(get).not.toHaveBeenCalled()
  })
})

describe('amount mapping', () => {
  it('parses numbers, strings, and missing or malformed values', () => {
    expect(toAmount(123)).toBe(123n)
    expect(toAmount('9007199254740993')).toBe(9007199254740993n)
    expect(toAmount(undefined)).toBe(0n)
    expect(toAmount(-5)).toBe(0n)
    expect(toAmount('12a')).toBe(0n)
  })

  it('never rewrites digits inside a JSON string', () => {
    const text =
      '{"message":"amount: 12345678901234567, too high","outputAmount":12345678901234567}'
    const parsed = parseRouterJson<{ message: string; outputAmount: string }>(text)
    expect(parsed.message).toBe('amount: 12345678901234567, too high')
    expect(toAmount(parsed.outputAmount)).toBe(12345678901234567n)
    const escaped = parseRouterJson<{ m: string }>('{"m":"\\"outputAmount\\": 12345678901234567}"}')
    expect(escaped.m).toContain('12345678901234567')
  })

  it('keeps integers above 2^53 exact when parsing JSON', () => {
    const parsed = parseRouterJson<{ outputAmount: string; small: number }>(
      '{"outputAmount": 9007199254740993, "small": 5}'
    )
    expect(toAmount(parsed.outputAmount)).toBe(9007199254740993n)
    expect(parsed.small).toBe(5)
  })

  it('sums the legs of a route and sends amounts as decimal strings', async () => {
    get.mockResolvedValueOnce(
      reply([
        { fromAsset: 0, toAsset: 31566704, inputAmount: 800000, outputAmount: 66342 },
        { inputAmount: 200000, outputAmount: 16500 },
        { outputAmount: 5 } // no input: ignored
      ])
    )
    const { quote, legs } = await fetchBiatecRoute(MAINNET, {
      fromAssetId: 0,
      toAssetId: 31566704,
      amount: 1_000_000n,
      swapMode: 'FIXED_INPUT'
    })
    expect(legs).toHaveLength(2)
    expect(quote).toMatchObject({ source: 'biatec', inputAmount: 1_000_000n, outputAmount: 82842n })
    const [url, config] = get.mock.calls[0]
    expect(url).toBe('https://router.api.biatec.io/api/v1/router/route')
    expect(config?.params).toEqual({
      fromAsset: '0',
      toAsset: '31566704',
      amount: '1000000',
      maxRoutes: '1'
    })
    expect(config?.timeout).toBe(5000)
    expect(config?.headers).toMatchObject({ Authorization: 'SigTx header' })
  })

  it('maps an empty answer or a zero output to no-route', async () => {
    get.mockResolvedValueOnce(reply([]))
    const params = { fromAssetId: 0, toAssetId: 1, amount: 10n, swapMode: 'FIXED_INPUT' as const }
    expect(await reasonOf(fetchBiatecRoute(MAINNET, params))).toBe('no-route')
    get.mockResolvedValueOnce(reply([{ inputAmount: 10 }]))
    expect(await reasonOf(fetchBiatecRoute(MAINNET, params))).toBe('no-route')
    get.mockResolvedValueOnce(reply('null'))
    expect(await reasonOf(fetchBiatecRoute(MAINNET, params))).toBe('no-route')
  })

  it('classifies HTTP and network errors', async () => {
    const params = { fromAssetId: 0, toAssetId: 1, amount: 10n, swapMode: 'FIXED_INPUT' as const }
    get.mockRejectedValueOnce(httpError(404))
    expect(await reasonOf(fetchBiatecRoute(MAINNET, params))).toBe('no-route')
    get.mockRejectedValueOnce(httpError(500))
    expect(await reasonOf(fetchBiatecRoute(MAINNET, params))).toBe('http')
    // CORS / offline / timeout: no response
    get.mockRejectedValueOnce(new AxiosError('Network Error', 'ERR_NETWORK'))
    expect(await reasonOf(fetchBiatecRoute(MAINNET, params))).toBe('network')
  })

  it('maps routeTxs legs with their transactions and posts string amounts', async () => {
    post.mockResolvedValueOnce(
      reply({
        input: {},
        routes: [
          { route: { inputAmount: 600, outputAmount: 60 }, txsToSign: ['AAA', 'BBB'] },
          { route: { inputAmount: 400, outputAmount: 39 }, txsToSign: ['CCC'] }
        ]
      })
    )
    const result = await fetchBiatecRouteTxs(MAINNET, {
      sender: 'SENDER',
      fromAssetId: 0,
      toAssetId: 1,
      amount: 1000n,
      swapMode: 'FIXED_INPUT',
      receiveMinimum: 98n
    })
    expect(result.legs).toEqual([
      { inputAmount: 600n, outputAmount: 60n, txns: ['AAA', 'BBB'] },
      { inputAmount: 400n, outputAmount: 39n, txns: ['CCC'] }
    ])
    expect(result.quote.outputAmount).toBe(99n)
    const [, body, config] = post.mock.calls[0]
    expect(body).toEqual({
      sender: 'SENDER',
      fromAsset: '0',
      toAsset: '1',
      swapAmount: '1000',
      receiveMinimum: '98',
      routesCount: 1,
      maxHops: 3
    })
    expect(config?.timeout).toBe(15000)
  })

  it('rejects a routeTxs answer with a leg without transactions or spending more than the amount', async () => {
    const params = {
      sender: 'S',
      fromAssetId: 0,
      toAssetId: 1,
      amount: 1000n,
      swapMode: 'FIXED_INPUT' as const,
      receiveMinimum: 0n
    }
    post.mockResolvedValueOnce(
      reply({ routes: [{ route: { inputAmount: 1000, outputAmount: 5 }, txsToSign: [] }] })
    )
    expect(await reasonOf(fetchBiatecRouteTxs(MAINNET, params))).toBe('invalid')
    post.mockResolvedValueOnce(
      reply({ routes: [{ route: { inputAmount: 1001, outputAmount: 5 }, txsToSign: ['A'] }] })
    )
    expect(await reasonOf(fetchBiatecRouteTxs(MAINNET, params))).toBe('invalid')
    // Spending less would leave part of the order neither executed nor handed to Folks.
    post.mockResolvedValueOnce(
      reply({ routes: [{ route: { inputAmount: 600, outputAmount: 5 }, txsToSign: ['A'] }] })
    )
    expect(await reasonOf(fetchBiatecRouteTxs(MAINNET, params))).toBe('invalid')
  })
})

describe('answer validation', () => {
  const params = { fromAssetId: 0, toAssetId: 1, amount: 10n, swapMode: 'FIXED_INPUT' as const }
  it('rejects legs for another asset pair', async () => {
    get.mockResolvedValueOnce(
      reply([{ fromAsset: 0, toAsset: 2, inputAmount: 10, outputAmount: 5 }])
    )
    expect(await reasonOf(fetchBiatecRoute(MAINNET, params))).toBe('invalid')
    post.mockResolvedValueOnce(
      reply({
        routes: [
          {
            route: { fromAsset: 3, toAsset: 1, inputAmount: 10, outputAmount: 5 },
            txsToSign: ['A']
          }
        ]
      })
    )
    expect(
      await reasonOf(fetchBiatecRouteTxs(MAINNET, { ...params, sender: 'S', receiveMinimum: 0n }))
    ).toBe('invalid')
  })

  it('bounds the ARC-14 header fetch so the call cannot hang on algod', async () => {
    vi.useFakeTimers()
    try {
      vi.mocked(getAuthToken).mockImplementationOnce(() => new Promise<string>(() => {}))
      const pending = reasonOf(fetchBiatecRoute(MAINNET, params))
      await vi.advanceTimersByTimeAsync(5_001)
      expect(await pending).toBe('network')
      expect(get).not.toHaveBeenCalled()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('fixed-output safety rule', () => {
  it('accepts only an echoed mode with an output in [requested, requested * 1.01]', () => {
    expect(acceptFixedOutput('FixedOutput', 1000n, 1000n)).toBe(true)
    expect(acceptFixedOutput('FixedOutput', 1000n, 1010n)).toBe(true)
    expect(acceptFixedOutput('FixedOutput', 1000n, 1011n)).toBe(false)
    expect(acceptFixedOutput('FixedOutput', 1000n, 999n)).toBe(false)
    expect(acceptFixedOutput(undefined, 1000n, 1000n)).toBe(false)
    expect(acceptFixedOutput('FixedInput', 1000n, 1000n)).toBe(false)
  })

  const fo = { fromAssetId: 1, toAssetId: 0, amount: 1_000_000n, swapMode: 'FIXED_OUTPUT' as const }

  it('reports unsupported when a route answer does not echo the mode (router without #9)', async () => {
    // An old router treats the wanted output as an input: 1 ALGO in, 0.066 USDC out.
    get.mockResolvedValueOnce(reply([{ inputAmount: 1_000_000, outputAmount: 66_342 }]))
    expect(await reasonOf(fetchBiatecRoute(MAINNET, fo))).toBe('unsupported')
    // Even when the output happens to look right, no echo means no.
    get.mockResolvedValueOnce(reply([{ inputAmount: 15_000_000, outputAmount: 1_000_100 }]))
    expect(await reasonOf(fetchBiatecRoute(MAINNET, fo))).toBe('unsupported')
    expect(get.mock.calls[0][1]?.params).toMatchObject({ swapMode: 'FixedOutput' })
  })

  it('accepts an echoed fixed-output route, in list or object form', async () => {
    get.mockResolvedValueOnce(
      reply([{ inputAmount: 15_000_000, outputAmount: 1_000_100, swapMode: 'FixedOutput' }])
    )
    expect((await fetchBiatecRoute(MAINNET, fo)).quote.inputAmount).toBe(15_000_000n)
    get.mockResolvedValueOnce(
      reply({
        swapMode: 'FixedOutput',
        routes: [{ inputAmount: 15_000_000, outputAmount: 1_000_100 }]
      })
    )
    expect((await fetchBiatecRoute(MAINNET, fo)).quote.outputAmount).toBe(1_000_100n)
  })

  it('accepts the X-Swap-Mode response header as the route echo', async () => {
    get.mockResolvedValueOnce({
      ...reply([{ inputAmount: 15_000_000, outputAmount: 1_000_100 }]),
      headers: { 'x-swap-mode': 'FixedOutput' }
    })
    expect((await fetchBiatecRoute(MAINNET, fo)).quote.inputAmount).toBe(15_000_000n)
    get.mockResolvedValueOnce({
      ...reply([{ inputAmount: 15_000_000, outputAmount: 1_000_100 }]),
      headers: { 'x-swap-mode': 'FixedInput' }
    })
    expect(await reasonOf(fetchBiatecRoute(MAINNET, fo))).toBe('unsupported')
  })

  it('rejects an echoed answer whose output is outside the 1 % band', async () => {
    get.mockResolvedValueOnce(
      reply([{ inputAmount: 15_000_000, outputAmount: 1_020_000, swapMode: 'FixedOutput' }])
    )
    expect(await reasonOf(fetchBiatecRoute(MAINNET, fo))).toBe('unsupported')
  })

  it('uses input.swapMode as the routeTxs echo and sends sendMaximum', async () => {
    const params = { ...fo, sender: 'S', receiveMinimum: 995_000n, sendMaximum: 15_100_000n }
    const legs = [{ route: { inputAmount: 15_000_000, outputAmount: 1_000_100 }, txsToSign: ['A'] }]
    post.mockResolvedValueOnce(reply({ input: {}, routes: legs }))
    expect(await reasonOf(fetchBiatecRouteTxs(MAINNET, params))).toBe('unsupported')
    post.mockResolvedValueOnce(reply({ input: { swapMode: 'FixedOutput' }, routes: legs }))
    expect((await fetchBiatecRouteTxs(MAINNET, params)).legs).toHaveLength(1)
    expect(post.mock.calls[1][1]).toMatchObject({
      swapMode: 'FixedOutput',
      sendMaximum: '15100000',
      swapAmount: '1000000'
    })
    // An input above sendMaximum is refused.
    post.mockResolvedValueOnce(
      reply({
        input: { swapMode: 'FixedOutput' },
        routes: [{ route: { inputAmount: 15_200_000, outputAmount: 1_000_100 }, txsToSign: ['A'] }]
      })
    )
    expect(await reasonOf(fetchBiatecRouteTxs(MAINNET, params))).toBe('invalid')
  })
})

describe('auth header cache', () => {
  it('reuses the header per network for 5 minutes', async () => {
    const auth = vi.mocked(getAuthToken)
    await getRouterAuthHeader(MAINNET, 1_000)
    await getRouterAuthHeader(MAINNET, 1_000 + AUTH_HEADER_TTL_MS - 1)
    expect(auth).toHaveBeenCalledTimes(1)
    activeNetwork.env = 'testnet-v1.0'
    await getRouterAuthHeader('testnet-v1.0', 2_000)
    expect(auth).toHaveBeenCalledTimes(2)
    activeNetwork.env = MAINNET
    await getRouterAuthHeader(MAINNET, 1_000 + AUTH_HEADER_TTL_MS)
    expect(auth).toHaveBeenCalledTimes(3)
  })

  it('never signs or caches a header for a network that is not active', async () => {
    activeNetwork.env = 'testnet-v1.0'
    expect(await reasonOf(getRouterAuthHeader(MAINNET))).toBe('network')
    expect(vi.mocked(getAuthToken)).not.toHaveBeenCalled()
  })

  it('shares one request between concurrent callers', async () => {
    const auth = vi.mocked(getAuthToken)
    await Promise.all([getRouterAuthHeader(MAINNET), getRouterAuthHeader(MAINNET)])
    expect(auth).toHaveBeenCalledTimes(1)
  })

  it('drops the cached header on 401', async () => {
    const auth = vi.mocked(getAuthToken)
    const params = { fromAssetId: 0, toAssetId: 1, amount: 10n, swapMode: 'FIXED_INPUT' as const }
    get.mockRejectedValueOnce(httpError(401))
    expect(await reasonOf(fetchBiatecRoute(MAINNET, params))).toBe('http')
    get.mockResolvedValueOnce(reply([{ inputAmount: 10, outputAmount: 5 }]))
    await fetchBiatecRoute(MAINNET, params)
    expect(auth).toHaveBeenCalledTimes(2)
  })
})
