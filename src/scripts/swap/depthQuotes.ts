import type { ISwapQuote } from '@/interface/ISwapQuote'
import type { SwapRequest } from './swapQuote'
import {
  fetchBiatecRoute,
  isBiatecRouterConfigured,
  isBiatecRouterError
} from '@/service/routerApi'
import fetchFolksSwapQuote from '@/scripts/folks/fetchFolksSwapQuote'

export interface DepthQuoteSources {
  /** Whether the network has a Biatec Router at all. */
  biatecConfigured: boolean
  /** Biatec Router quote; throws when there is no usable answer. */
  biatec: (request: SwapRequest) => Promise<ISwapQuote>
  /** Folks Router quote; throws or returns null when there is none. */
  folks: (request: SwapRequest) => Promise<ISwapQuote | null>
}

export type DepthQuoter = (request: SwapRequest) => Promise<ISwapQuote | null>

/**
 * Quote function for ONE market depth refresh (shared by the bid and the offer side):
 * Biatec Router first, Folks Router when the router is not configured, errors, finds no
 * route or does not support fixed output yet.
 *
 * Within the refresh, a network/CORS failure or an outage-like HTTP error (401, 403, 429, 5xx;
 * a 400 stays per row) stops further
 * Biatec calls (every row would fail the same way), and an "unsupported" fixed-output answer
 * stops further fixed-output Biatec calls - so a router outage costs one failed call per
 * refresh, not one per row. "No route" stays per row (another amount may have one).
 */
/** HTTP statuses that fail every row the same way (auth, rate limit, server errors). */
const isOutageStatus = (status: number | undefined): boolean =>
  status === undefined || status === 401 || status === 403 || status === 429 || status >= 500

/**
 * How long an "unsupported" fixed-output answer is remembered per network across refreshes,
 * so every refresh does not spend a router call whose answer is known to be discarded.
 */
export const FIXED_OUTPUT_UNSUPPORTED_TTL_MS = 10 * 60 * 1000
const fixedOutputUnsupportedUntil = new Map<string, number>()

export const resetDepthQuoterMemo = (): void => fixedOutputUnsupportedUntil.clear()

export const createDepthQuoter = (sources: DepthQuoteSources, memoKey?: string): DepthQuoter => {
  let biatecDown = !sources.biatecConfigured
  let fixedOutputUnsupported =
    memoKey !== undefined && (fixedOutputUnsupportedUntil.get(memoKey) ?? 0) > Date.now()
  return async (request) => {
    const skipBiatec = biatecDown || (request.swapMode === 'FIXED_OUTPUT' && fixedOutputUnsupported)
    if (!skipBiatec) {
      try {
        return await sources.biatec(request)
      } catch (error) {
        if (isBiatecRouterError(error)) {
          // Outage-like answers fail every row the same way: stop for this refresh.
          if (error.reason === 'network' || error.reason === 'not-configured') biatecDown = true
          if (error.reason === 'http' && isOutageStatus(error.status)) biatecDown = true
          if (error.reason === 'unsupported') {
            fixedOutputUnsupported = true
            if (memoKey !== undefined) {
              fixedOutputUnsupportedUntil.set(memoKey, Date.now() + FIXED_OUTPUT_UNSUPPORTED_TTL_MS)
            }
          }
        } else {
          biatecDown = true
        }
      }
    }
    return sources.folks(request)
  }
}

/** The depth quoter for `env` backed by the real routers. Create one per refresh. */
export const createNetworkDepthQuoter = (env: string): DepthQuoter =>
  createDepthQuoter(
    {
      biatecConfigured: isBiatecRouterConfigured(env),
      biatec: async (request) => (await fetchBiatecRoute(env, request)).quote,
      folks: async (request) => (await fetchFolksSwapQuote(env, request)).quote
    },
    env
  )
