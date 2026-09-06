import { describe, expect, it } from 'vitest'
import type { AggregatedPool } from '@/api/models'
import { aggregatedPoolPairPrice } from '../tradeApi'

const VOTE = 452399768
const GD = 1241945177

// api/aggregated-pool returns the pair in both orientations; both rows describe
// the same market (~0.0195 GD per VOTE).
const rows: AggregatedPool[] = [
  {
    assetIdA: VOTE,
    assetIdB: GD,
    virtualSumALevel1ForPrice: 1_000_000,
    virtualSumBLevel1ForPrice: 19_500
  },
  {
    assetIdA: GD,
    assetIdB: VOTE,
    virtualSumALevel1ForPrice: 19_500,
    virtualSumBLevel1ForPrice: 1_000_000
  }
]

describe('aggregatedPoolPairPrice', () => {
  it('returns currency-per-asset for the requested orientation', () => {
    expect(aggregatedPoolPairPrice(rows, VOTE, GD)).toBeCloseTo(0.0195, 9)
  })

  it('inverts a row that only exists in the opposite orientation', () => {
    expect(aggregatedPoolPairPrice([rows[1]], VOTE, GD)).toBeCloseTo(0.0195, 9)
    expect(aggregatedPoolPairPrice([rows[0]], GD, VOTE)).toBeCloseTo(1 / 0.0195, 6)
  })

  it('ignores rows of other pairs', () => {
    expect(aggregatedPoolPairPrice([{ ...rows[0], assetIdB: 0 }], VOTE, GD)).toBeNull()
  })

  it('returns null when price-discovery reserves are empty or missing', () => {
    expect(aggregatedPoolPairPrice([], VOTE, GD)).toBeNull()
    expect(
      aggregatedPoolPairPrice(
        [
          {
            assetIdA: VOTE,
            assetIdB: GD,
            virtualSumALevel1ForPrice: 0,
            virtualSumBLevel1ForPrice: 5
          }
        ],
        VOTE,
        GD
      )
    ).toBeNull()
    expect(
      aggregatedPoolPairPrice(
        [
          {
            assetIdA: VOTE,
            assetIdB: GD,
            virtualSumALevel1ForPrice: null,
            virtualSumBLevel1ForPrice: null
          }
        ],
        VOTE,
        GD
      )
    ).toBeNull()
  })

  it('skips an empty row and uses the next usable one', () => {
    const empty: AggregatedPool = { assetIdA: VOTE, assetIdB: GD, virtualSumALevel1ForPrice: 0 }
    expect(aggregatedPoolPairPrice([empty, rows[1]], VOTE, GD)).toBeCloseTo(0.0195, 9)
  })
})
