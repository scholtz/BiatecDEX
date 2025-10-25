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
  currentPrice?: number | null
  vwap1d?: number | null
  vwap7d?: number | null
  volume1d?: number | null
  volume7d?: number | null
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
  assetRows: [] as AssetRow[]
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
        currentPrice: null,
        vwap1d: null,
        vwap7d: null,
        volume1d: null,
        volume7d: null,
        priceLoading: false
      })
    }

    state.assetRows = nextAssetRows
    
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
  if (!store.state.clientPP || assetRow.priceLoading) {
    return
  }

  // Find a suitable currency to pair with this asset
  // Prefer ALGO (asset ID 0) or use the most common paired asset
  const algoCurrency = assetCatalog.value.find((a) => a.assetId === 0)
  if (!algoCurrency) {
    return
  }

  const rowIndex = state.assetRows.findIndex((r) => r.assetId === assetRow.assetId)
  if (rowIndex === -1) return

  state.assetRows[rowIndex].priceLoading = true

  try {
    const signer = getDummySigner()
    const price = await store.state.clientPP.getPrice({
      args: {
        appPoolId: 0,
        assetA: BigInt(assetRow.assetId),
        assetB: BigInt(algoCurrency.assetId)
      },
      sender: signer.address,
      signer: signer.transactionSigner
    })

    if (price) {
      const weightedPeriods = computeWeightedPeriods(price)

      // Update the row with the price data
      const updatedRowIndex = state.assetRows.findIndex((r) => r.assetId === assetRow.assetId)
      if (updatedRowIndex !== -1) {
        state.assetRows[updatedRowIndex].currentPrice = Number(price.latestPrice) / 1e9
        state.assetRows[updatedRowIndex].vwap1d = weightedPeriods.period2?.price
          ? weightedPeriods.period2.price / 1e9
          : null
        state.assetRows[updatedRowIndex].vwap7d = weightedPeriods.period3?.price
          ? weightedPeriods.period3.price / 1e9
          : null
        state.assetRows[updatedRowIndex].volume1d = weightedPeriods.period2?.volume
          ? weightedPeriods.period2.volume / 1e9
          : null
        state.assetRows[updatedRowIndex].volume7d = weightedPeriods.period3?.volume
          ? weightedPeriods.period3.volume / 1e9
          : null
      }
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
                  <span>{{ data.poolCount }}</span>
                </template>
              </Column>
              <Column
                field="assetTvl"
                :header="t('views.allAssets.table.assetTvl')"
                sortable
              >
                <template #body="{ data }">
                  <span>{{ data.formattedAssetTvl }}</span>
                </template>
              </Column>
              <Column
                field="otherAssetTvl"
                :header="t('views.allAssets.table.otherAssetTvl')"
                sortable
              >
                <template #body="{ data }">
                  <span>{{ data.formattedOtherAssetTvl }}</span>
                </template>
              </Column>
              <Column field="totalTvlUsd" :header="t('views.allAssets.table.totalTvl')" sortable>
                <template #body="{ data }">
                  <span class="font-semibold">{{ data.formattedTotalTvl }}</span>
                </template>
              </Column>
              <Column
                field="currentPrice"
                :header="t('views.allAssets.table.currentPrice')"
                sortable
              >
                <template #body="{ data }">
                  <div v-if="data.priceLoading" class="flex items-center gap-1">
                    <i class="pi pi-spinner animate-spin text-xs"></i>
                  </div>
                  <span v-else-if="data.currentPrice !== null">{{
                    formatNumber(data.currentPrice)
                  }}</span>
                  <span v-else class="text-gray-400">N/A</span>
                </template>
              </Column>
              <Column field="vwap1d" :header="t('views.allAssets.table.vwap1d')" sortable>
                <template #body="{ data }">
                  <div v-if="data.priceLoading" class="flex items-center gap-1">
                    <i class="pi pi-spinner animate-spin text-xs"></i>
                  </div>
                  <span v-else-if="data.vwap1d !== null">{{ formatNumber(data.vwap1d) }}</span>
                  <span v-else class="text-gray-400">N/A</span>
                </template>
              </Column>
              <Column field="vwap7d" :header="t('views.allAssets.table.vwap7d')" sortable>
                <template #body="{ data }">
                  <div v-if="data.priceLoading" class="flex items-center gap-1">
                    <i class="pi pi-spinner animate-spin text-xs"></i>
                  </div>
                  <span v-else-if="data.vwap7d !== null">{{ formatNumber(data.vwap7d) }}</span>
                  <span v-else class="text-gray-400">N/A</span>
                </template>
              </Column>
              <Column field="volume1d" :header="t('views.allAssets.table.volume1d')" sortable>
                <template #body="{ data }">
                  <div v-if="data.priceLoading" class="flex items-center gap-1">
                    <i class="pi pi-spinner animate-spin text-xs"></i>
                  </div>
                  <span v-else-if="data.volume1d !== null">{{ formatNumber(data.volume1d) }}</span>
                  <span v-else class="text-gray-400">N/A</span>
                </template>
              </Column>
              <Column field="volume7d" :header="t('views.allAssets.table.volume7d')" sortable>
                <template #body="{ data }">
                  <div v-if="data.priceLoading" class="flex items-center gap-1">
                    <i class="pi pi-spinner animate-spin text-xs"></i>
                  </div>
                  <span v-else-if="data.volume7d !== null">{{ formatNumber(data.volume7d) }}</span>
                  <span v-else class="text-gray-400">N/A</span>
                </template>
              </Column>
              <Column :header="t('views.allAssets.table.actions')">
                <template #body="{ data }">
                  <div class="flex gap-2">
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
