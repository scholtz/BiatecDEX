import { describe, expect, it } from 'vitest'
import {
  buildPairGraph,
  getAssetsWithPools,
  getMostLiquidPool,
  getPairedAssets,
  hasPair,
  type PairPool
} from '../pairGraph'

describe('pairGraph', () => {
  it('builds edges in both orientations', () => {
    const pools: PairPool[] = [{ appId: 1n, assetA: 10, assetB: 20, tvlUsd: 100 }]
    const graph = buildPairGraph(pools)
    expect(graph.get(10)?.get(20)?.tvlUsd).toBe(100)
    expect(graph.get(20)?.get(10)?.tvlUsd).toBe(100)
  })

  it('aggregates TVL across multiple pools of the same pair', () => {
    const pools: PairPool[] = [
      { appId: 1n, assetA: 10, assetB: 20, tvlUsd: 100 },
      { appId: 2n, assetA: 20, assetB: 10, tvlUsd: 50 }
    ]
    const graph = buildPairGraph(pools)
    expect(graph.get(10)?.get(20)?.tvlUsd).toBe(150)
    expect(graph.get(10)?.get(20)?.pools).toHaveLength(2)
  })

  it('skips self-paired pools so they cannot self-loop', () => {
    const pools: PairPool[] = [{ appId: 1n, assetA: 10, assetB: 10, tvlUsd: 100 }]
    const graph = buildPairGraph(pools)
    expect(graph.has(10)).toBe(false)
  })

  it('skips pools with non-finite asset ids', () => {
    const pools: PairPool[] = [{ appId: 1n, assetA: Number.NaN, assetB: 20, tvlUsd: 100 }]
    const graph = buildPairGraph(pools)
    expect(graph.size).toBe(0)
  })

  it('getAssetsWithPools returns every asset that has an edge', () => {
    const graph = buildPairGraph([
      { appId: 1n, assetA: 10, assetB: 20, tvlUsd: 1 },
      { appId: 2n, assetA: 20, assetB: 30, tvlUsd: 1 }
    ])
    expect(getAssetsWithPools(graph)).toEqual(new Set([10, 20, 30]))
  })

  it('getPairedAssets sorts by descending TVL, then lower asset id', () => {
    const graph = buildPairGraph([
      { appId: 1n, assetA: 10, assetB: 20, tvlUsd: 5 },
      { appId: 2n, assetA: 10, assetB: 30, tvlUsd: 50 },
      { appId: 3n, assetA: 10, assetB: 40, tvlUsd: 5 }
    ])
    expect(getPairedAssets(graph, 10)).toEqual([30, 20, 40])
  })

  it('getPairedAssets returns empty array for an asset with no pools', () => {
    const graph = buildPairGraph([{ appId: 1n, assetA: 10, assetB: 20, tvlUsd: 1 }])
    expect(getPairedAssets(graph, 999)).toEqual([])
  })

  it('hasPair is symmetric', () => {
    const graph = buildPairGraph([{ appId: 1n, assetA: 10, assetB: 20, tvlUsd: 1 }])
    expect(hasPair(graph, 10, 20)).toBe(true)
    expect(hasPair(graph, 20, 10)).toBe(true)
    expect(hasPair(graph, 10, 30)).toBe(false)
  })

  it('getMostLiquidPool picks the highest-TVL pair, then the highest-TVL pool within it', () => {
    const graph = buildPairGraph([
      { appId: 1n, assetA: 10, assetB: 20, tvlUsd: 5 },
      { appId: 2n, assetA: 10, assetB: 30, tvlUsd: 40 },
      { appId: 3n, assetA: 10, assetB: 30, tvlUsd: 60 }
    ])
    const best = getMostLiquidPool(graph, 10)
    expect(best?.otherAssetId).toBe(30)
    expect(best?.pool.appId).toBe(3n)
  })

  it('getMostLiquidPool breaks zero-TVL ties by pool count then lower asset id (on-chain fallback)', () => {
    const graph = buildPairGraph([
      { appId: 1n, assetA: 10, assetB: 40, tvlUsd: 0 },
      { appId: 2n, assetA: 10, assetB: 20, tvlUsd: 0 },
      { appId: 3n, assetA: 10, assetB: 20, tvlUsd: 0 }
    ])
    const best = getMostLiquidPool(graph, 10)
    // pair (10,20) has 2 pools vs (10,40)'s 1, so it wins despite equal TVL.
    expect(best?.otherAssetId).toBe(20)
  })

  it('getMostLiquidPool returns null for an asset with no pools', () => {
    const graph = buildPairGraph([{ appId: 1n, assetA: 10, assetB: 20, tvlUsd: 1 }])
    expect(getMostLiquidPool(graph, 999)).toBeNull()
  })

  it('getMostLiquidPool is deterministic regardless of input order', () => {
    const poolsA: PairPool[] = [
      { appId: 1n, assetA: 10, assetB: 20, tvlUsd: 5 },
      { appId: 2n, assetA: 10, assetB: 30, tvlUsd: 5 }
    ]
    const poolsB = [...poolsA].reverse()
    const bestA = getMostLiquidPool(buildPairGraph(poolsA), 10)
    const bestB = getMostLiquidPool(buildPairGraph(poolsB), 10)
    expect(bestA?.otherAssetId).toBe(bestB?.otherAssetId)
    expect(bestA?.pool.appId).toBe(bestB?.pool.appId)
  })

  it('handles an empty pool list without throwing', () => {
    const graph = buildPairGraph([])
    expect(graph.size).toBe(0)
    expect(getMostLiquidPool(graph, 10)).toBeNull()
    expect(getPairedAssets(graph, 10)).toEqual([])
    expect(hasPair(graph, 10, 20)).toBe(false)
  })
})
