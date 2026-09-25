import { computed, ref, type Ref, type ComputedRef } from 'vue'
import formatNumber from '@/scripts/asset/formatNumber'

export interface DashboardAsset {
  assetId: number
  amount: bigint
  decimals: number
  name: string
  symbol: string
  code?: string
  network: string
  usdPrice?: number
  usdValue?: number
}

export interface TraderDashboardComputed {
  assetRows: ComputedRef<
    {
      assetId: number
      assetName: string
      assetCode: string
      displayName: string
      amountLabel: string
      usdPriceLabel: string
      usdValueLabel: string
      usdValueRaw: number
      baseAmountRaw: number
      isFrom: boolean
    }[]
  >
  totalUsdValue: ComputedRef<number>
  assetCount: ComputedRef<number>
  largestHolding: ComputedRef<DashboardAsset | undefined>
  dailyChangePct: Ref<number | null>
  dailyChangeLabel: ComputedRef<string>
}

export function useTraderDashboardComputed(
  assetsRef: Ref<DashboardAsset[]>,
  selectedFromAssetCode: Ref<string | null>,
  locale: Ref<string>,
  formatUsd: (value?: number) => string,
  // Existing-pair filter (see CLAUDE.md "Pair-driven asset selection"): when
  // set, only assets whose id is in this set are shown as swap targets for
  // the selected from-asset. Null means "no filter" (nothing selected yet, or
  // the pair graph has not finished loading), so rows are never hidden due to
  // a slow/failed pool fetch.
  pairedAssetIds: Ref<Set<number> | null> = ref(null)
): TraderDashboardComputed {
  const assetRows = computed(() =>
    assetsRef.value
      .filter((row) => pairedAssetIds.value === null || pairedAssetIds.value.has(row.assetId))
      .map((row) => {
        const symbol = row.symbol ?? ''
        const decimals = row.decimals ?? 0
        const precision = decimals > 6 ? 6 : Math.max(0, decimals)
        const displayName = row.code ? `${row.name} (${row.code})` : row.name
        const base = Number(row.amount) / 10 ** decimals
        const usdValueRaw = row.usdValue ?? 0
        return {
          assetId: row.assetId,
          assetName: row.name,
          assetCode: row.code ?? '',
          displayName,
          amountLabel: formatNumber(row.amount, decimals, precision, true, locale.value, symbol),
          usdPriceLabel: formatUsd(row.usdPrice),
          usdValueLabel: formatUsd(row.usdValue),
          usdValueRaw,
          baseAmountRaw: base,
          isFrom: selectedFromAssetCode.value === (row.code ?? '')
        }
      })
  )

  const totalUsdValue = computed(() =>
    assetsRef.value.reduce((acc, a) => acc + (a.usdValue ?? 0), 0)
  )
  const assetCount = computed(() => assetsRef.value.length)
  const largestHolding = computed(() => {
    let largest: DashboardAsset | undefined
    for (const a of assetsRef.value) {
      if (!largest || (a.usdValue ?? 0) > (largest.usdValue ?? 0)) largest = a
    }
    return largest
  })

  const dailyChangePct = ref<number | null>(null)
  // Placeholder (null) until historical pricing integrated
  const dailyChangeLabel = computed(() => {
    const val = dailyChangePct.value
    if (val === null) return '—'
    return `${val > 0 ? '+' : ''}${val.toFixed(2)}%`
  })

  return { assetRows, totalUsdValue, assetCount, largestHolding, dailyChangePct, dailyChangeLabel }
}
