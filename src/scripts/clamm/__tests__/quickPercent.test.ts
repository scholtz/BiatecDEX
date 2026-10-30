import { describe, expect, it } from 'vitest'
import { isQuickPercentActive, MAX_WITHDRAW_PERCENT, QUICK_PERCENTS } from '../quickPercent'

const active = (percent: number) =>
  [...QUICK_PERCENTS, MAX_WITHDRAW_PERCENT].filter((b) => isQuickPercentActive(percent, b))

describe('isQuickPercentActive', () => {
  it('highlights exactly the matching button', () => {
    expect(active(50)).toEqual([50])
    expect(active(100)).toEqual([100])
    expect(active(1)).toEqual([1])
  })
  it('highlights nothing for values without a button', () => {
    expect(active(33)).toEqual([])
    expect(active(0)).toEqual([])
    expect(active(Number.NaN)).toEqual([])
  })
  it('tolerates float noise', () => {
    expect(active(24.999999999999996)).toEqual([25])
  })
})
