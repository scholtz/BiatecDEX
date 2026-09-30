import { describe, expect, it } from 'vitest'
import { clampDepositToBalance } from '../clampDeposit'

describe('clampDepositToBalance', () => {
  it('lowers a deposit that exceeds what the account holds to the balance', () => {
    expect(clampDepositToBalance(500, 120)).toBe(120)
    expect(clampDepositToBalance(120.5, 120)).toBe(120)
  })

  it('leaves a deposit that is within the balance alone', () => {
    expect(clampDepositToBalance(100, 120)).toBe(100)
    expect(clampDepositToBalance(120, 120)).toBe(120)
    expect(clampDepositToBalance(0, 120)).toBe(0)
  })

  it('drops the deposit to 0 when the whole balance was deposited (nothing left)', () => {
    expect(clampDepositToBalance(500, 0)).toBe(0)
  })

  it('tolerates floating point dust (no needless rewrite of an equal amount)', () => {
    const balance = 0.1 + 0.2
    expect(clampDepositToBalance(0.3, balance)).toBe(0.3)
    expect(clampDepositToBalance(balance + 1e-12, balance)).toBe(balance + 1e-12)
  })

  it('never returns a negative or non-finite amount', () => {
    expect(clampDepositToBalance(5, -3)).toBe(0)
    expect(clampDepositToBalance(5, Number.NaN)).toBe(0)
    expect(clampDepositToBalance(Number.NaN, 10)).toBe(0)
    expect(clampDepositToBalance(-2, 10)).toBe(0)
    expect(clampDepositToBalance(Number.POSITIVE_INFINITY, 10)).toBe(10)
  })
})
