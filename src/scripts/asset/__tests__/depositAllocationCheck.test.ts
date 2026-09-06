import { describe, expect, it } from 'vitest'
import BigNumber from 'bignumber.js'
import calculateDistribution from '../calculateDistribution'
import { checkDepositAllocation, rangeSideOfMidPrice } from '../depositAllocationCheck'

// The VOTE/GD report: 10000 VOTE + 0 GD into 0.02 - 0.022 while the (stale) mid
// price says 0.024. Every bucket ends up empty and the old submit loop did nothing.
const voteGdPlan = (midPrice: number, asset: number, currency: number) =>
  calculateDistribution({
    type: 'focused',
    visibleFrom: new BigNumber(0.01),
    visibleTo: new BigNumber(0.05),
    midPrice: new BigNumber(midPrice),
    lowPrice: new BigNumber(0.02),
    highPrice: new BigNumber(0.022),
    depositAssetAmount: new BigNumber(asset),
    depositCurrencyAmount: new BigNumber(currency),
    precision: new BigNumber(1)
  })

describe('rangeSideOfMidPrice', () => {
  it('classifies the range against the mid price', () => {
    expect(rangeSideOfMidPrice(0.024, 0.02, 0.022)).toBe('below')
    expect(rangeSideOfMidPrice(0.019, 0.02, 0.022)).toBe('above')
    expect(rangeSideOfMidPrice(0.021, 0.02, 0.022)).toBe('spanning')
    expect(rangeSideOfMidPrice(0, 0.02, 0.022)).toBe('spanning')
    expect(rangeSideOfMidPrice(NaN, 0.02, 0.022)).toBe('spanning')
  })
})

describe('checkDepositAllocation', () => {
  it('refuses the reported scenario: asset-only deposit into a range below the mid price', () => {
    const distribution = voteGdPlan(0.024, 10000, 0)
    const result = checkDepositAllocation({
      distribution,
      depositAssetAmount: 10000,
      depositCurrencyAmount: 0,
      midPrice: 0.024,
      lowPrice: 0.02,
      highPrice: 0.022
    })
    expect(result).toEqual({ ok: false, reason: 'nothing-to-deposit', side: 'below' })
  })

  it('accepts the same deposit once the mid price is corrected below the range', () => {
    const distribution = voteGdPlan(0.019, 10000, 0)
    const result = checkDepositAllocation({
      distribution,
      depositAssetAmount: 10000,
      depositCurrencyAmount: 0,
      midPrice: 0.019,
      lowPrice: 0.02,
      highPrice: 0.022
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.side).toBe('above')
      expect(result.assetAllocated).toBeCloseTo(10000, 6)
      expect(result.currencyAllocated).toBe(0)
      expect(result.bucketCount).toBeGreaterThan(0)
    }
  })

  it('refuses when both deposits are zero', () => {
    const distribution = voteGdPlan(0.019, 0, 0)
    expect(
      checkDepositAllocation({
        distribution,
        depositAssetAmount: 0,
        depositCurrencyAmount: 0,
        midPrice: 0.019,
        lowPrice: 0.02,
        highPrice: 0.022
      })
    ).toEqual({ ok: false, reason: 'no-deposit', side: 'above' })
  })

  it('refuses instead of silently dropping the currency when the range is above the price', () => {
    const distribution = voteGdPlan(0.019, 10000, 5)
    expect(
      checkDepositAllocation({
        distribution,
        depositAssetAmount: 10000,
        depositCurrencyAmount: 5,
        midPrice: 0.019,
        lowPrice: 0.02,
        highPrice: 0.022
      })
    ).toEqual({ ok: false, reason: 'currency-unused', side: 'above' })
  })

  it('refuses instead of silently dropping the asset when the range is below the price', () => {
    const distribution = voteGdPlan(0.024, 10000, 5)
    expect(
      checkDepositAllocation({
        distribution,
        depositAssetAmount: 10000,
        depositCurrencyAmount: 5,
        midPrice: 0.024,
        lowPrice: 0.02,
        highPrice: 0.022
      })
    ).toEqual({ ok: false, reason: 'asset-unused', side: 'below' })
  })

  it('accepts a two-sided deposit spanning the mid price', () => {
    const distribution = voteGdPlan(0.021, 10000, 5)
    const result = checkDepositAllocation({
      distribution,
      depositAssetAmount: 10000,
      depositCurrencyAmount: 5,
      midPrice: 0.021,
      lowPrice: 0.02,
      highPrice: 0.022
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.side).toBe('spanning')
      expect(result.assetAllocated).toBeCloseTo(10000, 6)
      expect(result.currencyAllocated).toBeCloseTo(5, 6)
    }
  })

  it('treats NaN bucket amounts as zero', () => {
    const result = checkDepositAllocation({
      distribution: { asset1: [new BigNumber(NaN)], asset2: [new BigNumber(NaN)] },
      depositAssetAmount: 1,
      depositCurrencyAmount: 0,
      midPrice: 1,
      lowPrice: 2,
      highPrice: 3
    })
    expect(result).toEqual({ ok: false, reason: 'nothing-to-deposit', side: 'above' })
  })
})
