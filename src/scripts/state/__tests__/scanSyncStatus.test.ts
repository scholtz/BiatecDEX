import { describe, expect, it } from 'vitest'
import { classifyScanSync, scanLagSeconds, SCAN_STALE_AFTER_SECONDS } from '../scanSyncStatus'

const now = 1_000_000
const block = (round: number, age: number) => ({ round, timestampSec: now - age })

describe('classifyScanSync', () => {
  it('is unknown without data or with garbage', () => {
    expect(classifyScanSync(null, null, now)).toBe('unknown')
    expect(classifyScanSync({ round: NaN, timestampSec: now }, null, now)).toBe('unknown')
  })
  it('is ok while the block is within the threshold', () => {
    expect(classifyScanSync(block(10, 5), null, now)).toBe('ok')
    expect(classifyScanSync(block(10, SCAN_STALE_AFTER_SECONDS), null, now)).toBe('ok')
  })
  it('is stalled when old and not incrementing (or first look)', () => {
    expect(classifyScanSync(block(10, 61), null, now)).toBe('stalled')
    expect(classifyScanSync(block(10, 300), block(10, 315), now)).toBe('stalled')
  })
  it('is syncing when old but the round advanced', () => {
    expect(classifyScanSync(block(12, 300), block(10, 315), now)).toBe('syncing')
  })
  it('recovers to ok once fresh', () => {
    expect(classifyScanSync(block(500, 3), block(12, 300), now)).toBe('ok')
  })
  it('clamps the lag at zero for clock skew', () => {
    expect(scanLagSeconds({ round: 1, timestampSec: now + 50 }, now)).toBe(0)
    expect(scanLagSeconds(block(1, 90), now)).toBe(90)
  })
})
