import type { Pool } from '@/api/models'
import { AMMType } from '@/api/models'
import {
  fromFixedBigInt,
  initPriceDecimals,
  precisionForTickType,
  toFixedBigInt,
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
}

export interface TvlBucket {
  from: number
  to: number
  /** TVL of concentrated/stable pools in this bucket, in quote currency units. */
  concentrated: number
  /** TVL of constant product pools in this bucket, in quote currency units. */
  constantProduct: number
  total: number
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
   * Anchor for the default tick window — should be Add Liquidity's own `state.midPrice`
   * (shared via `store.state.liquidityGridWindow`) so the two panels' windows agree;
   * defaults to `referencePrice` (or the TVL-weighted pool price) when not given.
   */
  midPrice?: number
  /**
   * Exact starting price of the tick walk — Add Liquidity's own `state.minPrice` at
   * the time its distribution was built (shared via `store.state.liquidityGridWindow`).
   * The raw tick grid is anchor-sensitive, and Add Liquidity does not re-derive its
   * window on every midPrice move, so re-computing `midPrice * visibleRangeFactor`
   * here can drift from the form's actual anchor; passing the exact value makes the
   * two grids identical by construction. Defaults to the derived value when absent.
   */
  visibleFrom?: number
  minPrice?: number
  maxPrice?: number
  maxBuckets?: number
  /** Ticks kept below the window when no explicit window is given. */
  maxTicksPerSide?: number
  /** Window cap as a price ratio around the mid price (default 32x each way). */
  maxWindowRatio?: number
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

  // Single-price concentrated position: all reserves sit at one price.
  const pMin = pool.pMin ?? null
  const pMax = pool.pMax ?? null
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
      isConcentrated: true
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
    isConcentrated
  }
}

interface FixedRange {
  from: bigint
  to: bigint
}

/**
 * Forward-walks the RAW tick grid the npm package's `initPriceDecimals` produces —
 * the same primitive `scripts/asset/calculateDistribution.ts` uses to build the grid
 * Add Liquidity actually creates pools on. This is deliberately NOT the "clean"
 * `cleanLogTick`/`getTickSize`/`snapPriceToTick` convenience wrapper: that wrapper
 * only rounds prices to nice 1/2/5×10^k values for UI steppers and does not represent
 * the tick sizes pools are bounded by (see its own doc comment: "the raw tick can be
 * non-round for sub-1 prices (0.9 → 0.09); use cleanLogTick when you need a clean
 * value for a UI stepper" — a depth chart needs the real bins, not the UI stepper).
 * Mirrors calculateDistribution.ts's walk-and-merge exactly, in fixed-point bigint.
 */
const walkRawRangesForward = (
  fromFixed: bigint,
  toFixed: bigint,
  precision: bigint,
  maxCount: number
): FixedRange[] => {
  if (!(fromFixed > 0n) || !(toFixed > fromFixed)) return []
  const tickSetup = initPriceDecimals(fromFixed, precision)
  let price = tickSetup.fitPrice
  const ranges: FixedRange[] = [{ from: price, to: price + tickSetup.tick }]
  price = price + tickSetup.tick
  while (price <= toFixed && ranges.length < maxCount) {
    const step = initPriceDecimals(price, precision)
    const rangeEnd = step.fitPrice + step.tick
    if (price === toFixed && step.fitPrice === price) break
    ranges.push({ from: step.fitPrice, to: rangeEnd })
    price = step.fitPrice + step.tick
  }
  // Merge overlapping ranges, exactly like calculateDistribution.ts.
  for (let i = 0; i < ranges.length - 1; i++) {
    if (ranges[i + 1].from < ranges[i].to) {
      ranges[i].to = ranges[i + 1].to
      ranges.splice(i + 1, 1)
      i--
    }
  }
  return ranges
}

/**
 * Backward walk of the same raw tick grid, from an already-fit `anchorFixed` boundary
 * down to `lowerLimitFixed`. `initPriceDecimals` only steps forward (that's how the
 * package and calculateDistribution.ts both consume it), so each step here derives
 * the local raw tick size just below the current boundary and re-fits the candidate
 * through `initPriceDecimals` again — the same "ask the primitive, don't compute it
 * ourselves" approach the forward walk uses, just run right-to-left.
 */
const walkRawRangesBackward = (
  anchorFixed: bigint,
  lowerLimitFixed: bigint,
  precision: bigint,
  maxCount: number
): FixedRange[] => {
  const ranges: FixedRange[] = []
  let boundary = anchorFixed
  while (ranges.length < maxCount && boundary > lowerLimitFixed && boundary > 0n) {
    const justBelow = boundary - 1n
    if (justBelow <= 0n) {
      ranges.push({ from: 0n, to: boundary })
      break
    }
    const localTick = initPriceDecimals(justBelow, precision).tick
    if (!(localTick > 0n)) break
    const candidate = boundary - localTick
    if (candidate <= 0n) {
      // A wide tick can legitimately span all the way down to zero (e.g. at price 1,
      // precision "wide" has a tick width of ~1) — that's the coarsest bucket, not
      // an error, so clamp instead of discarding it.
      ranges.push({ from: 0n, to: boundary })
      break
    }
    const snapped = initPriceDecimals(candidate, precision).fitPrice
    if (!(snapped < boundary)) break
    ranges.push({ from: snapped, to: boundary })
    boundary = snapped
  }
  return ranges.reverse()
}

const rangesToBoundaries = (ranges: FixedRange[]): number[] => {
  if (ranges.length === 0) return []
  const boundaries = ranges.map((range) => fromFixedBigInt(range.from))
  boundaries.push(fromFixedBigInt(ranges[ranges.length - 1].to))
  return boundaries
}

/**
 * Boundaries of the raw tick grid covering [minPrice, maxPrice], anchored at
 * minPrice — the same grid `calculateDistribution.ts` would build for that window.
 */
export const buildTickBoundaries = (
  minPrice: number,
  maxPrice: number,
  tickType: TickType,
  maxBuckets = 240
): number[] => {
  if (!(minPrice > 0) || !(maxPrice > minPrice)) return []
  const precision = BigInt(precisionForTickType(tickType))
  return rangesToBoundaries(
    walkRawRangesForward(toFixedBigInt(minPrice), toFixedBigInt(maxPrice), precision, maxBuckets)
  )
}

/**
 * Boundaries of the raw tick grid around a mid price, anchored the same way
 * `AddLiquidity.vue` anchors its own price-range window (`visibleRangeFactor`) so
 * the segment near the current price is the exact same chain Add Liquidity's own
 * grid walks — the raw tick grid is anchor-sensitive (each boundary is chained from
 * the previous one), so matching only the tick width/precision isn't enough; the
 * walk's starting price has to match too, or the two panels' ticks visibly diverge
 * even though they're using the identical algorithm.
 *
 * The upper walk starts at Add Liquidity's own `visibleFrom` — the exact
 * `state.minPrice` the form's grid used when `visibleFrom` is passed (preferred; the
 * form latches its window and does not re-derive it on every midPrice move), or the
 * derived `midPrice * visibleRangeFactor(precision)` as a fallback — and continues
 * forward as far as `maxWindowRatio` allows: a superset of what Add Liquidity itself
 * shows, extended further out for market-overview purposes, with the near-price
 * segment matching exactly. The lower walk extends further down than Add Liquidity's
 * own window (which doesn't go below its `visibleFrom` either, so there's nothing to
 * match down there) for the same overview purpose, continuing from that same start.
 */
export const buildTickBoundariesAroundPrice = (
  midPrice: number,
  tickType: TickType,
  maxTicksPerSide = 50,
  maxWindowRatio = 32,
  visibleFrom?: number
): number[] => {
  if (!(midPrice > 0)) return []
  const numericPrecision = precisionForTickType(tickType)
  const precision = BigInt(numericPrecision)
  // Prefer Add Liquidity's exact anchor when provided; the derived fallback only
  // coincides with it while the form's window is fresh (see visibleFrom option doc).
  const anchor =
    visibleFrom !== undefined && visibleFrom > 0
      ? visibleFrom
      : midPrice * visibleRangeFactor(numericPrecision)
  const visibleFromFixed = toFixedBigInt(anchor)
  const lowerLimitFixed = toFixedBigInt(midPrice / maxWindowRatio)
  const upperLimitFixed = toFixedBigInt(midPrice * maxWindowRatio)

  const upperRanges = walkRawRangesForward(
    visibleFromFixed,
    upperLimitFixed,
    precision,
    maxTicksPerSide * 2
  )
  if (upperRanges.length === 0) return []

  const anchorFixed = upperRanges[0].from
  const lowerRanges =
    anchorFixed > lowerLimitFixed
      ? walkRawRangesBackward(anchorFixed, lowerLimitFixed, precision, maxTicksPerSide)
      : []

  return rangesToBoundaries([...lowerRanges, ...upperRanges])
}

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
      : buildTickBoundariesAroundPrice(
          options.midPrice ?? referencePrice,
          options.tickType,
          options.maxTicksPerSide ?? 50,
          options.maxWindowRatio ?? 32,
          options.visibleFrom
        )
  if (boundaries.length < 2) {
    return { buckets: [], referencePrice }
  }

  const buckets: TvlBucket[] = []
  for (let i = 0; i < boundaries.length - 1; i++) {
    const from = boundaries[i]
    const to = boundaries[i + 1]
    let concentrated = 0
    let constantProduct = 0
    for (const pool of pools) {
      let value = 0
      if (pool.isWall) {
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
    buckets.push({ from, to, concentrated, constantProduct, total: concentrated + constantProduct })
  }

  return { buckets, referencePrice }
}
