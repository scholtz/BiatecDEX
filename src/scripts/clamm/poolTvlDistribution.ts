import type { Pool } from '@/api/models'
import { AMMType } from '@/api/models'
import { getTickSize, snapPriceToTick, type TickType } from 'biatec-concentrated-liquidity-amm'

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
  minPrice?: number
  maxPrice?: number
  maxBuckets?: number
  /** Ticks kept on each side of the reference price when no explicit window is given. */
  maxTicksPerSide?: number
  /** Window cap as a price ratio around the reference price (default 32x each way). */
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

/**
 * Boundaries of the shared logarithmic tick grid covering [minPrice, maxPrice].
 * Each boundary is snapped to the canonical 1/2/5×10^k grid of the selected tick
 * type, so a wide pool range splits into exactly the finer ticks a narrow view uses.
 */
export const buildTickBoundaries = (
  minPrice: number,
  maxPrice: number,
  tickType: TickType,
  maxBuckets = 120
): number[] => {
  if (!(minPrice > 0) || !(maxPrice > minPrice)) return []
  let start = snapPriceToTick(minPrice, tickType, 'down')
  if (!(start > 0)) {
    start = getTickSize(minPrice, tickType)
  }
  if (!(start > 0)) return []
  const boundaries: number[] = [start]
  let current = start
  for (let i = 0; i < maxBuckets && current < maxPrice; i++) {
    const step = getTickSize(current, tickType)
    if (!(step > 0)) break
    let next = snapPriceToTick(current + step, tickType)
    if (!(next > current)) next = current + step
    boundaries.push(next)
    current = next
  }
  return boundaries
}

/**
 * Boundaries of the canonical tick grid built outward from a center price. The walk
 * is capped both by a tick count per side and by a total price ratio, so wide ticks
 * still yield several buckets (constant product liquidity spans 0..Infinity) while
 * narrow ticks stay a readable zoom around the current price.
 */
export const buildTickBoundariesAroundPrice = (
  center: number,
  tickType: TickType,
  maxTicksPerSide = 50,
  maxWindowRatio = 32
): number[] => {
  if (!(center > 0)) return []
  let start = snapPriceToTick(center, tickType, 'down')
  if (!(start > 0)) {
    start = getTickSize(center, tickType)
  }
  if (!(start > 0)) return []

  const lower: number[] = []
  let down = start
  while (lower.length < maxTicksPerSide && down > center / maxWindowRatio) {
    // Tick size just below the boundary: at a grid step boundary the tick at the
    // boundary itself is already the larger step above it.
    const step = getTickSize(down * (1 - 1e-9), tickType)
    if (!(step > 0)) break
    let next = snapPriceToTick(down - step, tickType)
    if (!(next > 0) || next >= down) {
      // Stepping by the full tick underflowed (wide ticks near their decade start,
      // e.g. 1 - 1 = 0): fall back to the canonical boundary of the decade below.
      next = snapPriceToTick(down / 2, tickType)
    }
    if (!(next > 0) || next >= down) break
    lower.push(next)
    down = next
  }

  const upper: number[] = []
  let up = start
  while (upper.length < maxTicksPerSide && up < center * maxWindowRatio) {
    const step = getTickSize(up, tickType)
    if (!(step > 0)) break
    let next = snapPriceToTick(up + step, tickType)
    if (!(next > up)) next = up + step
    upper.push(next)
    up = next
  }

  return [...lower.reverse(), start, ...upper]
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
          referencePrice,
          options.tickType,
          options.maxTicksPerSide ?? 50,
          options.maxWindowRatio ?? 32
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
