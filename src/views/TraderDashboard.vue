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
import formatNumber from '@/scripts/asset/formatNumber'
import Skeleton from 'primevue/skeleton'
import {
  useTraderDashboardComputed,
  type DashboardAsset as DashboardAssetModel
} from '@/composables/useTraderDashboard'
import type { BiatecAsset } from '@/api/models'
import type { IAsset } from '@/interface/IAsset'
import { useRouter } from 'vue-router'

// Local alias to avoid confusion with composable export
interface DashboardAsset extends DashboardAssetModel {}

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
  assets: [] as DashboardAsset[]
})

// Selection refs (declared early for downstream computed usage)
const selectedFromAssetCode = ref<string | null>(null)
// Quote asset removed

// --- Summary KPI Computations via composable ---
const formatUsd = (value?: number) => {
  if (value === undefined || value === null || Number.isNaN(value)) {
    return 'N/A'
  }
  return usdFormatter.value.format(value)
}
// Use toRef so mutations to state.assets propagate into composable
const assetsRef = toRef(state, 'assets')
const { assetRows, totalUsdValue, assetCount, largestHolding, dailyChangePct, dailyChangeLabel } =
  useTraderDashboardComputed(assetsRef, selectedFromAssetCode, locale, formatUsd)
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
  for (const row of state.assets) {
    const managed = assetCatalogById.value.get(row.assetId)
    if (!managed) continue
    if (managed.network !== store.state.env) continue
    if (seen.has(managed.code)) continue
    seen.add(managed.code)
    options.push({
      label: `${managed.name} (${managed.code})`,
      value: managed.code
    })
  }
  options.sort((a, b) => a.label.localeCompare(b.label))
  return options
})

// Removed quote asset options

// assetRows comes from composable

// Selection refs (must exist before computed below)

const isSwapDisabled = computed(() => !selectedFromAssetCode.value)

const extractAssetId = (raw: any): number | null => {
  const candidate = raw?.['asset-id'] ?? raw?.assetId ?? raw?.id
  if (candidate === undefined || candidate === null) {
    return null
  }
  const parsed = Number(candidate)
  return Number.isFinite(parsed) ? parsed : null
}

const extractAmount = (raw: any): bigint => {
  const value = raw?.amount ?? raw?.balance ?? 0
  try {
    return BigInt(value)
  } catch {
    const numeric = Number(value)
    if (Number.isFinite(numeric)) {
      return BigInt(Math.trunc(numeric))
    }
    return 0n
  }
}

const extractDecimals = (raw: any): number | undefined => {
  const candidates = [
    raw?.decimals,
    raw?.params?.decimals,
    raw?.assetInfo?.params?.decimals,
    raw?.['asset-info']?.params?.decimals
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'number') {
      return candidate
    }
  }
  return undefined
}

const extractUnitName = (raw: any): string | undefined => {
  const candidates = [
    raw?.unitName,
    raw?.params?.unitName,
    raw?.assetInfo?.params?.unitName,
    raw?.['asset-info']?.params?.unitName
  ]
  for (const candidate of candidates) {
    if (typeof candidate === 'string' && candidate.length > 0) {
      return candidate
    }
  }
  return undefined
}

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
  if (!fromCodes.includes(selectedFromAssetCode.value ?? '')) {
    selectedFromAssetCode.value = null
  }
  if (!selectedFromAssetCode.value && fromCodes.length > 0) {
    if (store.state.assetCode && fromCodes.includes(store.state.assetCode)) {
      selectedFromAssetCode.value = store.state.assetCode
    } else {
      selectedFromAssetCode.value = fromCodes[0]
    }
  }

  // Quote asset selection removed
}

const loadAccountAssets = async (showLoading = true) => {
  if (!authStore.isAuthenticated || !authStore.account || !activeNetworkConfig.value) {
    state.assets = []
    state.error = ''
    return
  }

  const requestId = ++loadToken.value
  if (showLoading) {
    state.isLoading = true
  }
  state.error = ''

  try {
    const algod = getAlgodClient(activeNetworkConfig.value)
    const account = await algod.accountInformation(authStore.account).do()
    if (requestId !== loadToken.value) {
      return
    }

    const nextAssets: DashboardAsset[] = []

    const managedAlgo = assetCatalogById.value.get(0)
    const algoAmount = account?.amount !== undefined ? BigInt(account.amount) : 0n
    nextAssets.push({
      assetId: 0,
      amount: algoAmount,
      decimals: managedAlgo?.decimals ?? 6,
      name: managedAlgo?.name ?? 'Algorand',
      symbol: managedAlgo?.symbol ?? managedAlgo?.code ?? 'ALGO',
      code: managedAlgo?.code,
      network: managedAlgo?.network ?? store.state.env
    })

    const accountAssets = Array.isArray(account?.assets) ? account.assets : []
    for (const raw of accountAssets) {
      const assetId = extractAssetId(raw)
      if (assetId === null) continue
      const amount = extractAmount(raw)
      const managed = assetCatalogById.value.get(assetId)
      const decimals = managed?.decimals ?? extractDecimals(raw) ?? 0
      const unitName = extractUnitName(raw)
      nextAssets.push({
        assetId,
        amount,
        decimals,
        name: managed?.name ?? `#${assetId}`,
        symbol: managed?.symbol ?? managed?.code ?? unitName ?? '',
        code: managed?.code,
        network: managed?.network ?? store.state.env
      })
    }

    // Include ALGO (0) as well for valuation so portfolio total reflects it
    const idsForValuation = Array.from(new Set(nextAssets.map((asset) => asset.assetId)))

    if (idsForValuation.length > 0) {
      try {
        const valuations = await fetchValuations(idsForValuation)
        const valuationMap = new Map<number, BiatecAsset>()
        valuations.forEach((asset) => {
          valuationMap.set(Number(asset.index), asset)
        })

        nextAssets.forEach((row) => {
          const valuation = valuationMap.get(row.assetId)
          if (!valuation) return
          if (valuation.params?.name) {
            row.name = valuation.params.name
          }
          if (valuation.params?.unitName) {
            row.symbol = valuation.params.unitName
          }
          if (typeof valuation.params?.decimals === 'number') {
            row.decimals = valuation.params.decimals
          }
          if (typeof valuation.priceUSD === 'number') {
            row.usdPrice = valuation.priceUSD
          }
        })
      } catch (valuationError) {
        state.error =
          valuationError instanceof Error ? valuationError.message : String(valuationError)
      }
    }

    nextAssets.forEach((row) => {
      const managed = assetCatalogById.value.get(row.assetId)
      if (managed) {
        row.name = managed.name ?? row.name
        row.symbol = managed.symbol ?? row.symbol
        row.code = managed.code
        row.decimals = managed.decimals ?? row.decimals
      }
      if (row.usdPrice !== undefined) {
        const balance = Number(row.amount) / 10 ** (row.decimals ?? 0)
        if (Number.isFinite(balance)) {
          row.usdValue = balance * row.usdPrice
        }
      }
    })

    nextAssets.sort((a, b) => {
      const diff = (b.usdValue ?? 0) - (a.usdValue ?? 0)
      if (Math.abs(diff) > 1e-8) {
        return diff
      }
      return a.name.localeCompare(b.name)
    })

    state.assets = nextAssets
    await nextTick()
    ensureSelections()
  } catch (error) {
    if (requestId !== loadToken.value) {
      return
    }
    state.error = error instanceof Error ? error.message : String(error)
    state.assets = []
  } finally {
    if (requestId === loadToken.value && showLoading) {
      state.isLoading = false
    }
  }
}

const onSwapRow = (rowCode: string | undefined) => {
  if (!selectedFromAssetCode.value || !rowCode || selectedFromAssetCode.value === rowCode) return
  const network = store.state.env || 'algorand'
  // Requirement: algo/gd should interpret gd as asset (row) and algo as currency (selected)
  router.push({
    name: 'tradeWithAssets',
    params: {
      network,
      assetCode: rowCode,
      currencyCode: selectedFromAssetCode.value
    }
  })
}

const onRefresh = () => {
  void loadAccountAssets()
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
      state.assets = []
      state.error = ''
      selectedFromAssetCode.value = null
      // quote asset removed
    } else {
      void loadAccountAssets()
    }
  }
)

watch(fromAssetOptions, ensureSelections)
// removed quote asset watcher

watch(
  () => store.state.assetCode,
  (code) => {
    if (code && fromAssetOptions.value.some((option) => option.value === code)) {
      selectedFromAssetCode.value = code
    }
  }
)

watch(
  () => store.state.refreshAccountBalance,
  (shouldRefresh) => {
    if (shouldRefresh) {
      void loadAccountAssets(false)
      store.state.refreshAccountBalance = false
    }
  }
)

// removed currency code watcher

const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
}

onMounted(() => {
  ensureSelections()
  void loadAccountAssets()
  intervalId = setInterval(() => {
    void loadAccountAssets(false)
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
              {{ t('views.traderDashboard.title') }}
            </h1>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {{ t('views.traderDashboard.subtitle') }}
            </p>
          </div>
          <div
            class="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 auto-rows-fr"
          >
            <!-- Portfolio Value -->
            <div
              class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white/65 dark:bg-surface-800/60 backdrop-blur p-4 flex flex-col"
              v-tooltip.top="t('tooltips.dashboard.portfolioValue')"
            >
              <span
                class="text-[10px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400"
                >{{ t('views.traderDashboard.portfolioValue') }}</span
              >
              <span
                class="mt-1 text-xl sm:text-2xl font-bold truncate"
                :title="totalUsdValue.toLocaleString(locale)"
                >{{ formatUsd(totalUsdValue) }}</span
              >
            </div>
            <!-- Assets Count -->
            <div
              v-if="assetCount > 0"
              class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white/65 dark:bg-surface-800/60 backdrop-blur p-4 flex flex-col"
              v-tooltip.top="t('tooltips.dashboard.assetsCount')"
            >
              <span
                class="text-[10px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400"
                >{{ t('views.traderDashboard.assetsCount') }}</span
              >
              <span class="mt-1 text-xl sm:text-2xl font-bold">{{ assetCount }}</span>
            </div>
            <!-- Largest Holding -->
            <div
              v-if="largestHolding"
              class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white/65 dark:bg-surface-800/60 backdrop-blur p-4 flex flex-col"
              v-tooltip.top="t('tooltips.dashboard.largestHolding')"
            >
              <span
                class="text-[10px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400"
                >{{ t('views.traderDashboard.largestHolding') }}</span
              >
              <span class="mt-1 font-medium truncate"
                >{{ largestHolding.name
                }}<span v-if="largestHolding.code"> ({{ largestHolding.code }})</span></span
              >
              <span class="text-xs text-gray-600 dark:text-gray-300">{{
                formatUsd(largestHolding.usdValue)
              }}</span>
            </div>
            <!-- Swap Controls -->
            <div
              class="rounded-lg border border-surface-200 dark:border-surface-700 bg-white/65 dark:bg-surface-800/60 backdrop-blur p-4 flex flex-col"
              v-tooltip.top="t('tooltips.dashboard.assetSelection')"
            >
              <span
                class="text-[10px] font-semibold tracking-wide uppercase text-gray-500 dark:text-gray-400"
                >{{ t('views.traderDashboard.selection.swapFromAsset') }}</span
              >
              <div class="mt-2 flex items-center gap-2">
                <Button
                  icon="pi pi-refresh"
                  size="small"
                  class="shrink-0"
                  v-tooltip.top="t('tooltips.dashboard.refresh')"
                  @click="onRefresh"
                />
                <Dropdown
                  v-model="selectedFromAssetCode"
                  :options="fromAssetOptions"
                  optionLabel="label"
                  optionValue="value"
                  class="w-full"
                  :placeholder="t('views.traderDashboard.selection.assetLabel')"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      <Card class="mx-0">
        <template #content>
          <Message v-if="state.error" severity="error" class="mb-3">
            {{ t('views.traderDashboard.errors.loadFailed', { message: state.error }) }}
          </Message>
          <Message
            v-else-if="!state.isLoading && assetRows.length === 0"
            severity="info"
            class="mb-3 flex items-center gap-2"
          >
            <i class="pi pi-info-circle text-lg"></i>
            {{ t('views.traderDashboard.empty') }}
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
              :value="assetRows"
              dataKey="assetId"
              stripedRows
              responsiveLayout="scroll"
              class="border border-surface-200 dark:border-surface-700 rounded-lg overflow-hidden"
              :rowClass="
                (row) =>
                  row.isFrom
                    ? 'bg-blue-50 dark:bg-blue-900/30'
                    : row.isTo
                      ? 'bg-emerald-50 dark:bg-emerald-900/30'
                      : ''
              "
              sortMode="multiple"
            >
              <Column sortable>
                <template #header>
                  <span v-tooltip.top="t('tooltips.tables.assetId')">{{
                    t('views.traderDashboard.table.asset')
                  }}</span>
                </template>
                <template #body="{ data }">
                  <div class="flex items-center gap-3">
                    <div class="flex flex-col flex-1">
                      <span
                        class="font-medium"
                        :class="{
                          'text-blue-600 dark:text-blue-300': data.isFrom
                        }"
                        >{{ data.assetName }}</span
                      >
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
              <Column field="amountLabel" sortable>
                <template #header>
                  <span v-tooltip.top="t('tooltips.tables.balance')">{{
                    t('views.traderDashboard.table.balance')
                  }}</span>
                </template>
                <template #body="{ data }">
                  <span :title="data.baseAmountRaw.toLocaleString()">{{ data.amountLabel }}</span>
                </template>
              </Column>
              <Column
                field="usdPriceLabel"
                :header="t('views.traderDashboard.table.usdPrice')"
                sortable
              >
                <template #body="{ data }">
                  <span>{{ data.usdPriceLabel }}</span>
                </template>
              </Column>
              <Column field="usdValueRaw" sortable>
                <template #header>
                  <span v-tooltip.top="t('tooltips.tables.usdValue')">{{
                    t('views.traderDashboard.table.usdValue')
                  }}</span>
                </template>
                <template #body="{ data }">
                  <span :class="{ 'font-semibold': data.isFrom }">{{ data.usdValueLabel }}</span>
                </template>
              </Column>
              <Column>
                <template #header>
                  <span v-tooltip.top="t('tooltips.tables.actions')">Actions</span>
                </template>
                <template #body="{ data }">
                  <Button
                    icon="pi pi-arrow-right"
                    size="small"
                    severity="secondary"
                    :disabled="!selectedFromAssetCode || selectedFromAssetCode === data.code"
                    :title="'Swap ' + (selectedFromAssetCode || '?') + ' → ' + (data.code || '?')"
                    @click="onSwapRow(data.code)"
                  />
                </template>
              </Column>
            </DataTable>
            <div
              class="mt-4 m-2 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
            >
              <span class="text-sm text-gray-600 dark:text-gray-300">
                {{ t('views.traderDashboard.optIn.hint') }}
              </span>
              <Button
                icon="pi pi-plus"
                size="small"
                :label="t('views.traderDashboard.optIn.cta')"
                @click="onNavigateToOptIn"
              />
            </div>
          </template>
        </template>
      </Card>
    </div>
  </Layout>
</template>
