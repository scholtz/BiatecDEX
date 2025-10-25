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
import { BiatecClammPoolClient, getPools } from 'biatec-concentrated-liquidity-amm'
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
  return state.assetRows.reduce((sum, row) => sum + row.totalTvlUsd, 0)
})

const totalPools = computed(() => {
  return state.assetRows.reduce((sum, row) => sum + row.poolCount, 0)
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
    const assetDataMap = new Map<
      number,
      {
        poolCount: number
        assetTvl: number // TVL when this asset is the primary asset (Asset A)
        otherAssetTvl: number // TVL when this asset is paired with another (Asset B)
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
          otherAssetTvl: 0
        }
        dataA.poolCount += 1
        dataA.assetTvl += Number(status.realABalance || 0n)
        assetDataMap.set(assetAId, dataA)

        // Get or initialize asset B data
        // For Asset B: it's the primary asset in this pool
        const dataB = assetDataMap.get(assetBId) || {
          poolCount: 0,
          assetTvl: 0,
          otherAssetTvl: 0
        }
        dataB.poolCount += 1
        dataB.assetTvl += Number(status.realBBalance || 0n)
        assetDataMap.set(assetBId, dataB)

        // Update cross-references: each pool's balance should appear in both assets
        // Asset A should also see Asset B's balance as "other asset TVL"
        dataA.otherAssetTvl += Number(status.realBBalance || 0n)
        assetDataMap.set(assetAId, dataA)
        
        // Asset B should also see Asset A's balance as "other asset TVL"
        dataB.otherAssetTvl += Number(status.realABalance || 0n)
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

      // Calculate TVL in USD
      const assetTvl = data.assetTvl / 10 ** decimals
      const otherAssetTvl = data.otherAssetTvl / 10 ** decimals
      const assetTvlUsd = usdPrice ? assetTvl * usdPrice : 0
      const otherAssetTvlUsd = usdPrice ? otherAssetTvl * usdPrice : 0
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
        currentPriceUsd: null,
        vwap1dUsd: null,
        vwap7dUsd: null,
        volume1dUsd: null,
        volume7dUsd: null,
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

const loadPriceDataForAsset = async (assetRow: AssetRow) => {
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
    let latestPriceUsd: number | null = null

    // Load price/volume data for each pool involving this asset
    for (const pool of pools) {
      try {
        const price = await store.state.clientPP.getPrice({
          args: {
            appPoolId: 0,
            assetA: BigInt(pool.assetA),
            assetB: BigInt(pool.assetB)
          },
          sender: signer.address,
          signer: signer.transactionSigner
        })

        if (price) {
          const weightedPeriods = computeWeightedPeriods(price)
          
          // Get the paired asset's USD price for volume conversion
          const pairedAssetId = pool.assetA === assetRow.assetId ? pool.assetB : pool.assetA
          const pairedAsset = state.assetRows.find((r) => r.assetId === pairedAssetId)
          const pairedUsdPrice = pairedAsset?.usdPrice || 0

          // Calculate current price in USD
          // If this asset is Asset A in the pool, price is in terms of Asset B
          // If this asset is Asset B in the pool, we need to invert the price
          const priceInAssetB = Number(price.latestPrice) / 1e9
          if (pool.assetA === assetRow.assetId && pairedUsdPrice > 0) {
            // Asset A: price is how much B per A, so A_USD = price_AB * B_USD
            latestPriceUsd = priceInAssetB * pairedUsdPrice
          } else if (pool.assetB === assetRow.assetId && pairedUsdPrice > 0 && priceInAssetB > 0) {
            // Asset B: price is how much B per A, so B_USD = A_USD / price_AB
            latestPriceUsd = pairedUsdPrice / priceInAssetB
          }

          // Aggregate volumes in USD
          if (weightedPeriods.period2?.volume && pairedUsdPrice > 0) {
            const volume1d = weightedPeriods.period2.volume / 1e9
            const volume1dUsd = volume1d * pairedUsdPrice
            totalVolume1dUsd += volume1dUsd
            
            // Weight VWAP by volume
            const vwap1d = weightedPeriods.period2.price / 1e9
            weightedPrice1d += vwap1d * volume1dUsd
            totalWeight1d += volume1dUsd
          }

          if (weightedPeriods.period3?.volume && pairedUsdPrice > 0) {
            const volume7d = weightedPeriods.period3.volume / 1e9
            const volume7dUsd = volume7d * pairedUsdPrice
            totalVolume7dUsd += volume7dUsd
            
            // Weight VWAP by volume
            const vwap7d = weightedPeriods.period3.price / 1e9
            weightedPrice7d += vwap7d * volume7dUsd
            totalWeight7d += volume7dUsd
          }
        }
      } catch (error) {
        console.error(`Error loading price data for pool ${pool.appId}:`, error)
      }
    }

    // Calculate volume-weighted average prices in USD
    const vwap1dUsd = totalWeight1d > 0 ? (weightedPrice1d / totalWeight1d) * assetRow.usdPrice : null
    const vwap7dUsd = totalWeight7d > 0 ? (weightedPrice7d / totalWeight7d) * assetRow.usdPrice : null

    // Update the row with the aggregated price/volume data
    const updatedRowIndex = state.assetRows.findIndex((r) => r.assetId === assetRow.assetId)
    if (updatedRowIndex !== -1) {
      state.assetRows[updatedRowIndex].currentPriceUsd = latestPriceUsd || assetRow.usdPrice
      state.assetRows[updatedRowIndex].vwap1dUsd = vwap1dUsd
      state.assetRows[updatedRowIndex].vwap7dUsd = vwap7dUsd
      state.assetRows[updatedRowIndex].volume1dUsd = totalVolume1dUsd > 0 ? totalVolume1dUsd : null
      state.assetRows[updatedRowIndex].volume7dUsd = totalVolume7dUsd > 0 ? totalVolume7dUsd : null
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
  const promises = state.assetRows.map((row) => loadPriceDataForAsset(row))
  await Promise.allSettled(promises)
}

const onRefresh = () => {
  void loadAllAssets()
}

const onSwap = (assetCode: string) => {
  const network = store.state.env || 'algorand'
  router.push({
    name: 'homeWithAssets',
    params: {
      network,
      assetCode: assetCode,
      currencyCode: store.state.currencyCode || 'algo'
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
      currencyCode: store.state.currencyCode || 'algo'
    }
  })
}

const onAddLiquidity = (assetCode: string) => {
  navigateToLiquidity(assetCode)
}

const onRemoveLiquidity = (assetCode: string) => {
  navigateToLiquidity(assetCode)
}

onMounted(() => {
  void loadAllAssets()
  intervalId = setInterval(() => {
    void loadAllAssets(false)
  }, 30000) // Refresh every 30 seconds
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
          <div class="flex flex-col gap-2">
            <h1 class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              {{ t('views.allAssets.title') }}
            </h1>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {{ t('views.allAssets.subtitle') }}
            </p>
          </div>
          <div class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
            <!-- Total TVL -->
            <div
              class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white/65 dark:bg-surface-800/60 backdrop-blur p-4 flex flex-col"
            >
              <span
                class="text-[10px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400"
                >{{ t('views.allAssets.totalTvl') }}</span
              >
              <span
                class="mt-1 text-xl sm:text-2xl font-bold truncate"
                :title="totalTvl.toLocaleString(locale)"
                >{{ formatUsd(totalTvl) }}</span
              >
            </div>
            <!-- Total Pools -->
            <div
              class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white/65 dark:bg-surface-800/60 backdrop-blur p-4 flex flex-col"
            >
              <span
                class="text-[10px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400"
                >{{ t('views.allAssets.totalPools') }}</span
              >
              <span class="mt-1 text-xl sm:text-2xl font-bold">{{ totalPools }}</span>
            </div>
            <!-- Asset Count -->
            <div
              v-if="state.assetRows.length > 0"
              class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white/65 dark:bg-surface-800/60 backdrop-blur p-4 flex flex-col"
            >
              <span
                class="text-[10px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400"
                >{{ t('views.allAssets.assetCount') }}</span
              >
              <span class="mt-1 text-xl sm:text-2xl font-bold">{{ state.assetRows.length }}</span>
            </div>
          </div>
        </div>
      </div>
      <Card class="mx-0">
        <template #content>
          <div class="flex justify-between items-center mb-4 m-2">
            <h2 class="text-lg font-semibold">{{ t('views.allAssets.tableTitle') }}</h2>
            <Button
              icon="pi pi-refresh"
              size="small"
              :title="t('views.allAssets.actions.refresh')"
              @click="onRefresh"
            />
          </div>
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
              class="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden"
              sortMode="multiple"
              paginator
              :rows="20"
            >
              <Column :header="t('views.allAssets.table.assetName')" sortable field="assetName">
                <template #body="{ data }">
                  <div class="flex flex-col">
                    <span class="font-medium">{{ data.assetName }}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-300">
                      {{ data.assetCode }}
                    </span>
                  </div>
                </template>
              </Column>
              <Column field="poolCount" :header="t('views.allAssets.table.poolCount')" sortable>
                <template #body="{ data }">
                  <span class="text-right block">{{ data.poolCount }}</span>
                </template>
              </Column>
              <Column
                field="assetTvl"
                :header="t('views.allAssets.table.assetTvl')"
                sortable
              >
                <template #body="{ data }">
                  <span class="text-right block">{{ data.formattedAssetTvl }}</span>
                </template>
              </Column>
              <Column
                field="otherAssetTvl"
                :header="t('views.allAssets.table.otherAssetTvl')"
                sortable
              >
                <template #body="{ data }">
                  <span class="text-right block">{{ data.formattedOtherAssetTvl }}</span>
                </template>
              </Column>
              <Column field="totalTvlUsd" :header="t('views.allAssets.table.totalTvl')" sortable>
                <template #body="{ data }">
                  <span class="font-semibold text-right block">{{ data.formattedTotalTvl }}</span>
                </template>
              </Column>
              <Column
                field="currentPriceUsd"
                :header="t('views.allAssets.table.currentPrice')"
                sortable
              >
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
              <Column field="vwap1dUsd" :header="t('views.allAssets.table.vwap1d')" sortable>
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
              </Column>
              <Column field="volume1dUsd" :header="t('views.allAssets.table.volume1d')" sortable>
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
              <Column field="volume7dUsd" :header="t('views.allAssets.table.volume7d')" sortable>
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
              <Column :header="t('views.allAssets.table.actions')">
                <template #body="{ data }">
                  <div class="flex gap-2 justify-end">
                    <Button
                      icon="pi pi-arrow-right-arrow-left"
                      size="small"
                      severity="info"
                      :title="t('views.allAssets.actions.swap')"
                      @click="onSwap(data.assetCode)"
                    />
                    <Button
                      icon="pi pi-plus-circle"
                      size="small"
                      severity="success"
                      :title="t('views.allAssets.actions.addLiquidity')"
                      @click="onAddLiquidity(data.assetCode)"
                    />
                    <Button
                      icon="pi pi-minus-circle"
                      size="small"
                      severity="danger"
                      :title="t('views.allAssets.actions.removeLiquidity')"
                      @click="onRemoveLiquidity(data.assetCode)"
                      :disabled="data.poolCount === 0"
                    />
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
