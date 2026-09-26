import { describe, expect, it } from 'vitest'
import { classifyDepositRatioMode, tickRatioFor } from '../depositRatioMode'

// A simple grid: 10 bins of width 0.1 from 0.0 to 1.0, plus a narrow bin around a
// mid price of 0.12 to exercise the straddling-bin cases: [0.1, 0.2) contains 0.12.
const BINS_MIN = [0.0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
const BINS_MAX = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0]
const MID = 0.12 // sits inside bin index 1: [0.1, 0.2)

describe('classifyDepositRatioMode', () => {
  it('locks to price when the range has full bins on both sides of the mid price', () => {
    // bins 0 (below), 1 (straddle), 2 (above)
    expect(classifyDepositRatioMode(BINS_MIN, BINS_MAX, 0, 2, MID)).toEqual({ kind: 'price' })
    // Wider range, still both sides present.
    expect(classifyDepositRatioMode(BINS_MIN, BINS_MAX, 0, 5, MID)).toEqual({ kind: 'price' })
  })

  it('locks to the tick ratio for a single selected bin', () => {
    // Exactly one bin selected, and it is the straddling bin.
    expect(classifyDepositRatioMode(BINS_MIN, BINS_MAX, 1, 1, MID)).toEqual({
      kind: 'tick',
      bin: { from: 0.1, to: 0.2 }
    })
  })

  it('is one-sided (asset-only) when every selected bin is above the mid price with no straddle', () => {
    expect(classifyDepositRatioMode(BINS_MIN, BINS_MAX, 2, 5, MID)).toEqual({ kind: 'asset-only' })
    // A single bin fully above price, alone, is also asset-only (nothing to lock).
    expect(classifyDepositRatioMode(BINS_MIN, BINS_MAX, 3, 3, MID)).toEqual({ kind: 'asset-only' })
  })

  it('is one-sided (currency-only) when every selected bin is below the mid price with no straddle', () => {
    expect(classifyDepositRatioMode(BINS_MIN, BINS_MAX, 0, 0, MID)).toEqual({
      kind: 'currency-only'
    })
  })

  it('locks to the tick ratio when the straddling bin is included but only one side has full bins', () => {
    // Many currency bins below (0,1) + the straddling bin (2) at index... adjust indices:
    // bins 0,1 are below price (both < 0.1 boundary at index1 which is straddle at idx1).
    // Use a range where bin 0 (below) + bin1 (straddle) only — no bins above.
    expect(classifyDepositRatioMode(BINS_MIN, BINS_MAX, 0, 1, MID)).toEqual({
      kind: 'tick',
      bin: { from: 0.1, to: 0.2 }
    })
    // Straddle + one bin above, nothing below.
    expect(classifyDepositRatioMode(BINS_MIN, BINS_MAX, 1, 2, MID)).toEqual({
      kind: 'tick',
      bin: { from: 0.1, to: 0.2 }
    })
  })

  it('falls back to price for unusable input instead of throwing', () => {
    expect(classifyDepositRatioMode(BINS_MIN, BINS_MAX, 0, 2, 0)).toEqual({ kind: 'price' })
    expect(classifyDepositRatioMode(BINS_MIN, BINS_MAX, 0, 2, Number.NaN)).toEqual({
      kind: 'price'
    })
    expect(classifyDepositRatioMode(BINS_MIN, BINS_MAX, 2, 0, MID)).toEqual({ kind: 'price' })
    expect(classifyDepositRatioMode(BINS_MIN, BINS_MAX, 0, 999, MID)).toEqual({ kind: 'price' })
    expect(classifyDepositRatioMode([], [], 0, 0, MID)).toEqual({ kind: 'price' })
  })
})

describe('tickRatioFor', () => {
  it('gives a bin near its low edge mostly asset, not the midPrice-implied 1:price ratio', () => {
    // Regression for the reported arbitrage bug: as price approaches a bin's LOW edge
    // a Uniswap-v3-style position becomes dominated by the asset side (at price ===
    // pMin it would be 100% asset, 0% currency). Bin [0.1, 0.2] at price 0.12 sits
    // close to its low edge, so it needs much MORE asset relative to currency than a
    // naive `currency = asset * 0.12` would imply (which would overstate the currency
    // requirement, i.e. demand vote/asset be matched almost 1:1 with currency+8%,
    // when the bin can barely absorb any currency at all this close to its floor).
    const { asset, currency } = tickRatioFor({ from: 0.1, to: 0.2 }, 0.12)
    expect(asset).toBeGreaterThan(0)
    expect(currency).toBeGreaterThan(0)
    const naiveCurrencyForThisAsset = asset * 0.12
    expect(currency).toBeLessThan(naiveCurrencyForThisAsset)
    // Concretely: this bin needs roughly 20x more asset than currency, not ~8x currency
    // per unit asset as `currency = asset * 0.12` would suggest.
    expect(asset / currency).toBeGreaterThan(15)
  })

  it('matches the closed-form Uniswap v3 segment amounts', () => {
    const L = 1
    const P = 100
    const { asset, currency } = tickRatioFor({ from: 80, to: 125 }, P)
    expect(asset).toBeCloseTo(L * (1 / Math.sqrt(100) - 1 / Math.sqrt(125)), 9)
    expect(currency).toBeCloseTo(L * (Math.sqrt(100) - Math.sqrt(80)), 9)
  })

  it('is symmetric: a bin centered on price needs both sides in a sensible ratio', () => {
    const { asset, currency } = tickRatioFor({ from: 0.09, to: 0.11 }, 0.1)
    expect(asset).toBeGreaterThan(0)
    expect(currency).toBeGreaterThan(0)
  })
})
