// Regression: the depth chart pipeline against a real testnet USDC/tAlgo
// snapshot (mix of in-range, one-sided, far-out-of-range Biatec CLAMM pools and
// a large Tiny constant-product pool). Guards against the math ever rendering a
// populated pair as empty ("No pool liquidity for this pair yet" while the
// pools table shows pools).
import { describe, expect, it } from 'vitest'
import type { Pool } from '@/api/models'
import visibleRangeFactor from '../visibleRangeFactor'
import { calculateTvlDistribution, normalizePoolLiquidity } from '../poolTvlDistribution'
import pools from './fixtures/pools-usdc-talgo.json'

const ASSET_ID = 10458941
const CURRENCY_ID = 0

describe('calculateTvlDistribution on a real testnet snapshot', () => {
  const normalized = (pools as Pool[])
    .map((p) => normalizePoolLiquidity(p, ASSET_ID, CURRENCY_ID))
    .filter((p): p is NonNullable<typeof p> => p !== null)

  it('normalizes every pool of the snapshot (none silently dropped)', () => {
    expect(normalized).toHaveLength((pools as Pool[]).length)
  })

  it('derives the TVL-weighted reference price near the traded price', () => {
    const { referencePrice } = calculateTvlDistribution(normalized, { tickType: 'normal' })
    expect(referencePrice).toBeGreaterThan(0.1)
    expect(referencePrice).toBeLessThan(0.15)
  })

  it('renders non-empty buckets for every tick width and window source', () => {
    const mid = 0.124
    for (const [tickType, precision] of [
      ['wide', 0],
      ['normal', 1],
      ['narrow', 2]
    ] as const) {
      const factor = visibleRangeFactor(precision)
      // Derived window (first visit) and shared window (after AddLiquidity
      // publishes its grid) must both produce a populated chart.
      for (const options of [
        { tickType },
        {
          tickType,
          midPrice: mid,
          visibleFrom: mid * factor,
          visibleTo: mid / factor
        }
      ] as const) {
        const { buckets } = calculateTvlDistribution(normalized, options)
        expect(buckets.length, `${tickType} ${JSON.stringify(options)}`).toBeGreaterThan(1)
        expect(
          buckets.some((bucket) => bucket.total > 0),
          `${tickType}: all buckets empty`
        ).toBe(true)
      }
    }
  })

  it('marks hasExactPool exactly on the ticks where Biatec pools exist', () => {
    const { buckets } = calculateTvlDistribution(normalized, {
      tickType: 'normal',
      midPrice: 0.124,
      visibleFrom: 0.124 * visibleRangeFactor(1),
      visibleTo: 0.124 / visibleRangeFactor(1)
    })
    const exact = buckets.filter((bucket) => bucket.hasExactPool)
    // Snapshot has Biatec pools on [0.1,0.11], [0.11,0.12], [0.12,0.13],
    // [0.13,0.14] inside this window ([0.14,0.16] and [0.5,1] are off-grid for
    // the normal tick chain anchored at 0.0248, [9,10]/[10,11] are outside).
    expect(exact.length).toBeGreaterThanOrEqual(3)
    for (const bucket of exact) {
      expect(bucket.from).toBeGreaterThanOrEqual(0.09)
      expect(bucket.to).toBeLessThanOrEqual(0.17)
    }
  })
})
