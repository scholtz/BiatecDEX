import { describe, expect, it } from 'vitest'
import { MIN_ASSET_TVL_USD, hasMinimumTvl } from '../minTvl'

describe('hasMinimumTvl', () => {
  it('uses a $100 threshold', () => {
    expect(MIN_ASSET_TVL_USD).toBe(100)
  })

  it('hides assets at or below the threshold', () => {
    expect(hasMinimumTvl(0)).toBe(false)
    expect(hasMinimumTvl(99.99)).toBe(false)
    expect(hasMinimumTvl(100)).toBe(false)
  })

  it('shows assets above the threshold', () => {
    expect(hasMinimumTvl(100.01)).toBe(true)
    expect(hasMinimumTvl(1_000_000)).toBe(true)
  })

  it('hides non-finite values', () => {
    expect(hasMinimumTvl(NaN)).toBe(false)
    expect(hasMinimumTvl(-5)).toBe(false)
  })
})
