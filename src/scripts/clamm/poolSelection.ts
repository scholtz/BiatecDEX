/**
 * Which existing pools the Add Liquidity position will join: the pools whose price range
 * lies inside the range selected in the depth chart / Add Liquidity panel (a wall pool,
 * min === max, counts when its price is inside) and - when a fee tier is selected - that
 * use the same base LP fee. Pure module (no Vue, no network).
 */

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

export const poolInSelectedRange = (
  pool: Pick<PoolBounds, 'min' | 'max'>,
  range: SelectedRange | null | undefined
): boolean => {
  if (!range || !Number.isFinite(range.min) || !Number.isFinite(range.max)) return false
  if (!(range.min > 0) || range.max < range.min) return false
  const low = Number(pool.min) / SCALE
  const high = Number(pool.max) / SCALE
  if (!(low > 0) || high < low) return false
  const slackLow = range.min * RELATIVE_TOLERANCE
  const slackHigh = range.max * RELATIVE_TOLERANCE
  return low >= range.min - slackLow && high <= range.max + slackHigh
}

export const poolIsSelected = (
  pool: PoolBounds,
  range: SelectedRange | null | undefined,
  selectedFee: bigint | null | undefined
): boolean =>
  poolInSelectedRange(pool, range) &&
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
