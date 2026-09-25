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
})
