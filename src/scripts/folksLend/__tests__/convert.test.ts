import { describe, expect, it } from 'vitest'
import {
  ONE_14_DP,
  calcFAssetReceived,
  calcFolksLendReceived,
  calcUnderlyingReceived,
  exchangeRate,
  formatBaseUnits,
  fromBaseUnits,
  toBaseUnits
} from '@/scripts/folksLend/convert'

describe('fToken maths', () => {
  it('converts 1:1 at index 1.0', () => {
    expect(calcFAssetReceived(1_000_000n, ONE_14_DP)).toBe(1_000_000n)
    expect(calcUnderlyingReceived(1_000_000n, ONE_14_DP)).toBe(1_000_000n)
  })

  it('gives fewer fTokens and more USDC back at index 1.25', () => {
    const index = (ONE_14_DP * 125n) / 100n
    expect(calcFAssetReceived(1_250_000n, index)).toBe(1_000_000n)
    expect(calcUnderlyingReceived(1_000_000n, index)).toBe(1_250_000n)
  })

  it('floors: a round trip never returns more than was deposited', () => {
    const index = ONE_14_DP + 12_345_678_901n
    for (const amount of [1n, 7n, 999_999n, 123_456_789n, 9_007_199_254_740_993n]) {
      const f = calcFAssetReceived(amount, index)
      expect(calcUnderlyingReceived(f, index) <= amount).toBe(true)
    }
  })

  it('dispatches by direction', () => {
    const index = ONE_14_DP * 2n
    expect(calcFolksLendReceived('deposit', 100n, index)).toBe(50n)
    expect(calcFolksLendReceived('withdraw', 100n, index)).toBe(200n)
  })

  it('rejects a non-positive index', () => {
    expect(() => calcFAssetReceived(1n, 0n)).toThrow()
    expect(() => calcUnderlyingReceived(1n, -1n)).toThrow()
  })

  it('exposes the rate as USDC per fUSDC', () => {
    expect(exchangeRate((ONE_14_DP * 105n) / 100n)).toBeCloseTo(1.05, 10)
  })
})

describe('base unit conversion', () => {
  it('avoids float artefacts', () => {
    expect(toBaseUnits(0.1 + 0.2, 6)).toBe(300_000n)
    expect(toBaseUnits(1.234567, 6)).toBe(1_234_567n)
    expect(toBaseUnits(12, 6)).toBe(12_000_000n)
    expect(toBaseUnits(0.000001, 6)).toBe(1n)
  })

  it('treats a missing, invalid or non-positive input as zero', () => {
    for (const value of [null, undefined, 0, -5, NaN, Infinity, -Infinity]) {
      expect(toBaseUnits(value, 6)).toBe(0n)
    }
  })

  it('round-trips a balance through the number field', () => {
    for (const base of [1n, 999_999n, 1_000_000n, 123_456_789_012n, 4_999_999_999_999_999n]) {
      expect(toBaseUnits(fromBaseUnits(base, 6), 6)).toBe(base)
    }
  })

  it('formats base units exactly', () => {
    expect(formatBaseUnits(0n, 6)).toBe('0')
    expect(formatBaseUnits(1n, 6)).toBe('0.000001')
    expect(formatBaseUnits(1_500_000n, 6)).toBe('1.5')
    expect(formatBaseUnits(12_000_000n, 6)).toBe('12')
    expect(formatBaseUnits(9_007_199_254_740_993_123_456n, 6)).toBe('9007199254740993.123456')
    expect(formatBaseUnits(-1_250_000n, 6)).toBe('-1.25')
    expect(formatBaseUnits(42n, 0)).toBe('42')
  })
})
