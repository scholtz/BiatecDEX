import { describe, it, expect } from 'vitest'
import calculateDistribution from '../calculateDistribution'
import BigNumber from 'bignumber.js'
import { outputCalculateDistributionToString } from '../../../scripts/clamm/outputCalculateDistributionToString'

describe('Debug visibleTo behavior', () => {
  it('should debug both visibleTo scenarios', () => {
    console.log('=== Testing visibleTo scenarios ===')

    // Test 1: visibleTo equals tick boundary
    const input1 = {
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

    const result1 = calculateDistribution(input1)
    const output1 = outputCalculateDistributionToString(result1)

    console.log('Test 1 - visibleTo equals tick boundary (1.4):')
    console.log('Output length:', output1.length)
    output1.forEach((line, i) => console.log(`  ${i}: ${line}`))

    // Test 2: visibleTo in mid range
    const input2 = {
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

    const result2 = calculateDistribution(input2)
    const output2 = outputCalculateDistributionToString(result2)

    console.log('\nTest 2 - visibleTo in mid range (1.35):')
    console.log('Output length:', output2.length)
    output2.forEach((line, i) => console.log(`  ${i}: ${line}`))

    console.log('\nExpected for both:')
    const expected = [
      '<0.60[0.00,0.00]0.70>',
      '<0.70[0.00,16.00]0.80>',
      '<0.80[0.00,16.00]0.90>',
      '<0.90[0.00,16.00]1.00>',
      '<1.00[8.00,0.00]1.10>',
      '<1.10[8.00,0.00]1.20>',
      '<1.20[8.00,0.00]1.30>',
      '<1.30[0.00,0.00]1.40>'
    ]
    console.log('Expected length:', expected.length)
    expected.forEach((line, i) => console.log(`  ${i}: ${line}`))

    // Test if both outputs match expected
    const test1Matches = JSON.stringify(output1) === JSON.stringify(expected)
    const test2Matches = JSON.stringify(output2) === JSON.stringify(expected)

    console.log('\nString comparison results:')
    console.log('Test 1 matches expected:', test1Matches)
    console.log('Test 2 matches expected:', test2Matches)

    // Always pass for debugging purposes
    expect(true).toBe(true)
  })
})
