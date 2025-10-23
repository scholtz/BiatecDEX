<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch, toRef } from 'vue'
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
const selectedToAssetCode = ref<string | null>(null)

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
  useTraderDashboardComputed(
    assetsRef,
    selectedFromAssetCode,
    selectedToAssetCode,
    locale,
    formatUsd
  )
const loadToken = ref(0)

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

const toAssetOptions = computed<AssetOption[]>(() => {
  return assetCatalog.value
    .map((asset) => ({
      label: `${asset.name} (${asset.code})`,
      value: asset.code
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
})

// assetRows comes from composable

// Selection refs (must exist before computed below)

const isSwapDisabled = computed(
  () =>
    !selectedFromAssetCode.value ||
    !selectedToAssetCode.value ||
    selectedFromAssetCode.value === selectedToAssetCode.value
)

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

  const toCodes = toAssetOptions.value.map((option) => option.value)
  if (!toCodes.includes(selectedToAssetCode.value ?? '')) {
    selectedToAssetCode.value = null
  }
  if (!selectedToAssetCode.value && toCodes.length > 0) {
    if (store.state.currencyCode && toCodes.includes(store.state.currencyCode)) {
      selectedToAssetCode.value = store.state.currencyCode
    } else if (selectedFromAssetCode.value && toCodes.includes(selectedFromAssetCode.value)) {
      selectedToAssetCode.value =
        toCodes.find((code) => code !== selectedFromAssetCode.value) ?? toCodes[0]
    } else {
      selectedToAssetCode.value = toCodes[0]
    }
  }
}

const loadAccountAssets = async () => {
  if (!authStore.isAuthenticated || !authStore.account || !activeNetworkConfig.value) {
    state.assets = []
    state.error = ''
    return
  }

  const requestId = ++loadToken.value
  state.isLoading = true
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

    const idsForValuation = Array.from(
      new Set(nextAssets.map((asset) => asset.assetId).filter((id) => id !== 0))
    )

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
    if (requestId === loadToken.value) {
      state.isLoading = false
    }
  }
}

const onSwap = () => {
  if (isSwapDisabled.value) return
  router.push({
    name: 'homeWithAssets',
    params: {
      assetCode: selectedFromAssetCode.value,
      currencyCode: selectedToAssetCode.value
    }
  })
}

const onRefresh = () => {
  void loadAccountAssets()
}

watch(
  () => authStore.account,
  (account) => {
    if (!account) {
      state.assets = []
      state.error = ''
      selectedFromAssetCode.value = null
      selectedToAssetCode.value = null
    } else {
      void loadAccountAssets()
    }
  }
)

watch(fromAssetOptions, ensureSelections)
watch(toAssetOptions, ensureSelections)

watch(
  () => store.state.assetCode,
  (code) => {
    if (code && fromAssetOptions.value.some((option) => option.value === code)) {
      selectedFromAssetCode.value = code
    }
  }
)

watch(
  () => store.state.currencyCode,
  (code) => {
    if (code && toAssetOptions.value.some((option) => option.value === code)) {
      selectedToAssetCode.value = code
    }
  }
)

onMounted(() => {
  ensureSelections()
  void loadAccountAssets()
})
</script>

<template>
  <Layout :authRequired="true">
    <div class="flex w-full flex-col gap-4 py-2">
      <div class="relative px-2">
        <div
          class="absolute inset-0 rounded-xl bg-white/70 backdrop-blur-sm dark:bg-surface-800/70 shadow-sm"
        ></div>
        <div class="relative flex flex-col gap-4 md:flex-row md:items-end md:gap-8 p-4 rounded-xl">
          <div class="flex-1">
            <h1 class="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
              {{ t('views.traderDashboard.title') }}
            </h1>
            <p class="mt-1 text-sm text-gray-600 dark:text-gray-300">
              {{ t('views.traderDashboard.subtitle') }}
            </p>
          </div>
          <div class="flex flex-1 flex-col gap-4 md:flex-row md:items-end md:gap-6">
            <div class="flex flex-col gap-1">
              <label
                class="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200"
              >
                From Asset
              </label>
              <Dropdown
                v-model="selectedFromAssetCode"
                :options="fromAssetOptions"
                optionLabel="label"
                optionValue="value"
                class="w-60"
                :placeholder="t('views.traderDashboard.selection.assetLabel')"
              />
            </div>
            <div class="flex items-center justify-center py-2 md:py-0">
              <Button
                icon="pi pi-arrow-right"
                class="p-button-rounded p-button-text text-gray-700 dark:text-gray-200"
                :disabled="!selectedFromAssetCode || !selectedToAssetCode"
                :title="
                  'Swap direction: ' +
                  (selectedFromAssetCode || '?') +
                  ' → ' +
                  (selectedToAssetCode || '?')
                "
              />
              <Button
                icon="pi pi-refresh"
                class="p-button-rounded ml-2 bg-white/60 hover:bg-white dark:bg-surface-700/60 dark:hover:bg-surface-600 border border-gray-300 dark:border-surface-600"
                :disabled="
                  !selectedFromAssetCode ||
                  !selectedToAssetCode ||
                  selectedFromAssetCode === selectedToAssetCode
                "
                :title="'Invert from/to assets'"
                @click="
                  (() => {
                    if (!selectedFromAssetCode || !selectedToAssetCode) return
                    const temp = selectedFromAssetCode
                    selectedFromAssetCode = selectedToAssetCode
                    selectedToAssetCode = temp
                  })()
                "
              />
            </div>
            <div class="flex flex-col gap-1">
              <label
                class="text-xs font-semibold uppercase tracking-wide text-gray-700 dark:text-gray-200"
              >
                Quote Asset
              </label>
              <Dropdown
                v-model="selectedToAssetCode"
                :options="toAssetOptions"
                optionLabel="label"
                optionValue="value"
                class="w-60"
                :placeholder="t('views.traderDashboard.selection.currencyLabel')"
              />
            </div>
            <div class="flex gap-2 md:ml-auto pt-2 md:pt-0">
              <Button
                :label="t('views.traderDashboard.actions.swap')"
                icon="pi pi-exchange"
                class="w-full md:w-auto"
                :disabled="isSwapDisabled"
                @click="onSwap"
                :title="
                  isSwapDisabled ? 'Select distinct assets to enable swap' : 'Swap selected pair'
                "
              />
              <Button
                :label="t('views.traderDashboard.actions.refresh')"
                icon="pi pi-refresh"
                class="w-full md:w-auto bg-white/80 hover:bg-white dark:bg-surface-700/80 dark:hover:bg-surface-600 border border-gray-300 dark:border-surface-600 text-gray-700 dark:text-gray-200"
                :loading="state.isLoading"
                @click="onRefresh"
              />
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
          <DataTable
            v-else
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
            <Column :header="t('views.traderDashboard.table.asset')" sortable>
              <template #body="{ data }">
                <div class="flex flex-col">
                  <span
                    class="font-medium"
                    :class="{
                      'text-blue-600 dark:text-blue-300': data.isFrom,
                      'text-emerald-600 dark:text-emerald-300': data.isTo
                    }"
                    >{{ data.displayName }}</span
                  >
                  <span class="text-xs text-gray-500 dark:text-gray-300">
                    {{ t('views.traderDashboard.table.assetId') }}: {{ data.assetId }}
                  </span>
                </div>
              </template>
            </Column>
            <Column field="amountLabel" :header="t('views.traderDashboard.table.balance')" sortable>
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
            <Column
              field="usdValueRaw"
              :header="t('views.traderDashboard.table.usdValue')"
              sortable
            >
              <template #body="{ data }">
                <span :class="{ 'font-semibold': data.isFrom || data.isTo }">{{
                  data.usdValueLabel
                }}</span>
              </template>
            </Column>
          </DataTable>
        </template>
      </Card>
    </div>
  </Layout>
</template>
