import { describe, expect, it } from 'vitest'
import { resolvePrecisionChoice } from '../resolvePrecisionChoice'

describe('resolvePrecisionChoice', () => {
  it('uses the derived value on the very first call (no last pair yet)', () => {
    const result = resolvePrecisionChoice(2, null, 'vote:0', null)
    expect(result.precision).toBe(2)
    expect(result.resolvedForPairKey).toBe('vote:0')
  })

  it('prefers a stored value when re-resolving the SAME pair (cross-panel sync)', () => {
    // e.g. the user picked "wide" via the depth chart; a later re-run of the
    // price cascade for the same pair must not silently revert that choice.
    const result = resolvePrecisionChoice(2, 0, 'vote:0', 'vote:0')
    expect(result.precision).toBe(0)
  })

  it('uses the derived value for the SAME pair when nothing is stored yet', () => {
    const result = resolvePrecisionChoice(2, null, 'vote:0', 'vote:0')
    expect(result.precision).toBe(2)
  })

  it('ignores a stored value from a DIFFERENT pair — the reported bug', () => {
    // vote/ALGO left "normal" (1) stored; switching to GLD/GD (which has
    // pools only at "wide", i.e. derived=0) must adopt GLD/GD's own default,
    // not keep vote/ALGO's leftover precision.
    const result = resolvePrecisionChoice(0, 1, 'GLD:GD', 'vote:ALGO')
    expect(result.precision).toBe(0)
  })

  it('always reports resolvedForPairKey as the current pairKey, not the last one', () => {
    const result = resolvePrecisionChoice(0, 1, 'GLD:GD', 'vote:ALGO')
    expect(result.resolvedForPairKey).toBe('GLD:GD')
  })

  it('treats a re-resolve of the same pair as "same" even across many calls', () => {
    const first = resolvePrecisionChoice(2, null, 'GLD:GD', null)
    const second = resolvePrecisionChoice(2, first.precision, 'GLD:GD', first.resolvedForPairKey)
    expect(second.precision).toBe(first.precision)
    const third = resolvePrecisionChoice(2, 5, 'GLD:GD', second.resolvedForPairKey)
    expect(third.precision).toBe(5) // user's own later choice, still honored
  })

  it('honors a manual tick-width pick made for the pair on screen (applyTickPrecision contract)', () => {
    // AddLiquidity.vue's applyTickPrecision (manual button click, or the depth
    // chart's own control) writes store.state.liquidityTickPrecision directly,
    // bypassing this function — it MUST also update its own lastPrecisionPairKey
    // to the pair it was picked for, or a resolveInitialPrecision() call that
    // runs afterward for that same pair (e.g. a slow reference-price fallback
    // landing after the user already chose) would see a stale lastPairKey,
    // wrongly conclude the manual choice belongs to "a different pair", and
    // silently overwrite it. This models applyTickPrecision doing that update
    // correctly: the manually-set value must survive the later resolve.
    const manualPick = { pairKey: 'GLD:GD', storedPrecision: 0 }
    const result = resolvePrecisionChoice(
      2 /* derived, ignored since same pair */,
      manualPick.storedPrecision,
      manualPick.pairKey,
      manualPick.pairKey // lastPrecisionPairKey correctly updated by applyTickPrecision
    )
    expect(result.precision).toBe(0)
  })

  it('demonstrates the regression when a manual pick does NOT update lastPairKey', () => {
    // Same setup as above, but with lastPairKey left stale (the bug a self-review
    // round caught) — the manual choice is wrongly discarded in favor of derived.
    const result = resolvePrecisionChoice(2, 0, 'GLD:GD', 'some-other-pair')
    expect(result.precision).toBe(2)
  })

  it('survives a component remount for the SAME pair (lastPairKey must be store state, not component-local)', () => {
    // AddLiquidity.vue can remount without the pair changing — ManageLiquidity.vue
    // swaps it out for the remove-liquidity/pool-swap tab and back via a route-name
    // v-if/v-else chain. store.state.liquidityTickPrecision AND
    // store.state.liquidityTickPrecisionPairKey both survive that remount (Pinia
    // state); a component-local "last pair" variable would not, and would
    // wrongly present lastPairKey as null here even though the pair never
    // changed, discarding the user's still-valid stored precision.
    const result = resolvePrecisionChoice(
      2 /* derived, must be ignored */,
      0 /* the user's stored choice from before the remount */,
      'GLD:GD',
      'GLD:GD' /* store-persisted lastPairKey, unaffected by the remount */
    )
    expect(result.precision).toBe(0)
  })
})
