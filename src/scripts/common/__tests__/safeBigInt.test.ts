import { describe, expect, it } from 'vitest'
import { tokenAmountToBigInt } from '../safeBigInt'

describe('tokenAmountToBigInt', () => {
  it('scales decimal-exactly', () => {
    expect(tokenAmountToBigInt(0.29, 6)).toBe(290_000n)
    expect(tokenAmountToBigInt(123.456, 6)).toBe(123_456_000n)
    expect(tokenAmountToBigInt(1.0000005, 6)).toBe(1_000_000n)
    expect(tokenAmountToBigInt(1.0000005, 6, false)).toBe(1_000_001n)
  })
})
