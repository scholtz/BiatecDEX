import { describe, expect, it } from 'vitest'
import { TICK_TYPES } from 'biatec-concentrated-liquidity-amm'
import { classifyWallPrice } from '../wallTickType'

describe('classifyWallPrice', () => {
  it('assigns a wall to the widest width whose grid has a boundary at its price', () => {
    // 1 (and 0.5, 2, 5, 10, ...) sit on the wide 1/2/5 grid.
    expect(classifyWallPrice(1, TICK_TYPES)).toBe('wide')
    expect(classifyWallPrice(2, TICK_TYPES)).toBe('wide')
    expect(classifyWallPrice(0.5, TICK_TYPES)).toBe('wide')
    // 0.9 is a normal boundary but not a wide one.
    expect(classifyWallPrice(0.9, TICK_TYPES)).toBe('normal')
    // 1.01 only exists on the narrow grid.
    expect(classifyWallPrice(1.01, TICK_TYPES)).toBe('narrow')
  })

  it('returns null for prices on no grid and for invalid input', () => {
    expect(classifyWallPrice(1.0137, TICK_TYPES)).toBeNull()
    expect(classifyWallPrice(0, TICK_TYPES)).toBeNull()
    expect(classifyWallPrice(-1, TICK_TYPES)).toBeNull()
    expect(classifyWallPrice(Number.NaN, TICK_TYPES)).toBeNull()
    expect(classifyWallPrice(Number.POSITIVE_INFINITY, TICK_TYPES)).toBeNull()
  })
})
