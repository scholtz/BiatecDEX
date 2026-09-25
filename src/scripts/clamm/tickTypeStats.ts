/**
 * Per-tick-width (wide/normal/narrow) pool stats for a single asset pair.
 *
 * Used by AddLiquidity.vue's tick-width selector to show how many existing
 * pools sit at each width, and to default the selection to whichever width
 * has the most liquidity deployed (falling back to pool count when no TVL
 * data is available, e.g. the on-chain-only fallback path).
 *
 * Pure module — no Vue, no network calls, no dependency on the
 * `biatec-concentrated-liquidity-amm` package's `TickType` type (kept
 * generic over `T` so it works with any small set of category keys and is
 * testable without that package's real tick classifier).
 */

export interface TickTypeStat {
  /** Existing pools of this pair classified at this tick width. */
  count: number
  /** Summed USD TVL of those pools (0 when unknown, e.g. on-chain fallback). */
  tvlUsd: number
}

export type TickTypeStats<T extends string> = Record<T, TickTypeStat>

/** A pool reduced to what classification/aggregation needs. */
export interface ClassifiablePool {
  low: number
  high: number
  tvlUsd: number
}

export const emptyTickTypeStats = <T extends string>(types: readonly T[]): TickTypeStats<T> =>
  Object.fromEntries(types.map((type) => [type, { count: 0, tvlUsd: 0 }])) as TickTypeStats<T>

/**
 * Classify each pool by tick width and aggregate count + TVL per width.
 * Wall pools (`low === high`, a zero-width single-price position — not a
 * "tick width" in the wide/normal/narrow sense) and pools `classify` can't
 * place into any known type are skipped, not counted anywhere.
 */
export const buildTickTypeStats = <T extends string>(
  pools: readonly ClassifiablePool[],
  types: readonly T[],
  classify: (low: number, high: number) => T | null
): TickTypeStats<T> => {
  const stats = emptyTickTypeStats(types)
  for (const pool of pools) {
    if (!(pool.high > pool.low)) continue
    const type = classify(pool.low, pool.high)
    if (type === null || !(type in stats)) continue
    const stat = stats[type]
    stat.count += 1
    stat.tvlUsd += pool.tvlUsd
  }
  return stats
}

/**
 * The tick width with the most liquidity deployed — ranked by summed TVL
 * first, then by pool count (meaningful when TVL is unknown, e.g. every
 * `tvlUsd` is 0 on the on-chain fallback path), then by the given `types`
 * order for a fully deterministic tie-break. Returns null when every width
 * has zero pools (nothing to default to).
 */
export const mostLiquidTickType = <T extends string>(
  stats: TickTypeStats<T>,
  types: readonly T[]
): T | null => {
  let best: T | null = null
  let bestTvl = -Infinity
  let bestCount = -1
  for (const type of types) {
    const stat = stats[type]
    if (!stat || stat.count === 0) continue
    const better = stat.tvlUsd > bestTvl || (stat.tvlUsd === bestTvl && stat.count > bestCount)
    if (better) {
      best = type
      bestTvl = stat.tvlUsd
      bestCount = stat.count
    }
  }
  return best
}
