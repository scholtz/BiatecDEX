import { describe, it, expect } from 'vitest'
import { isChartReadyToRender } from '../chartReadiness'

// Regression: PoolsLiquidityChart.vue used to render its candles as soon as
// pools loaded, using whatever tick precision the store happened to already
// hold (often a stale/default value left over from a previous pair, or the
// "normal" default before AddLiquidity.vue's async precision derivation
// completes). Buckets built at the wrong precision never line up with a
// pool's declared bounds, so every bar rendered "no CLAMM pool" (no green) -
// then a couple of seconds later, once the real precision arrived, the whole
// chart silently re-rendered with the correct colors. This pure function is
// the single decision point for "is it safe to show the real chart yet", so
// the two-render flash and its fix are both covered without needing to mount
// the component or wait on real timers.
describe('isChartReadyToRender', () => {
  it('is not ready before pools have loaded, regardless of everything else', () => {
    expect(
      isChartReadyToRender({
        poolsLoaded: false,
        precisionPairKey: 'mainnet-v1.0:VOTE:GD',
        currentPairKey: 'mainnet-v1.0:VOTE:GD',
        timedOut: true
      })
    ).toBe(false)
  })

  it('is not ready once pools load if the stored precision belongs to a different pair and the timeout has not elapsed', () => {
    expect(
      isChartReadyToRender({
        poolsLoaded: true,
        precisionPairKey: 'mainnet-v1.0:ALGO:USDC', // leftover from a previous pair
        currentPairKey: 'mainnet-v1.0:VOTE:GD',
        timedOut: false
      })
    ).toBe(false)
  })

  it('is not ready once pools load if no precision has ever been stored for any pair yet', () => {
    expect(
      isChartReadyToRender({
        poolsLoaded: true,
        precisionPairKey: null,
        currentPairKey: 'mainnet-v1.0:VOTE:GD',
        timedOut: false
      })
    ).toBe(false)
  })

  it('is ready as soon as pools load if the stored precision already belongs to the current pair', () => {
    expect(
      isChartReadyToRender({
        poolsLoaded: true,
        precisionPairKey: 'mainnet-v1.0:VOTE:GD',
        currentPairKey: 'mainnet-v1.0:VOTE:GD',
        timedOut: false
      })
    ).toBe(true)
  })

  // Covers routes where AddLiquidity.vue is never mounted (remove-liquidity,
  // pool-swap) and thus nothing will ever stamp a matching precisionPairKey -
  // the bounded timeout is what stops the chart from spinning forever there.
  it('is ready once the bounded timeout elapses even if the precision never matched the current pair', () => {
    expect(
      isChartReadyToRender({
        poolsLoaded: true,
        precisionPairKey: null,
        currentPairKey: 'mainnet-v1.0:VOTE:GD',
        timedOut: true
      })
    ).toBe(true)
  })
})
