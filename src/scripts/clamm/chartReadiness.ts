/**
 * Decides when PoolsLiquidityChart.vue may show its real, classified candles
 * instead of a loading state. Bucket classification (which bars are green /
 * "has a CLAMM pool") depends on the tick precision matching the pool's real
 * bounds - rendering before that precision is confirmed to belong to the
 * CURRENT pair produces a visibly wrong first frame (all bars orange), which
 * then silently re-renders once the real precision arrives. See
 * chartReadiness.test.ts for the full regression writeup.
 */
// AddLiquidity.vue's own derivedPrecision() bound: how long IT waits for its
// tickTypeStats fetch before falling back to a default-precision choice for its own UI
// (a secondary feature - the badges / best-tick-type suggestion). This is NOT the total
// time AddLiquidity takes to write store.state.liquidityTickPrecisionPairKey: that write
// only happens after an earlier, unbounded upstream chain (aggregated price, then
// on-chain price, then orderbook) has already resolved. Exported so both files reference
// one literal instead of silently drifting apart.
export const PRECISION_DERIVATION_TIMEOUT_MS = 800

// PoolsLiquidityChart's own fallback bound: how long it waits, after its own pools have
// loaded, for the real (matching) tick precision to arrive from AddLiquidity before giving
// up and rendering with whatever precision the store already holds. Deliberately much
// longer than PRECISION_DERIVATION_TIMEOUT_MS above - it has to cover AddLiquidity's full,
// unbounded upstream price chain PLUS that 800ms race, not just the race by itself. This
// only bounds how long a spinner shows on a slow connection; it is not on any hot path.
export const CHART_PRECISION_FALLBACK_TIMEOUT_MS = 3000

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
