/**
 * Which existing pools the Add Liquidity position will join: Add Liquidity creates/tops up one
 * pool per canonical grid bin of the selected tick width inside the range selected in the depth
 * chart, so the affected pools are exactly those whose [min, max] IS such a bin (a wall pool,
 * min === max, at the selected wall price) and - when a fee tier is selected - that use the
 * same base LP fee. Pools spanning several bins or off the grid are not affected (nor are
 * wall pools when a range of bins is selected).
 * Pure module (no Vue, no network).
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

export type GridBin = readonly [number, number]

/** Same cap as the Add Liquidity form (calculateDistribution), so both see the same bins. */
const MAX_BINS_BOUNDARIES = 1000

/**
 * The bins Add Liquidity puts liquidity into for a selected range: the consecutive pairs of
 * canonical grid boundaries (at the selected tick `precision`) that overlap
 * `[range.min, range.max]` - the same bins calculateDistribution allocates to. A wall
 * selection (min === max) is the single price itself.
 */
export const selectedGridBins = (range: SelectedRange, precision: number): GridBin[] => {
  if (range.min === range.max) return [[range.min, range.max]]
  const boundaries = tickGridBoundaries(range.min, range.max, precision, MAX_BINS_BOUNDARIES)
  const bins: GridBin[] = []
  for (let i = 0; i + 1 < boundaries.length; i++) {
    const lo = boundaries[i]
    const hi = boundaries[i + 1]
    // A bin only touching the range edge (float noise) is not part of it.
    if (hi > range.min * (1 + RELATIVE_TOLERANCE) && lo < range.max * (1 - RELATIVE_TOLERANCE)) {
      bins.push([lo, hi])
    }
  }
  return bins
}

/** Pool bounds are `round(price * 1e9)`: a grid price matches when it rounds to the same unit. */
const sameBound = (poolUnits: bigint, gridPrice: number): boolean => {
  const grid = Math.round(gridPrice * SCALE)
  const poolValue = Number(poolUnits)
  return Math.abs(poolValue - grid) <= Math.max(1, grid * RELATIVE_TOLERANCE)
}

/** The bins of a valid selection, or [] (no selection / invalid range / invalid precision). */
export const gridBinsForSelection = (
  range: SelectedRange | null | undefined,
  precision: number
): GridBin[] => {
  if (!range || !Number.isFinite(range.min) || !Number.isFinite(range.max)) return []
  if (!(range.min > 0) || range.max < range.min || !Number.isFinite(precision)) return []
  return selectedGridBins(range, precision)
}

/**
 * True when the pool is exactly one of the given bins: a pool spanning several bins, or off the
 * grid of the chosen tick width, is not touched by Add Liquidity.
 */
export const poolMatchesBins = (
  pool: Pick<PoolBounds, 'min' | 'max'>,
  bins: readonly GridBin[]
): boolean =>
  pool.min > 0n &&
  pool.max >= pool.min &&
  bins.some(([lo, hi]) => sameBound(pool.min, lo) && sameBound(pool.max, hi))

/** Bins matched and (when a fee tier is selected) the same base LP fee. */
export const poolIsSelected = (
  pool: PoolBounds,
  bins: readonly GridBin[],
  selectedFee: bigint | null | undefined
): boolean =>
  poolMatchesBins(pool, bins) &&
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
