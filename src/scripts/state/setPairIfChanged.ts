import type { IAsset } from '@/interface/IAsset'

/**
 * Anti-freeze (RESULT_CODE_HUNG) protection for the shared pair state.
 *
 * store.state.pair is watched by several components (AddLiquidity, AssetInfo,
 * trading panels). Multiple sync functions (useRouteParams, AddLiquidity's
 * syncStorePairWithRoute, header route sync) recompute the pair on overlapping
 * triggers, and each used to assign a FRESH object every run. A new object is
 * a reactive change even when its content is identical, so every no-op sync
 * re-fired every pair watcher; two writers that disagreed (or merely
 * alternated) fed an endless watcher cascade that froze the tab. Vue's
 * "Maximum recursive updates" detection is dev-only — production just hangs.
 *
 * Rule: NOTHING may assign store.state.pair directly; always go through
 * setPairIfChanged so semantically identical pairs never touch the store.
 */
export interface StorePair {
  invert: boolean
  currency: IAsset
  asset: IAsset
}

const sameAsset = (a?: IAsset, b?: IAsset): boolean =>
  !!a &&
  !!b &&
  Number(a.assetId) === Number(b.assetId) &&
  a.network === b.network &&
  a.code === b.code

/**
 * True when both pairs describe the same asset/currency split. `invert` is
 * deliberately ignored: it only records which argument order produced the
 * split (no consumer reads it back), and comparing it would reintroduce
 * ping-pong between call sites that pass the pair in opposite orders.
 */
export const isSamePair = (current: StorePair | undefined | null, next: StorePair): boolean =>
  !!current && sameAsset(current.asset, next.asset) && sameAsset(current.currency, next.currency)

/**
 * Writes `next` into `state.pair` only when it differs semantically.
 * Returns true when the store was updated.
 */
export const setPairIfChanged = (state: { pair: StorePair }, next: StorePair): boolean => {
  if (isSamePair(state.pair, next)) {
    return false
  }
  state.pair = next
  return true
}
