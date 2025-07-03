import { describe, it, expect } from 'vitest'
import calculateDistribution from '../calculateDistribution'
import BigNumber from 'bignumber.js'
import { outputCalculateDistributionToString } from '../../../scripts/clamm/outputCalculateDistributionToString'

describe('Focused visibleTo tests', () => {
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
    const output = outputCalculateDistributionToString(result)

    console.log('Test 1 - visibleTo equals high tick value (1.4):')
    output.forEach((line, i) => console.log(`${i}: ${line}`))

    expect(output).toEqual([
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
    const output = outputCalculateDistributionToString(result)

    console.log('Test 2 - visibleTo in mid range (1.35):')
    output.forEach((line, i) => console.log(`${i}: ${line}`))

    expect(output).toEqual([
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
})
