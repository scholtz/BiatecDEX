/**
 * Which existing pools the Add Liquidity position will join: Add Liquidity creates/tops up one
 * pool per canonical grid bin of the selected tick width inside the range selected in the depth
 * chart, so the affected pools are exactly those whose [min, max] IS such a bin (a wall pool,
 * min === max, at the selected wall price) and - when a fee tier is selected - that use the
 * same base LP fee. Pools spanning several bins or off the grid are not affected. Pure module (no Vue, no network).
 */

import { tickGridBoundaries } from 'biatec-concentrated-liquidity-amm'
import type { RawAssetHolding } from '@/types/algorand'

export interface PoolBounds {
  /** Pool bounds scaled by 1e9 (the FullConfig representation). */
  min: bigint
  max: bigint
  fee: bigint
}

export interface SelectedRange {
  min: number
  max: number
}

const SCALE = 1e9
/** Pool bounds went through a 1e9 scaling and float round trips: compare with a tiny relative slack. */
const RELATIVE_TOLERANCE = 1e-9

/** Two prices are the same pool bound: the 1e9 scaling of a bound costs up to 5e-10 absolute. */
const sameBound = (poolBound: number, gridBound: number): boolean =>
  Math.abs(poolBound - gridBound) <= Math.max(Math.abs(gridBound) * RELATIVE_TOLERANCE, 5e-10)

/**
 * The bins Add Liquidity puts liquidity into for a selected range: every consecutive pair of
 * canonical grid boundaries (at the selected tick `precision`) inside `[range.min, range.max]`.
 * A wall selection (min === max) is the single price itself.
 */
export const selectedGridBins = (
  range: SelectedRange,
  precision: number
): Array<readonly [number, number]> => {
  if (range.min === range.max) return [[range.min, range.max]]
  const inside = tickGridBoundaries(range.min, range.max, precision).filter(
    (b) =>
      b >= range.min - range.min * RELATIVE_TOLERANCE && b <= range.max * (1 + RELATIVE_TOLERANCE)
  )
  const bins: Array<readonly [number, number]> = []
  for (let i = 0; i + 1 < inside.length; i++) bins.push([inside[i], inside[i + 1]])
  return bins
}

/**
 * True when the pool is exactly one of the selected range's grid bins: a pool spanning several
 * bins, or off the grid of the chosen tick width, is not touched by Add Liquidity.
 */
export const poolInSelectedRange = (
  pool: Pick<PoolBounds, 'min' | 'max'>,
  range: SelectedRange | null | undefined,
  precision: number
): boolean => {
  if (!range || !Number.isFinite(range.min) || !Number.isFinite(range.max)) return false
  if (!(range.min > 0) || range.max < range.min || !Number.isFinite(precision)) return false
  const low = Number(pool.min) / SCALE
  const high = Number(pool.max) / SCALE
  if (!(low > 0) || high < low) return false
  return selectedGridBins(range, precision).some(
    ([binLow, binHigh]) => sameBound(low, binLow) && sameBound(high, binHigh)
  )
}

export const poolIsSelected = (
  pool: PoolBounds,
  range: SelectedRange | null | undefined,
  selectedFee: bigint | null | undefined,
  precision: number
): boolean =>
  poolInSelectedRange(pool, range, precision) &&
  (selectedFee === null || selectedFee === undefined || pool.fee === selectedFee)

export type OptInState = 'optedIn' | 'notOptedIn' | 'unknown'

/**
 * Whether the account holds the pool's LP token. `heldAssetIds` is null while the account is
 * unknown (signed out / not loaded yet) and an LP id of 0 means the pool's LP token is
 * unknown - both are "unknown", never a false "not opted in".
 */
export const lpOptInState = (
  lpTokenId: bigint,
  heldAssetIds: ReadonlySet<bigint> | null
): OptInState => {
  if (heldAssetIds === null || lpTokenId <= 0n) return 'unknown'
  return heldAssetIds.has(lpTokenId) ? 'optedIn' : 'notOptedIn'
}

/**
 * Asset ids an account holds (opted in to), from algod holdings in either key shape
 * (`assetId` of the typed client, `asset-id` of the raw REST JSON).
 */
export const collectHeldAssetIds = (
  holdings: readonly RawAssetHolding[] | undefined
): Set<bigint> => {
  const ids = new Set<bigint>()
  for (const holding of holdings ?? []) {
    const id = holding?.['asset-id'] ?? holding?.assetId
    if (typeof id === 'bigint') ids.add(id)
    else if (typeof id === 'number' && Number.isSafeInteger(id)) ids.add(BigInt(id))
  }
  return ids
}
