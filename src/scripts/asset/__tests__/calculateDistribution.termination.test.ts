import { describe, it, expect } from 'vitest'
import BigNumber from 'bignumber.js'
import calculateDistribution from '../calculateDistribution'

/**
 * Anti-freeze (RESULT_CODE_HUNG) guard tests: the tick-grid walk must terminate
 * for EVERY input, including degenerate ones coming from an unpriced pool
 * (midPrice 0/NaN), a collapsed window (from === to / from > to), or extreme
 * magnitudes where the derived tick size underflows to 0 and the walk cannot
 * advance. The hard iteration cap inside the while loop is the last line of
 * defense — these tests pin it in place.
 */

const run = (over: Partial<Record<string, BigNumber>> & { type?: string } = {}) =>
  calculateDistribution({
    type: (over.type ?? 'equal') as 'spread' | 'focused' | 'equal' | 'single' | 'wall',
    visibleFrom: (over.visibleFrom as BigNumber) ?? new BigNumber(0.1),
    visibleTo: (over.visibleTo as BigNumber) ?? new BigNumber(2),
    midPrice: (over.midPrice as BigNumber) ?? new BigNumber(1),
    lowPrice: (over.lowPrice as BigNumber) ?? new BigNumber(0.5),
    highPrice: (over.highPrice as BigNumber) ?? new BigNumber(1.5),
    depositAssetAmount: (over.depositAssetAmount as BigNumber) ?? new BigNumber(10),
    depositCurrencyAmount: (over.depositCurrencyAmount as BigNumber) ?? new BigNumber(10),
    precision: (over.precision as BigNumber) ?? new BigNumber(4)
  })

const MAX_BUCKETS = 1002 // walk cap (1000) + initial range + final partial

describe('calculateDistribution always terminates', () => {
  it('normal input stays within the bucket cap', () => {
    const out = run()
    expect(out.labels.length).toBeGreaterThan(0)
    expect(out.labels.length).toBeLessThanOrEqual(MAX_BUCKETS)
  })

  it('zero window (from === to)', () => {
    const out = run({ visibleFrom: new BigNumber(1), visibleTo: new BigNumber(1) })
    expect(out.labels.length).toBeLessThanOrEqual(MAX_BUCKETS)
  })

  it('inverted window (from > to)', () => {
    const out = run({ visibleFrom: new BigNumber(2), visibleTo: new BigNumber(0.5) })
    expect(out.labels.length).toBeLessThanOrEqual(MAX_BUCKETS)
  })

  it('zero and NaN prices', () => {
    for (const bad of [new BigNumber(0), new BigNumber(NaN)]) {
      const out = run({ visibleFrom: bad, midPrice: bad, lowPrice: bad })
      expect(out.labels.length).toBeLessThanOrEqual(MAX_BUCKETS)
    }
  })

  it('NaN upper bound exits immediately instead of walking forever', () => {
    const out = run({ visibleTo: new BigNumber(NaN) })
    expect(out.labels.length).toBeLessThanOrEqual(MAX_BUCKETS)
  })

  it('huge magnitude spread hits the cap, not an endless walk', () => {
    const out = run({
      visibleFrom: new BigNumber('1e-15'),
      visibleTo: new BigNumber('1e15'),
      precision: new BigNumber(9)
    })
    expect(out.labels.length).toBeLessThanOrEqual(MAX_BUCKETS)
  })
})
