<script setup lang="ts">
import Button from 'primevue/button'
import Card from 'primevue/card'
import Select from 'primevue/select'
import Tooltip from 'primevue/tooltip'
import { getDummySigner } from '../../scripts/algo/getDummySigner'
import { useAppStore } from '../../stores/app'
import { type AppPoolInfo } from 'biatec-concentrated-liquidity-amm'
import formatNumber from '../../scripts/asset/formatNumber'
import { computed, onMounted, reactive, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { computeWeightedPeriods } from './weightedPeriods'
import { useI18n } from 'vue-i18n'
import { AssetsService } from '../../service/AssetsService'
import type { IAsset } from '@/interface/IAsset'
const props = defineProps<{
  class?: string
}>()

const store = useAppStore()
const route = useRoute()
const router = useRouter()
const { t, locale } = useI18n()
var state = reactive({
  mounted: false,
  loading: false,
  price: null as AppPoolInfo | null
})

// Get available assets and currencies for the dropdowns
const availableAssets = computed(() => {
  return AssetsService.getAssets()
    .filter((asset) => asset.network === store.state.env)
    .filter((asset) => asset.code !== store.state.currencyCode)
})

const availableCurrencies = computed(() => {
  return AssetsService.getCurrencies()
    .filter((asset) => asset.network === store.state.env)
    .filter((asset) => asset.code !== store.state.assetCode)
})

const selectedAsset = computed({
  get: () => store.state.pair.asset,
  set: (asset: IAsset) => {
    if (asset && asset.code !== store.state.assetCode) {
      navigateToAssetPair(asset.code, store.state.currencyCode)
    }
  }
})

const selectedCurrency = computed({
  get: () => store.state.pair.currency,
  set: (currency: IAsset) => {
    if (currency && currency.code !== store.state.currencyCode) {
      navigateToAssetPair(store.state.assetCode, currency.code)
    }
  }
})

const navigateToAssetPair = (assetCode: string, currencyCode: string) => {
  const network = store.state.env || 'algorand'
  
  // Determine which route to use based on current route
  if (route.name === 'home') {
    // Stay on home page - just update the asset/currency in store
    store.state.assetCode = assetCode
    store.state.currencyCode = currencyCode
    const asset = AssetsService.getAsset(assetCode)
    const currency = AssetsService.getAsset(currencyCode)
    if (asset) store.state.pair.asset = asset
    if (currency) store.state.pair.currency = currency
  } else if (route.name === 'explore-assets') {
    // Stay on explore-assets page
    store.state.assetCode = assetCode
    store.state.currencyCode = currencyCode
    const asset = AssetsService.getAsset(assetCode)
    const currency = AssetsService.getAsset(currencyCode)
    if (asset) store.state.pair.asset = asset
    if (currency) store.state.pair.currency = currency
  } else if (route.name === 'trade' || route.name === 'tradeWithAssets') {
    // Navigate to trade with assets
    router.push({
      name: 'tradeWithAssets',
      params: {
        network,
        assetCode,
        currencyCode
      }
    })
  } else if (route.name && route.params && (route.name as string).includes('liquidity')) {
    // Navigate to liquidity with assets
    router.push({
      name: 'liquidity-with-assets',
      params: {
        network,
        assetCode,
        currencyCode
      }
    })
  } else {
    // Default fallback - navigate to trade
    router.push({
      name: 'tradeWithAssets',
      params: {
        network,
        assetCode,
        currencyCode
      }
    })
  }
}
const weightedPeriods = computed(() => (state.price ? computeWeightedPeriods(state.price) : null))

const dateFormatter = computed(
  () =>
    new Intl.DateTimeFormat(locale.value, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      day: '2-digit',
      month: 'short'
    })
)

const getTooltip = (p: PeriodTile) => {
  const currentTime = p.nowTime ? dateFormatter.value.format(new Date(p.nowTime)) : 'N/A'
  const previousTime = p.prevTime ? dateFormatter.value.format(new Date(p.prevTime)) : 'N/A'
  return (
    t('components.assetInfo.currentTime') +
    currentTime +
    ' | ' +
    t('components.assetInfo.previousTime') +
    previousTime
  )
}

interface PeriodTile {
  key: string
  label: string
  price: number
  prevPrice: number
  volume: number
  prevVolume: number
  nowTime?: number
  prevTime?: number
}

const periodData = computed<PeriodTile[]>(() => {
  if (!state.price || !weightedPeriods.value) return []
  const wp: any = weightedPeriods.value
  const arr: PeriodTile[] = []
  const push = (
    key: 'period1' | 'period2' | 'period3' | 'period4',
    label: string,
    nowTimeProp: string,
    prevTimeProp: string
  ) => {
    const entry = wp[key]
    if (!entry) return
    const volume: number = entry.volume ?? 0
    if (volume <= 0) return
    arr.push({
      key,
      label,
      price: entry.price ?? 0,
      prevPrice: entry.previousPrice ?? 0,
      volume,
      prevVolume: entry.previousVolume ?? 0,
      nowTime: Number((state.price as any)[nowTimeProp]) * 1000,
      prevTime: Number((state.price as any)[prevTimeProp]) * 1000
    })
  }
  push('period1', t('components.assetInfo.minutePrice'), 'period1NowTime', 'period1PrevTime')
  push('period2', t('components.assetInfo.dayPrice'), 'period2NowTime', 'period2PrevTime')
  push('period3', t('components.assetInfo.monthPrice'), 'period3NowTime', 'period3PrevTime')
  push('period4', t('components.assetInfo.yearPrice'), 'period4NowTime', 'period4PrevTime')
  return arr
})

onMounted(async () => {
  await load()
  state.mounted = true
})
watch(
  () => store.state.clientPP,
  async () => {
    if (!state.mounted) return
    await load()
  }
)

watch(
  () => route?.params?.assetCode,
  async () => {
    console.log('AssetInfo: assetId changed', route.params.assetCode)
    if (!state.mounted) return
    await load()
  }
)
watch(
  () => route?.params?.currencyCode,
  async () => {
    console.log('AssetInfo: currency.assetId changed', route.params.currencyCode)
    if (!state.mounted) return
    await load()
  }
)

const load = async () => {
  if (!store.state.clientPP) {
    console.log('AssetInfo: clientPP not initialized')

    return
  }
  state.price = null
  state.loading = true
  try {
    console.log('AssetInfo: loading..')
    var signer = getDummySigner()
    var price = await store.state.clientPP.getPrice({
      args: {
        appPoolId: 0,
        assetA: store.state.pair.asset.assetId,
        assetB: store.state.pair.currency.assetId
      },
      sender: signer.address,
      signer: signer.transactionSigner
    })
    if (price) {
      state.price = price
      console.log('AssetInfo: loaded price', price)
    }
    state.loading = false
  } catch (e) {
    state.loading = false
    console.error('AssetInfo: Error loading price', e)
  } finally {
    state.loading = false
  }
}
</script>
<template>
  <div class="asset-info-wrapper flex">
    <div class="asset-info flex gap-2 w-full flex-wrap">
      <!-- Asset and Currency Selection tile -->
      <Card class="latest-tile px-4 py-3 flex flex-col justify-between flex-1 min-w-[250px]">
        <template #content>
          <div class="w-full h-full flex flex-col md:flex-row items-center justify-center gap-3">
            <div class="flex items-center gap-2 w-full md:w-auto">
              <Select
                v-model="selectedAsset"
                :options="availableAssets"
                optionLabel="name"
                :placeholder="t('components.assetInfo.selectAsset')"
                class="w-full md:w-[140px]"
                :pt="{
                  root: { class: 'text-sm' },
                  option: { class: 'text-sm' }
                }"
              >
                <template #value="slotProps">
                  <div v-if="slotProps.value" class="flex items-center gap-2">
                    <span class="font-medium">{{ slotProps.value.symbol || slotProps.value.code }}</span>
                  </div>
                  <span v-else>{{ slotProps.placeholder }}</span>
                </template>
                <template #option="slotProps">
                  <div class="flex flex-col">
                    <span class="font-medium">{{ slotProps.option.name }}</span>
                    <span class="text-xs text-gray-500">{{ slotProps.option.code }}</span>
                  </div>
                </template>
              </Select>
              <span class="text-lg font-semibold">/</span>
              <Select
                v-model="selectedCurrency"
                :options="availableCurrencies"
                optionLabel="name"
                :placeholder="t('components.assetInfo.selectCurrency')"
                class="w-full md:w-[140px]"
                :pt="{
                  root: { class: 'text-sm' },
                  option: { class: 'text-sm' }
                }"
              >
                <template #value="slotProps">
                  <div v-if="slotProps.value" class="flex items-center gap-2">
                    <span class="font-medium">{{ slotProps.value.symbol || slotProps.value.code }}</span>
                  </div>
                  <span v-else>{{ slotProps.placeholder }}</span>
                </template>
                <template #option="slotProps">
                  <div class="flex flex-col">
                    <span class="font-medium">{{ slotProps.option.name }}</span>
                    <span class="text-xs text-gray-500">{{ slotProps.option.code }}</span>
                  </div>
                </template>
              </Select>
            </div>
            <Button
              :disabled="state.loading"
              size="small"
              text
              aria-label="refresh"
              @click="load"
              class="!p-1 refresh-btn"
            >
              <span class="pi pi-refresh" :class="{ 'animate-spin-slow': state.loading }" />
            </Button>
          </div>
        </template>
      </Card>
      <!-- Latest price -->
      <Card class="px-2 py-2 flex flex-col justify-between flex-1">
        <template #content>
          <div class="flex items-center justify-between text-xs mb-1 flex-col">
            <span class="font-medium">{{ t('components.assetInfo.latestPrice') }}</span>

            <div v-if="state.loading" class="text-xs opacity-70 flex items-center gap-2">
              <span class="pi pi-spinner animate-spin" /> {{ t('components.assetInfo.loading') }}
            </div>
            <div v-else-if="!state.price?.latestPrice" class="text-xs opacity-70">
              {{ t('components.assetInfo.noData') }}
            </div>
            <div v-else class="flex flex-col items-center gap-1">
              <div class="flex items-center gap-2">
                <div class="text-2xl font-bold leading-none">
                  {{ formatNumber(Number(state.price.latestPrice) / 1e9) }}
                </div>
                <div class="flex flex-col leading-tight text-xs">
                  <span
                    :class="[
                      state.price.latestPrice > (state.price.period1NowVwap ?? 0)
                        ? 'text-emerald-400'
                        : 'text-rose-400',
                      'flex items-center gap-1'
                    ]"
                  >
                    <span>{{
                      state.price.latestPrice > (state.price.period1NowVwap ?? 0) ? '▲' : '▼'
                    }}</span>
                  </span>
                </div>
              </div>
              <div class="m-0 p-0 text-xs opacity-70">
                {{ store.state.pair.asset.symbol }} / {{ store.state.pair.currency.symbol }}
              </div>
            </div>
          </div>
        </template>
      </Card>
      <!-- Period tiles -->
      <Card
        v-for="p in periodData"
        :key="p.key"
        class="px-4 py-2 flex flex-col justify-between flex-1"
      >
        <template #content>
          <div class="flex items-center justify-between text-xs mb-1">
            <span class="font-medium" v-tooltip="getTooltip(p)">{{ p.label }}</span>
            <span
              v-if="p.prevPrice > 0"
              :class="[
                'font-semibold',
                p.price - p.prevPrice > 0
                  ? 'text-emerald-400'
                  : p.price - p.prevPrice < 0
                    ? 'text-rose-400'
                    : 'text-neutral-400'
              ]"
            >
              {{ (((p.price - p.prevPrice) / p.prevPrice) * 100).toFixed(2) }}%
            </span>
          </div>
          <div class="flex w-full items-center justify-center gap-2">
            <div class="text-lg font-semibold leading-none">
              {{ formatNumber(p.price / 1e9) }}
            </div>
            <span
              v-if="p.prevPrice > 0"
              :class="[
                p.price - p.prevPrice > 0
                  ? 'text-emerald-400'
                  : p.price - p.prevPrice < 0
                    ? 'text-rose-400'
                    : 'text-neutral-400',
                'text-sm'
              ]"
            >
              {{ p.price - p.prevPrice > 0 ? '▲' : p.price - p.prevPrice < 0 ? '▼' : '■' }}
            </span>
          </div>
          <div class="flex items-center justify-between mt-2 text-[11px]">
            <span class="opacity-70">{{ t('components.assetInfo.volume') }}</span>
            <span class="font-medium">
              {{
                formatNumber(
                  p.volume / 1e9,
                  undefined,
                  undefined,
                  undefined,
                  undefined,
                  store.state.pair.currency.symbol
                )
              }}
            </span>
          </div>
        </template>
      </Card>
    </div>
  </div>
</template>

<style scoped>
.asset-info-wrapper {
  width: 100%;
}
.asset-info {
  width: 100%;
}
/* Responsive: handled by flex-wrap */
.refresh-btn :deep(.pi) {
  font-size: 0.85rem;
}
.animate-spin-slow {
  animation: spin 2.2s linear infinite;
}
@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
