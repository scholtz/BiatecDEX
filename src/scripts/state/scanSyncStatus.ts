/** A block processed by Biatec Scan (the trade reporter), as served by `api/coingecko/latest-block`. */
export interface ScanBlock {
  round: number
  /** UNIX timestamp of the block in seconds. */
  timestampSec: number
}

/**
 * - `ok`: the latest processed block is fresh.
 * - `syncing`: the block is old but the processed round advanced since the previous check (catching up).
 * - `stalled`: the block is old and the processed round did not advance.
 * - `unknown`: no data (no trade API for the network, endpoint unavailable): never warn.
 */
export type ScanSyncState = 'ok' | 'syncing' | 'stalled' | 'unknown'

/** Latest processed block older than this means the price data may be out of sync. */
export const SCAN_STALE_AFTER_SECONDS = 60

/**
 * Pure classifier. `previous` is the block seen by the previous poll. An old block without a baseline
 * is `unknown` (no banner yet): a second sample is needed to tell `syncing` from `stalled`.
 */
export const classifyScanSync = (
  latest: ScanBlock | null,
  previous: ScanBlock | null,
  nowSec: number
): ScanSyncState => {
  if (!latest || !Number.isFinite(latest.round) || !Number.isFinite(latest.timestampSec)) {
    return 'unknown'
  }
  if (nowSec - latest.timestampSec <= SCAN_STALE_AFTER_SECONDS) return 'ok'
  if (!previous) return 'unknown'
  return latest.round > previous.round ? 'syncing' : 'stalled'
}

/** Seconds behind the chain, never negative (clock skew). */
export const scanLagSeconds = (latest: ScanBlock, nowSec: number): number =>
  Math.max(0, Math.floor(nowSec - latest.timestampSec))
