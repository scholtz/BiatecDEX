import { describe, expect, it } from 'vitest'
import { mostUsedLpFee, type FeeSample } from '../feeTierStats'

const TIERS = [100_000n, 1_000_000n, 2_000_000n, 3_000_000n, 10_000_000n] as const
const s = (fee: bigint, tvlUsd: number, low = 1, high = 2): FeeSample => ({
  low,
  high,
  fee,
  tvlUsd
})

describe('mostUsedLpFee', () => {
  it('ranks by summed TVL first', () => {
    const samples = [s(1_000_000n, 5), s(1_000_000n, 5), s(3_000_000n, 100)]
    expect(mostUsedLpFee(samples, TIERS)).toBe(3_000_000n)
  })

  it('falls back to pool count when TVL is unknown, then to tier order', () => {
    expect(mostUsedLpFee([s(3_000_000n, 0), s(1_000_000n, 0), s(1_000_000n, 0)], TIERS)).toBe(
      1_000_000n
    )
    expect(mostUsedLpFee([s(3_000_000n, 0), s(1_000_000n, 0)], TIERS)).toBe(1_000_000n)
  })

  it('prefers the fees of pools in the given width, falling back to all pools', () => {
    const samples = [s(1_000_000n, 1, 1, 2), s(3_000_000n, 50, 1, 1)]
    const inWidth = (x: FeeSample) => x.high > x.low
    expect(mostUsedLpFee(samples, TIERS, inWidth)).toBe(1_000_000n)
    expect(mostUsedLpFee(samples, TIERS, () => false)).toBe(3_000_000n)
  })

  it('ignores fees that are not a supported tier and returns null when nothing is left', () => {
    expect(mostUsedLpFee([s(123n, 999)], TIERS)).toBeNull()
    expect(mostUsedLpFee([], TIERS)).toBeNull()
    expect(mostUsedLpFee([s(1_000_000n, Number.NaN)], TIERS)).toBe(1_000_000n)
  })
})
