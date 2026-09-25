import { describe, expect, it } from 'vitest'
import BigNumber from 'bignumber.js'
import {
  precisionForTickType,
  tickGridBoundaries,
  tickGridBoundaryAbove,
  tickGridBoundaryBelow,
  TICK_TYPES
} from 'biatec-concentrated-liquidity-amm'
import calculateDistribution from '../calculateDistribution'
import visibleRangeFactor from '../../clamm/visibleRangeFactor'
import { buildTickBoundariesAroundPrice } from '../../clamm/poolTvlDistribution'

// Regression for the drifting pool bounds bug: opening Add Liquidity for GOLD/ALGO at
// wide ticks on three different days (mid price ~1000, ~1500, ~1600) produced three
// different pools — [536, 2140], [1080, 2160], [1090, 2180] — because the old grid
// chained every boundary from a window start derived from the mid price. The grid
// must be the same absolute set of boundaries whatever the current price is.

const gridFor = (midPrice: number, precision: number) => {
  const visible = visibleRangeFactor(precision)
  return calculateDistribution({
    type: 'equal',
    visibleFrom: new BigNumber(midPrice * visible),
    visibleTo: new BigNumber(midPrice / visible),
    midPrice: new BigNumber(midPrice),
    lowPrice: new BigNumber(midPrice),
    highPrice: new BigNumber(midPrice),
    depositAssetAmount: new BigNumber(0),
    depositCurrencyAmount: new BigNumber(0),
    precision: new BigNumber(precision)
  })
}

const binContaining = (grid: ReturnType<typeof gridFor>, price: number): [number, number] => {
  for (let i = 0; i < grid.min.length; i++) {
    if (grid.min[i].lte(price) && grid.max[i].gt(price)) {
      return [grid.min[i].toNumber(), grid.max[i].toNumber()]
    }
  }
  throw new Error(`no bin contains ${price}`)
}

describe('calculateDistribution uses the canonical tick grid', () => {
  it('the wide bin around GOLD/ALGO ~1500 is [1000, 2000] whatever the mid price was', () => {
    for (const midPrice of [536, 800, 1000, 1080, 1090, 1234.5678, 1500, 1600, 1999]) {
      expect(binContaining(gridFor(midPrice, 0), 1500)).toEqual([1000, 2000])
    }
  })

  it('every bin of every window is a canonical bin, for every tick width', () => {
    for (const type of TICK_TYPES) {
      const precision = precisionForTickType(type)
      for (const midPrice of [0.00123, 0.02, 0.6, 0.995, 1, 2.5, 10, 150, 536, 1090, 99999]) {
        const grid = gridFor(midPrice, precision)
        expect(grid.min.length).toBeGreaterThan(0)
        for (let i = 0; i < grid.min.length; i++) {
          const from = grid.min[i].toNumber()
          const to = grid.max[i].toNumber()
          expect(tickGridBoundaryBelow(from, precision), `${type} mid=${midPrice}`).toBe(from)
          expect(tickGridBoundaryAbove(from, precision), `${type} mid=${midPrice}`).toBe(to)
        }
      }
    }
  })

  it('bins are contiguous, increasing and cover the visible window', () => {
    for (const type of TICK_TYPES) {
      const precision = precisionForTickType(type)
      const visible = visibleRangeFactor(precision)
      for (const midPrice of [0.02, 1, 536, 1500]) {
        const grid = gridFor(midPrice, precision)
        expect(grid.min[0].toNumber()).toBeLessThanOrEqual(midPrice * visible)
        expect(grid.max[grid.max.length - 1].toNumber()).toBeGreaterThanOrEqual(midPrice / visible)
        for (let i = 1; i < grid.min.length; i++) {
          expect(grid.min[i].eq(grid.max[i - 1])).toBe(true)
          expect(grid.max[i].gt(grid.min[i])).toBe(true)
        }
      }
    }
  })

  it('two windows that both contain a price agree on every shared boundary', () => {
    for (const type of TICK_TYPES) {
      const precision = precisionForTickType(type)
      const a = gridFor(1080, precision)
      const b = gridFor(1600, precision)
      const bSet = new Set(b.min.map((v) => v.toNumber()))
      const shared = a.min
        .map((v) => v.toNumber())
        .filter((v) => v >= b.min[0].toNumber() && v <= b.max[b.max.length - 1].toNumber())
      expect(shared.length).toBeGreaterThan(0)
      for (const bound of shared) {
        expect(bSet.has(bound), `${type}: ${bound}`).toBe(true)
      }
    }
  })

  it('matches the depth chart grid (poolTvlDistribution) boundary for boundary', () => {
    for (const type of TICK_TYPES) {
      const precision = precisionForTickType(type)
      for (const midPrice of [1, 0.995, 0.6, 2.5, 10, 150, 0.02, 1500]) {
        const form = gridFor(midPrice, precision)
        const chart = new Set(buildTickBoundariesAroundPrice(midPrice, type))
        for (const bound of form.min) {
          const value = bound.toNumber()
          if (value < Math.min(...chart)) continue
          expect(chart.has(value), `${type} mid=${midPrice}: ${value}`).toBe(true)
        }
      }
    }
  })

  it('is exactly the package grid over the same window', () => {
    for (const type of TICK_TYPES) {
      const precision = precisionForTickType(type)
      const visible = visibleRangeFactor(precision)
      const midPrice = 1500
      const grid = gridFor(midPrice, precision)
      const expected = tickGridBoundaries(midPrice * visible, midPrice / visible, precision)
      expect(grid.min.map((v) => v.toNumber())).toEqual(expected.slice(0, -1))
      expect(grid.max.map((v) => v.toNumber())).toEqual(expected.slice(1))
    }
  })
})
