import { describe, expect, it, vi } from 'vitest'
import type { Pool } from '@/api/models'
import {
  ammStatusToPool,
  loadPairPools,
  mergePoolUpdate
} from '../liquidityPoolsSource'

const ASSET_ID = 10458941
const CURRENCY_ID = 0

// A healthy Biatec CLAMM pool as the trade reporter serves it (values from the
// real testnet USDC/tAlgo pair).
const reporterPool: Pool = {
  poolAddress: 'POOL_A',
  poolAppId: 768784928,
  assetIdA: ASSET_ID,
  assetIdB: CURRENCY_ID,
  ammType: 'ConcentratedLiquidityAMM',
  protocol: 'Biatec',
  pMin: 0.13,
  pMax: 0.14,
  realAmountA: 23.908445,
  realAmountB: 0.49315,
  virtualAmountA: 757.25395,
  virtualAmountB: 99.426867
} as Pool

const secondPool: Pool = {
  ...reporterPool,
  poolAddress: 'POOL_B',
  poolAppId: 768784875,
  pMin: 0.11,
  pMax: 0.12,
  realAmountA: 0,
  realAmountB: 2.662776,
  virtualAmountA: 521.218992,
  virtualAmountB: 62.546279
} as Pool

describe('loadPairPools', () => {
  it('uses the reporter pools when the reporter returns data', async () => {
    const fetchFromChain = vi.fn()
    const result = await loadPairPools([], {
      fetchFromReporter: async () => [reporterPool, secondPool],
      fetchFromChain
    })
    expect(result.pools).toEqual([reporterPool, secondPool])
    expect(result.source).toBe('reporter')
    expect(result.error).toBeNull()
    // The slow on-chain path must not run when the reporter succeeds.
    expect(fetchFromChain).not.toHaveBeenCalled()
  })

  it('falls back to the on-chain path when the reporter returns empty', async () => {
    const result = await loadPairPools([], {
      fetchFromReporter: async () => [],
      fetchFromChain: async () => [reporterPool]
    })
    expect(result.pools).toEqual([reporterPool])
    expect(result.source).toBe('chain')
    expect(result.error).toBeNull()
  })

  it('falls back to the on-chain path when the reporter throws', async () => {
    const result = await loadPairPools([], {
      fetchFromReporter: async () => {
        throw new Error('502 Bad Gateway')
      },
      fetchFromChain: async () => [reporterPool]
    })
    expect(result.pools).toEqual([reporterPool])
    expect(result.source).toBe('chain')
    expect(result.error).toBeNull()
  })

  it('accepts a genuinely empty pair (reporter and chain both empty)', async () => {
    const result = await loadPairPools([reporterPool], {
      fetchFromReporter: async () => [],
      fetchFromChain: async () => []
    })
    expect(result.pools).toEqual([])
    expect(result.source).toBe('chain')
    expect(result.error).toBeNull()
  })

  it('keeps the previous pools when both paths fail', async () => {
    const previous = [reporterPool, secondPool]
    const result = await loadPairPools(previous, {
      fetchFromReporter: async () => {
        throw new Error('reporter down')
      },
      fetchFromChain: async () => {
        throw new Error('algod down')
      }
    })
    // The chart must NOT wipe a working depth chart because one periodic
    // refresh failed — that is the "all candles get removed" bug.
    expect(result.pools).toEqual(previous)
    expect(result.source).toBe('previous')
    expect(result.error).toContain('reporter down')
  })

  it('reports the error with empty pools when both paths fail and there is no previous data', async () => {
    const result = await loadPairPools([], {
      fetchFromReporter: async () => {
        throw new Error('reporter down')
      },
      fetchFromChain: async () => {
        throw new Error('algod down')
      }
    })
    expect(result.pools).toEqual([])
    expect(result.source).toBe('previous')
    expect(result.error).toContain('reporter down')
  })

  it('keeps previous pools when the reporter is empty and the chain path throws', async () => {
    const previous = [reporterPool]
    const result = await loadPairPools(previous, {
      fetchFromReporter: async () => [],
      fetchFromChain: async () => {
        throw new Error('algod down')
      }
    })
    expect(result.pools).toEqual(previous)
    expect(result.source).toBe('previous')
    expect(result.error).toContain('algod down')
  })
})

describe('mergePoolUpdate', () => {
  it('ignores updates for pools of another pair', () => {
    const other = { ...reporterPool, assetIdA: 999999 } as Pool
    expect(mergePoolUpdate([reporterPool], other, ASSET_ID, CURRENCY_ID)).toBeNull()
  })

  it('appends a new pool of the pair', () => {
    const merged = mergePoolUpdate([reporterPool], secondPool, ASSET_ID, CURRENCY_ID)
    expect(merged).toEqual([reporterPool, secondPool])
  })

  it('replaces an existing pool with fresh data', () => {
    const updated = { ...reporterPool, realAmountA: 42 } as Pool
    const merged = mergePoolUpdate([reporterPool, secondPool], updated, ASSET_ID, CURRENCY_ID)
    expect(merged).toHaveLength(2)
    expect(merged![0].realAmountA).toBe(42)
  })

  it('does not replace a healthy pool with a degenerate live payload', () => {
    // A partially-populated SignalR payload (e.g. missing virtual amounts) must
    // not blank out an existing bar on the chart.
    const degenerate = {
      poolAddress: reporterPool.poolAddress,
      poolAppId: reporterPool.poolAppId,
      assetIdA: ASSET_ID,
      assetIdB: CURRENCY_ID,
      ammType: 'ConcentratedLiquidityAMM',
      protocol: 'Biatec',
      pMin: 0.13,
      pMax: 0.14,
      realAmountA: 5,
      realAmountB: 5,
      virtualAmountA: 0,
      virtualAmountB: 0
    } as Pool
    expect(mergePoolUpdate([reporterPool], degenerate, ASSET_ID, CURRENCY_ID)).toBeNull()
  })

  it('accepts an explicitly drained pool (all reserves zero)', () => {
    const drained = {
      ...reporterPool,
      realAmountA: 0,
      realAmountB: 0,
      virtualAmountA: 0,
      virtualAmountB: 0
    } as Pool
    const merged = mergePoolUpdate([reporterPool], drained, ASSET_ID, CURRENCY_ID)
    expect(merged).toHaveLength(1)
    expect(merged![0].realAmountA).toBe(0)
  })

  it('ignores a degenerate payload for an unknown pool', () => {
    const degenerate = {
      poolAddress: 'UNKNOWN',
      poolAppId: 1,
      assetIdA: ASSET_ID,
      assetIdB: CURRENCY_ID,
      virtualAmountA: 0,
      virtualAmountB: 0,
      realAmountA: 0,
      realAmountB: 0
    } as Pool
    // Zero reserves for a pool we never displayed adds nothing to the chart.
    expect(mergePoolUpdate([reporterPool], degenerate, ASSET_ID, CURRENCY_ID)).toBeNull()
  })
})

describe('ammStatusToPool', () => {
  it('reconstructs reporter-equivalent pool values from on-chain status', () => {
    // Real testnet pool 768784928: L = 274.392761265, price such that
    // virtualA = 757.25..., virtualB = 99.42... (values cross-checked against the
    // trade reporter response for the same pool).
    const price = 99.426867 / 757.25395
    const pool = ammStatusToPool({
      appId: 768784928n,
      assetA: BigInt(ASSET_ID),
      assetB: BigInt(CURRENCY_ID),
      pMin: 0.13,
      pMax: 0.14,
      lpFee: 0.001,
      verificationClass: 0,
      assetABalance: 23908445000n,
      assetBBalance: 493150000n,
      currentLiquidity: 274392761265n,
      price: BigInt(Math.round(price * 1e9))
    })
    expect(pool.poolAppId).toBe(768784928)
    expect(pool.assetIdA).toBe(ASSET_ID)
    expect(pool.assetIdB).toBe(CURRENCY_ID)
    expect(pool.protocol).toBe('Biatec')
    expect(pool.ammType).toBe('ConcentratedLiquidityAMM')
    expect(pool.pMin).toBeCloseTo(0.13, 9)
    expect(pool.pMax).toBeCloseTo(0.14, 9)
    expect(pool.realAmountA).toBeCloseTo(23.908445, 9)
    expect(pool.realAmountB).toBeCloseTo(0.49315, 9)
    expect(pool.virtualAmountA).toBeCloseTo(757.25395, 2)
    expect(pool.virtualAmountB).toBeCloseTo(99.426867, 2)
  })

  it('handles a wall pool (pMin == pMax) without dividing by a zero-width range', () => {
    const pool = ammStatusToPool({
      appId: 1n,
      assetA: BigInt(ASSET_ID),
      assetB: BigInt(CURRENCY_ID),
      pMin: 0.13,
      pMax: 0.13,
      lpFee: 0.001,
      verificationClass: 0,
      assetABalance: 5000000000n,
      assetBBalance: 0n,
      currentLiquidity: 0n,
      price: BigInt(Math.round(0.13 * 1e9))
    })
    expect(pool.pMin).toBe(pool.pMax)
    expect(pool.realAmountA).toBeCloseTo(5, 9)
    expect(pool.hasZeroWidthPriceRange).toBe(true)
  })
})
