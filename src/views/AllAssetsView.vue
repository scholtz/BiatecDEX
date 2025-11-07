<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref } from 'vue'
import Layout from '@/layouts/PublicLayout.vue'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Message from 'primevue/message'
import { useAppStore } from '@/stores/app'
import { useI18n } from 'vue-i18n'
import { useNetwork } from '@txnlab/use-wallet-vue'
import getAlgodClient from '@/scripts/algo/getAlgodClient'
import { getAVMTradeReporterAPI } from '@/api'
import { AssetsService } from '@/service/AssetsService'
import Skeleton from 'primevue/skeleton'
import type { BiatecAsset } from '@/api/models'
import type { IAsset } from '@/interface/IAsset'
import { useRouter } from 'vue-router'
import { BiatecClammPoolClient, getPools, type AppPoolInfo } from 'biatec-concentrated-liquidity-amm'
import { getDummySigner } from '@/scripts/algo/getDummySigner'
import { computeWeightedPeriods } from '@/components/LiquidityComponents/weightedPeriods'
import formatNumber from '@/scripts/asset/formatNumber'

interface AssetRow {
  assetId: number
  assetName: string
  assetCode: string
  assetSymbol: string
  decimals: number
  poolCount: number
  assetTvl: number // TVL when this asset is Asset A (primary)
  otherAssetTvl: number // TVL when this asset is Asset B (paired)
  totalTvlUsd: number
  usdPrice?: number
  currentPriceUsd?: number | null // Current price in USD
  vwap1dUsd?: number | null // VWAP 1D in USD
  vwap7dUsd?: number | null // VWAP 7D in USD
  volume1dUsd?: number | null // Aggregated volume 1D in USD from all pools
  volume7dUsd?: number | null // Aggregated volume 7D in USD from all pools
  fee1dUsd?: number | null // Aggregated fees 1D in USD from all pools
  fee7dUsd?: number | null // Aggregated fees 7D in USD from all pools
  priceLoading: boolean
}

const store = useAppStore()
const { t, locale } = useI18n()
const { activeNetworkConfig } = useNetwork()
const router = useRouter()
const api = getAVMTradeReporterAPI()

const state = reactive({
  isLoading: false,
  error: '',
  assetRows: [] as AssetRow[],
  poolsByAsset: new Map<number, { assetA: number; assetB: number; appId: bigint }[]>()
})

const getE2EData = () => (typeof window !== 'undefined' ? window.__BIATEC_E2E : undefined)

const loadToken = ref(0)
let intervalId: ReturnType<typeof setInterval> | undefined

const assetCatalog = computed(() =>
  AssetsService.getAssets().filter((asset) => asset.network === store.state.env)
)

const assetCatalogById = computed(() => {
  const map = new Map<number, IAsset>()
  assetCatalog.value.forEach((asset) => {
    map.set(asset.assetId, asset)
  })
  return map
})

const usdFormatter = computed(
  () =>
    new Intl.NumberFormat(locale.value, {
      style: 'currency',
      currency: 'USD',
      maximumFractionDigits: 2
    })
)

const formatUsd = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return 'N/A'
  }
  return usdFormatter.value.format(value)
}

const toNumber = (value: bigint | number | undefined | null) => {
  if (typeof value === 'bigint') {
    return Number(value)
  }
  if (typeof value === 'number') {
    return value
  }
  return 0
}

const aggregatedAssetRows = computed(() => {
  return state.assetRows
    .map((row) => {
      return {
        ...row,
        formattedTotalTvl: formatUsd(row.totalTvlUsd),
        formattedAssetTvl: formatUsd(row.assetTvl),
        formattedOtherAssetTvl: formatUsd(row.otherAssetTvl)
      }
    })
    .sort((a, b) => {
      // Sort by total TVL descending
      return b.totalTvlUsd - a.totalTvlUsd
    })
})

const totalTvl = computed(() => {
  // Only sum assetTvl to avoid double-counting (each pool appears in both asset rows)
  return state.assetRows.reduce((sum, row) => sum + row.assetTvl, 0)
})

const totalPools = computed(() => {
  return Math.floor(state.assetRows.reduce((sum, row) => sum + row.poolCount, 0) / 2)
})

const fetchValuations = async (ids: number[]): Promise<BiatecAsset[]> => {
  const chunkSize = 20
  const aggregated: BiatecAsset[] = []
  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize)
    const response = await api.getApiAsset({ ids: chunk.join(',') })
    const data = response?.data ?? []
    aggregated.push(...data)
  }
  return aggregated
}

const loadAllAssets = async (showLoading = true) => {
  const e2eData = getE2EData()
  if (e2eData?.assetRows?.length) {
    state.assetRows = e2eData.assetRows.map((row) => ({
      ...row,
      priceLoading: row.priceLoading ?? false
    }))
    console.log('E2E asset rows loaded', state.assetRows)
    const poolsByAsset = new Map<number, { assetA: number; assetB: number; appId: bigint }[]>()
    for (const pool of e2eData.pools ?? []) {
      const poolInfo = {
        assetA: pool.assetA,
        assetB: pool.assetB,
        appId: BigInt(pool.appId)
      }
      if (!poolsByAsset.has(pool.assetA)) {
        poolsByAsset.set(pool.assetA, [])
      }
      poolsByAsset.get(pool.assetA)!.push(poolInfo)
      if (!poolsByAsset.has(pool.assetB)) {
        poolsByAsset.set(pool.assetB, [])
      }
      poolsByAsset.get(pool.assetB)!.push(poolInfo)
    }
    state.poolsByAsset = poolsByAsset
    state.isLoading = false
    state.error = ''
    return
  }

  if (!activeNetworkConfig.value) {
    state.assetRows = []
    state.error = ''
    return
  }

  const requestId = ++loadToken.value
  if (showLoading) {
    state.isLoading = true
  }
  state.error = ''

  try {
    if (!store?.state?.clientPP?.appId) {
      throw new Error('Pool Provider App ID is not set in the store.')
    }

    const algod = getAlgodClient(activeNetworkConfig.value)

    // Get all pools with empty assetId (0) to get all pools
    const allPools = await getPools({
      algod: algod,
      assetId: 0n,
      poolProviderAppId: store.state.clientPP.appId
    })

    if (requestId !== loadToken.value) {
      return
    }

    // Create dummy signer for status calls
    const dummySigner = getDummySigner()

    // Store pool information for volume aggregation later
    interface PoolInfo {
      assetA: number
      assetB: number
      appId: bigint
    }
    const poolsByAsset = new Map<number, PoolInfo[]>()

    // Aggregate data by asset
    // Store contributions from other assets separately to calculate USD correctly
    const assetDataMap = new Map<
      number,
      {
        poolCount: number
        assetTvl: number // TVL when this asset is the primary asset (Asset A) in base units
        otherAssetTvlContributions: Map<number, number> // assetId -> balance in base units
      }
    >()

    const assetIds = new Set<number>()

    // Process each pool to get TVL data
    for (const pool of allPools) {
      try {
        const biatecClammPoolClient = new BiatecClammPoolClient({
          algorand: store.state.clientPP.algorand,
          appId: pool.appId,
          defaultSender: dummySigner.address,
          defaultSigner: dummySigner.transactionSigner
        })

        if (!store.state.clientConfig?.appId) {
          throw new Error('Biatec Config Provider App ID is not set in the store.')
        }

        const status = await biatecClammPoolClient.status({
          args: {
            appBiatecConfigProvider: store.state.clientConfig.appId,
            assetA: pool.assetA,
            assetB: pool.assetB,
            assetLp: pool.lpTokenId
          },
          assetReferences: [pool.assetA, pool.assetB]
        })

        const assetAId = Number(pool.assetA)
        const assetBId = Number(pool.assetB)

        assetIds.add(assetAId)
        assetIds.add(assetBId)

        // Store pool information for both assets for volume aggregation
        const poolInfo: PoolInfo = {
          assetA: assetAId,
          assetB: assetBId,
          appId: pool.appId
        }

        if (!poolsByAsset.has(assetAId)) {
          poolsByAsset.set(assetAId, [])
        }
        poolsByAsset.get(assetAId)!.push(poolInfo)

        if (!poolsByAsset.has(assetBId)) {
          poolsByAsset.set(assetBId, [])
        }
        poolsByAsset.get(assetBId)!.push(poolInfo)

        // Get or initialize asset A data
        // For Asset A: it's the primary asset in this pool
        const dataA = assetDataMap.get(assetAId) || {
          poolCount: 0,
          assetTvl: 0,
          otherAssetTvlContributions: new Map<number, number>()
        }
        dataA.poolCount += 1
        dataA.assetTvl += Number(status.realABalance || 0n)
        // Asset A sees Asset B's balance as other asset TVL
        const currentBContribution = dataA.otherAssetTvlContributions.get(assetBId) || 0
        dataA.otherAssetTvlContributions.set(
          assetBId,
          currentBContribution + Number(status.realBBalance || 0n)
        )
        assetDataMap.set(assetAId, dataA)

        // Get or initialize asset B data
        // For Asset B: it's the primary asset in this pool
        const dataB = assetDataMap.get(assetBId) || {
          poolCount: 0,
          assetTvl: 0,
          otherAssetTvlContributions: new Map<number, number>()
        }
        dataB.poolCount += 1
        dataB.assetTvl += Number(status.realBBalance || 0n)
        // Asset B sees Asset A's balance as other asset TVL
        const currentAContribution = dataB.otherAssetTvlContributions.get(assetAId) || 0
        dataB.otherAssetTvlContributions.set(
          assetAId,
          currentAContribution + Number(status.realABalance || 0n)
        )
        assetDataMap.set(assetBId, dataB)
      } catch (error) {
        console.error(`Error processing pool ${pool.appId}:`, error)
      }
    }

    // Fetch USD valuations for all assets
    let valuationMap = new Map<number, BiatecAsset>()
    if (assetIds.size > 0) {
      try {
        const valuations = await fetchValuations(Array.from(assetIds))
        valuations.forEach((asset) => {
          valuationMap.set(Number(asset.index), asset)
        })
      } catch (valuationError) {
        console.error('Error fetching valuations:', valuationError)
      }
    }

    // Build asset rows
    const nextAssetRows: AssetRow[] = []
    for (const [assetId, data] of assetDataMap.entries()) {
      const valuation = valuationMap.get(assetId)
      const asset = assetCatalogById.value.get(assetId)

      // Get asset information from catalog or valuation or fallback
      const decimals = asset?.decimals ?? valuation?.params?.decimals ?? 0
      const name = asset?.name ?? valuation?.params?.name ?? `Asset #${assetId}`
      const code = asset?.code ?? valuation?.params?.unitName?.toLowerCase() ?? `asa-${assetId}`
      const symbol = asset?.symbol ?? asset?.code ?? valuation?.params?.unitName ?? code

      const usdPrice = valuation?.priceUSD

      // Calculate TVL in USD for this asset (when it's primary)
      const assetTvl = data.assetTvl / 10 ** decimals
      const assetTvlUsd = usdPrice ? assetTvl * usdPrice : 0

      // Calculate Other Asset TVL in USD by summing contributions from each other asset
      // Each contribution is in that asset's base units, so we need to use that asset's decimals and price
      let otherAssetTvlUsd = 0
      for (const [otherAssetId, otherAssetBalance] of data.otherAssetTvlContributions.entries()) {
        const otherValuation = valuationMap.get(otherAssetId)
        const otherAsset = assetCatalogById.value.get(otherAssetId)
        const otherDecimals = otherAsset?.decimals ?? otherValuation?.params?.decimals ?? 0
        const otherUsdPrice = otherValuation?.priceUSD || 0

        const otherAssetAmount = otherAssetBalance / 10 ** otherDecimals
        otherAssetTvlUsd += otherAssetAmount * otherUsdPrice
      }

      const totalTvlUsd = assetTvlUsd + otherAssetTvlUsd

      nextAssetRows.push({
        assetId,
        assetName: name,
        assetCode: code,
        assetSymbol: symbol,
        decimals,
        poolCount: data.poolCount,
        assetTvl: assetTvlUsd,
        otherAssetTvl: otherAssetTvlUsd,
        totalTvlUsd,
        usdPrice,
        currentPriceUsd: usdPrice || null, // Use API valuation as current price
        vwap1dUsd: null,
        vwap7dUsd: null,
        volume1dUsd: null,
        volume7dUsd: null,
        fee1dUsd: null,
        fee7dUsd: null,
        priceLoading: false
      })
    }

    state.assetRows = nextAssetRows
    state.poolsByAsset = poolsByAsset

    // Load price data asynchronously without blocking the UI
    void loadAllPriceData()
  } catch (error) {
    if (requestId !== loadToken.value) {
      return
    }
    state.error = error instanceof Error ? error.message : String(error)
    state.assetRows = []
  } finally {
    if (requestId === loadToken.value && showLoading) {
      state.isLoading = false
    }
  }
}

const loadPriceDataForAsset = async (
  assetRow: AssetRow,
  priceCache: Map<string, Promise<AppPoolInfo | undefined>>
) => {
  if (!store.state.clientPP || assetRow.priceLoading || !assetRow.usdPrice) {
    return
  }

  const rowIndex = state.assetRows.findIndex((r) => r.assetId === assetRow.assetId)
  if (rowIndex === -1) return

  state.assetRows[rowIndex].priceLoading = true

  try {
    const signer = getDummySigner()
    const pools = state.poolsByAsset.get(assetRow.assetId) || []

    let totalVolume1dUsd = 0
    let totalVolume7dUsd = 0
    let weightedPrice1d = 0
    let weightedPrice7d = 0
    let totalWeight1d = 0
    let totalWeight7d = 0
    let totalFee1dUsd = 0
    let totalFee7dUsd = 0
    const assetUsdPrice = assetRow.usdPrice ?? 0

    for (const pool of pools) {
      const poolKey = `${pool.assetA}-${pool.assetB}-${pool.appId.toString()}`
      let pricePromise = priceCache.get(poolKey)
      if (!pricePromise) {
        pricePromise = store.state.clientPP
          .getPrice({
            args: {
              appPoolId: 0,
              assetA: BigInt(pool.assetA),
              assetB: BigInt(pool.assetB)
            },
            sender: signer.address,
            signer: signer.transactionSigner
          })
          .catch((error) => {
            console.error(`Error loading price data for pool ${pool.appId}:`, error)
            return undefined
          })
        priceCache.set(poolKey, pricePromise)
      }

      const price = await pricePromise
      if (!price) {
        continue
      }

      const weightedPeriods = computeWeightedPeriods(price)

      const assetBId = pool.assetB
      const assetBData = state.assetRows.find((r) => r.assetId === assetBId)
      const assetBUsdPrice = assetBData?.usdPrice || 0

      const pairedAssetId = pool.assetA === assetRow.assetId ? pool.assetB : pool.assetA
      const pairedAsset = state.assetRows.find((r) => r.assetId === pairedAssetId)
      const pairedUsdPrice = pairedAsset?.usdPrice || 0

      if (weightedPeriods.period2?.volume && assetBUsdPrice > 0) {
        const volume1d = weightedPeriods.period2.volume / 1e9
        const volume1dUsd = volume1d * assetBUsdPrice
        totalVolume1dUsd += volume1dUsd

        const vwap1d = weightedPeriods.period2.price / 1e9
        const thisAssetVwap1dUsd =
          pool.assetA === assetRow.assetId
            ? vwap1d * pairedUsdPrice
            : pairedUsdPrice / (vwap1d || 1)
        weightedPrice1d += thisAssetVwap1dUsd * volume1dUsd
        totalWeight1d += volume1dUsd
      }

      if (weightedPeriods.period3?.volume && assetBUsdPrice > 0) {
        const volume7d = weightedPeriods.period3.volume / 1e9
        const volume7dUsd = volume7d * assetBUsdPrice
        totalVolume7dUsd += volume7dUsd

        const vwap7d = weightedPeriods.period3.price / 1e9
        const thisAssetVwap7dUsd =
          pool.assetA === assetRow.assetId
            ? vwap7d * pairedUsdPrice
            : pairedUsdPrice / (vwap7d || 1)
        weightedPrice7d += thisAssetVwap7dUsd * volume7dUsd
        totalWeight7d += volume7dUsd
      }

      const feeSuffix = pool.assetA === assetRow.assetId ? 'A' : 'B'
      const priceRecord = price as Record<string, bigint | number | undefined>
      const fee1dRaw = toNumber(priceRecord[`period2NowFee${feeSuffix}`])
      const fee7dRaw = toNumber(priceRecord[`period3NowFee${feeSuffix}`])

      if (fee1dRaw > 0 && assetUsdPrice > 0) {
        totalFee1dUsd += (fee1dRaw / 1e9) * assetUsdPrice
      }

      if (fee7dRaw > 0 && assetUsdPrice > 0) {
        totalFee7dUsd += (fee7dRaw / 1e9) * assetUsdPrice
      }
    }

    const vwap1dUsd = totalWeight1d > 0 ? weightedPrice1d / totalWeight1d : null
    const vwap7dUsd = totalWeight7d > 0 ? weightedPrice7d / totalWeight7d : null

    const updatedRowIndex = state.assetRows.findIndex((r) => r.assetId === assetRow.assetId)
    if (updatedRowIndex !== -1) {
      state.assetRows[updatedRowIndex].vwap1dUsd = vwap1dUsd
      state.assetRows[updatedRowIndex].vwap7dUsd = vwap7dUsd
      state.assetRows[updatedRowIndex].volume1dUsd = totalVolume1dUsd > 0 ? totalVolume1dUsd : null
      state.assetRows[updatedRowIndex].volume7dUsd = totalVolume7dUsd > 0 ? totalVolume7dUsd : null
      state.assetRows[updatedRowIndex].fee1dUsd = totalFee1dUsd > 0 ? totalFee1dUsd : null
      state.assetRows[updatedRowIndex].fee7dUsd = totalFee7dUsd > 0 ? totalFee7dUsd : null
    }
  } catch (error) {
    console.error(`Error loading price data for asset ${assetRow.assetId}:`, error)
  } finally {
    const finalRowIndex = state.assetRows.findIndex((r) => r.assetId === assetRow.assetId)
    if (finalRowIndex !== -1) {
      state.assetRows[finalRowIndex].priceLoading = false
    }
  }
}

const loadAllPriceData = async () => {
  // Load price data for each asset asynchronously
  const priceCache = new Map<string, Promise<AppPoolInfo | undefined>>()
  const promises = state.assetRows.map((row) => loadPriceDataForAsset(row, priceCache))
  await Promise.allSettled(promises)
}

const onRefresh = () => {
  void loadAllAssets()
}

const resolveRouteCurrency = (assetCode: string) => {
  const selectedCurrency = store.state.currencyCode || 'algo'
  if (!assetCode) {
    return selectedCurrency
  }
  return assetCode.toLowerCase() === selectedCurrency.toLowerCase() ? 'algo' : selectedCurrency
}

const onSwap = (assetCode: string) => {
  const network = store.state.env || 'algorand'
  router.push({
    name: 'tradeWithAssets',
    params: {
      network,
      assetCode: assetCode,
      currencyCode: resolveRouteCurrency(assetCode)
    }
  })
}

const navigateToLiquidity = (assetCode: string) => {
  const network = store.state.env || 'algorand'
  router.push({
    name: 'liquidity-with-assets',
    params: {
      network,
      assetCode: assetCode,
      currencyCode: resolveRouteCurrency(assetCode)
    }
  })
}

const onAddLiquidity = (assetCode: string) => {
  navigateToLiquidity(assetCode)
}

const onRemoveLiquidity = (assetCode: string) => {
  navigateToLiquidity(assetCode)
}

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}

onMounted(() => {
  void loadAllAssets()
  intervalId = setInterval(() => {
    void loadAllAssets(false)
  }, 5000) // Refresh every 5 seconds
})

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId)
  }
})
</script>

<template>
  <Layout :authRequired="false">
    <div class="flex w-full flex-col gap-4 py-2">
      <div class="relative px-2">
        <div
          class="absolute inset-0 rounded-xl bg-white/70 backdrop-blur-sm dark:bg-surface-800/70 shadow-sm"
        ></div>
        <div class="relative flex flex-col gap-6 p-4 rounded-xl">
          <div class="flex flex-col gap-2 animate-fade-in">
            <div class="flex flex-col lg:flex-row lg:justify-between gap-2">
              <!-- Title and subtitle container -->
              <div class="flex flex-col gap-1">
                <h1
                  class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100 animate-slide-in-left"
                >
                  {{ t('views.allAssets.title') }}
                </h1>
                <p class="text-sm text-gray-600 dark:text-gray-300 animate-fade-in-delayed">
                  {{ t('views.allAssets.subtitle') }}
                </p>
              </div>
              <!-- Total TVL Box on wide screens -->
              <div class="hidden lg:flex animate-slide-in-right lg:self-center">
                <div
                  class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white/80 dark:bg-surface-800/80 backdrop-blur-sm p-3 shadow-sm hover:shadow-md transition-shadow duration-200"
                >
                  <div class="flex flex-col items-center text-center">
                    <span
                      class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                    >
                      {{ t('views.allAssets.totalTvl') }}
                    </span>
                    <span
                      class="text-lg font-bold text-gray-900 dark:text-gray-100 mt-1 animate-pulse"
                    >
                      {{ formatUsd(totalTvl) }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <!-- Total TVL Box on mobile/small screens -->
            <div class="flex lg:hidden justify-center animate-fade-in-delayed">
              <div
                class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white/80 dark:bg-surface-800/80 backdrop-blur-sm p-4 shadow-sm hover:shadow-md transition-shadow duration-200"
              >
                <div class="flex flex-col items-center text-center">
                  <span
                    class="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide"
                  >
                    {{ t('views.allAssets.totalTvl') }}
                  </span>
                  <span
                    class="text-xl font-bold text-gray-900 dark:text-gray-100 mt-1 animate-pulse"
                  >
                    {{ formatUsd(totalTvl) }}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <Card class="mx-0">
        <template #content>
          <Message v-if="state.error" severity="error" class="mb-3">
            {{ t('views.allAssets.errors.loadFailed', { message: state.error }) }}
          </Message>
          <Message
            v-else-if="!state.isLoading && aggregatedAssetRows.length === 0"
            severity="info"
            class="mb-3 flex items-center gap-2"
          >
            <i class="pi pi-info-circle text-lg"></i>
            {{ t('views.allAssets.emptyAssets') }}
          </Message>
          <div v-if="state.isLoading" class="flex flex-col gap-2">
            <div v-for="n in 8" :key="n" class="flex items-center gap-6">
              <Skeleton width="14rem" height="1rem" />
              <Skeleton width="8rem" height="1rem" />
              <Skeleton width="6rem" height="1rem" />
              <Skeleton width="6rem" height="1rem" />
            </div>
          </div>
          <template v-else>
            <DataTable
              :value="aggregatedAssetRows"
              dataKey="assetId"
              stripedRows
              responsiveLayout="scroll"
              class="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden animate-bounce-in"
              sortMode="multiple"
              paginator
              :rows="20"
            >
              <Column sortable field="assetName">
                <template #header>
                  <span v-tooltip.top="t('tooltips.tables.assetId')">{{
                    t('views.allAssets.table.asset')
                  }}</span>
                </template>
                <template #body="{ data }">
                  <div class="flex items-center gap-3">
                    <div class="flex flex-col flex-1">
                      <span class="font-medium">{{ data.assetName }}</span>
                      <span class="text-xs text-gray-500 dark:text-gray-300">
                        {{ data.assetCode }}
                        <a
                          :href="`https://algorand.scan.biatec.io/asset/${data.assetId}`"
                          target="_blank"
                          rel="noopener noreferrer"
                          class="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 underline"
                          v-tooltip.top="t('tooltips.tables.assetId')"
                          @click.stop
                        >
                          ({{ data.assetId }})
                        </a>
                      </span>
                    </div>
                    <div class="shrink-0">
                      <img
                        :src="`https://algorand-trades.de-4.biatec.io/api/asset/image/${data.assetId}`"
                        :alt="`${data.assetName} logo`"
                        class="w-10 h-10 rounded-lg object-cover border border-surface-200 dark:border-surface-700"
                        @error="handleImageError"
                      />
                    </div>
                  </div>
                </template>
              </Column>
              <Column field="assetTvl" sortable headerClass="text-right">
                <template #header>
                  <span
                    class="block w-full text-right"
                    v-tooltip.top="t('tooltips.tables.assetTvl')"
                    >{{ t('views.allAssets.table.assetTvl') }}</span
                  >
                </template>
                <template #body="{ data }">
                  <span class="text-right block">{{ data.formattedAssetTvl }}</span>
                </template>
              </Column>
              <Column field="otherAssetTvl" sortable headerClass="text-right">
                <template #header>
                  <span
                    class="block w-full text-right"
                    v-tooltip.top="t('tooltips.tables.otherAssetTvl')"
                    >{{ t('views.allAssets.table.otherAssetTvl') }}</span
                  >
                </template>
                <template #body="{ data }">
                  <span class="text-right block">{{ data.formattedOtherAssetTvl }}</span>
                </template>
              </Column>
              <Column field="totalTvlUsd" sortable headerClass="text-right">
                <template #header>
                  <span
                    class="block w-full text-right"
                    v-tooltip.top="t('tooltips.tables.totalTvl')"
                    >{{ t('views.allAssets.table.totalTvl') }}</span
                  >
                </template>
                <template #body="{ data }">
                  <span class="font-semibold text-right block">{{ data.formattedTotalTvl }}</span>
                </template>
              </Column>
              <Column field="currentPriceUsd" sortable headerClass="text-right">
                <template #header>
                  <span
                    class="block w-full text-right"
                    v-tooltip.top="t('tooltips.tables.currentPrice')"
                    >{{ t('views.allAssets.table.currentPrice') }}</span
                  >
                </template>
                <template #body="{ data }">
                  <div v-if="data.priceLoading" class="flex items-center justify-end gap-1">
                    <i class="pi pi-spinner animate-spin text-xs"></i>
                  </div>
                  <span v-else-if="data.currentPriceUsd !== null" class="text-right block">{{
                    formatUsd(data.currentPriceUsd)
                  }}</span>
                  <span v-else class="text-gray-400 text-right block">N/A</span>
                </template>
              </Column>
              <!-- <Column field="vwap1dUsd" :header="t('views.allAssets.table.vwap1d')" sortable>
                <template #body="{ data }">
                  <div v-if="data.priceLoading" class="flex items-center justify-end gap-1">
                    <i class="pi pi-spinner animate-spin text-xs"></i>
                  </div>
                  <span v-else-if="data.vwap1dUsd !== null" class="text-right block">{{
                    formatUsd(data.vwap1dUsd)
                  }}</span>
                  <span v-else class="text-gray-400 text-right block">N/A</span>
                </template>
              </Column>
              <Column field="vwap7dUsd" :header="t('views.allAssets.table.vwap7d')" sortable>
                <template #body="{ data }">
                  <div v-if="data.priceLoading" class="flex items-center justify-end gap-1">
                    <i class="pi pi-spinner animate-spin text-xs"></i>
                  </div>
                  <span v-else-if="data.vwap7dUsd !== null" class="text-right block">{{
                    formatUsd(data.vwap7dUsd)
                  }}</span>
                  <span v-else class="text-gray-400 text-right block">N/A</span>
                </template>
              </Column> -->
              <Column field="volume1dUsd" sortable headerClass="text-right">
                <template #header>
                  <span
                    class="block w-full text-right"
                    v-tooltip.top="t('tooltips.tables.volume1d')"
                    >{{ t('views.allAssets.table.volume1d') }}</span
                  >
                </template>
                <template #body="{ data }">
                  <div v-if="data.priceLoading" class="flex items-center justify-end gap-1">
                    <i class="pi pi-spinner animate-spin text-xs"></i>
                  </div>
                  <span v-else-if="data.volume1dUsd !== null" class="text-right block">{{
                    formatUsd(data.volume1dUsd)
                  }}</span>
                  <span v-else class="text-gray-400 text-right block">N/A</span>
                </template>
              </Column>
              <Column field="fee1dUsd" sortable headerClass="text-right">
                <template #header>
                  <span
                    class="block w-full text-right"
                    v-tooltip.top="t('tooltips.tables.fees1d')"
                    >{{ t('views.allAssets.table.fees1d') }}</span
                  >
                </template>
                <template #body="{ data }">
                  <div v-if="data.priceLoading" class="flex items-center justify-end gap-1">
                    <i class="pi pi-spinner animate-spin text-xs"></i>
                  </div>
                  <span v-else-if="data.fee1dUsd !== null" class="text-right block">{{
                    formatUsd(data.fee1dUsd)
                  }}</span>
                  <span v-else class="text-gray-400 text-right block">N/A</span>
                </template>
              </Column>
              <Column field="volume7dUsd" sortable headerClass="text-right">
                <template #header>
                  <span
                    class="block w-full text-right"
                    v-tooltip.top="t('tooltips.tables.volume7d')"
                    >{{ t('views.allAssets.table.volume7d') }}</span
                  >
                </template>
                <template #body="{ data }">
                  <div v-if="data.priceLoading" class="flex items-center justify-end gap-1">
                    <i class="pi pi-spinner animate-spin text-xs"></i>
                  </div>
                  <span v-else-if="data.volume7dUsd !== null" class="text-right block">{{
                    formatUsd(data.volume7dUsd)
                  }}</span>
                  <span v-else class="text-gray-400 text-right block">N/A</span>
                </template>
              </Column>
              <Column field="fee7dUsd" sortable headerClass="text-right">
                <template #header>
                  <span
                    class="block w-full text-right"
                    v-tooltip.top="t('tooltips.tables.fees7d')"
                    >{{ t('views.allAssets.table.fees7d') }}</span
                  >
                </template>
                <template #body="{ data }">
                  <div v-if="data.priceLoading" class="flex items-center justify-end gap-1">
                    <i class="pi pi-spinner animate-spin text-xs"></i>
                  </div>
                  <span v-else-if="data.fee7dUsd !== null" class="text-right block">{{
                    formatUsd(data.fee7dUsd)
                  }}</span>
                  <span v-else class="text-gray-400 text-right block">N/A</span>
                </template>
              </Column>
              <Column headerClass="text-right">
                <template #header>
                  <span
                    class="block w-full text-right"
                    v-tooltip.top="t('tooltips.tables.actions')"
                    >{{ t('views.allAssets.table.actions') }}</span
                  >
                </template>
                <template #body="{ data }">
                  <div class="flex gap-3 justify-end">
                    <span v-tooltip.top="t('tooltips.tables.swapAction')">
                      <Button
                        icon="pi pi-arrow-right-arrow-left"
                        size="large"
                        severity="info"
                        @click="onSwap(data.assetCode)"
                        class="animate-pulse hover:animate-bounce"
                      />
                    </span>
                    <span :data-cy="`asset-add-${data.assetCode}`" class="inline-flex">
                      <span v-tooltip.top="t('tooltips.tables.addLiquidityAction')">
                        <Button
                          icon="pi pi-plus-circle"
                          size="large"
                          severity="success"
                          @click="onAddLiquidity(data.assetCode)"
                          class="hover:animate-bounce"
                        />
                      </span>
                    </span>
                    <span v-tooltip.top="t('tooltips.tables.removeLiquidityAction')">
                      <Button
                        icon="pi pi-minus-circle"
                        size="large"
                        severity="danger"
                        @click="onRemoveLiquidity(data.assetCode)"
                        :disabled="data.poolCount === 0"
                        class="hover:animate-bounce"
                      />
                    </span>
                  </div>
                </template>
              </Column>
            </DataTable>
          </template>
        </template>
      </Card>
    </div>
  </Layout>
</template>
