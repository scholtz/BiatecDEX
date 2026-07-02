import { describe, expect, it } from 'vitest'
import type { Pool } from '@/api/models'
import {
  amountsInPriceRange,
  bucketNormalizationScale,
  buildTickBoundaries,
  buildTickBoundariesAroundPrice,
  calculateTvlDistribution,
  effectivePriceRange,
  normalizePoolLiquidity
} from '../poolTvlDistribution'

const ASSET_ID = 123
const CURRENCY_ID = 456

// Constant product pool: x = 100 asset, y = 10000 currency -> P = 100, L = 1000
const constantProductPool: Pool = {
  poolAddress: 'CP_POOL',
  poolAppId: 1,
  assetIdA: ASSET_ID,
  assetIdB: CURRENCY_ID,
  ammType: 'OldAMM',
  realAmountA: 100,
  realAmountB: 10000,
  virtualAmountA: 100,
  virtualAmountB: 10000
} as Pool

// Concentrated pool with the same virtual reserves: L = 1000, P = 100, range [80, 125]
// real x = L(1/sqrt(100) - 1/sqrt(125)), real y = L(sqrt(100) - sqrt(80))
const clammRealAsset = 1000 * (1 / Math.sqrt(100) - 1 / Math.sqrt(125))
const clammRealCurrency = 1000 * (Math.sqrt(100) - Math.sqrt(80))
const clammPool: Pool = {
  poolAddress: 'CLAMM_POOL',
  poolAppId: 2,
  assetIdA: ASSET_ID,
  assetIdB: CURRENCY_ID,
  ammType: 'ConcentratedLiquidityAMM',
  pMin: 80,
  pMax: 125,
  realAmountA: clammRealAsset,
  realAmountB: clammRealCurrency,
  virtualAmountA: 100,
  virtualAmountB: 10000
} as Pool

describe('amountsInPriceRange', () => {
  it('returns full reserves of a constant product pool over its whole range', () => {
    const L = 1000
    const P = 100
    expect(amountsInPriceRange(L, P, 0, P).currency).toBeCloseTo(10000, 6)
    expect(amountsInPriceRange(L, P, 0, P).asset).toBe(0)
    expect(amountsInPriceRange(L, P, P, Infinity).asset).toBeCloseTo(100, 6)
    expect(amountsInPriceRange(L, P, P, Infinity).currency).toBe(0)
  })

  it('telescopes: adjacent segments sum to the enclosing segment', () => {
    const L = 1000
    const P = 100
    const whole = amountsInPriceRange(L, P, 50, 200)
    const left = amountsInPriceRange(L, P, 50, 100)
    const mid = amountsInPriceRange(L, P, 100, 150)
    const right = amountsInPriceRange(L, P, 150, 200)
    expect(left.asset + mid.asset + right.asset).toBeCloseTo(whole.asset, 9)
    expect(left.currency + mid.currency + right.currency).toBeCloseTo(whole.currency, 9)
  })

  it('matches the closed-form one-sided amounts inside a range', () => {
    const L = 1000
    const P = 100
    const { asset, currency } = amountsInPriceRange(L, P, 80, 125)
    expect(asset).toBeCloseTo(L * (1 / Math.sqrt(100) - 1 / Math.sqrt(125)), 9)
    expect(currency).toBeCloseTo(L * (Math.sqrt(100) - Math.sqrt(80)), 9)
  })
})

describe('effectivePriceRange', () => {
  it('collapses to the full range for constant product reserves', () => {
    const { priceMin, priceMax } = effectivePriceRange(1000, 100, 100, 10000)
    expect(priceMin).toBe(0)
    expect(priceMax).toBe(Infinity)
  })

  it('recovers the bounds of a concentrated position', () => {
    const { priceMin, priceMax } = effectivePriceRange(1000, 100, clammRealAsset, clammRealCurrency)
    expect(priceMin).toBeCloseTo(80, 6)
    expect(priceMax).toBeCloseTo(125, 6)
  })
})

describe('normalizePoolLiquidity', () => {
  it('normalizes a constant product pool', () => {
    const pool = normalizePoolLiquidity(constantProductPool, ASSET_ID, CURRENCY_ID)
    expect(pool).not.toBeNull()
    expect(pool!.liquidity).toBeCloseTo(1000, 9)
    expect(pool!.price).toBeCloseTo(100, 9)
    expect(pool!.priceMin).toBe(0)
    expect(pool!.priceMax).toBe(Infinity)
    expect(pool!.isConcentrated).toBe(false)
  })

  it('normalizes a concentrated pool with its effective bounds', () => {
    const pool = normalizePoolLiquidity(clammPool, ASSET_ID, CURRENCY_ID)
    expect(pool).not.toBeNull()
    expect(pool!.liquidity).toBeCloseTo(1000, 6)
    expect(pool!.price).toBeCloseTo(100, 6)
    expect(pool!.priceMin).toBeCloseTo(80, 4)
    expect(pool!.priceMax).toBeCloseTo(125, 4)
    expect(pool!.isConcentrated).toBe(true)
  })

  it('inverts prices for a reversed pair orientation', () => {
    const pool = normalizePoolLiquidity(clammPool, CURRENCY_ID, ASSET_ID)
    expect(pool).not.toBeNull()
    expect(pool!.price).toBeCloseTo(1 / 100, 9)
    expect(pool!.priceMin).toBeCloseTo(1 / 125, 6)
    expect(pool!.priceMax).toBeCloseTo(1 / 80, 6)
    expect(pool!.realAsset).toBeCloseTo(clammRealCurrency, 9)
    expect(pool!.realCurrency).toBeCloseTo(clammRealAsset, 9)
  })

  it('rejects pools of other pairs and empty pools', () => {
    expect(normalizePoolLiquidity(constantProductPool, ASSET_ID, 999)).toBeNull()
    expect(
      normalizePoolLiquidity(
        { ...constantProductPool, realAmountA: 0, realAmountB: 0 } as Pool,
        ASSET_ID,
        CURRENCY_ID
      )
    ).toBeNull()
  })

  it('treats a pMin == pMax pool as a wall at that price', () => {
    const wall = normalizePoolLiquidity(
      {
        ...clammPool,
        pMin: 100,
        pMax: 100,
        realAmountA: 5,
        realAmountB: 500
      } as Pool,
      ASSET_ID,
      CURRENCY_ID
    )
    expect(wall).not.toBeNull()
    expect(wall!.isWall).toBe(true)
    expect(wall!.price).toBe(100)
  })
})

describe('buildTickBoundaries', () => {
  it('builds a strictly increasing canonical grid covering the window', () => {
    const boundaries = buildTickBoundaries(80, 125, 'normal')
    expect(boundaries.length).toBeGreaterThan(2)
    expect(boundaries[0]).toBeLessThanOrEqual(80)
    expect(boundaries[boundaries.length - 1]).toBeGreaterThanOrEqual(125)
    for (let i = 1; i < boundaries.length; i++) {
      expect(boundaries[i]).toBeGreaterThan(boundaries[i - 1])
    }
  })

  it('produces finer buckets for narrower tick types', () => {
    const wide = buildTickBoundaries(80, 125, 'wide')
    const narrow = buildTickBoundaries(80, 125, 'narrow')
    expect(narrow.length).toBeGreaterThan(wide.length)
  })
})

describe('buildTickBoundariesAroundPrice', () => {
  it('yields several wide ticks around the price (full-range pools span the axis)', () => {
    const boundaries = buildTickBoundariesAroundPrice(1, 'wide')
    expect(boundaries.length).toBeGreaterThanOrEqual(8)
    for (let i = 1; i < boundaries.length; i++) {
      expect(boundaries[i]).toBeGreaterThan(boundaries[i - 1])
    }
    expect(boundaries[0]).toBeLessThanOrEqual(1 / 16)
    expect(boundaries[boundaries.length - 1]).toBeGreaterThanOrEqual(16)
  })

  it('respects the per-side tick cap for narrow ticks', () => {
    const boundaries = buildTickBoundariesAroundPrice(0.995, 'narrow', 50, 32)
    expect(boundaries.length).toBeLessThanOrEqual(101)
    expect(boundaries.length).toBeGreaterThan(50)
    expect(boundaries[0]).toBeLessThan(0.995)
    expect(boundaries[boundaries.length - 1]).toBeGreaterThan(0.995)
  })
})

describe('calculateTvlDistribution', () => {
  it('conserves the total value of a concentrated pool across its ticks', () => {
    const pool = normalizePoolLiquidity(clammPool, ASSET_ID, CURRENCY_ID)!
    const { buckets, referencePrice } = calculateTvlDistribution([pool], {
      tickType: 'narrow',
      referencePrice: 100,
      minPrice: 70,
      maxPrice: 140
    })
    const total = buckets.reduce((sum, bucket) => sum + bucket.total, 0)
    expect(referencePrice).toBe(100)
    expect(total).toBeCloseTo(clammRealAsset * 100 + clammRealCurrency, 6)
    expect(buckets.every((bucket) => bucket.constantProduct === 0)).toBe(true)
  })

  it('conserves value regardless of tick width (wide range split into narrow ticks)', () => {
    const pool = normalizePoolLiquidity(clammPool, ASSET_ID, CURRENCY_ID)!
    const expected = clammRealAsset * 100 + clammRealCurrency
    for (const tickType of ['wide', 'normal', 'narrow'] as const) {
      const { buckets } = calculateTvlDistribution([pool], {
        tickType,
        referencePrice: 100,
        minPrice: 70,
        maxPrice: 140
      })
      const total = buckets.reduce((sum, bucket) => sum + bucket.total, 0)
      expect(total).toBeCloseTo(expected, 6)
    }
  })

  it('combines constant product and concentrated pools additively', () => {
    const cp = normalizePoolLiquidity(constantProductPool, ASSET_ID, CURRENCY_ID)!
    const clamm = normalizePoolLiquidity(clammPool, ASSET_ID, CURRENCY_ID)!
    const options = {
      tickType: 'normal' as const,
      referencePrice: 100,
      minPrice: 70,
      maxPrice: 140
    }
    const combined = calculateTvlDistribution([cp, clamm], options)
    const cpOnly = calculateTvlDistribution([cp], options)
    const clammOnly = calculateTvlDistribution([clamm], options)
    combined.buckets.forEach((bucket, i) => {
      expect(bucket.total).toBeCloseTo(cpOnly.buckets[i].total + clammOnly.buckets[i].total, 9)
      expect(bucket.constantProduct).toBeCloseTo(cpOnly.buckets[i].constantProduct, 9)
      expect(bucket.concentrated).toBeCloseTo(clammOnly.buckets[i].concentrated, 9)
    })
    // The constant product pool has liquidity everywhere in the window; the
    // concentrated pool only inside [80, 125].
    expect(combined.buckets[0].constantProduct).toBeGreaterThan(0)
    expect(combined.buckets[0].concentrated).toBe(0)
  })

  it('places wall pool value into the bucket containing its price', () => {
    const wall = normalizePoolLiquidity(
      { ...clammPool, pMin: 100, pMax: 100, realAmountA: 5, realAmountB: 500 } as Pool,
      ASSET_ID,
      CURRENCY_ID
    )!
    const { buckets } = calculateTvlDistribution([wall], {
      tickType: 'normal',
      referencePrice: 100,
      minPrice: 70,
      maxPrice: 140
    })
    const total = buckets.reduce((sum, bucket) => sum + bucket.total, 0)
    expect(total).toBeCloseTo(5 * 100 + 500, 9)
    const hit = buckets.filter((bucket) => bucket.total > 0)
    expect(hit).toHaveLength(1)
    expect(hit[0].from).toBeLessThanOrEqual(100)
    expect(hit[0].to).toBeGreaterThan(100)
  })

  it('derives a TVL-weighted reference price when none is given', () => {
    const cp = normalizePoolLiquidity(constantProductPool, ASSET_ID, CURRENCY_ID)!
    const { referencePrice } = calculateTvlDistribution([cp], { tickType: 'normal' })
    expect(referencePrice).toBeCloseTo(100, 9)
  })

  it('normalized bar heights of a constant product pool are smooth (no grid-step spikes)', () => {
    // A pool priced like the GD/$ screenshot: P ~ 0.995, pure constant product.
    const pool = normalizePoolLiquidity(
      {
        ...constantProductPool,
        realAmountA: 1000,
        realAmountB: 995,
        virtualAmountA: 1000,
        virtualAmountB: 995
      } as Pool,
      ASSET_ID,
      CURRENCY_ID
    )!
    for (const tickType of ['wide', 'normal', 'narrow'] as const) {
      const { buckets } = calculateTvlDistribution([pool], { tickType })
      const heights = buckets
        .map((bucket) => bucket.total * bucketNormalizationScale(bucket.from, bucket.to, tickType))
        .filter((height) => height > 0)
      expect(heights.length).toBeGreaterThan(3)
      // Raw per-bucket TVL doubles where the 1/2/5 grid widens its step; the
      // normalized heights must stay smooth across those boundaries.
      for (let i = 1; i < heights.length; i++) {
        const ratio = heights[i] / heights[i - 1]
        expect(ratio).toBeGreaterThan(0.55)
        expect(ratio).toBeLessThan(1.8)
      }
    }
  })
})
