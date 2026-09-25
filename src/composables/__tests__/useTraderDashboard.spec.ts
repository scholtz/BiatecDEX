import { describe, expect, it } from 'vitest'
import { ref } from 'vue'
import { useTraderDashboardComputed, type DashboardAsset } from '../useTraderDashboard'

const asset = (overrides: Partial<DashboardAsset> & { assetId: number }): DashboardAsset => ({
  amount: 1000000n,
  decimals: 6,
  name: `Asset ${overrides.assetId}`,
  symbol: `A${overrides.assetId}`,
  code: `code${overrides.assetId}`,
  network: 'testnet-v1.0',
  ...overrides
})

describe('useTraderDashboardComputed', () => {
  it('shows every asset when no pair filter is set (null)', () => {
    const assetsRef = ref<DashboardAsset[]>([asset({ assetId: 1 }), asset({ assetId: 2 })])
    const { assetRows } = useTraderDashboardComputed(
      assetsRef,
      ref(null),
      ref('en'),
      () => 'N/A',
      ref(null)
    )
    expect(assetRows.value).toHaveLength(2)
  })

  it('only shows assets in the pair filter set (existing-pair rule)', () => {
    const assetsRef = ref<DashboardAsset[]>([
      asset({ assetId: 1 }),
      asset({ assetId: 2 }),
      asset({ assetId: 3 })
    ])
    const { assetRows } = useTraderDashboardComputed(
      assetsRef,
      ref('code1'),
      ref('en'),
      () => 'N/A',
      ref(new Set([1, 2]))
    )
    expect(assetRows.value.map((r) => r.assetId).sort()).toEqual([1, 2])
  })

  it('returns an empty table when the pair filter set is empty (asset has no pools)', () => {
    const assetsRef = ref<DashboardAsset[]>([asset({ assetId: 1 }), asset({ assetId: 2 })])
    const { assetRows } = useTraderDashboardComputed(
      assetsRef,
      ref('code1'),
      ref('en'),
      () => 'N/A',
      ref(new Set())
    )
    expect(assetRows.value).toHaveLength(0)
  })

  it('totals and largest holding are unaffected by the pair filter (portfolio-wide)', () => {
    const assetsRef = ref<DashboardAsset[]>([
      asset({ assetId: 1, usdValue: 10 }),
      asset({ assetId: 2, usdValue: 90 })
    ])
    const { totalUsdValue, largestHolding } = useTraderDashboardComputed(
      assetsRef,
      ref('code1'),
      ref('en'),
      () => 'N/A',
      ref(new Set([1]))
    )
    expect(totalUsdValue.value).toBe(100)
    expect(largestHolding.value?.assetId).toBe(2)
  })
})
