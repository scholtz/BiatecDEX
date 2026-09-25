import { describe, it, expect } from 'vitest'
import calculateDistribution from '../calculateDistribution'
import BigNumber from 'bignumber.js'
import { tickGridBoundaries } from 'biatec-concentrated-liquidity-amm'
import { outputCalculateDistributionToString } from '../../../scripts/clamm/outputCalculateDistributionToString'

// Bins are the canonical grid of the shared package (see the tick section of
// CLAUDE.md): at precision 1 ("normal") every decade is split at 1/2/5 and each
// segment into `anchor * 10^(k-1)` wide bins — 0.5, 0.55, …, 1, 1.1, …, 2, 2.2, ….
// Output lines read `<from[asset,currency]to>`.

const sum = (values: BigNumber[]) => values.reduce((acc, v) => acc.plus(v), new BigNumber(0))

describe('calculateDistribution', () => {
  it('should allocate both assets to range spanning midPrice', () => {
    const input = {
      type: 'focused' as const,
      visibleFrom: new BigNumber('0.18555136240000003'),
      visibleTo: new BigNumber('4.63878406'),
      midPrice: new BigNumber('0.927756812'),
      lowPrice: new BigNumber('0.9'),
      highPrice: new BigNumber('1'),
      depositAssetAmount: new BigNumber('100'),
      depositCurrencyAmount: new BigNumber('100'),
      precision: new BigNumber('1')
    }

    const result = calculateDistribution(input)

    // The bins are exactly the canonical grid over the window: 0.18, 0.19, 0.2,
    // 0.22, … 0.5, 0.55, … 1, 1.1, … 2, 2.2, … 4.8 (51 bins).
    const expected = tickGridBoundaries(0.18555136240000003, 4.63878406, 1)
    expect(result.min.map((v) => v.toNumber())).toEqual(expected.slice(0, -1))
    expect(result.max.map((v) => v.toNumber())).toEqual(expected.slice(1))
    expect(result.min).toHaveLength(51)
    expect(result.min[0].toNumber()).toBe(0.18)
    expect(result.max[result.max.length - 1].toNumber()).toBe(4.8)

    // Only the two bins overlapping [0.9, 1] receive deposits. [0.9, 0.95] spans the
    // mid price 0.9278: its currency share is (0.9278 - 0.9) / 0.05 of the currency
    // multiplier and its asset share (0.95 - 0.9278) / 0.05 of the asset multiplier;
    // the focused shape then divides the asset multiplier by 1.2 for [0.95, 1].
    const bin09 = result.min.findIndex((v) => v.eq(0.9))
    const bin095 = result.min.findIndex((v) => v.eq(0.95))
    expect(result.asset1[bin09].toNumber()).toBeCloseTo(34.8, 1)
    expect(result.asset1[bin095].toNumber()).toBeCloseTo(65.2, 1)
    expect(result.asset2[bin09].toNumber()).toBeCloseTo(100, 6)
    expect(result.asset2[bin095].toNumber()).toBe(0)
    expect(sum(result.asset1).toNumber()).toBeCloseTo(100, 6)
    expect(sum(result.asset2).toNumber()).toBeCloseTo(100, 6)
    result.min.forEach((from, i) => {
      if (i !== bin09 && i !== bin095) {
        expect(result.asset1[i].toNumber(), `asset at ${from}`).toBe(0)
        expect(result.asset2[i].toNumber(), `currency at ${from}`).toBe(0)
      }
    })
  })

  it('should handle equal distribution type', () => {
    const input = {
      type: 'equal' as const,
      visibleFrom: new BigNumber('0.5'),
      visibleTo: new BigNumber('1.5'),
      midPrice: new BigNumber('1.0'),
      lowPrice: new BigNumber('0.8'),
      highPrice: new BigNumber('1.2'),
      depositAssetAmount: new BigNumber('50'),
      depositCurrencyAmount: new BigNumber('50'),
      precision: new BigNumber('1')
    }

    const result = calculateDistribution(input)
    expect(outputCalculateDistributionToString(result)).toStrictEqual([
      '<0.50[0.00,0.00]0.55>',
      '<0.55[0.00,0.00]0.60>',
      '<0.60[0.00,0.00]0.65>',
      '<0.65[0.00,0.00]0.70>',
      '<0.70[0.00,0.00]0.75>',
      '<0.75[0.00,0.00]0.80>',
      '<0.80[0.00,12.50]0.85>',
      '<0.85[0.00,12.50]0.90>',
      '<0.90[0.00,12.50]0.95>',
      '<0.95[0.00,12.50]1.00>',
      '<1.00[25.00,0.00]1.10>',
      '<1.10[25.00,0.00]1.20>',
      '<1.20[0.00,0.00]1.30>',
      '<1.30[0.00,0.00]1.40>',
      '<1.40[0.00,0.00]1.50>'
    ])
  })

  it('no tick after visibleTo when visibleTo is equal to high tick value', () => {
    const input = {
      type: 'equal' as const,
      visibleFrom: new BigNumber('0.6'),
      visibleTo: new BigNumber('1.4'),
      lowPrice: new BigNumber('0.7'),
      midPrice: new BigNumber('1.0'),
      highPrice: new BigNumber('1.3'),
      depositAssetAmount: new BigNumber('24'),
      depositCurrencyAmount: new BigNumber('48'),
      precision: new BigNumber('1')
    }

    const result = calculateDistribution(input)
    expect(outputCalculateDistributionToString(result)).toStrictEqual([
      '<0.60[0.00,0.00]0.65>',
      '<0.65[0.00,0.00]0.70>',
      '<0.70[0.00,8.00]0.75>',
      '<0.75[0.00,8.00]0.80>',
      '<0.80[0.00,8.00]0.85>',
      '<0.85[0.00,8.00]0.90>',
      '<0.90[0.00,8.00]0.95>',
      '<0.95[0.00,8.00]1.00>',
      '<1.00[8.00,0.00]1.10>',
      '<1.10[8.00,0.00]1.20>',
      '<1.20[8.00,0.00]1.30>',
      '<1.30[0.00,0.00]1.40>'
    ])
  })

  it('no tick after visibleTo mid range', () => {
    const input = {
      type: 'equal' as const,
      visibleFrom: new BigNumber('0.6'),
      visibleTo: new BigNumber('1.35'),
      lowPrice: new BigNumber('0.7'),
      midPrice: new BigNumber('1.0'),
      highPrice: new BigNumber('1.3'),
      depositAssetAmount: new BigNumber('24'),
      depositCurrencyAmount: new BigNumber('48'),
      precision: new BigNumber('1')
    }

    const result = calculateDistribution(input)
    // The last bin is the canonical bin containing visibleTo (1.3 - 1.4), never a
    // truncated partial bin ending at 1.35.
    expect(outputCalculateDistributionToString(result)).toStrictEqual([
      '<0.60[0.00,0.00]0.65>',
      '<0.65[0.00,0.00]0.70>',
      '<0.70[0.00,8.00]0.75>',
      '<0.75[0.00,8.00]0.80>',
      '<0.80[0.00,8.00]0.85>',
      '<0.85[0.00,8.00]0.90>',
      '<0.90[0.00,8.00]0.95>',
      '<0.95[0.00,8.00]1.00>',
      '<1.00[8.00,0.00]1.10>',
      '<1.10[8.00,0.00]1.20>',
      '<1.20[8.00,0.00]1.30>',
      '<1.30[0.00,0.00]1.40>'
    ])
  })

  it('should handle spread distribution type', () => {
    const input = {
      type: 'spread' as const,
      visibleFrom: new BigNumber('0.5'),
      visibleTo: new BigNumber('1.5'),
      midPrice: new BigNumber('1.0'),
      lowPrice: new BigNumber('0.9'),
      highPrice: new BigNumber('1.1'),
      depositAssetAmount: new BigNumber('100'),
      depositCurrencyAmount: new BigNumber('100'),
      precision: new BigNumber('1')
    }

    // Spread: after every bin the asset multiplier grows by 1.3 and the currency
    // multiplier shrinks by 1.3, so of the two currency bins below the mid price the
    // lower one gets 1 : 1/1.3 of the currency (56.52 : 43.48).
    const result = calculateDistribution(input)
    expect(outputCalculateDistributionToString(result)).toStrictEqual([
      '<0.50[0.00,0.00]0.55>',
      '<0.55[0.00,0.00]0.60>',
      '<0.60[0.00,0.00]0.65>',
      '<0.65[0.00,0.00]0.70>',
      '<0.70[0.00,0.00]0.75>',
      '<0.75[0.00,0.00]0.80>',
      '<0.80[0.00,0.00]0.85>',
      '<0.85[0.00,0.00]0.90>',
      '<0.90[0.00,56.52]0.95>',
      '<0.95[0.00,43.48]1.00>',
      '<1.00[100.00,0.00]1.10>',
      '<1.10[0.00,0.00]1.20>',
      '<1.20[0.00,0.00]1.30>',
      '<1.30[0.00,0.00]1.40>',
      '<1.40[0.00,0.00]1.50>'
    ])
  })

  it('should handle focused distribution type with correct multipliers', () => {
    const input = {
      type: 'focused' as const,
      visibleFrom: new BigNumber('0.5'),
      visibleTo: new BigNumber('1.5'),
      midPrice: new BigNumber('1.0'),
      lowPrice: new BigNumber('0.9'),
      highPrice: new BigNumber('1.1'),
      depositAssetAmount: new BigNumber('100'),
      depositCurrencyAmount: new BigNumber('100'),
      precision: new BigNumber('1')
    }

    // Focused: the currency multiplier grows by 1.2 per bin towards the mid price
    // (1 : 1.2 -> 45.45 : 54.55).
    const result = calculateDistribution(input)
    expect(outputCalculateDistributionToString(result)).toStrictEqual([
      '<0.50[0.00,0.00]0.55>',
      '<0.55[0.00,0.00]0.60>',
      '<0.60[0.00,0.00]0.65>',
      '<0.65[0.00,0.00]0.70>',
      '<0.70[0.00,0.00]0.75>',
      '<0.75[0.00,0.00]0.80>',
      '<0.80[0.00,0.00]0.85>',
      '<0.85[0.00,0.00]0.90>',
      '<0.90[0.00,45.45]0.95>',
      '<0.95[0.00,54.55]1.00>',
      '<1.00[100.00,0.00]1.10>',
      '<1.10[0.00,0.00]1.20>',
      '<1.20[0.00,0.00]1.30>',
      '<1.30[0.00,0.00]1.40>',
      '<1.40[0.00,0.00]1.50>'
    ])
  })

  it('should not allocate to ranges outside target range', () => {
    const input = {
      type: 'equal' as const,
      visibleFrom: new BigNumber('0.1'),
      visibleTo: new BigNumber('2.0'),
      midPrice: new BigNumber('1.0'),
      lowPrice: new BigNumber('0.9'),
      highPrice: new BigNumber('1.1'),
      depositAssetAmount: new BigNumber('100'),
      depositCurrencyAmount: new BigNumber('100'),
      precision: new BigNumber('1')
    }

    const result = calculateDistribution(input)
    // 0.1..0.2 by 0.01 (10) + 0.2..0.5 by 0.02 (15) + 0.5..1 by 0.05 (10) + 1..2 by 0.1 (10)
    const expected = tickGridBoundaries(0.1, 2, 1)
    expect(result.min.map((v) => v.toNumber())).toEqual(expected.slice(0, -1))
    expect(result.min).toHaveLength(45)
    const allocated = result.min
      .map((from, i) => ({
        from: from.toNumber(),
        asset: result.asset1[i].toNumber(),
        currency: result.asset2[i].toNumber()
      }))
      .filter((bin) => bin.asset > 0 || bin.currency > 0)
    expect(allocated).toEqual([
      { from: 0.9, asset: 0, currency: 50 },
      { from: 0.95, asset: 0, currency: 50 },
      { from: 1, asset: 100, currency: 0 }
    ])
  })

  it('should handle edge case with zero deposit amounts', () => {
    const input = {
      type: 'equal' as const,
      visibleFrom: new BigNumber('0.5'),
      visibleTo: new BigNumber('1.5'),
      midPrice: new BigNumber('1.0'),
      lowPrice: new BigNumber('0.9'),
      highPrice: new BigNumber('1.1'),
      depositAssetAmount: new BigNumber('0'),
      depositCurrencyAmount: new BigNumber('0'),
      precision: new BigNumber('1')
    }

    const result = calculateDistribution(input)
    expect(outputCalculateDistributionToString(result)).toStrictEqual([
      '<0.50[0.00,0.00]0.55>',
      '<0.55[0.00,0.00]0.60>',
      '<0.60[0.00,0.00]0.65>',
      '<0.65[0.00,0.00]0.70>',
      '<0.70[0.00,0.00]0.75>',
      '<0.75[0.00,0.00]0.80>',
      '<0.80[0.00,0.00]0.85>',
      '<0.85[0.00,0.00]0.90>',
      '<0.90[0.00,0.00]0.95>',
      '<0.95[0.00,0.00]1.00>',
      '<1.00[0.00,0.00]1.10>',
      '<1.10[0.00,0.00]1.20>',
      '<1.20[0.00,0.00]1.30>',
      '<1.30[0.00,0.00]1.40>',
      '<1.40[0.00,0.00]1.50>'
    ])
  })

  it('should handle NaN deposit amounts gracefully', () => {
    const input = {
      type: 'equal' as const,
      visibleFrom: new BigNumber('0.5'),
      visibleTo: new BigNumber('1.5'),
      midPrice: new BigNumber('1.0'),
      lowPrice: new BigNumber('0.9'),
      highPrice: new BigNumber('1.1'),
      depositAssetAmount: new BigNumber(NaN),
      depositCurrencyAmount: new BigNumber(NaN),
      precision: new BigNumber('1')
    }

    const result = calculateDistribution(input)
    expect(result.min).toHaveLength(15)
    expect(result.asset1.every((v) => v.isZero())).toBe(true)
    expect(result.asset2.every((v) => v.isZero())).toBe(true)
  })

  it('should correctly allocate assets based on midPrice position', () => {
    const input = {
      type: 'equal' as const,
      visibleFrom: new BigNumber('0.5'),
      visibleTo: new BigNumber('1.5'),
      midPrice: new BigNumber('1.0'),
      lowPrice: new BigNumber('0.8'),
      highPrice: new BigNumber('1.2'),
      depositAssetAmount: new BigNumber('100'),
      depositCurrencyAmount: new BigNumber('100'),
      precision: new BigNumber('1')
    }

    const result = calculateDistribution(input)
    expect(outputCalculateDistributionToString(result)).toStrictEqual([
      '<0.50[0.00,0.00]0.55>',
      '<0.55[0.00,0.00]0.60>',
      '<0.60[0.00,0.00]0.65>',
      '<0.65[0.00,0.00]0.70>',
      '<0.70[0.00,0.00]0.75>',
      '<0.75[0.00,0.00]0.80>',
      '<0.80[0.00,25.00]0.85>',
      '<0.85[0.00,25.00]0.90>',
      '<0.90[0.00,25.00]0.95>',
      '<0.95[0.00,25.00]1.00>',
      '<1.00[50.00,0.00]1.10>',
      '<1.10[50.00,0.00]1.20>',
      '<1.20[0.00,0.00]1.30>',
      '<1.30[0.00,0.00]1.40>',
      '<1.40[0.00,0.00]1.50>'
    ])
  })

  it('should return consistent array lengths', () => {
    const input = {
      type: 'focused' as const,
      visibleFrom: new BigNumber('0.18555136240000003'),
      visibleTo: new BigNumber('4.63878406'),
      midPrice: new BigNumber('0.927756812'),
      lowPrice: new BigNumber('0.9'),
      highPrice: new BigNumber('1'),
      depositAssetAmount: new BigNumber('100'),
      depositCurrencyAmount: new BigNumber('100'),
      precision: new BigNumber('1')
    }

    const result = calculateDistribution(input)
    expect(result.labels).toHaveLength(51)
    expect(result.min).toHaveLength(51)
    expect(result.max).toHaveLength(51)
    expect(result.asset1).toHaveLength(51)
    expect(result.asset2).toHaveLength(51)
    expect(result.labels[0]).toBe('0.18 - 0.19')
    expect(result.labels[result.labels.length - 1]).toBe('4.6 - 4.8')
  })

  it('should handle high precision values', () => {
    const input = {
      type: 'equal' as const,
      visibleFrom: new BigNumber('0.0013'),
      visibleTo: new BigNumber('0.0017'),
      midPrice: new BigNumber('0.0015'),
      lowPrice: new BigNumber('0.0014'),
      highPrice: new BigNumber('0.0016'),
      depositAssetAmount: new BigNumber('1000'),
      depositCurrencyAmount: new BigNumber('1000'),
      precision: new BigNumber('2')
    }

    const result = calculateDistribution(input)
    // Narrow bins in [0.001, 0.002) are 0.00001 wide: 0.0013, 0.00131, … 0.0017.
    const expected = tickGridBoundaries(0.0013, 0.0017, 2)
    expect(result.min.map((v) => v.toNumber())).toEqual(expected.slice(0, -1))
    expect(result.min).toHaveLength(40)
    expect(result.min[0].toNumber()).toBe(0.0013)
    expect(result.max[result.max.length - 1].toNumber()).toBe(0.0017)
    // [0.0014, 0.0015) -> 10 currency bins of 100; [0.0015, 0.0016) -> 10 asset bins of 100.
    result.min.forEach((from, i) => {
      const value = from.toNumber()
      const inCurrency = value >= 0.0014 - 1e-12 && value < 0.0015 - 1e-12
      const inAsset = value >= 0.0015 - 1e-12 && value < 0.0016 - 1e-12
      expect(result.asset2[i].toNumber(), `currency at ${value}`).toBeCloseTo(
        inCurrency ? 100 : 0,
        9
      )
      expect(result.asset1[i].toNumber(), `asset at ${value}`).toBeCloseTo(inAsset ? 100 : 0, 9)
    })
    expect(sum(result.asset1).toNumber()).toBeCloseTo(1000, 6)
    expect(sum(result.asset2).toNumber()).toBeCloseTo(1000, 6)
  })
})
