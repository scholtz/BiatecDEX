import { describe, expect, it } from 'vitest'
import BigNumber from 'bignumber.js'
import type { Pool } from '@/api/models'
import calculateDistribution from '@/scripts/asset/calculateDistribution'
import visibleRangeFactor from '../visibleRangeFactor'
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
    // Raw wide ticks (precision 0) roughly double each step (tick ~= price), so this
    // window is coarser than the old "clean" 1/2/5x10^k grid — that's expected: it's
    // now the same raw grid pools are actually created on, not a UI-only rounding.
    const boundaries = buildTickBoundariesAroundPrice(1, 'wide')
    expect(boundaries.length).toBeGreaterThanOrEqual(5)
    for (let i = 1; i < boundaries.length; i++) {
      expect(boundaries[i]).toBeGreaterThan(boundaries[i - 1])
    }
    expect(boundaries[0]).toBeLessThanOrEqual(1)
    expect(boundaries[boundaries.length - 1]).toBeGreaterThanOrEqual(16)
  })

  it('clamps to zero instead of erroring when a wide tick rounds its fit to zero', () => {
    // At wide precision, price 0.995 rounds to a 1.0 tick, and 0.995 < 1.0, so the
    // raw fit is exactly 0 — a legitimate "this coarse bucket starts at zero" result.
    const boundaries = buildTickBoundariesAroundPrice(0.995, 'wide')
    expect(boundaries[0]).toBe(0)
    expect(boundaries.length).toBeGreaterThanOrEqual(5)
    for (let i = 1; i < boundaries.length; i++) {
      expect(boundaries[i]).toBeGreaterThan(boundaries[i - 1])
    }
  })

  it('centers the mid price bucket with equal tick counts on both sides', () => {
    for (const midPrice of [1, 0.995, 0.6, 2.5, 10, 150, 0.02]) {
      for (const tickType of ['wide', 'normal', 'narrow'] as const) {
        const boundaries = buildTickBoundariesAroundPrice(midPrice, tickType)
        const buckets = boundaries.length - 1
        let midIndex = -1
        for (let i = 0; i < buckets; i++) {
          if (boundaries[i] <= midPrice && midPrice < boundaries[i + 1]) {
            midIndex = i
            break
          }
        }
        expect(midIndex, `mid=${midPrice} ${tickType}: mid bucket missing`).toBeGreaterThanOrEqual(
          0
        )
        const below = midIndex
        const above = buckets - 1 - midIndex
        expect(below, `mid=${midPrice} ${tickType}: ${below} below vs ${above} above`).toBe(above)
      }
    }
  })

  it('matches AddLiquidity.vue calculateDistribution.ts for the same mid price and precision', () => {
    // Regression test for a real chart/form tick mismatch: both must anchor at the
    // same visibleFrom (visibleRangeFactor) and walk the identical raw tick math.
    const midPrice = 1
    const boundaries = buildTickBoundariesAroundPrice(midPrice, 'wide')
    // Verified against scripts/asset/calculateDistribution.ts directly for
    // visibleFrom = midPrice * 0.05, visibleTo = midPrice / 0.05, precision 0.
    expect(boundaries.slice(0, 7)).toEqual([0.05, 0.1, 0.2, 0.4, 0.8, 2, 4])
  })

  it('reproduces AddLiquidity calculateDistribution grids exactly across prices and widths', () => {
    // Full-grid regression: every boundary of the form's grid (calculateDistribution
    // over its visibleFrom..visibleTo window) must appear in the chart's boundaries,
    // for every tick width — this is the invariant the user sees as "both panels
    // show the same ticks". The last form boundary is excluded: the form's window
    // truncates its final bucket where the chart continues walking (and may merge
    // that partial bucket into the next full tick).
    for (const midPrice of [1, 0.995, 0.6, 2.5, 10, 150, 0.02]) {
      for (const [tickType, precision] of [
        ['wide', 0],
        ['normal', 1],
        ['narrow', 2]
      ] as const) {
        const visible = visibleRangeFactor(precision)
        const form = calculateDistribution({
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
        const chart = buildTickBoundariesAroundPrice(midPrice, tickType)
        const chartSet = new Set(chart.map((v) => v.toPrecision(12)))
        for (const bound of form.min) {
          expect(
            chartSet.has(bound.toNumber().toPrecision(12)),
            `mid=${midPrice} ${tickType}: form boundary ${bound.toNumber()} missing from chart`
          ).toBe(true)
        }
      }
    }
  })

  it('anchors at a shared visibleFrom even when the mid price has drifted', () => {
    // The form latches its window (ticksCalculated) and does not re-derive
    // visibleFrom when the mid price moves; the chart must follow the form's actual
    // anchor, not re-derive its own from the newer mid price — for wide ticks a tiny
    // anchor difference produces a completely different boundary chain.
    const staleVisibleFrom = 1 * visibleRangeFactor(0) // window built at midPrice 1
    const driftedMidPrice = 1.18 // price moved after the form latched
    const anchored = buildTickBoundariesAroundPrice(driftedMidPrice, 'wide', {
      visibleFrom: staleVisibleFrom
    })
    const derived = buildTickBoundariesAroundPrice(driftedMidPrice, 'wide')
    // With the shared anchor the chain is the midPrice-1 chain (0.05, 0.1, ... 0.8, 2).
    expect(anchored).toContain(0.8)
    expect(anchored).toContain(0.4)
    // Without it the drifted mid price derives a different anchor and a different
    // chain — the situation this option exists to prevent.
    expect(derived).not.toEqual(anchored)
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

  it('places an off-grid wall pool value into the bucket containing its price', () => {
    // A wall price strictly inside a tick (not on any boundary) stays aggregated in
    // the bucket containing it — it is not representable as a standalone wall tick.
    const boundaries = buildTickBoundaries(70, 140, 'normal')
    const interiorPrice = (boundaries[2] + boundaries[3]) / 2
    const wall = normalizePoolLiquidity(
      {
        ...clammPool,
        pMin: interiorPrice,
        pMax: interiorPrice,
        realAmountA: 5,
        realAmountB: 500
      } as Pool,
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
    expect(buckets.every((bucket) => !bucket.isWall)).toBe(true)
    const hit = buckets.filter((bucket) => bucket.total > 0)
    expect(hit).toHaveLength(1)
    expect(hit[0].from).toBeLessThanOrEqual(interiorPrice)
    expect(hit[0].to).toBeGreaterThan(interiorPrice)
  })

  it('renders a wall pool sitting exactly on a tick boundary as a standalone wall tick', () => {
    const boundaries = buildTickBoundaries(70, 140, 'normal')
    const wallPrice = boundaries[3]
    const wall = normalizePoolLiquidity(
      { ...clammPool, pMin: wallPrice, pMax: wallPrice, realAmountA: 5, realAmountB: 500 } as Pool,
      ASSET_ID,
      CURRENCY_ID
    )!
    const { buckets } = calculateTvlDistribution([wall], {
      tickType: 'normal',
      referencePrice: 100,
      minPrice: 70,
      maxPrice: 140
    })
    const wallTicks = buckets.filter((bucket) => bucket.isWall)
    expect(wallTicks).toHaveLength(1)
    expect(wallTicks[0].from).toBeCloseTo(wallPrice, 9)
    expect(wallTicks[0].to).toBe(wallTicks[0].from)
    expect(wallTicks[0].total).toBeCloseTo(5 * 100 + 500, 9)
    // The wall TVL must not be double counted in the adjacent regular buckets.
    expect(buckets.filter((bucket) => !bucket.isWall).every((bucket) => bucket.total === 0)).toBe(
      true
    )
    // Ordering: the wall tick sits between the bucket ending and the one starting at
    // its price.
    const index = buckets.findIndex((bucket) => bucket.isWall)
    expect(buckets[index - 1].to).toBeCloseTo(wallPrice, 9)
    expect(buckets[index + 1].from).toBeCloseTo(wallPrice, 9)
  })

  it('marks hasExactPool on a wall tick backed by a Biatec CLAMM wall pool', () => {
    const boundaries = buildTickBoundaries(70, 140, 'normal')
    const wallPrice = boundaries[2]
    const biatecWall = normalizePoolLiquidity(
      {
        ...clammPool,
        protocol: 'Biatec',
        pMin: wallPrice,
        pMax: wallPrice,
        realAmountA: 5,
        realAmountB: 500
      } as Pool,
      ASSET_ID,
      CURRENCY_ID
    )!
    const otherWall = normalizePoolLiquidity(
      {
        ...clammPool,
        poolAddress: 'PACT_WALL',
        protocol: 'Pact',
        pMin: wallPrice,
        pMax: wallPrice,
        realAmountA: 5,
        realAmountB: 500
      } as Pool,
      ASSET_ID,
      CURRENCY_ID
    )!
    const options = {
      tickType: 'normal' as const,
      referencePrice: 100,
      minPrice: 70,
      maxPrice: 140
    }
    const biatec = calculateTvlDistribution([biatecWall], options)
    expect(biatec.buckets.filter((bucket) => bucket.isWall)[0].hasExactPool).toBe(true)
    const other = calculateTvlDistribution([otherWall], options)
    expect(other.buckets.filter((bucket) => bucket.isWall)[0].hasExactPool).toBe(false)
    // Two walls on the same boundary combine into one wall tick.
    const combined = calculateTvlDistribution([biatecWall, otherWall], options)
    const wallTicks = combined.buckets.filter((bucket) => bucket.isWall)
    expect(wallTicks).toHaveLength(1)
    expect(wallTicks[0].total).toBeCloseTo(2 * (5 * 100 + 500), 9)
  })

  it('marks hasExactPool only on the tick whose bounds equal a Biatec CLAMM pool exactly', () => {
    // A Biatec pool created on exactly one narrow tick [100, 101].
    const exactPool = normalizePoolLiquidity(
      {
        ...clammPool,
        poolAddress: 'EXACT_POOL',
        protocol: 'Biatec',
        pMin: 100,
        pMax: 101,
        realAmountA: 0.5,
        realAmountB: 25,
        virtualAmountA: 100,
        virtualAmountB: 10024
      } as Pool,
      ASSET_ID,
      CURRENCY_ID
    )!
    expect(exactPool.declaredMin).toBe(100)
    expect(exactPool.declaredMax).toBe(101)

    // A wider Biatec pool [80, 125] overlapping many narrow ticks.
    const widePool = normalizePoolLiquidity(
      { ...clammPool, poolAddress: 'WIDE_POOL', protocol: 'Biatec' } as Pool,
      ASSET_ID,
      CURRENCY_ID
    )!

    const { buckets } = calculateTvlDistribution([exactPool, widePool], {
      tickType: 'narrow',
      referencePrice: 100,
      minPrice: 70,
      maxPrice: 140
    })
    const exact = buckets.filter((bucket) => bucket.hasExactPool)
    // Only the [100, 101] tick matches a pool's declared bounds — the wide pool
    // overlaps dozens of narrow ticks but depositing on any of them would create a
    // NEW pool, so none of them may be marked as existing.
    expect(exact).toHaveLength(1)
    expect(exact[0].from).toBeCloseTo(100, 9)
    expect(exact[0].to).toBeCloseTo(101, 9)
    // The wide pool still contributes concentrated TVL to overlapped ticks.
    expect(buckets.some((bucket) => bucket.concentrated > 0 && !bucket.hasExactPool)).toBe(true)
  })

  it('matches declared pool bounds in reversed pair orientation', () => {
    const reversedPool = normalizePoolLiquidity(
      {
        ...clammPool,
        poolAddress: 'REVERSED_POOL',
        protocol: 'Biatec',
        assetIdA: CURRENCY_ID,
        assetIdB: ASSET_ID,
        pMin: 1 / 101,
        pMax: 1 / 100,
        realAmountA: 25,
        realAmountB: 0.5,
        virtualAmountA: 10024,
        virtualAmountB: 100
      } as Pool,
      ASSET_ID,
      CURRENCY_ID
    )!
    expect(reversedPool.declaredMin).toBeCloseTo(100, 6)
    expect(reversedPool.declaredMax).toBeCloseTo(101, 6)

    const { buckets } = calculateTvlDistribution([reversedPool], {
      tickType: 'narrow',
      referencePrice: 100,
      minPrice: 70,
      maxPrice: 140
    })
    const exact = buckets.filter((bucket) => bucket.hasExactPool)
    expect(exact).toHaveLength(1)
    expect(exact[0].from).toBeCloseTo(100, 9)
  })

  it('does not mark ticks for non-Biatec concentrated pools', () => {
    const pactPool = normalizePoolLiquidity(
      { ...clammPool, protocol: 'Pact', pMin: 100, pMax: 101 } as Pool,
      ASSET_ID,
      CURRENCY_ID
    )!
    expect(pactPool.declaredMin).toBeNull()
    const { buckets } = calculateTvlDistribution([pactPool], {
      tickType: 'narrow',
      referencePrice: 100,
      minPrice: 70,
      maxPrice: 140
    })
    expect(buckets.every((bucket) => !bucket.hasExactPool)).toBe(true)
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
      // The raw initPriceDecimals grid's tick width isn't a perfectly constant
      // fraction (it varies with rounding, and adjacent buckets occasionally merge
      // — see walkRawRangesForward); normalized heights must stay smooth regardless.
      for (let i = 1; i < heights.length; i++) {
        const ratio = heights[i] / heights[i - 1]
        expect(ratio).toBeGreaterThan(0.55)
        expect(ratio).toBeLessThan(1.8)
      }
    }
  })
})
