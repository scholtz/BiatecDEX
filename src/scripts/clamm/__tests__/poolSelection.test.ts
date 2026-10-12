import { describe, expect, it } from 'vitest'
import {
  collectHeldAssetIds,
  lpOptInState,
  poolInSelectedRange,
  poolIsSelected
} from '../poolSelection'

const p = (min: number, max: number, fee = 3_000_000n) => ({
  min: BigInt(Math.round(min * 1e9)),
  max: BigInt(Math.round(max * 1e9)),
  fee
})

describe('poolInSelectedRange', () => {
  it('matches pools inside the selection, boundaries included', () => {
    expect(poolInSelectedRange(p(1, 2), { min: 1, max: 2 })).toBe(true)
    expect(poolInSelectedRange(p(1.1, 1.2), { min: 1, max: 2 })).toBe(true)
  })
  it('rejects pools partly or fully outside', () => {
    expect(poolInSelectedRange(p(0.9, 1.5), { min: 1, max: 2 })).toBe(false)
    expect(poolInSelectedRange(p(2, 3), { min: 1, max: 1.9 })).toBe(false)
  })
  it('matches a wall pool at the selected wall price', () => {
    expect(poolInSelectedRange(p(0.9, 0.9), { min: 0.9, max: 0.9 })).toBe(true)
    expect(poolInSelectedRange(p(0.9, 0.9), { min: 1, max: 2 })).toBe(false)
  })
  it('is false without a valid selection', () => {
    expect(poolInSelectedRange(p(1, 2), null)).toBe(false)
    expect(poolInSelectedRange(p(1, 2), { min: 0, max: 0 })).toBe(false)
    expect(poolInSelectedRange(p(1, 2), { min: NaN, max: 2 })).toBe(false)
    expect(poolInSelectedRange(p(1, 2), { min: 2, max: 1 })).toBe(false)
  })
})

describe('poolIsSelected', () => {
  it('requires the fee only when one is selected', () => {
    const range = { min: 1, max: 2 }
    expect(poolIsSelected(p(1, 2, 3n), range, null)).toBe(true)
    expect(poolIsSelected(p(1, 2, 3n), range, 3n)).toBe(true)
    expect(poolIsSelected(p(1, 2, 3n), range, 4n)).toBe(false)
  })
})

describe('lpOptInState', () => {
  it('reports opt-in from the held assets', () => {
    expect(lpOptInState(7n, new Set([7n]))).toBe('optedIn')
    expect(lpOptInState(7n, new Set([8n]))).toBe('notOptedIn')
  })
  it('is unknown without an account or LP id', () => {
    expect(lpOptInState(7n, null)).toBe('unknown')
    expect(lpOptInState(0n, new Set())).toBe('unknown')
  })
})

describe('collectHeldAssetIds', () => {
  it('reads both holding key shapes', () => {
    const ids = collectHeldAssetIds([{ assetId: 5n }, { 'asset-id': 6 }, {}])
    expect([...ids].sort()).toEqual([5n, 6n])
  })
  it('handles missing holdings', () => {
    expect(collectHeldAssetIds(undefined).size).toBe(0)
  })
})
