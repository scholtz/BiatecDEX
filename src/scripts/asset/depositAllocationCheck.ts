/**
 * Anything exposing `toNumber()` - a BigNumber, or the reactive proxy Vue wraps around
 * one when the distribution lives in component state (the proxy drops BigNumber's
 * nominal `_isBigNumber` marker, so the plain BigNumber type would reject it).
 */
export interface NumberLike {
  toNumber(): number
}

/**
 * Why a planned add-liquidity submission cannot go through as entered:
 * - `no-deposit`: both deposit amounts are zero.
 * - `nothing-to-deposit`: at least one amount is non-zero but no tick bucket receives
 *   anything - the whole selected range sits on the side of the mid price that only
 *   accepts the OTHER asset (below the mid price a pool holds only the currency,
 *   above it only the asset), so the entered amount has nowhere to go.
 * - `asset-unused` / `currency-unused`: something would be deposited, but one of the
 *   non-zero amounts the user typed would be silently dropped.
 */
export type DepositAllocationReason =
  'no-deposit' | 'nothing-to-deposit' | 'asset-unused' | 'currency-unused'

/** Where the selected range lies relative to the mid price. */
export type RangeSide = 'below' | 'above' | 'spanning'

export interface DepositAllocationOk {
  ok: true
  assetAllocated: number
  currencyAllocated: number
  bucketCount: number
  side: RangeSide
}

export interface DepositAllocationProblem {
  ok: false
  reason: DepositAllocationReason
  side: RangeSide
}

export type DepositAllocationCheck = DepositAllocationOk | DepositAllocationProblem

export interface DepositAllocationInput {
  distribution: { asset1: NumberLike[]; asset2: NumberLike[] }
  depositAssetAmount: number
  depositCurrencyAmount: number
  midPrice: number
  lowPrice: number
  highPrice: number
}

const sumFinite = (values: NumberLike[]): number =>
  values.reduce((acc, v) => {
    const n = v.toNumber()
    return Number.isFinite(n) ? acc + n : acc
  }, 0)

export const rangeSideOfMidPrice = (
  midPrice: number,
  lowPrice: number,
  highPrice: number
): RangeSide => {
  if (!(midPrice > 0)) return 'spanning'
  if (highPrice <= midPrice) return 'below'
  if (lowPrice >= midPrice) return 'above'
  return 'spanning'
}

/**
 * Inspect the per-bucket deposit plan produced by `calculateDistribution` before
 * anything is signed. AddLiquidity's submit loop skips every bucket whose two amounts
 * are zero, so a plan where every bucket is empty would previously run zero
 * transactions and still report success; this check turns that (and a silently
 * dropped deposit) into an explicit, explainable refusal.
 */
export const checkDepositAllocation = (input: DepositAllocationInput): DepositAllocationCheck => {
  const side = rangeSideOfMidPrice(input.midPrice, input.lowPrice, input.highPrice)
  const wantsAsset = input.depositAssetAmount > 0
  const wantsCurrency = input.depositCurrencyAmount > 0
  if (!wantsAsset && !wantsCurrency) return { ok: false, reason: 'no-deposit', side }

  const assetAllocated = sumFinite(input.distribution.asset1)
  const currencyAllocated = sumFinite(input.distribution.asset2)
  const bucketCount = input.distribution.asset1.reduce((count, a, i) => {
    const b = input.distribution.asset2[i]
    const aNum = a.toNumber()
    const bNum = b === undefined ? 0 : b.toNumber()
    const nonEmpty = (Number.isFinite(aNum) && aNum !== 0) || (Number.isFinite(bNum) && bNum !== 0)
    return count + (nonEmpty ? 1 : 0)
  }, 0)

  if (bucketCount === 0 || (assetAllocated <= 0 && currencyAllocated <= 0)) {
    return { ok: false, reason: 'nothing-to-deposit', side }
  }
  if (wantsAsset && assetAllocated <= 0) return { ok: false, reason: 'asset-unused', side }
  if (wantsCurrency && currencyAllocated <= 0) {
    return { ok: false, reason: 'currency-unused', side }
  }
  return { ok: true, assetAllocated, currencyAllocated, bucketCount, side }
}

export default checkDepositAllocation
