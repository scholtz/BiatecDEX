import { describe, expect, it } from 'vitest'
import {
  buildTickTypeStats,
  emptyTickTypeStats,
  mostLiquidTickType,
  type ClassifiablePool
} from '../tickTypeStats'

type TestType = 'wide' | 'normal' | 'narrow'
const TYPES: TestType[] = ['wide', 'normal', 'narrow']

// A simple classifier for tests: low>=100 is wide, low>=10 is normal, else narrow.
const classify = (low: number): TestType => (low >= 100 ? 'wide' : low >= 10 ? 'normal' : 'narrow')

describe('tickTypeStats', () => {
  it('emptyTickTypeStats seeds every type at zero', () => {
    expect(emptyTickTypeStats(TYPES)).toEqual({
      wide: { count: 0, tvlUsd: 0 },
      normal: { count: 0, tvlUsd: 0 },
      narrow: { count: 0, tvlUsd: 0 }
    })
  })

  it('classifies and aggregates count + TVL per type', () => {
    const pools: ClassifiablePool[] = [
      { low: 200, high: 300, tvlUsd: 10 },
      { low: 150, high: 250, tvlUsd: 5 },
      { low: 20, high: 30, tvlUsd: 7 },
      { low: 1, high: 2, tvlUsd: 3 }
    ]
    const stats = buildTickTypeStats(pools, TYPES, (low) => classify(low))
    expect(stats.wide).toEqual({ count: 2, tvlUsd: 15 })
    expect(stats.normal).toEqual({ count: 1, tvlUsd: 7 })
    expect(stats.narrow).toEqual({ count: 1, tvlUsd: 3 })
  })

  it('skips wall pools (low === high) — not a tick-width bucket', () => {
    const pools: ClassifiablePool[] = [{ low: 5, high: 5, tvlUsd: 100 }]
    const stats = buildTickTypeStats(pools, TYPES, (low) => classify(low))
    expect(stats.wide.count + stats.normal.count + stats.narrow.count).toBe(0)
  })

  // GoldDAO/USD: nearly all Biatec liquidity ($98.8k) is ONE wall pool at price 1, next to a
  // tiny ranged pool. Ignoring walls made the small ranged pool's width the "most liquid".
  it('counts wall pools toward the width the classifyWall callback assigns', () => {
    const pools: ClassifiablePool[] = [
      { low: 20, high: 30, tvlUsd: 2 },
      { low: 5, high: 5, tvlUsd: 98_000 },
      { low: 0, high: 0, tvlUsd: 50 }
    ]
    const stats = buildTickTypeStats(
      pools,
      TYPES,
      (low) => classify(low),
      (price) => (price > 0 ? 'wide' : null)
    )
    expect(stats.wide).toEqual({ count: 1, tvlUsd: 98_000 })
    expect(stats.normal).toEqual({ count: 1, tvlUsd: 2 })
    expect(mostLiquidTickType(stats, TYPES)).toBe('wide')
  })

  it('skips pools the classifier cannot place', () => {
    const pools: ClassifiablePool[] = [{ low: 1, high: 2, tvlUsd: 100 }]
    const stats = buildTickTypeStats(pools, TYPES, () => null)
    expect(stats.wide.count + stats.normal.count + stats.narrow.count).toBe(0)
  })

  it('handles an empty pool list', () => {
    expect(buildTickTypeStats([], TYPES, (low) => classify(low))).toEqual(emptyTickTypeStats(TYPES))
  })

  it('mostLiquidTickType picks the highest-TVL type', () => {
    const stats = buildTickTypeStats(
      [
        { low: 200, high: 300, tvlUsd: 5 },
        { low: 20, high: 30, tvlUsd: 50 }
      ],
      TYPES,
      (low) => classify(low)
    )
    expect(mostLiquidTickType(stats, TYPES)).toBe('normal')
  })

  it('mostLiquidTickType falls back to pool count when TVL is unknown (all zero)', () => {
    const stats = buildTickTypeStats(
      [
        { low: 200, high: 300, tvlUsd: 0 },
        { low: 20, high: 30, tvlUsd: 0 },
        { low: 25, high: 35, tvlUsd: 0 }
      ],
      TYPES,
      (low) => classify(low)
    )
    expect(mostLiquidTickType(stats, TYPES)).toBe('normal')
  })

  it('mostLiquidTickType returns null when every type has zero pools', () => {
    expect(mostLiquidTickType(emptyTickTypeStats(TYPES), TYPES)).toBeNull()
  })

  it('mostLiquidTickType is deterministic on a full tie (TVL and count equal)', () => {
    const stats = buildTickTypeStats(
      [
        { low: 200, high: 300, tvlUsd: 10 },
        { low: 20, high: 30, tvlUsd: 10 }
      ],
      TYPES,
      (low) => classify(low)
    )
    // Tie on TVL and count (1 pool, 10 TVL each) — first-in-`types`-order wins.
    expect(mostLiquidTickType(stats, TYPES)).toBe('wide')
  })
})
