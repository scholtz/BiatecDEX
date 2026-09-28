/**
 * Decides when PoolsLiquidityChart.vue may show its real, classified candles
 * instead of a loading state. Bucket classification (which bars are green /
 * "has a CLAMM pool") depends on the tick precision matching the pool's real
 * bounds - rendering before that precision is confirmed to belong to the
 * CURRENT pair produces a visibly wrong first frame (all bars orange), which
 * then silently re-renders once the real precision arrives. See
 * chartReadiness.test.ts for the full regression writeup.
 */
export interface ChartReadinessInput {
  /** True once this pair's pool fetch has completed at least once (empty or not). */
  poolsLoaded: boolean
  /** store.state.liquidityTickPrecisionPairKey - the pair the stored tick
   *  precision was actually derived/chosen for, or null if none yet. */
  precisionPairKey: string | null
  /** buildPairKey() for the pair currently on screen. */
  currentPairKey: string
  /** True once a bounded wait for the real precision has elapsed without it
   *  arriving - covers routes where nothing will ever derive one (e.g.
   *  remove-liquidity / pool-swap, where AddLiquidity.vue isn't mounted), so
   *  the chart doesn't wait forever. */
  timedOut: boolean
}

export function isChartReadyToRender(input: ChartReadinessInput): boolean {
  if (!input.poolsLoaded) return false
  if (input.precisionPairKey === input.currentPairKey) return true
  return input.timedOut
}
