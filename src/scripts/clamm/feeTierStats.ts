/**
 * Which base LP fee tier a pair's existing pools use most - the default fee for Add
 * Liquidity, chosen the same way as the default tick width (see tickTypeStats.ts): highest
 * summed TVL, then pool count, then the tier order. Pure module (no Vue, no network).
 */

export interface FeeSample {
  low: number
  high: number
  /** Base LP fee scaled by 1e9 (1_000_000n = 0.1 %). */
  fee: bigint
  tvlUsd: number
}

/**
 * The most used supported fee. Pools for which `inWidth` holds (e.g. the default tick
 * width) are considered first, since joining an existing pool needs the same width AND
 * fee; when none of them uses a supported tier, all pools are considered. Null when no
 * pool uses a supported tier.
 */
export const mostUsedLpFee = (
  samples: readonly FeeSample[],
  tiers: readonly bigint[],
  inWidth?: (sample: FeeSample) => boolean
): bigint | null => {
  const rank = (pool: readonly FeeSample[]): bigint | null => {
    let best: bigint | null = null
    let bestTvl = -Infinity
    let bestCount = 0
    for (const tier of tiers) {
      const matching = pool.filter((sample) => sample.fee === tier)
      if (matching.length === 0) continue
      const tvl = matching.reduce(
        (sum, sample) => sum + (Number.isFinite(sample.tvlUsd) ? sample.tvlUsd : 0),
        0
      )
      if (tvl > bestTvl || (tvl === bestTvl && matching.length > bestCount)) {
        best = tier
        bestTvl = tvl
        bestCount = matching.length
      }
    }
    return best
  }
  const preferred = inWidth ? rank(samples.filter(inWidth)) : null
  return preferred ?? rank(samples)
}
