/**
 * How far the default distribution window spans around the mid price, per numeric
 * tick precision (0 = wide, 1 = normal, 2 = narrow — see `precisionForTickType` in
 * `biatec-concentrated-liquidity-amm`). Wider ticks (lower precision) need a wider
 * window so the coarse ticks still cover a useful range.
 *
 * Shared by `components/LiquidityComponents/AddLiquidity.vue` (its own price-range
 * slider window) and `scripts/clamm/poolTvlDistribution.ts` (the pool liquidity
 * depth chart's default window) so both panels show the same extent by default. The
 * tick grid itself is canonical (`tickGridBoundaries` in the shared package: absolute
 * boundaries that never depend on the window or the current price), so this factor
 * only decides how much of the grid is visible — never where its boundaries fall.
 */
const visibleRangeFactor = (precision: number): number => {
  if (precision <= 0) return 0.05
  if (precision === 1) return 0.2
  return 0.8
}

export default visibleRangeFactor
