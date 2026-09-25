/**
 * Core decision behind AddLiquidity.vue's `resolveInitialPrecision()`: pick
 * the tick-width precision to use for a pair, and whether that choice
 * should be written back as the "remembered" precision for the SAME pair's
 * future reloads.
 *
 * `storedPrecision` (`store.state.liquidityTickPrecision`) is a single
 * global field, the cross-panel sync channel shared with the pool liquidity
 * depth chart for ONE pair's viewing session (see CLAUDE.md "Cross-panel
 * sync"). It is not itself scoped per pair, so this function's `pairKey` /
 * `lastPairKey` comparison is what makes the stored value apply only within
 * a single pair's session:
 *
 * - Same pair as last time (`pairKey === lastPairKey`): the stored value —
 *   if the user (or the depth chart) already chose one — always wins. This
 *   is the deliberate cross-panel sync: re-resolving on the same pair (a
 *   refresh, a re-run of the price cascade) must not undo that choice.
 * - A genuinely different pair (`pairKey !== lastPairKey`, including the
 *   very first call with `lastPairKey === null`): the stored value is
 *   ignored even if one happens to be set (it belongs to whatever pair was
 *   viewed before) and `derived` — the new pair's own highest-liquidity
 *   default — is used instead. This is the bug fix: previously the stored
 *   value from an unrelated earlier pair kept winning for every pair
 *   afterward, because nothing ever told resolveInitialPrecision() the pair
 *   itself had changed.
 */
export interface PrecisionChoice {
  precision: number
  /** Caller should update its own "last resolved pair" tracking to this key. */
  resolvedForPairKey: string
}

export const resolvePrecisionChoice = (
  derived: number,
  storedPrecision: number | null,
  pairKey: string,
  lastPairKey: string | null
): PrecisionChoice => {
  const samePair = pairKey === lastPairKey
  const precision = samePair && typeof storedPrecision === 'number' ? storedPrecision : derived
  return { precision, resolvedForPairKey: pairKey }
}
