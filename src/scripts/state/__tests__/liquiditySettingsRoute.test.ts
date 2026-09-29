import { describe, expect, it } from 'vitest'
import { LP_FEE_TIERS, parseLpFeeParam, parseTickParam } from '../liquiditySettingsRoute'

describe('parseTickParam', () => {
  it('accepts the three tick types, case-insensitively', () => {
    expect(parseTickParam('wide')).toBe('wide')
    expect(parseTickParam('Normal')).toBe('normal')
    expect(parseTickParam('NARROW')).toBe('narrow')
  })

  it('rejects anything else', () => {
    expect(parseTickParam(undefined)).toBeNull()
    expect(parseTickParam(null)).toBeNull()
    expect(parseTickParam('')).toBeNull()
    expect(parseTickParam('huge')).toBeNull()
    expect(parseTickParam('1')).toBeNull()
  })

  it('uses the first value of a repeated query key', () => {
    expect(parseTickParam(['wide', 'narrow'])).toBe('wide')
    expect(parseTickParam([null, 'narrow'])).toBeNull()
  })
})

describe('parseLpFeeParam', () => {
  it('accepts every supported fee tier', () => {
    for (const tier of LP_FEE_TIERS) {
      expect(parseLpFeeParam(tier.toString())).toBe(tier)
    }
  })

  it('rejects fees that are not a supported tier', () => {
    expect(parseLpFeeParam('1234')).toBeNull()
    expect(parseLpFeeParam('-1000000')).toBeNull()
    expect(parseLpFeeParam('1e6')).toBeNull()
    expect(parseLpFeeParam('abc')).toBeNull()
    expect(parseLpFeeParam('')).toBeNull()
    expect(parseLpFeeParam(undefined)).toBeNull()
    expect(parseLpFeeParam(null)).toBeNull()
  })
})
