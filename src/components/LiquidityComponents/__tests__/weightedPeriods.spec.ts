import { describe, expect, it } from 'vitest'
import type { AppPoolInfo } from 'biatec-concentrated-liquidity-amm'
import { computeWeightedPeriod } from '../weightedPeriods'

const createPoolInfo = (
  overrides: Partial<Record<string, bigint | number>> = {}
): AppPoolInfo => ({
  period3Duration: BigInt(30),
  period3NowTime: BigInt(20),
  period3NowVolumeB: BigInt(300),
  period3PrevVolumeB: BigInt(600),
  period3NowVwap: BigInt(200),
  period3PrevVwap: BigInt(180),
  ...overrides
} as unknown as AppPoolInfo)

describe('computeWeightedPeriod', () => {
  it('blends current and previous periods proportionally by time and volume', () => {
    const result = computeWeightedPeriod(createPoolInfo(), 'period3')

    expect(result.volume).toBeCloseTo(500)
    expect(result.price).toBeCloseTo(192)
  })

  it('falls back to current period when previous data is empty', () => {
    const result = computeWeightedPeriod(
      createPoolInfo({
        period3PrevVolumeB: BigInt(0),
        period3PrevVwap: BigInt(0)
      }),
      'period3'
    )

    expect(result.volume).toBeCloseTo(300)
    expect(result.price).toBeCloseTo(200)
  })

  it('ignores previous contribution when current period already covers the duration', () => {
    const result = computeWeightedPeriod(
      createPoolInfo({
        period3NowTime: BigInt(30),
        period3PrevVolumeB: BigInt(900),
        period3PrevVwap: BigInt(150)
      }),
      'period3'
    )

    expect(result.volume).toBeCloseTo(300)
    expect(result.price).toBeCloseTo(200)
  })
})
