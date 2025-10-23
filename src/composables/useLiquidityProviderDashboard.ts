import { computed, ref, type Ref, type ComputedRef } from 'vue'
import formatNumber from '@/scripts/asset/formatNumber'

export interface LiquidityPosition {
  poolAppId: number
  assetIdA: number
  assetIdB: number
  amountA: bigint
  amountB: bigint
  decimalsA: number
  decimalsB: number
  nameA: string
  nameB: string
  symbolA: string
  symbolB: string
  codeA?: string
  codeB?: string
  network: string
  usdPriceA?: number
  usdPriceB?: number
  usdValueA?: number
  usdValueB?: number
  lpTokenAmount?: bigint
  lpTokenDecimals?: number
}

export interface LiquidityProviderDashboardComputed {
  positionRows: ComputedRef<
    {
      poolAppId: number
      assetIdA: number
      assetIdB: number
      displayNameA: string
      displayNameB: string
      amountLabelA: string
      amountLabelB: string
      usdPriceLabelA: string
      usdPriceLabelB: string
      usdValueLabelA: string
      usdValueLabelB: string
      totalUsdValue: number
      totalUsdValueLabel: string
      isSelected: boolean
      codeA?: string
      codeB?: string
    }[]
  >
  totalUsdValue: ComputedRef<number>
  positionCount: ComputedRef<number>
  largestPosition: ComputedRef<LiquidityPosition | undefined>
}

export function useLiquidityProviderDashboardComputed(
  positionsRef: Ref<LiquidityPosition[]>,
  selectedAssetCode: Ref<string | null>,
  locale: Ref<string>,
  formatUsd: (value?: number) => string
): LiquidityProviderDashboardComputed {
  const positionRows = computed(() =>
    positionsRef.value.map((position) => {
      const symbolA = position.symbolA ?? ''
      const symbolB = position.symbolB ?? ''
      const decimalsA = position.decimalsA ?? 0
      const decimalsB = position.decimalsB ?? 0
      const precisionA = decimalsA > 6 ? 6 : Math.max(0, decimalsA)
      const precisionB = decimalsB > 6 ? 6 : Math.max(0, decimalsB)
      
      const displayNameA = position.codeA ? `${position.nameA} (${position.codeA})` : position.nameA
      const displayNameB = position.codeB ? `${position.nameB} (${position.codeB})` : position.nameB
      
      const usdValueA = position.usdValueA ?? 0
      const usdValueB = position.usdValueB ?? 0
      const totalUsdValue = usdValueA + usdValueB
      
      return {
        poolAppId: position.poolAppId,
        assetIdA: position.assetIdA,
        assetIdB: position.assetIdB,
        codeA: position.codeA ?? '',
        codeB: position.codeB ?? '',
        displayNameA,
        displayNameB,
        amountLabelA: formatNumber(position.amountA, decimalsA, precisionA, true, locale.value, symbolA),
        amountLabelB: formatNumber(position.amountB, decimalsB, precisionB, true, locale.value, symbolB),
        usdPriceLabelA: formatUsd(position.usdPriceA),
        usdPriceLabelB: formatUsd(position.usdPriceB),
        usdValueLabelA: formatUsd(position.usdValueA),
        usdValueLabelB: formatUsd(position.usdValueB),
        totalUsdValue,
        totalUsdValueLabel: formatUsd(totalUsdValue),
        isSelected: selectedAssetCode.value === (position.codeA ?? '') || selectedAssetCode.value === (position.codeB ?? '')
      }
    })
  )

  const totalUsdValue = computed(() =>
    positionsRef.value.reduce((acc, p) => acc + (p.usdValueA ?? 0) + (p.usdValueB ?? 0), 0)
  )
  
  const positionCount = computed(() => positionsRef.value.length)
  
  const largestPosition = computed(() => {
    let largest: LiquidityPosition | undefined
    for (const p of positionsRef.value) {
      const pValue = (p.usdValueA ?? 0) + (p.usdValueB ?? 0)
      const largestValue = largest ? (largest.usdValueA ?? 0) + (largest.usdValueB ?? 0) : 0
      if (!largest || pValue > largestValue) largest = p
    }
    return largest
  })

  return { positionRows, totalUsdValue, positionCount, largestPosition }
}
