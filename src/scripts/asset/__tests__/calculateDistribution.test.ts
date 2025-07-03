import { describe, it, expect } from 'vitest'
import calculateDistribution from '../calculateDistribution'
import BigNumber from 'bignumber.js'
import { outputCalculateDistributionToString } from '../../../scripts/clamm/outputCalculateDistributionToString'

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

    expect(outputCalculateDistributionToString(result)).toStrictEqual([
      '<0.18[0.00,0.00]0.20>',
      '<0.20[0.00,0.00]0.22>',
      '<0.22[0.00,0.00]0.24>',
      '<0.24[0.00,0.00]0.27>',
      '<0.27[0.00,0.00]0.30>',
      '<0.30[0.00,0.00]0.33>',
      '<0.33[0.00,0.00]0.36>',
      '<0.36[0.00,0.00]0.40>',
      '<0.40[0.00,0.00]0.44>',
      '<0.44[0.00,0.00]0.50>',
      '<0.50[0.00,0.00]0.60>',
      '<0.60[0.00,0.00]0.70>',
      '<0.70[0.00,0.00]0.80>',
      '<0.80[0.00,0.00]0.90>',
      '<0.90[100.00,100.00]1.00>',
      '<1.00[0.00,0.00]1.10>',
      '<1.10[0.00,0.00]1.20>',
      '<1.20[0.00,0.00]1.30>',
      '<1.30[0.00,0.00]1.40>',
      '<1.40[0.00,0.00]1.60>',
      '<1.60[0.00,0.00]1.80>',
      '<1.80[0.00,0.00]2.00>',
      '<2.00[0.00,0.00]2.20>',
      '<2.20[0.00,0.00]2.40>',
      '<2.40[0.00,0.00]2.70>',
      '<2.70[0.00,0.00]3.00>',
      '<3.00[0.00,0.00]3.30>',
      '<3.30[0.00,0.00]3.60>',
      '<3.60[0.00,0.00]4.00>',
      '<4.00[0.00,0.00]4.40>',
      '<4.40[0.00,0.00]4.80>'
    ])
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
      '<0.50[0.00,0.00]0.60>',
      '<0.60[0.00,0.00]0.70>',
      '<0.70[0.00,0.00]0.80>',
      '<0.80[0.00,25.00]0.90>',
      '<0.90[0.00,25.00]1.00>',
      '<1.00[25.00,0.00]1.10>',
      '<1.10[25.00,0.00]1.20>',
      '<1.20[0.00,0.00]1.30>',
      '<1.30[0.00,0.00]1.40>',
      '<1.40[0.00,0.00]1.60>'
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
      '<0.60[0.00,0.00]0.70>',
      '<0.70[0.00,16.00]0.80>',
      '<0.80[0.00,16.00]0.90>',
      '<0.90[0.00,16.00]1.00>',
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
    expect(outputCalculateDistributionToString(result)).toStrictEqual([
      '<0.60[0.00,0.00]0.70>',
      '<0.70[0.00,16.00]0.80>',
      '<0.80[0.00,16.00]0.90>',
      '<0.90[0.00,16.00]1.00>',
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

    const result = calculateDistribution(input)
    expect(outputCalculateDistributionToString(result)).toStrictEqual([
      '<0.50[0.00,0.00]0.60>',
      '<0.60[0.00,0.00]0.70>',
      '<0.70[0.00,0.00]0.80>',
      '<0.80[0.00,0.00]0.90>',
      '<0.90[0.00,100.00]1.00>',
      '<1.00[100.00,0.00]1.10>',
      '<1.10[0.00,0.00]1.20>',
      '<1.20[0.00,0.00]1.30>',
      '<1.30[0.00,0.00]1.40>',
      '<1.40[0.00,0.00]1.60>'
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

    const result = calculateDistribution(input)
    expect(outputCalculateDistributionToString(result)).toStrictEqual([
      '<0.50[0.00,0.00]0.60>',
      '<0.60[0.00,0.00]0.70>',
      '<0.70[0.00,0.00]0.80>',
      '<0.80[0.00,0.00]0.90>',
      '<0.90[0.00,100.00]1.00>',
      '<1.00[100.00,0.00]1.10>',
      '<1.10[0.00,0.00]1.20>',
      '<1.20[0.00,0.00]1.30>',
      '<1.30[0.00,0.00]1.40>',
      '<1.40[0.00,0.00]1.60>'
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
    expect(outputCalculateDistributionToString(result)).toStrictEqual([
      '<0.10[0.00,0.00]0.11>',
      '<0.11[0.00,0.00]0.12>',
      '<0.12[0.00,0.00]0.13>',
      '<0.13[0.00,0.00]0.14>',
      '<0.14[0.00,0.00]0.16>',
      '<0.16[0.00,0.00]0.18>',
      '<0.18[0.00,0.00]0.20>',
      '<0.20[0.00,0.00]0.22>',
      '<0.22[0.00,0.00]0.24>',
      '<0.24[0.00,0.00]0.27>',
      '<0.27[0.00,0.00]0.30>',
      '<0.30[0.00,0.00]0.33>',
      '<0.33[0.00,0.00]0.36>',
      '<0.36[0.00,0.00]0.40>',
      '<0.40[0.00,0.00]0.44>',
      '<0.44[0.00,0.00]0.50>',
      '<0.50[0.00,0.00]0.60>',
      '<0.60[0.00,0.00]0.70>',
      '<0.70[0.00,0.00]0.80>',
      '<0.80[0.00,0.00]0.90>',
      '<0.90[0.00,100.00]1.00>',
      '<1.00[100.00,0.00]1.10>',
      '<1.10[0.00,0.00]1.20>',
      '<1.20[0.00,0.00]1.30>',
      '<1.30[0.00,0.00]1.40>',
      '<1.40[0.00,0.00]1.60>',
      '<1.60[0.00,0.00]1.80>',
      '<1.80[0.00,0.00]2.00>'
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
      '<0.50[0.00,0.00]0.60>',
      '<0.60[0.00,0.00]0.70>',
      '<0.70[0.00,0.00]0.80>',
      '<0.80[0.00,0.00]0.90>',
      '<0.90[0.00,0.00]1.00>',
      '<1.00[0.00,0.00]1.10>',
      '<1.10[0.00,0.00]1.20>',
      '<1.20[0.00,0.00]1.30>',
      '<1.30[0.00,0.00]1.40>',
      '<1.40[0.00,0.00]1.60>'
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
    expect(outputCalculateDistributionToString(result)).toStrictEqual([
      '<0.50[0.00,0.00]0.60>',
      '<0.60[0.00,0.00]0.70>',
      '<0.70[0.00,0.00]0.80>',
      '<0.80[0.00,0.00]0.90>',
      '<0.90[0.00,0.00]1.00>',
      '<1.00[0.00,0.00]1.10>',
      '<1.10[0.00,0.00]1.20>',
      '<1.20[0.00,0.00]1.30>',
      '<1.30[0.00,0.00]1.40>',
      '<1.40[0.00,0.00]1.60>'
    ])
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
      '<0.50[0.00,0.00]0.60>',
      '<0.60[0.00,0.00]0.70>',
      '<0.70[0.00,0.00]0.80>',
      '<0.80[0.00,50.00]0.90>',
      '<0.90[0.00,50.00]1.00>',
      '<1.00[50.00,0.00]1.10>',
      '<1.10[50.00,0.00]1.20>',
      '<1.20[0.00,0.00]1.30>',
      '<1.30[0.00,0.00]1.40>',
      '<1.40[0.00,0.00]1.60>'
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
    expect(outputCalculateDistributionToString(result)).toStrictEqual([
      '<0.18[0.00,0.00]0.20>',
      '<0.20[0.00,0.00]0.22>',
      '<0.22[0.00,0.00]0.24>',
      '<0.24[0.00,0.00]0.27>',
      '<0.27[0.00,0.00]0.30>',
      '<0.30[0.00,0.00]0.33>',
      '<0.33[0.00,0.00]0.36>',
      '<0.36[0.00,0.00]0.40>',
      '<0.40[0.00,0.00]0.44>',
      '<0.44[0.00,0.00]0.50>',
      '<0.50[0.00,0.00]0.60>',
      '<0.60[0.00,0.00]0.70>',
      '<0.70[0.00,0.00]0.80>',
      '<0.80[0.00,0.00]0.90>',
      '<0.90[100.00,100.00]1.00>',
      '<1.00[0.00,0.00]1.10>',
      '<1.10[0.00,0.00]1.20>',
      '<1.20[0.00,0.00]1.30>',
      '<1.30[0.00,0.00]1.40>',
      '<1.40[0.00,0.00]1.60>',
      '<1.60[0.00,0.00]1.80>',
      '<1.80[0.00,0.00]2.00>',
      '<2.00[0.00,0.00]2.20>',
      '<2.20[0.00,0.00]2.40>',
      '<2.40[0.00,0.00]2.70>',
      '<2.70[0.00,0.00]3.00>',
      '<3.00[0.00,0.00]3.30>',
      '<3.30[0.00,0.00]3.60>',
      '<3.60[0.00,0.00]4.00>',
      '<4.00[0.00,0.00]4.40>',
      '<4.40[0.00,0.00]4.80>'
    ])
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
    expect(outputCalculateDistributionToString(result, 4)).toStrictEqual([
      '<0.0013[0.0000,0.0000]0.0013>',
      '<0.0013[0.0000,0.0000]0.0013>',
      '<0.0013[0.0000,0.0000]0.0013>',
      '<0.0013[0.0000,0.0000]0.0013>',
      '<0.0013[0.0000,0.0000]0.0014>',
      '<0.0014[0.0000,0.0000]0.0014>',
      '<0.0014[0.0000,0.0000]0.0014>',
      '<0.0014[0.0000,0.0000]0.0014>',
      '<0.0014[0.0000,0.0000]0.0014>',
      '<0.0014[0.0000,0.0000]0.0014>',
      '<0.0014[0.0000,100.0000]0.0014>',
      '<0.0014[0.0000,100.0000]0.0014>',
      '<0.0014[0.0000,100.0000]0.0014>',
      '<0.0014[0.0000,100.0000]0.0014>',
      '<0.0014[0.0000,100.0000]0.0015>',
      '<0.0015[0.0000,100.0000]0.0015>',
      '<0.0015[0.0000,100.0000]0.0015>',
      '<0.0015[0.0000,100.0000]0.0015>',
      '<0.0015[0.0000,100.0000]0.0015>',
      '<0.0015[0.0000,100.0000]0.0015>',
      '<0.0015[200.0000,0.0000]0.0015>',
      '<0.0015[200.0000,0.0000]0.0015>',
      '<0.0015[200.0000,0.0000]0.0016>',
      '<0.0016[200.0000,0.0000]0.0016>',
      '<0.0016[200.0000,0.0000]0.0016>',
      '<0.0016[0.0000,0.0000]0.0016>',
      '<0.0016[0.0000,0.0000]0.0016>',
      '<0.0016[0.0000,0.0000]0.0017>',
      '<0.0017[0.0000,0.0000]0.0017>',
      '<0.0017[0.0000,0.0000]0.0017>'
    ])
  })
})
