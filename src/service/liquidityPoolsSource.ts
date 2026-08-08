import type { Pool } from '@/api/models'
import { AMMType, DEXProtocol } from '@/api/models'
import { normalizePoolLiquidity } from '@/scripts/clamm/poolTvlDistribution'

/**
 * Resilient pool loading for the pool liquidity depth chart.
 *
 * The chart used to consume `GET api/pool` (AVMTradeReporter) as its ONLY data
 * source and reset its pool list on every failure, so any hiccup of the trade
 * reporter (restart with a cold pool cache, transient 5xx, partial responses
 * while the cache re-fills) wiped the chart or reduced it to the single pool
 * that was just re-indexed — even though the on-chain state was fine and the
 * "Liquidity pools" table right below (which has an on-chain fallback) kept
 * showing every pool. This module implements the repo-wide rule for pool data:
 * trade reporter first, slow on-chain path as fallback, and never discard the
 * last good data because one refresh failed.
 */

export interface PairPoolsDeps {
  /** Fast path: pre-indexed pools from the trade reporter API. May throw. */
  fetchFromReporter: () => Promise<Pool[]>
  /**
   * Slow path: pools reconstructed from on-chain state (pool provider boxes +
   * per-pool status). Only called when the reporter fails or returns nothing.
   * May throw.
   */
  fetchFromChain: () => Promise<Pool[]>
}

export interface PairPoolsResult {
  pools: Pool[]
  /**
   * Where the pools came from: 'reporter' (fast path), 'chain' (fallback),
   * 'previous' (both paths failed; the caller's last good list is returned
   * unchanged so the chart keeps rendering).
   */
  source: 'reporter' | 'chain' | 'previous'
  /** Human-readable error when both paths failed, null otherwise. */
  error: string | null
}

const errorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error)

/**
 * Load the pools of a pair: reporter first, on-chain fallback on error or empty
 * response, previous data retained when both fail. An empty result is only
 * accepted when the fallback path itself confirms it (a pair can genuinely have
 * no pools), never because the reporter's cache happened to be cold.
 */
export const loadPairPools = async (
  previous: Pool[],
  deps: PairPoolsDeps
): Promise<PairPoolsResult> => {
  let reporterError: string | null = null
  try {
    const pools = await deps.fetchFromReporter()
    if (pools.length > 0) {
      return { pools, source: 'reporter', error: null }
    }
  } catch (error) {
    reporterError = errorMessage(error)
  }
  try {
    const pools = await deps.fetchFromChain()
    return { pools, source: 'chain', error: null }
  } catch (error) {
    const chainError = errorMessage(error)
    const message = reporterError !== null ? `${reporterError}; ${chainError}` : chainError
    return { pools: previous, source: 'previous', error: message }
  }
}

const poolKey = (pool: Pool): string => pool.poolAddress ?? `${pool.poolAppId ?? ''}`

const poolMatchesPair = (pool: Pool, assetId: number, currencyId: number): boolean => {
  const idA = pool.assetIdA ?? null
  const idB = pool.assetIdB ?? null
  return (
    (idA === assetId && idB === currencyId) || (idA === currencyId && idB === assetId)
  )
}

/**
 * Merge a live (SignalR) pool update into the current list. Returns the new
 * list, or null when the update must be ignored (different pair, or a payload
 * that would corrupt an existing healthy entry). A degenerate payload — one
 * that `normalizePoolLiquidity` rejects even though the pool still has
 * reserves — must never replace a healthy entry: a half-populated live message
 * would silently blank that pool's bar out of the chart. An explicitly drained
 * pool (all reserves zero) is a real state change and is accepted.
 */
export const mergePoolUpdate = (
  existing: Pool[],
  update: Pool,
  assetId: number,
  currencyId: number
): Pool[] | null => {
  if (!poolMatchesPair(update, assetId, currencyId)) return null
  const key = poolKey(update)
  const index = existing.findIndex((pool) => poolKey(pool) === key)
  const normalizable = normalizePoolLiquidity(update, assetId, currencyId) !== null
  if (index === -1) {
    return normalizable ? [...existing, update] : null
  }
  const drained = update.realAmountA === 0 && update.realAmountB === 0
  if (!normalizable && !drained) return null
  const next = existing.slice()
  next.splice(index, 1, update)
  return next
}

/**
 * On-chain pool state needed to reconstruct a reporter-equivalent {@link Pool}.
 * All bigint amounts are in the contract's base scale (1e9); prices in real
 * units come from the pool provider's FullConfig (exact grid values).
 */
export interface OnChainPoolStatus {
  appId: bigint
  assetA: bigint
  assetB: bigint
  pMin: number
  pMax: number
  lpFee: number
  verificationClass: number
  /** Pool's asset A balance (variable ab), base scale 1e9. */
  assetABalance: bigint
  /** Pool's asset B balance (variable bb), base scale 1e9. */
  assetBBalance: bigint
  /** Current liquidity L, base scale 1e9. */
  currentLiquidity: bigint
  /** Current price (asset B per asset A), base scale 1e9. */
  price: bigint
  poolAddress?: string
}

const BASE_SCALE = 1e9

/**
 * Reconstruct the trade-reporter Pool shape from on-chain CLAMM state so the
 * depth chart's math (which consumes real/virtual amounts) works identically on
 * both data paths. Virtual reserves follow from L and the current price:
 * virtualA = L / sqrt(P), virtualB = L * sqrt(P) — the same relation the
 * reporter uses to serve virtualAmountA/B.
 */
export const ammStatusToPool = (status: OnChainPoolStatus): Pool => {
  const realAmountA = Number(status.assetABalance) / BASE_SCALE
  const realAmountB = Number(status.assetBBalance) / BASE_SCALE
  const liquidity = Number(status.currentLiquidity) / BASE_SCALE
  const price = Number(status.price) / BASE_SCALE
  const isWall = status.pMin === status.pMax

  let virtualAmountA: number
  let virtualAmountB: number
  if (isWall) {
    // Zero-width range: the pool trades at exactly pMin; derive virtual
    // amounts from the wall price (matches the reporter's wall handling).
    virtualAmountA = status.pMin > 0 ? realAmountA + realAmountB / status.pMin : realAmountA
    virtualAmountB = status.pMin > 0 ? virtualAmountA * status.pMin : realAmountB
  } else {
    const sqrtP = price > 0 ? Math.sqrt(price) : 0
    virtualAmountA = sqrtP > 0 ? liquidity / sqrtP : 0
    virtualAmountB = liquidity * sqrtP
  }

  return {
    poolAddress: status.poolAddress ?? `app-${status.appId.toString()}`,
    poolAppId: Number(status.appId),
    assetIdA: Number(status.assetA),
    assetIdB: Number(status.assetB),
    ammType: AMMType.ConcentratedLiquidityAMM,
    protocol: DEXProtocol.Biatec,
    pMin: status.pMin,
    pMax: status.pMax,
    lpFee: status.lpFee,
    verificationClass: status.verificationClass,
    a: Number(status.assetABalance),
    b: Number(status.assetBBalance),
    l: Number(status.currentLiquidity),
    hasZeroWidthPriceRange: isWall,
    realAmountA,
    realAmountB,
    virtualAmountA,
    virtualAmountB,
    virtualAmountAForPrice: virtualAmountA,
    virtualAmountBForPrice: virtualAmountB
  } as Pool
}
