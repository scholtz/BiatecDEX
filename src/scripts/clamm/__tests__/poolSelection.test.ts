import { describe, expect, it } from 'vitest'
import {
  collectHeldAssetIds,
  lpOptInState,
  poolInSelectedRange,
  poolIsSelected,
  selectedGridBins
} from '../poolSelection'

const p = (min: number, max: number, fee = 3_000_000n) => ({
  min: BigInt(Math.round(min * 1e9)),
  max: BigInt(Math.round(max * 1e9)),
  fee
})

const WIDE = 0
const NORMAL = 1

describe('selectedGridBins', () => {
  it('lists the canonical wide bins of 50-500', () => {
    expect(selectedGridBins({ min: 50, max: 500 }, WIDE)).toEqual([
      [50, 100],
      [100, 200],
      [200, 500]
    ])
  })
  it('is the price itself for a wall', () => {
    expect(selectedGridBins({ min: 0.9, max: 0.9 }, NORMAL)).toEqual([[0.9, 0.9]])
  })
})

describe('poolInSelectedRange', () => {
  const range = { min: 50, max: 500 }
  it('matches exactly the pools that are one bin of the selected width', () => {
    expect(poolInSelectedRange(p(50, 100), range, WIDE)).toBe(true)
    expect(poolInSelectedRange(p(100, 200), range, WIDE)).toBe(true)
    expect(poolInSelectedRange(p(200, 500), range, WIDE)).toBe(true)
  })
  it('ignores pools that span several bins (not touched by Add liquidity)', () => {
    expect(poolInSelectedRange(p(50, 200), range, WIDE)).toBe(false)
    expect(poolInSelectedRange(p(100, 500), range, WIDE)).toBe(false)
    expect(poolInSelectedRange(p(50, 500), range, WIDE)).toBe(false)
  })
  it('ignores pools off the grid of the selected width', () => {
    expect(poolInSelectedRange(p(60, 120), range, WIDE)).toBe(false)
    // A normal-width bin is not a wide bin.
    expect(poolInSelectedRange(p(100, 110), range, WIDE)).toBe(false)
    expect(poolInSelectedRange(p(100, 110), { min: 100, max: 120 }, NORMAL)).toBe(true)
  })
  it('ignores pools outside the selection', () => {
    expect(poolInSelectedRange(p(500, 1000), range, WIDE)).toBe(false)
    expect(poolInSelectedRange(p(20, 50), range, WIDE)).toBe(false)
  })
  it('matches a wall pool at the selected wall price only', () => {
    expect(poolInSelectedRange(p(0.9, 0.9), { min: 0.9, max: 0.9 }, NORMAL)).toBe(true)
    expect(poolInSelectedRange(p(0.9, 0.9), range, WIDE)).toBe(false)
  })
  it('is false without a valid selection', () => {
    expect(poolInSelectedRange(p(1, 2), null, WIDE)).toBe(false)
    expect(poolInSelectedRange(p(1, 2), { min: 0, max: 0 }, WIDE)).toBe(false)
    expect(poolInSelectedRange(p(1, 2), { min: NaN, max: 2 }, WIDE)).toBe(false)
    expect(poolInSelectedRange(p(1, 2), { min: 2, max: 1 }, WIDE)).toBe(false)
    expect(poolInSelectedRange(p(1, 2), { min: 1, max: 2 }, NaN)).toBe(false)
  })
})

describe('poolIsSelected', () => {
  it('requires the fee only when one is selected', () => {
    const range = { min: 50, max: 500 }
    expect(poolIsSelected(p(50, 100, 3n), range, null, WIDE)).toBe(true)
    expect(poolIsSelected(p(50, 100, 3n), range, 3n, WIDE)).toBe(true)
    expect(poolIsSelected(p(50, 100, 3n), range, 4n, WIDE)).toBe(false)
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
