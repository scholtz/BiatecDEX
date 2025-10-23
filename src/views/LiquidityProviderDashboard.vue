<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch, toRef } from 'vue'
import Layout from '@/layouts/PublicLayout.vue'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import Button from 'primevue/button'
import Dropdown from 'primevue/dropdown'
import Message from 'primevue/message'
import { useAppStore } from '@/stores/app'
import { useI18n } from 'vue-i18n'
import { useAVMAuthentication } from 'algorand-authentication-component-vue'
import { useNetwork } from '@txnlab/use-wallet-vue'
import getAlgodClient from '@/scripts/algo/getAlgodClient'
import { getAVMTradeReporterAPI } from '@/api'
import { AssetsService } from '@/service/AssetsService'
import Skeleton from 'primevue/skeleton'
import {
  useLiquidityProviderDashboardComputed,
  type LiquidityPosition
} from '@/composables/useLiquidityProviderDashboard'
import type { BiatecAsset } from '@/api/models'
import type { IAsset } from '@/interface/IAsset'
import { useRouter } from 'vue-router'
import { BiatecClammPoolClient, getPools } from 'biatec-concentrated-liquidity-amm'
import type algosdk from 'algosdk'

interface AssetOption {
  label: string
  value: string
}

const store = useAppStore()
const { t, locale } = useI18n()
const { authStore } = useAVMAuthentication()
const { activeNetworkConfig } = useNetwork()
const router = useRouter()
const api = getAVMTradeReporterAPI()

const state = reactive({
  isLoading: false,
  error: '',
  positions: [] as LiquidityPosition[]
})

const selectedAssetCode = ref<string | null>(null)
const selectedQuoteAssetCode = ref<string | null>(null)

const formatUsd = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return 'N/A'
  }
  return usdFormatter.value.format(value)
}

const positionsRef = toRef(state, 'positions')
const { positionRows, totalUsdValue, positionCount, largestPosition } =
  useLiquidityProviderDashboardComputed(positionsRef, selectedAssetCode, locale, formatUsd)

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
      maximumFractionDigits: 4
    })
)

const fromAssetOptions = computed<AssetOption[]>(() => {
  const options: AssetOption[] = []
  const seen = new Set<string>()
  
  // Collect unique assets from positions
  for (const position of state.positions) {
    const assetA = assetCatalogById.value.get(position.assetIdA)
    const assetB = assetCatalogById.value.get(position.assetIdB)
    
    if (assetA && assetA.network === store.state.env && !seen.has(assetA.code)) {
      seen.add(assetA.code)
      options.push({
        label: `${assetA.name} (${assetA.code})`,
        value: assetA.code
      })
    }
    
    if (assetB && assetB.network === store.state.env && !seen.has(assetB.code)) {
      seen.add(assetB.code)
      options.push({
        label: `${assetB.name} (${assetB.code})`,
        value: assetB.code
      })
    }
  }
  
  options.sort((a, b) => a.label.localeCompare(b.label))
  return options
})

const quoteAssetOptions = computed<AssetOption[]>(() => {
  if (!selectedAssetCode.value) return []
  
  const options: AssetOption[] = []
  const seen = new Set<string>()
  
  for (const position of state.positions) {
    const hasSelectedAsA = assetCatalogById.value.get(position.assetIdA)?.code === selectedAssetCode.value
    const hasSelectedAsB = assetCatalogById.value.get(position.assetIdB)?.code === selectedAssetCode.value
    
    if (hasSelectedAsA) {
      const assetB = assetCatalogById.value.get(position.assetIdB)
      if (assetB && !seen.has(assetB.code)) {
        seen.add(assetB.code)
        options.push({
          label: `${assetB.name} (${assetB.code})`,
          value: assetB.code
        })
      }
    }
    
    if (hasSelectedAsB) {
      const assetA = assetCatalogById.value.get(position.assetIdA)
      if (assetA && !seen.has(assetA.code)) {
        seen.add(assetA.code)
        options.push({
          label: `${assetA.name} (${assetA.code})`,
          value: assetA.code
        })
      }
    }
  }
  
  options.sort((a, b) => a.label.localeCompare(b.label))
  return options
})

const isActionDisabled = computed(() => !selectedAssetCode.value || !selectedQuoteAssetCode.value)

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

const ensureSelections = () => {
  const fromCodes = fromAssetOptions.value.map((option) => option.value)
  if (!fromCodes.includes(selectedAssetCode.value ?? '')) {
    selectedAssetCode.value = null
  }
  if (!selectedAssetCode.value && fromCodes.length > 0) {
    if (store.state.assetCode && fromCodes.includes(store.state.assetCode)) {
      selectedAssetCode.value = store.state.assetCode
    } else {
      selectedAssetCode.value = fromCodes[0]
    }
  }

  const quoteCodes = quoteAssetOptions.value.map((option) => option.value)
  if (!quoteCodes.includes(selectedQuoteAssetCode.value ?? '')) {
    selectedQuoteAssetCode.value = null
  }
  if (!selectedQuoteAssetCode.value && quoteCodes.length > 0) {
    if (store.state.currencyCode && quoteCodes.includes(store.state.currencyCode)) {
      selectedQuoteAssetCode.value = store.state.currencyCode
    } else {
      selectedQuoteAssetCode.value = quoteCodes[0]
    }
  }
}

const loadLiquidityPositions = async (showLoading = true) => {
  if (!authStore.isAuthenticated || !authStore.account || !activeNetworkConfig.value) {
    state.positions = []
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
    const account = await algod.accountInformation(authStore.account).do()
    
    if (requestId !== loadToken.value) {
      return
    }

    const nextPositions: LiquidityPosition[] = []
    const accountAssets = Array.isArray(account?.assets) ? account.assets : []
    const assetIds = new Set<number>()

    // Get all pools for each asset
    const poolsByAsset = new Map<number, any[]>()
    for (const asset of accountAssets) {
      const assetId = (asset as any)['asset-id'] ?? asset.assetId
      if (assetId === undefined || assetId === null) continue
      
      assetIds.add(assetId)
      
      try {
        const pools = await getPools({
          algod: algod,
          assetId: BigInt(assetId),
          poolProviderAppId: store.state.clientPP.appId
        })
        poolsByAsset.set(assetId, pools)
      } catch (error) {
        console.error(`Error fetching pools for asset ${assetId}:`, error)
      }
    }

    // Process pools and check if user has LP tokens
    const dummyAddress = 'TESTNTTTJDHIF5PJZUBTTDYYSKLCLM6KXCTWIOOTZJX5HO7263DPPMM2SU'
    const dummyTransactionSigner = async (
      txnGroup: algosdk.Transaction[],
      indexesToSign: number[]
    ): Promise<Uint8Array[]> => {
      return [] as Uint8Array[]
    }

    for (const [assetId, pools] of poolsByAsset.entries()) {
      for (const pool of pools) {
        try {
          // Check if user has LP tokens for this pool
          const lpAsset = accountAssets.find((a) => ((a as any)['asset-id'] ?? a.assetId) === Number(pool.lpTokenId))
          if (!lpAsset || !lpAsset.amount || Number(lpAsset.amount) === 0) {
            continue
          }

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

          const managedA = assetCatalogById.value.get(Number(pool.assetA))
          const managedB = assetCatalogById.value.get(Number(pool.assetB))

          const lpTokenAmount = BigInt(lpAsset.amount)
          const totalLPSupply = status.poolToken || 1n
          const userShareRatio = Number(lpTokenAmount) / Number(totalLPSupply)

          const userAmountA = BigInt(Math.floor(Number(status.realABalance || 0n) * userShareRatio))
          const userAmountB = BigInt(Math.floor(Number(status.realBBalance || 0n) * userShareRatio))

          nextPositions.push({
            poolAppId: Number(pool.appId),
            assetIdA: Number(pool.assetA),
            assetIdB: Number(pool.assetB),
            amountA: userAmountA,
            amountB: userAmountB,
            decimalsA: managedA?.decimals ?? 0,
            decimalsB: managedB?.decimals ?? 0,
            nameA: managedA?.name ?? `#${pool.assetA}`,
            nameB: managedB?.name ?? `#${pool.assetB}`,
            symbolA: managedA?.symbol ?? managedA?.code ?? '',
            symbolB: managedB?.symbol ?? managedB?.code ?? '',
            codeA: managedA?.code,
            codeB: managedB?.code,
            network: managedA?.network ?? store.state.env,
            lpTokenAmount,
            lpTokenDecimals: 6
          })
        } catch (error) {
          console.error(`Error processing pool ${pool.appId}:`, error)
        }
      }
    }

    // Fetch USD valuations
    const uniqueAssetIds = new Set<number>()
    nextPositions.forEach((pos) => {
      uniqueAssetIds.add(pos.assetIdA)
      uniqueAssetIds.add(pos.assetIdB)
    })

    if (uniqueAssetIds.size > 0) {
      try {
        const valuations = await fetchValuations(Array.from(uniqueAssetIds))
        const valuationMap = new Map<number, BiatecAsset>()
        valuations.forEach((asset) => {
          valuationMap.set(Number(asset.index), asset)
        })

        nextPositions.forEach((position) => {
          const valuationA = valuationMap.get(position.assetIdA)
          const valuationB = valuationMap.get(position.assetIdB)

          if (valuationA && typeof valuationA.priceUSD === 'number') {
            position.usdPriceA = valuationA.priceUSD
            const balanceA = Number(position.amountA) / 10 ** position.decimalsA
            if (Number.isFinite(balanceA)) {
              position.usdValueA = balanceA * valuationA.priceUSD
            }
          }

          if (valuationB && typeof valuationB.priceUSD === 'number') {
            position.usdPriceB = valuationB.priceUSD
            const balanceB = Number(position.amountB) / 10 ** position.decimalsB
            if (Number.isFinite(balanceB)) {
              position.usdValueB = balanceB * valuationB.priceUSD
            }
          }
        })
      } catch (valuationError) {
        state.error =
          valuationError instanceof Error ? valuationError.message : String(valuationError)
      }
    }

    // Sort by total USD value
    nextPositions.sort((a, b) => {
      const aValue = (a.usdValueA ?? 0) + (a.usdValueB ?? 0)
      const bValue = (b.usdValueA ?? 0) + (b.usdValueB ?? 0)
      const diff = bValue - aValue
      if (Math.abs(diff) > 1e-8) {
        return diff
      }
      return a.nameA.localeCompare(b.nameA)
    })

    state.positions = nextPositions
    await nextTick()
    ensureSelections()
  } catch (error) {
    if (requestId !== loadToken.value) {
      return
    }
    state.error = error instanceof Error ? error.message : String(error)
    state.positions = []
  } finally {
    if (requestId === loadToken.value && showLoading) {
      state.isLoading = false
    }
  }
}

const onAddLiquidity = () => {
  if (!selectedAssetCode.value || !selectedQuoteAssetCode.value) return
  const network = store.state.env || 'algorand'
  router.push({
    name: 'liquidity-with-assets',
    params: {
      network,
      assetCode: selectedAssetCode.value,
      currencyCode: selectedQuoteAssetCode.value
    }
  })
}

const onRemoveLiquidity = (poolAppId: number) => {
  const network = store.state.env || 'algorand'
  router.push({
    name: 'remove-liquidity',
    params: {
      network,
      ammAppId: poolAppId.toString()
    }
  })
}

const onRefresh = () => {
  void loadLiquidityPositions()
}

const onNavigateToOptIn = () => {
  router.push({
    name: 'asset-opt-in'
  })
}

watch(
  () => authStore.account,
  (account) => {
    if (!account) {
      state.positions = []
      state.error = ''
      selectedAssetCode.value = null
      selectedQuoteAssetCode.value = null
    } else {
      void loadLiquidityPositions()
    }
  }
)

watch(fromAssetOptions, ensureSelections)
watch(quoteAssetOptions, ensureSelections)

watch(
  () => store.state.assetCode,
  (code) => {
    if (code && fromAssetOptions.value.some((option) => option.value === code)) {
      selectedAssetCode.value = code
    }
  }
)

watch(
  () => store.state.currencyCode,
  (code) => {
    if (code && quoteAssetOptions.value.some((option) => option.value === code)) {
      selectedQuoteAssetCode.value = code
    }
  }
)

watch(
  () => store.state.refreshAccountBalance,
  (shouldRefresh) => {
    if (shouldRefresh) {
      void loadLiquidityPositions(false)
      store.state.refreshAccountBalance = false
    }
  }
)

onMounted(() => {
  ensureSelections()
  void loadLiquidityPositions()
  intervalId = setInterval(() => {
    void loadLiquidityPositions(false)
  }, 10000)
})

onUnmounted(() => {
  if (intervalId) {
    clearInterval(intervalId)
  }
})
</script>

<template>
  <Layout :authRequired="true">
    <div class="flex w-full flex-col gap-4 py-2">
      <div class="relative px-2">
        <div
          class="absolute inset-0 rounded-xl bg-white/70 backdrop-blur-sm dark:bg-surface-800/70 shadow-sm"
        ></div>
        <div class="relative flex flex-col gap-6 p-4 rounded-xl">
          <div class="flex flex-col gap-2">
            <h1 class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              {{ t('views.liquidityProviderDashboard.title') }}
            </h1>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {{ t('views.liquidityProviderDashboard.subtitle') }}
            </p>
          </div>
          <div
            class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr"
          >
            <!-- Portfolio Value -->
            <div
              class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white/65 dark:bg-surface-800/60 backdrop-blur p-4 flex flex-col"
            >
              <span
                class="text-[10px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400"
                >{{ t('views.liquidityProviderDashboard.portfolioValue') }}</span
              >
              <span
                class="mt-1 text-xl sm:text-2xl font-bold truncate"
                :title="totalUsdValue.toLocaleString(locale)"
                >{{ formatUsd(totalUsdValue) }}</span
              >
            </div>
            <!-- Position Count -->
            <div
              v-if="positionCount > 0"
              class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white/65 dark:bg-surface-800/60 backdrop-blur p-4 flex flex-col"
            >
              <span
                class="text-[10px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400"
                >{{ t('views.liquidityProviderDashboard.positionCount') }}</span
              >
              <span class="mt-1 text-xl sm:text-2xl font-bold">{{ positionCount }}</span>
            </div>
            <!-- Largest Position -->
            <div
              v-if="largestPosition"
              class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white/65 dark:bg-surface-800/60 backdrop-blur p-4 flex flex-col"
            >
              <span
                class="text-[10px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400"
                >{{ t('views.liquidityProviderDashboard.largestPosition') }}</span
              >
              <span class="mt-1 font-medium truncate"
                >{{ largestPosition.nameA
                }}<span v-if="largestPosition.codeA"> ({{ largestPosition.codeA }})</span> /
                {{ largestPosition.nameB
                }}<span v-if="largestPosition.codeB"> ({{ largestPosition.codeB }})</span></span
              >
              <span class="text-xs text-gray-600 dark:text-gray-300">{{
                formatUsd((largestPosition.usdValueA ?? 0) + (largestPosition.usdValueB ?? 0))
              }}</span>
            </div>
            <!-- Asset Selection -->
            <div
              class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white/65 dark:bg-surface-800/60 backdrop-blur p-4 flex flex-col"
            >
              <span
                class="text-[10px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400"
                >{{ t('views.liquidityProviderDashboard.selection.selectAsset') }}</span
              >
              <div class="mt-2 flex items-center gap-2">
                <Button
                  icon="pi pi-refresh"
                  size="small"
                  class="shrink-0"
                  :title="t('views.liquidityProviderDashboard.actions.refresh')"
                  @click="onRefresh"
                />
                <Dropdown
                  v-model="selectedAssetCode"
                  :options="fromAssetOptions"
                  optionLabel="label"
                  optionValue="value"
                  class="w-full"
                  :placeholder="t('views.liquidityProviderDashboard.selection.assetLabel')"
                />
              </div>
            </div>
            <!-- Quote Asset Selection -->
            <div
              v-if="selectedAssetCode"
              class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white/65 dark:bg-surface-800/60 backdrop-blur p-4 flex flex-col"
            >
              <span
                class="text-[10px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400"
                >{{ t('views.liquidityProviderDashboard.selection.selectQuoteAsset') }}</span
              >
              <div class="mt-2">
                <Dropdown
                  v-model="selectedQuoteAssetCode"
                  :options="quoteAssetOptions"
                  optionLabel="label"
                  optionValue="value"
                  class="w-full"
                  :placeholder="t('views.liquidityProviderDashboard.selection.quoteAssetLabel')"
                />
              </div>
            </div>
            <!-- Add Liquidity Button -->
            <div
              v-if="selectedAssetCode && selectedQuoteAssetCode"
              class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white/65 dark:bg-surface-800/60 backdrop-blur p-4 flex flex-col justify-center"
            >
              <Button
                icon="pi pi-plus-circle"
                :label="t('views.liquidityProviderDashboard.actions.addLiquidity')"
                severity="success"
                @click="onAddLiquidity"
                :disabled="isActionDisabled"
              />
            </div>
          </div>
        </div>
      </div>
      <Card class="mx-0">
        <template #content>
          <Message v-if="state.error" severity="error" class="mb-3">
            {{
              t('views.liquidityProviderDashboard.errors.loadFailed', { message: state.error })
            }}
          </Message>
          <Message
            v-else-if="!state.isLoading && positionRows.length === 0"
            severity="info"
            class="mb-3 flex items-center gap-2"
          >
            <i class="pi pi-info-circle text-lg"></i>
            {{ t('views.liquidityProviderDashboard.empty') }}
          </Message>
          <div v-if="state.isLoading" class="flex flex-col gap-2">
            <div v-for="n in 4" :key="n" class="flex items-center gap-6">
              <Skeleton width="14rem" height="1rem" />
              <Skeleton width="8rem" height="1rem" />
              <Skeleton width="6rem" height="1rem" />
              <Skeleton width="6rem" height="1rem" />
            </div>
          </div>
          <template v-else>
            <DataTable
              :value="positionRows"
              dataKey="poolAppId"
              stripedRows
              responsiveLayout="scroll"
              class="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden"
              :rowClass="(row) => (row.isSelected ? 'bg-blue-50 dark:bg-blue-900/30' : '')"
              sortMode="multiple"
            >
              <Column :header="t('views.liquidityProviderDashboard.table.pool')" sortable>
                <template #body="{ data }">
                  <div class="flex flex-col">
                    <span class="font-medium">{{ data.displayNameA }} / {{ data.displayNameB }}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-300">
                      {{ t('views.liquidityProviderDashboard.table.poolId') }}: {{ data.poolAppId }}
                    </span>
                  </div>
                </template>
              </Column>
              <Column
                field="amountLabelA"
                :header="t('views.liquidityProviderDashboard.table.assetABalance')"
                sortable
              >
                <template #body="{ data }">
                  <div class="flex flex-col">
                    <span>{{ data.amountLabelA }}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-300">{{
                      data.usdValueLabelA
                    }}</span>
                  </div>
                </template>
              </Column>
              <Column
                field="amountLabelB"
                :header="t('views.liquidityProviderDashboard.table.assetBBalance')"
                sortable
              >
                <template #body="{ data }">
                  <div class="flex flex-col">
                    <span>{{ data.amountLabelB }}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-300">{{
                      data.usdValueLabelB
                    }}</span>
                  </div>
                </template>
              </Column>
              <Column
                field="totalUsdValue"
                :header="t('views.liquidityProviderDashboard.table.totalValue')"
                sortable
              >
                <template #body="{ data }">
                  <span class="font-semibold">{{ data.totalUsdValueLabel }}</span>
                </template>
              </Column>
              <Column :header="t('views.liquidityProviderDashboard.table.actions')">
                <template #body="{ data }">
                  <div class="flex gap-2">
                    <Button
                      icon="pi pi-minus-circle"
                      size="small"
                      severity="danger"
                      :title="t('views.liquidityProviderDashboard.actions.removeLiquidity')"
                      @click="onRemoveLiquidity(data.poolAppId)"
                    />
                  </div>
                </template>
              </Column>
            </DataTable>
            <div
              class="mt-4 m-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <span class="text-sm text-gray-600 dark:text-gray-300">
                {{ t('views.liquidityProviderDashboard.optIn.hint') }}
              </span>
              <Button
                icon="pi pi-plus"
                size="small"
                :label="t('views.liquidityProviderDashboard.optIn.cta')"
                @click="onNavigateToOptIn"
              />
            </div>
          </template>
        </template>
      </Card>
    </div>
  </Layout>
</template>
