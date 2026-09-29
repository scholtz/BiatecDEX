import { describe, expect, it } from 'vitest'
import type { Pool } from '@/api/models'
import {
  bucketFeeMatch,
  calculateTvlDistribution,
  normalizePoolLiquidity,
  type NormalizedPoolLiquidity,
  type TvlBucket
} from '../poolTvlDistribution'

const bucket = (over: Partial<TvlBucket>): TvlBucket => ({
  from: 1,
  to: 2,
  concentrated: 0,
  constantProduct: 0,
  total: 0,
  hasExactPool: false,
  exactPoolFees: [],
  isWall: false,
  ...over
})

describe('bucketFeeMatch', () => {
  it('is "none" without an exact pool', () => {
    expect(bucketFeeMatch(bucket({}), 1_000_000n)).toBe('none')
  })

  it('is "match" when an exact pool uses the selected fee', () => {
    const b = bucket({ hasExactPool: true, exactPoolFees: [3_000_000n, 1_000_000n] })
    expect(bucketFeeMatch(b, 1_000_000n)).toBe('match')
  })

  it('is "otherFee" when the tick has pools but none at the selected fee', () => {
    const b = bucket({ hasExactPool: true, exactPoolFees: [3_000_000n] })
    expect(bucketFeeMatch(b, 1_000_000n)).toBe('otherFee')
  })

  it('treats an unknown selected fee or unknown pool fees as a match (old behaviour)', () => {
    expect(bucketFeeMatch(bucket({ hasExactPool: true, exactPoolFees: [3_000_000n] }), null)).toBe(
      'match'
    )
    expect(bucketFeeMatch(bucket({ hasExactPool: true, exactPoolFees: [] }), 1_000_000n)).toBe(
      'match'
    )
  })
})

describe('declared fee reaches the buckets', () => {
  const clamm = (appId: number, lpFee: number, pMin: number, pMax: number): Pool =>
    ({
      poolAddress: `P${appId}`,
      poolAppId: appId,
      assetIdA: 1,
      assetIdB: 2,
      protocol: 'Biatec',
      ammType: 'ConcentratedLiquidityAMM',
      realAmountA: 100,
      realAmountB: 100,
      virtualAmountA: 200,
      virtualAmountB: 200,
      pMin,
      pMax,
      lpFee
    }) as Pool

  it('normalizePoolLiquidity converts the fractional lpFee to the 1e9 tier scale', () => {
    expect(normalizePoolLiquidity(clamm(1, 0.001, 0.5, 1), 1, 2)?.declaredFee).toBe(1_000_000n)
    expect(normalizePoolLiquidity(clamm(1, 0.0001, 0.5, 1), 1, 2)?.declaredFee).toBe(100_000n)
    expect(
      normalizePoolLiquidity({ ...clamm(1, 0.001, 0.5, 1), lpFee: null }, 1, 2)?.declaredFee
    ).toBeNull()
  })

  it('collects the fees of every exact pool of a tick', () => {
    const pools: NormalizedPoolLiquidity[] = [
      normalizePoolLiquidity(clamm(1, 0.001, 1, 2), 1, 2)!,
      normalizePoolLiquidity(clamm(2, 0.003, 1, 2), 1, 2)!
    ]
    const { buckets } = calculateTvlDistribution(pools, {
      tickType: 'wide',
      referencePrice: 1.4,
      minPrice: 1,
      maxPrice: 2
    })
    const exact = buckets.find((b) => b.hasExactPool)
    expect(exact).toBeDefined()
    expect([...exact!.exactPoolFees].sort()).toEqual([1_000_000n, 3_000_000n])
    expect(bucketFeeMatch(exact!, 3_000_000n)).toBe('match')
    expect(bucketFeeMatch(exact!, 10_000_000n)).toBe('otherFee')
  })
})
