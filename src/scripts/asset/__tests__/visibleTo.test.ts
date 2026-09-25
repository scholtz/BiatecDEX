import { describe, it, expect } from 'vitest'
import calculateDistribution from '../calculateDistribution'
import BigNumber from 'bignumber.js'
import { outputCalculateDistributionToString } from '../../../scripts/clamm/outputCalculateDistributionToString'

// The last bin of a distribution is always the canonical bin containing
// `visibleTo` — never a truncated partial bin, and never an extra bin after it.
const expected = [
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
]

const inputFor = (visibleTo: string, type: 'equal' | 'focused' = 'equal') => ({
  type,
  visibleFrom: new BigNumber('0.6'),
  visibleTo: new BigNumber(visibleTo),
  lowPrice: new BigNumber('0.7'),
  midPrice: new BigNumber('1.0'),
  highPrice: new BigNumber('1.3'),
  depositAssetAmount: new BigNumber('24'),
  depositCurrencyAmount: new BigNumber('48'),
  precision: new BigNumber('1')
})

describe('No tick after visibleTo tests', () => {
  it('no tick after visibleTo exact match', () => {
    const result = calculateDistribution(inputFor('1.4'))
    expect(outputCalculateDistributionToString(result)).toStrictEqual(expected)
  })

  it('no tick after visibleTo mid range', () => {
    const result = calculateDistribution(inputFor('1.35'))
    expect(outputCalculateDistributionToString(result)).toStrictEqual(expected)
  })

  it('visibleTo just past a boundary adds exactly one more canonical bin', () => {
    const result = calculateDistribution(inputFor('1.41'))
    expect(outputCalculateDistributionToString(result)).toStrictEqual([
      ...expected,
      '<1.40[0.00,0.00]1.50>'
    ])
  })

  it('the bins do not depend on the distribution shape', () => {
    const equal = calculateDistribution(inputFor('1.35', 'equal'))
    const focused = calculateDistribution(inputFor('1.35', 'focused'))
    expect(focused.min.map((v) => v.toNumber())).toEqual(equal.min.map((v) => v.toNumber()))
    expect(focused.max.map((v) => v.toNumber())).toEqual(equal.max.map((v) => v.toNumber()))
  })
})
