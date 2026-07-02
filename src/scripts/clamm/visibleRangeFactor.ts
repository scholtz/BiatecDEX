/**
 * How far the default distribution window spans around the mid price, per numeric
 * tick precision (0 = wide, 1 = normal, 2 = narrow — see `precisionForTickType` in
 * `biatec-concentrated-liquidity-amm`). Wider ticks (lower precision) need a wider
 * window so the coarse ticks still cover a useful range.
 *
 * Shared by `components/LiquidityComponents/AddLiquidity.vue` (its own price-range
 * slider window) and `scripts/clamm/poolTvlDistribution.ts` (the pool liquidity
 * depth chart's default window) so both anchor their tick walk at the exact same
 * `visibleFrom` price. The raw tick grid (`initPriceDecimals`) is NOT anchor-
 * independent — each boundary is chained from the previous one, so two components
 * walking from different starting prices can land on visibly different tick
 * boundaries even at the same precision. Keeping this single source of truth is
 * what keeps the chart's ticks correlated with the ones Add Liquidity shows.
 */
const visibleRangeFactor = (precision: number): number => {
  if (precision <= 0) return 0.05
  if (precision === 1) return 0.2
  return 0.8
}

export default visibleRangeFactor
