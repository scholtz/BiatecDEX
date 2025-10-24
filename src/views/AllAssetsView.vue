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
import type algosdk from 'algosdk'

interface AssetRow {
  assetId: number
  assetName: string
  assetCode: string
  assetSymbol: string
  decimals: number
  poolCount: number
  aggregatedAssetATvl: number
  aggregatedAssetBTvl: number
  totalTvlUsd: number
  usdPrice?: number
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
        formattedAssetATvl: formatUsd(row.aggregatedAssetATvl),
        formattedAssetBTvl: formatUsd(row.aggregatedAssetBTvl)
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
    const dummyAddress = 'TESTNTTTJDHIF5PJZUBTTDYYSKLCLM6KXCTWIOOTZJX5HO7263DPPMM2SU'
    const dummyTransactionSigner = async (
      txnGroup: algosdk.Transaction[],
      indexesToSign: number[]
    ): Promise<Uint8Array[]> => {
      return [] as Uint8Array[]
    }

    // Aggregate data by asset
    const assetDataMap = new Map<
      number,
      {
        poolCount: number
        aggregatedAssetATvl: number
        aggregatedAssetBTvl: number
      }
    >()

    const assetIds = new Set<number>()

    // Process each pool to get TVL data
    for (const pool of allPools) {
      try {
        const biatecClammPoolClient = new BiatecClammPoolClient({
          algorand: store.state.clientPP.algorand,
          appId: pool.appId,
          defaultSender: dummyAddress,
          defaultSigner: dummyTransactionSigner
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
        const dataA = assetDataMap.get(assetAId) || {
          poolCount: 0,
          aggregatedAssetATvl: 0,
          aggregatedAssetBTvl: 0
        }
        dataA.poolCount += 1
        dataA.aggregatedAssetATvl += Number(status.realABalance || 0n)
        assetDataMap.set(assetAId, dataA)

        // Get or initialize asset B data
        const dataB = assetDataMap.get(assetBId) || {
          poolCount: 0,
          aggregatedAssetATvl: 0,
          aggregatedAssetBTvl: 0
        }
        dataB.poolCount += 1
        dataB.aggregatedAssetBTvl += Number(status.realBBalance || 0n)
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
      const assetATvl = data.aggregatedAssetATvl / 10 ** decimals
      const assetBTvl = data.aggregatedAssetBTvl / 10 ** decimals
      const assetATvlUsd = usdPrice ? assetATvl * usdPrice : 0
      const assetBTvlUsd = usdPrice ? assetBTvl * usdPrice : 0
      const totalTvlUsd = assetATvlUsd + assetBTvlUsd

      nextAssetRows.push({
        assetId,
        assetName: name,
        assetCode: code,
        assetSymbol: symbol,
        decimals,
        poolCount: data.poolCount,
        aggregatedAssetATvl: assetATvlUsd,
        aggregatedAssetBTvl: assetBTvlUsd,
        totalTvlUsd,
        usdPrice
      })
    }

    state.assetRows = nextAssetRows
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

const onAddLiquidity = (assetCode: string) => {
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

const onRemoveLiquidity = (assetCode: string) => {
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
          <div
            class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 auto-rows-fr"
          >
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
          <div class="flex justify-between items-center mb-4">
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
              <Column
                field="poolCount"
                :header="t('views.allAssets.table.poolCount')"
                sortable
              >
                <template #body="{ data }">
                  <span>{{ data.poolCount }}</span>
                </template>
              </Column>
              <Column
                field="aggregatedAssetATvl"
                :header="t('views.allAssets.table.assetATvl')"
                sortable
              >
                <template #body="{ data }">
                  <span>{{ data.formattedAssetATvl }}</span>
                </template>
              </Column>
              <Column
                field="aggregatedAssetBTvl"
                :header="t('views.allAssets.table.assetBTvl')"
                sortable
              >
                <template #body="{ data }">
                  <span>{{ data.formattedAssetBTvl }}</span>
                </template>
              </Column>
              <Column
                field="totalTvlUsd"
                :header="t('views.allAssets.table.totalTvl')"
                sortable
              >
                <template #body="{ data }">
                  <span class="font-semibold">{{ data.formattedTotalTvl }}</span>
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
