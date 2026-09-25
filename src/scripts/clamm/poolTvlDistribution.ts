import type { Pool } from '@/api/models'
import { AMMType, DEXProtocol } from '@/api/models'
import {
  nextTickGridBoundary,
  precisionForTickType,
  prevTickGridBoundary,
  tickGridBoundaries,
  type TickType
} from 'biatec-concentrated-liquidity-amm'
import visibleRangeFactor from './visibleRangeFactor'

/**
 * TVL-per-price-tick math shared by the pools liquidity chart.
 *
 * Every pool (constant product x*y=k, concentrated liquidity, stable swap) is reduced
 * to the same Uniswap-v3 style model: a liquidity L = sqrt(virtualX * virtualY) active
 * over an effective price range [priceMin, priceMax]. For a constant product pool the
 * effective range is (0, Infinity); for a concentrated pool it is its [pMin, pMax];
 * for a stable swap it is the narrow band implied by its amplified virtual reserves.
 *
 * The token amounts locked in a price segment [pa, pb] of a pool with liquidity L and
 * current price P (quote per base) are the standard formulas
 * (https://atiselsts.github.io/pdfs/uniswap-v3-liquidity-math.pdf):
 *   base  = L * (1/sqrt(max(P, pa)) - 1/sqrt(pb))   (0 when P >= pb)
 *   quote = L * (sqrt(min(P, pb)) - sqrt(pa))       (0 when P <= pa)
 * These telescope, so summing adjacent segments over the whole effective range
 * reproduces the pool's real reserves exactly.
 */

export interface NormalizedPoolLiquidity {
  key: string
  /** Real reserves of the pair's base asset (human units). */
  realAsset: number
  /** Real reserves of the pair's quote currency (human units). */
  realCurrency: number
  /** L = sqrt(virtualAsset * virtualCurrency), 0 for wall pools. */
  liquidity: number
  /** Current pool price, quote currency per base asset. */
  price: number
  /** Effective lower price bound; 0 means full range. */
  priceMin: number
  /** Effective upper price bound; Infinity means full range. */
  priceMax: number
  /** Single-price (pMin == pMax) concentrated position. */
  isWall: boolean
  /** Concentrated liquidity or stable swap (bounded effective range). */
  isConcentrated: boolean
  /**
   * The pool's declared [pMin, pMax] in pair orientation, set only for Biatec CLAMM
   * pools — used to detect ticks a pool exists for EXACTLY (adding liquidity there
   * joins the pool; anywhere else creates a new one). Distinct from
   * priceMin/priceMax, which are the reserve-derived effective range.
   */
  declaredMin: number | null
  declaredMax: number | null
}

export interface TvlBucket {
  from: number
  to: number
  /** TVL of concentrated/stable pools in this bucket, in quote currency units. */
  concentrated: number
  /** TVL of constant product pools in this bucket, in quote currency units. */
  constantProduct: number
  total: number
  /**
   * A Biatec CLAMM pool exists whose declared [pMin, pMax] equals exactly this tick
   * range — adding liquidity on this tick joins that pool; on any other tick it
   * creates a new pool. Deliberately NOT "some concentrated pool overlaps this
   * bucket": a wider pool overlapping finer ticks must not mark them as existing.
   * For a wall tick (`isWall`): a Biatec CLAMM wall pool exists at exactly this price.
   */
  hasExactPool: boolean
  /**
   * Standalone zero-width tick (from === to) holding wall pools (pMin === pMax)
   * whose price sits exactly on a grid boundary — rendered as a thin "price wall"
   * bar between the regular ticks. Wall pools whose price falls strictly inside a
   * bucket do NOT get their own tick; their TVL stays aggregated in that bucket.
   */
  isWall: boolean
}

export interface TvlDistribution {
  buckets: TvlBucket[]
  referencePrice: number
}

export interface TvlDistributionOptions {
  tickType: TickType
  /** Price used to value the base-asset side; defaults to TVL-weighted pool price. */
  referencePrice?: number
  /**
   * The current price the chart centers on — should be Add Liquidity's own
   * `state.midPrice` (shared via `store.state.liquidityGridWindow`) so the two
   * panels' windows agree; defaults to `referencePrice` (or the TVL-weighted pool
   * price) when not given.
   */
  midPrice?: number
  /**
   * Start of the price window — Add Liquidity's own `state.minPrice` (shared via
   * `store.state.liquidityGridWindow`) so both panels show the same extent. The grid
   * itself is canonical (absolute boundaries, see `tickGridBoundaries`), so this only
   * decides how much of it is shown, never where its boundaries fall. Defaults to the
   * derived `midPrice * visibleRangeFactor` when absent.
   */
  visibleFrom?: number
  /** End of the price window — Add Liquidity's `state.maxPrice`; derived when absent. */
  visibleTo?: number
  minPrice?: number
  maxPrice?: number
  maxBuckets?: number
}

/**
 * Nominal relative tick width per tick type (wide ≈ 100% of price, normal ≈ 10%,
 * narrow ≈ 1%), matching the shared package's logarithmic tick scheme.
 */
export const NOMINAL_TICK_FRACTIONS: Readonly<Record<TickType, number>> = {
  wide: 1,
  normal: 0.1,
  narrow: 0.01
}

/**
 * Display scale that converts a bucket's TVL into "TVL per nominal tick at this
 * price". The canonical 1/2/5×10^k grid quantizes tick widths, so the relative
 * bucket width jumps 2x/2.5x at step boundaries and raw per-bucket TVL of a smooth
 * (constant product) pool shows sawtooth spikes. Dividing by the bucket's log-width
 * and multiplying by the nominal tick log-width removes the quantization artifact
 * while keeping bars comparable across the whole axis.
 */
export const bucketNormalizationScale = (from: number, to: number, tickType: TickType): number => {
  if (!(from > 0) || !(to > from)) return 0
  return Math.log1p(NOMINAL_TICK_FRACTIONS[tickType]) / Math.log(to / from)
}

const invSqrt = (value: number): number =>
  Number.isFinite(value) && value > 0 ? 1 / Math.sqrt(value) : 0

/**
 * Token amounts locked in the price segment [from, to] for liquidity L at price P.
 * Handles from = 0 and to = Infinity (constant product pools).
 */
export const amountsInPriceRange = (
  liquidity: number,
  price: number,
  from: number,
  to: number
): { asset: number; currency: number } => {
  if (!(liquidity > 0) || !(price > 0) || !(to > from)) {
    return { asset: 0, currency: 0 }
  }
  const clamped = Math.min(Math.max(price, from), to)
  const asset = liquidity * Math.max(0, invSqrt(clamped) - invSqrt(to))
  const currency = liquidity * Math.max(0, Math.sqrt(clamped) - Math.sqrt(Math.max(from, 0)))
  return { asset, currency }
}

/**
 * Effective price range implied by real reserves: solving the segment formulas for the
 * bounds gives sqrt(pMin) = sqrt(P) - y/L and 1/sqrt(pMax) = 1/sqrt(P) - x/L. For a
 * constant product pool both collapse to 0 (full range); for concentrated / stable
 * pools they recover the actual bounds, so distributing L over [pMin, pMax] sums back
 * to exactly the real reserves.
 */
export const effectivePriceRange = (
  liquidity: number,
  price: number,
  realAsset: number,
  realCurrency: number
): { priceMin: number; priceMax: number } => {
  const sqrtP = Math.sqrt(price)
  const sqrtMin = Math.max(0, sqrtP - realCurrency / liquidity)
  const invSqrtMax = Math.max(0, 1 / sqrtP - realAsset / liquidity)
  // Snap numerical noise from full-range pools to the exact open bounds.
  const priceMin = sqrtMin * sqrtMin <= price * 1e-9 ? 0 : sqrtMin * sqrtMin
  const priceMax = invSqrtMax <= invSqrt(price) * 1e-9 ? Infinity : 1 / (invSqrtMax * invSqrtMax)
  return { priceMin, priceMax }
}

/**
 * Reduce a trade-API pool to the unified liquidity model, oriented so that prices are
 * quoted as pair currency per pair asset. Returns null when the pool is not for the
 * pair or carries no usable liquidity.
 */
export const normalizePoolLiquidity = (
  pool: Pool,
  assetId: number,
  currencyId: number
): NormalizedPoolLiquidity | null => {
  const idA = pool.assetIdA ?? null
  const idB = pool.assetIdB ?? null
  if (idA === null || idB === null) return null

  let reversed: boolean
  if (idA === assetId && idB === currencyId) {
    reversed = false
  } else if (idA === currencyId && idB === assetId) {
    reversed = true
  } else {
    return null
  }

  const realA = pool.realAmountA ?? 0
  const realB = pool.realAmountB ?? 0
  const virtualA = pool.virtualAmountA ?? 0
  const virtualB = pool.virtualAmountB ?? 0

  const realAsset = reversed ? realB : realA
  const realCurrency = reversed ? realA : realB
  if (!(realAsset > 0) && !(realCurrency > 0)) return null

  const key = pool.poolAddress ?? `${pool.poolAppId ?? 'pool'}`
  const isConcentrated =
    pool.ammType === AMMType.ConcentratedLiquidityAMM || pool.ammType === AMMType.StableSwap

  const pMin = pool.pMin ?? null
  const pMax = pool.pMax ?? null

  // Declared bounds in pair orientation — Biatec CLAMM pools only (these are the
  // ticks a user joins instead of creating a new pool).
  const isBiatecClamm =
    pool.protocol === DEXProtocol.Biatec && pool.ammType === AMMType.ConcentratedLiquidityAMM
  const declaredMin =
    isBiatecClamm && pMin !== null && pMax !== null && pMin > 0
      ? reversed
        ? 1 / pMax
        : pMin
      : null
  const declaredMax =
    isBiatecClamm && pMin !== null && pMax !== null && pMin > 0
      ? reversed
        ? 1 / pMin
        : pMax
      : null

  // Single-price concentrated position: all reserves sit at one price.
  if (
    pool.ammType === AMMType.ConcentratedLiquidityAMM &&
    pMin !== null &&
    pMax !== null &&
    pMin === pMax &&
    pMin > 0
  ) {
    const wallPrice = reversed ? 1 / pMin : pMin
    return {
      key,
      realAsset,
      realCurrency,
      liquidity: 0,
      price: wallPrice,
      priceMin: wallPrice,
      priceMax: wallPrice,
      isWall: true,
      isConcentrated: true,
      declaredMin,
      declaredMax
    }
  }

  const virtualAsset = reversed ? virtualB : virtualA
  const virtualCurrency = reversed ? virtualA : virtualB
  if (!(virtualAsset > 0) || !(virtualCurrency > 0)) return null

  const liquidity = Math.sqrt(virtualAsset * virtualCurrency)
  const price = virtualCurrency / virtualAsset
  if (!Number.isFinite(liquidity) || !(liquidity > 0) || !Number.isFinite(price) || !(price > 0)) {
    return null
  }

  const { priceMin, priceMax } = effectivePriceRange(liquidity, price, realAsset, realCurrency)
  return {
    key,
    realAsset,
    realCurrency,
    liquidity,
    price,
    priceMin,
    priceMax,
    isWall: false,
    isConcentrated,
    declaredMin,
    declaredMax
  }
}

/**
 * Boundaries of the canonical tick grid covering [minPrice, maxPrice] — the same
 * absolute grid `scripts/asset/calculateDistribution.ts` builds Add Liquidity's bins
 * on (both call the shared package's `tickGridBoundaries`), so the chart's ticks and
 * the pool bounds the form creates can never diverge, whatever window either uses.
 */
export const buildTickBoundaries = (
  minPrice: number,
  maxPrice: number,
  tickType: TickType,
  maxBuckets = 240
): number[] => {
  if (!(minPrice > 0) || !(maxPrice > minPrice)) return []
  return tickGridBoundaries(minPrice, maxPrice, precisionForTickType(tickType), maxBuckets + 1)
}

/** Options for {@link buildTickBoundariesAroundPrice}. */
export interface BuildBoundariesOptions {
  /** Window start (Add Liquidity's `state.minPrice`); derived when absent. */
  visibleFrom?: number
  /** Window end (Add Liquidity's `state.maxPrice`); derived when absent. */
  visibleTo?: number
  /** Safety cap on the total number of ticks (default 200). */
  maxTicks?: number
}

/**
 * Boundaries of the canonical tick grid over Add Liquidity's price window, centered
 * on the mid price: the grid covers `visibleFrom..visibleTo` (the form's own
 * `state.minPrice`/`state.maxPrice` when passed, else the derived
 * `midPrice * / visibleRangeFactor(precision)`), then the bucket containing the mid
 * price is **centered by tick count**: whichever side has fewer ticks is extended
 * past the window edge (the grid is absolute, so extending is just stepping to the
 * previous/next canonical boundary) until both sides match; if the downward extension
 * runs out of representable boundaries first, the upper side is trimmed instead.
 * Nominal price spans differ per side (log ticks widen as price grows) — the
 * guarantee is equal *counts*.
 */
export const buildTickBoundariesAroundPrice = (
  midPrice: number,
  tickType: TickType,
  options: BuildBoundariesOptions = {}
): number[] => {
  if (!(midPrice > 0)) return []
  const precision = precisionForTickType(tickType)
  const factor = visibleRangeFactor(precision)
  const from =
    options.visibleFrom !== undefined && options.visibleFrom > 0
      ? options.visibleFrom
      : midPrice * factor
  const to =
    options.visibleTo !== undefined && options.visibleTo > from
      ? options.visibleTo
      : midPrice / factor
  const maxTicks = options.maxTicks ?? 200

  const boundaries = tickGridBoundaries(from, to, precision, maxTicks + 1)
  if (boundaries.length < 2) return []

  // Center by tick count on the bucket containing the mid price.
  let midIndex = boundaries.findIndex(
    (b, i) => i + 1 < boundaries.length && b <= midPrice && midPrice < boundaries[i + 1]
  )
  if (midIndex === -1) {
    midIndex = midPrice < boundaries[0] ? 0 : boundaries.length - 2
  }
  const below = midIndex
  const above = boundaries.length - 2 - midIndex

  if (below < above) {
    let missing = above - below
    while (missing > 0) {
      const prev = prevTickGridBoundary(boundaries[0], precision)
      if (!(prev > 0) || !(prev < boundaries[0])) break
      boundaries.unshift(prev)
      midIndex += 1
      missing -= 1
    }
  } else if (above < below) {
    let missing = below - above
    while (missing > 0) {
      const next = nextTickGridBoundary(boundaries[boundaries.length - 1], precision)
      if (!(next > boundaries[boundaries.length - 1])) break
      boundaries.push(next)
      missing -= 1
    }
  }

  // Extension can come up short (downward walk running out of positive boundaries)
  // — trim the longer side so counts always match exactly.
  const bucketCount = boundaries.length - 1
  const perSide = Math.min(midIndex, bucketCount - 1 - midIndex)
  return boundaries.slice(midIndex - perSide, midIndex + perSide + 2)
}

// Relative tolerance for matching a pool's declared bound (or a wall pool's price)
// to a tick boundary — pools are created on grid prices, so only float/serialization
// noise is expected. Exported so the chart can match a wall selection back to its tick.
export const boundsMatch = (a: number, b: number): boolean =>
  Math.abs(a - b) <= Math.max(Math.abs(a), Math.abs(b)) * 1e-6

const weightedReferencePrice = (pools: NormalizedPoolLiquidity[]): number => {
  let weightSum = 0
  let priceSum = 0
  for (const pool of pools) {
    const value = pool.realAsset * pool.price + pool.realCurrency
    if (!(value > 0) || !Number.isFinite(pool.price)) continue
    weightSum += value
    priceSum += value * pool.price
  }
  return weightSum > 0 ? priceSum / weightSum : 0
}

/**
 * Combine all pools of a pair into the TVL locked per price tick, valued in quote
 * currency units at the reference price.
 */
export const calculateTvlDistribution = (
  pools: NormalizedPoolLiquidity[],
  options: TvlDistributionOptions
): TvlDistribution => {
  const referencePrice = options.referencePrice ?? weightedReferencePrice(pools)
  if (!(referencePrice > 0)) {
    return { buckets: [], referencePrice: 0 }
  }

  // Explicit window when given; otherwise walk the tick grid outward from the
  // reference price, capped per side by tick count and total price ratio.
  const boundaries =
    options.minPrice !== undefined && options.maxPrice !== undefined
      ? buildTickBoundaries(
          options.minPrice,
          options.maxPrice,
          options.tickType,
          options.maxBuckets ?? 240
        )
      : buildTickBoundariesAroundPrice(options.midPrice ?? referencePrice, options.tickType, {
          visibleFrom: options.visibleFrom,
          visibleTo: options.visibleTo,
          maxTicks: options.maxBuckets
        })
  if (boundaries.length < 2) {
    return { buckets: [], referencePrice }
  }

  // Wall pools (pMin === pMax) whose price sits exactly on a grid boundary become
  // standalone zero-width "wall ticks" inserted between the regular buckets; walls
  // strictly inside a bucket are not representable on this grid and stay aggregated
  // into the bucket containing them (the pre-existing behavior).
  const wallsAtBoundary = new Map<number, NormalizedPoolLiquidity[]>()
  const boundaryWalls = new Set<NormalizedPoolLiquidity>()
  for (const pool of pools) {
    if (!pool.isWall) continue
    const index = boundaries.findIndex((boundary) => boundsMatch(boundary, pool.price))
    if (index === -1) continue
    const list = wallsAtBoundary.get(index)
    if (list) {
      list.push(pool)
    } else {
      wallsAtBoundary.set(index, [pool])
    }
    boundaryWalls.add(pool)
  }
  const wallBucketAt = (index: number): TvlBucket | null => {
    const walls = wallsAtBoundary.get(index)
    if (!walls) return null
    const price = boundaries[index]
    let tvl = 0
    for (const pool of walls) {
      tvl += pool.realAsset * referencePrice + pool.realCurrency
    }
    return {
      from: price,
      to: price,
      concentrated: tvl,
      constantProduct: 0,
      total: tvl,
      // A wall pool with declared bounds is by definition a Biatec CLAMM pool at
      // exactly this price — adding a wall order here joins it.
      hasExactPool: walls.some((pool) => pool.declaredMin !== null),
      isWall: true
    }
  }

  const buckets: TvlBucket[] = []
  for (let i = 0; i < boundaries.length - 1; i++) {
    const wallBucket = wallBucketAt(i)
    if (wallBucket) buckets.push(wallBucket)
    const from = boundaries[i]
    const to = boundaries[i + 1]
    let concentrated = 0
    let constantProduct = 0
    for (const pool of pools) {
      let value = 0
      if (pool.isWall) {
        if (boundaryWalls.has(pool)) continue
        const isLast = i === boundaries.length - 2
        const inBucket = pool.price >= from && (pool.price < to || (isLast && pool.price === to))
        if (inBucket) {
          value = pool.realAsset * referencePrice + pool.realCurrency
        }
      } else {
        const overlapFrom = Math.max(from, pool.priceMin)
        const overlapTo = Math.min(to, pool.priceMax)
        const { asset, currency } = amountsInPriceRange(
          pool.liquidity,
          pool.price,
          overlapFrom,
          overlapTo
        )
        value = asset * referencePrice + currency
      }
      if (!(value > 0)) continue
      if (pool.isConcentrated) {
        concentrated += value
      } else {
        constantProduct += value
      }
    }
    const hasExactPool = pools.some(
      (pool) =>
        pool.declaredMin !== null &&
        pool.declaredMax !== null &&
        boundsMatch(pool.declaredMin, from) &&
        boundsMatch(pool.declaredMax, to)
    )
    buckets.push({
      from,
      to,
      concentrated,
      constantProduct,
      total: concentrated + constantProduct,
      hasExactPool,
      isWall: false
    })
  }
  const lastWall = wallBucketAt(boundaries.length - 1)
  if (lastWall) buckets.push(lastWall)

  return { buckets, referencePrice }
}
