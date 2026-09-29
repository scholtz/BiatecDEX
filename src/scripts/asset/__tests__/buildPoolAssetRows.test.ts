import { describe, it, expect } from 'vitest'
import { buildPoolAssetRows } from '../buildPoolAssetRows'

describe('buildPoolAssetRows', () => {
  it('builds one row per pooled asset id, preferring catalog name/code/symbol over the stat', () => {
    const rows = buildPoolAssetRows(
      [0, 123],
      new Map([
        [0, { name: 'Algorand', code: 'ALGO', symbol: 'ALGO', decimals: 6 }],
        [123, { name: 'Managed Token', code: 'asa123', symbol: 'MGD', decimals: 2 }]
      ]),
      new Map([
        [0, { assetName: 'stat-name', unitName: 'stat-symbol', tvlusd: 100, tvlOtherUSD: 50 }],
        [123, { assetName: 'stat-name-2', tvlusd: 10, tvlOtherUSD: 0 }]
      ])
    )

    expect(rows).toHaveLength(2)
    const algo = rows.find((r) => r.assetId === 0)!
    expect(algo.assetName).toBe('Algorand')
    expect(algo.assetCode).toBe('ALGO')
    expect(algo.assetSymbol).toBe('ALGO')
    expect(algo.aggregatedUsdValueInPools).toBe(150)
    expect(algo.aggregatedAmountInPools).toBe(0)
    expect(algo.currentHoldingAmount).toBe(0n)
    expect(algo.currentHoldingUsdValue).toBe(0)
  })

  it('falls back to the stat, then a synthetic name/code, when the asset is not in the catalog', () => {
    const rows = buildPoolAssetRows(
      [777, 888],
      new Map(),
      new Map([[777, { assetName: 'Only From Stat', unitName: 'OFS', tvlusd: 5 }]])
    )

    const fromStat = rows.find((r) => r.assetId === 777)!
    expect(fromStat.assetName).toBe('Only From Stat')
    expect(fromStat.assetCode).toBe('asa777')
    expect(fromStat.assetSymbol).toBe('OFS')

    const fromNothing = rows.find((r) => r.assetId === 888)!
    expect(fromNothing.assetName).toBe('Asset #888')
    expect(fromNothing.assetCode).toBe('asa888')
    expect(fromNothing.assetSymbol).toBe('')
    expect(fromNothing.aggregatedUsdValueInPools).toBe(0)
  })

  it('uses the ALGO code fallback specifically for asset id 0', () => {
    const rows = buildPoolAssetRows([0], new Map(), new Map())
    expect(rows[0].assetCode).toBe('ALGO')
  })

  it('sorts rows by aggregated USD value descending', () => {
    const rows = buildPoolAssetRows(
      [1, 2, 3],
      new Map(),
      new Map([
        [1, { tvlusd: 10 }],
        [2, { tvlusd: 100 }],
        [3, { tvlusd: 50 }]
      ])
    )
    expect(rows.map((r) => r.assetId)).toEqual([2, 3, 1])
  })

  it('returns an empty array for no pooled assets', () => {
    expect(buildPoolAssetRows([], new Map(), new Map())).toEqual([])
  })

  it('derives a nonzero amount from tvlusd/priceUSD instead of a bare 0 next to a real USD value', () => {
    const rows = buildPoolAssetRows(
      [1],
      new Map(),
      new Map([[1, { tvlusd: 200, tvlOtherUSD: 100, priceUSD: 2 }]])
    )
    expect(rows[0].aggregatedAmountInPools).toBe(100)
    expect(rows[0].aggregatedUsdValueInPools).toBe(300)
  })

  it('falls back to 0 amount when priceUSD is missing, zero or non-finite', () => {
    const rows = buildPoolAssetRows(
      [1, 2, 3],
      new Map(),
      new Map([
        [1, { tvlusd: 200 }],
        [2, { tvlusd: 200, priceUSD: 0 }],
        [3, { tvlusd: 200, priceUSD: -1 }]
      ])
    )
    expect(rows.every((r) => r.aggregatedAmountInPools === 0)).toBe(true)
  })
})
