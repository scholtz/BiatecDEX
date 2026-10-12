import { describe, expect, it } from 'vitest'
import { estimateWithdrawal, usdValue, type WithdrawPoolState } from '../withdrawEstimate'

const pool = (over: Partial<WithdrawPoolState> = {}): WithdrawPoolState => ({
  assetABalance: 1_000_000_000_000n, // 1000 A in base scale
  assetBBalance: 2_000_000_000_000n, // 2000 B
  currentLiquidity: 4_000_000_000_000n,
  releasedLiquidity: 4_000_000_000_000n,
  liquidityUsersFromFees: 0n,
  ...over
})

describe('estimateWithdrawal', () => {
  it('pays the pro-rata share of both assets in asset decimals', () => {
    // 1 000 000 LP (= 1.0 token, 6 dec) -> 1e9 base liquidity = 1/4000 of the pool.
    const r = estimateWithdrawal(1_000_000n, pool(), 6, 6)
    expect(r.amountA).toBe(250_000n) // 0.25 A
    expect(r.amountB).toBe(500_000n) // 0.5 B
  })

  it('adds the sender share of the fee liquidity', () => {
    const r = estimateWithdrawal(
      1_000_000n,
      pool({ liquidityUsersFromFees: 400_000_000_000n }),
      6,
      6
    )
    // fee share = 4e11 * 1e9 / 4e12 = 1e8 -> 1.1e9 liquidity
    expect(r.amountA).toBe(275_000n)
    expect(r.amountB).toBe(550_000n)
  })

  it('floors to the asset decimals', () => {
    const r = estimateWithdrawal(1n, pool({ currentLiquidity: 3_000_000_000_000n }), 0, 0)
    expect(r).toEqual({ amountA: 0n, amountB: 0n })
  })

  it('returns zero for nothing to withdraw or an empty pool', () => {
    expect(estimateWithdrawal(0n, pool(), 6, 6)).toEqual({ amountA: 0n, amountB: 0n })
    expect(estimateWithdrawal(5n, pool({ currentLiquidity: 0n }), 6, 6)).toEqual({
      amountA: 0n,
      amountB: 0n
    })
  })

  it('rejects decimals the 9-decimal base scale cannot express', () => {
    expect(() => estimateWithdrawal(1n, pool(), 18, 6)).toThrow(RangeError)
    expect(() => estimateWithdrawal(1n, pool(), 6, -1)).toThrow(RangeError)
    expect(() => estimateWithdrawal(1n, pool(), 6, 1.5)).toThrow(RangeError)
  })

  it('ignores fee liquidity when nothing is released', () => {
    const r = estimateWithdrawal(
      1_000_000n,
      pool({ releasedLiquidity: 0n, liquidityUsersFromFees: 1n }),
      6,
      6
    )
    expect(r.amountA).toBe(250_000n)
  })
})

describe('usdValue', () => {
  it('values smallest units by price', () => {
    expect(usdValue(2_500_000n, 6, 2)).toBe(5)
  })
  it('is null without a usable price', () => {
    expect(usdValue(1n, 6, null)).toBeNull()
    expect(usdValue(1n, 6, 0)).toBeNull()
    expect(usdValue(1n, 6, NaN)).toBeNull()
  })
})
