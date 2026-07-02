<script setup lang="ts">
import Card from 'primevue/card'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import Chart from 'primevue/chart'
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import { getAVMTradeReporterAPI } from '@/api'
import type { Pool } from '@/api/models'
import { AssetsService } from '@/service/AssetsService'
import { signalrService } from '@/service/signalrService'
import type { SubscriptionFilter } from '@/types/SubscriptionFilter'
import formatNumber from '@/scripts/asset/formatNumber'
import {
  bucketNormalizationScale,
  calculateTvlDistribution,
  normalizePoolLiquidity
} from '@/scripts/clamm/poolTvlDistribution'
import {
  getTickSize,
  precisionForTickType,
  tickDecimals,
  tickTypeForPrecision,
  TICK_TYPES,
  type TickType
} from 'biatec-concentrated-liquidity-amm'

const props = defineProps<{
  class?: string
}>()

const store = useAppStore()
const { t, locale } = useI18n()
const api = getAVMTradeReporterAPI()

const SUBSCRIPTION_KEY = 'pools-liquidity-chart'

const state = reactive({
  isLoading: false,
  error: null as string | null,
  pools: [] as Pool[]
})

// Tick width shared with the add-liquidity panel through the store.
const tickType = computed<TickType>({
  get: () => tickTypeForPrecision(store.state.liquidityTickPrecision ?? 1),
  set: (type) => {
    store.state.liquidityTickPrecision = precisionForTickType(type)
  }
})
const tickTypes = TICK_TYPES
const tickTypeLabel = (type: TickType): string => t(`components.addLiquidity.tickTypes.${type}`)

const assetMeta = computed(() => {
  const code = store.state.assetCode
  if (code) {
    const byCode = AssetsService.getAsset(code)
    if (byCode) {
      return byCode
    }
  }
  const pairAsset = store.state.pair?.asset
  if (pairAsset?.assetId !== undefined) {
    return AssetsService.getAssetById(pairAsset.assetId) ?? pairAsset
  }
  return pairAsset
})

const currencyMeta = computed(() => {
  const code = store.state.currencyCode
  if (code) {
    const byCode = AssetsService.getAsset(code)
    if (byCode) {
      return byCode
    }
  }
  const pairCurrency = store.state.pair?.currency
  if (pairCurrency?.assetId !== undefined) {
    return AssetsService.getAssetById(pairCurrency.assetId) ?? pairCurrency
  }
  return pairCurrency
})

const getNumericAssetId = (asset: unknown): number | null => {
  if (!asset || typeof asset !== 'object') return null
  const record = asset as { assetId?: number | bigint }
  if (record.assetId === undefined || record.assetId === null) return null
  const id = Number(record.assetId)
  return Number.isFinite(id) ? id : null
}

const assetId = computed(() => getNumericAssetId(assetMeta.value))
const currencyId = computed(() => getNumericAssetId(currencyMeta.value))
const pairKey = computed(() =>
  assetId.value !== null && currencyId.value !== null ? `${assetId.value}-${currencyId.value}` : ''
)

let lastRequestToken = 0
let currentSubscription: SubscriptionFilter | null = null

const poolKey = (pool: Pool): string => pool.poolAddress ?? `${pool.poolAppId ?? ''}`

const poolMatchesPair = (pool: Pool): boolean => {
  if (assetId.value === null || currencyId.value === null) return false
  const idA = pool.assetIdA ?? null
  const idB = pool.assetIdB ?? null
  return (
    (idA === assetId.value && idB === currencyId.value) ||
    (idA === currencyId.value && idB === assetId.value)
  )
}

const loadPools = async () => {
  if (assetId.value === null || currencyId.value === null) {
    state.pools = []
    return
  }
  const requestToken = ++lastRequestToken
  state.isLoading = true
  state.error = null
  try {
    // The API matches the pair in both orientations with a single call.
    const response = await api.getApiPool({
      assetIdA: assetId.value,
      assetIdB: currencyId.value,
      size: 1000
    })
    if (requestToken !== lastRequestToken) return
    const pools = (response?.data ?? []).filter(poolMatchesPair)
    const byKey = new Map<string, Pool>()
    pools.forEach((pool) => byKey.set(poolKey(pool), pool))
    state.pools = Array.from(byKey.values())
  } catch (error) {
    if (requestToken !== lastRequestToken) return
    state.error = error instanceof Error ? error.message : String(error)
    state.pools = []
  } finally {
    if (requestToken === lastRequestToken) {
      state.isLoading = false
    }
  }
}

const handlePoolUpdate = (pool: Pool) => {
  if (!poolMatchesPair(pool)) return
  const key = poolKey(pool)
  const index = state.pools.findIndex((existing) => poolKey(existing) === key)
  if (index === -1) {
    state.pools = [...state.pools, pool]
  } else {
    state.pools.splice(index, 1, pool)
  }
}

const ensurePoolSubscription = async () => {
  if (assetId.value === null || currencyId.value === null) {
    if (currentSubscription) {
      currentSubscription = null
      try {
        await signalrService.unregisterFilter(SUBSCRIPTION_KEY)
      } catch (error) {
        console.error('PoolsLiquidityChart: failed to unsubscribe from pool updates', error)
      }
    }
    return
  }
  const filter: SubscriptionFilter = {
    RecentBlocks: false,
    RecentTrades: false,
    RecentLiquidity: false,
    RecentPool: true,
    RecentAggregatedPool: false,
    RecentAssets: false,
    MainAggregatedPools: false,
    PoolsAddresses: [],
    AggregatedPoolsIds: [],
    AssetIds: Array.from(new Set([assetId.value, currencyId.value])).map((id) =>
      BigInt(id).toString()
    )
  }
  if (currentSubscription && JSON.stringify(currentSubscription) === JSON.stringify(filter)) {
    return
  }
  currentSubscription = filter
  try {
    await signalrService.registerFilter(SUBSCRIPTION_KEY, filter)
  } catch (error) {
    console.error('PoolsLiquidityChart: failed to subscribe to pool updates', error)
  }
}

const distribution = computed(() => {
  if (assetId.value === null || currencyId.value === null) {
    return { buckets: [], referencePrice: 0 }
  }
  const normalized = state.pools
    .map((pool) => normalizePoolLiquidity(pool, assetId.value!, currencyId.value!))
    .filter((pool): pool is NonNullable<typeof pool> => pool !== null)
  // Anchor the tick window at Add Liquidity's own exact grid window when available
  // (shared via the store) so this chart's ticks match what Add Liquidity shows —
  // the raw tick grid is anchor-sensitive and the form doesn't re-derive its window
  // on every midPrice move, so only the exact shared visibleFrom/visibleTo guarantee
  // the two grids are identical.
  const window = store.state.liquidityGridWindow
  return calculateTvlDistribution(normalized, {
    tickType: tickType.value,
    midPrice: window && window.midPrice > 0 ? window.midPrice : undefined,
    visibleFrom: window && window.visibleFrom > 0 ? window.visibleFrom : undefined,
    visibleTo: window && window.visibleTo > 0 ? window.visibleTo : undefined
  })
})

// Drag-selection of a price range on the chart (applied to the add-liquidity panel,
// via store.state.liquidityPriceRange — see the bidirectional sync in AddLiquidity.vue).
const selection = ref<{ anchor: number; head: number } | null>(null)
const dragging = ref(false)
const chartRef = ref()

interface ChartInstance {
  canvas: HTMLCanvasElement
  chartArea: { left: number; right: number; top: number; bottom: number }
}

const getChartInstance = (): ChartInstance | undefined => {
  const component = chartRef.value as
    { getChart?: () => ChartInstance | undefined } | undefined | null
  return component?.getChart?.()
}

const bucketIndexFromEvent = (event: PointerEvent, insideOnly: boolean): number | null => {
  const chart = getChartInstance()
  if (!chart) return null
  const count = distribution.value.buckets.length
  if (count === 0) return null
  const rect = chart.canvas.getBoundingClientRect()
  const px = event.clientX - rect.left
  const py = event.clientY - rect.top
  const area = chart.chartArea
  if (insideOnly && (px < area.left || px > area.right || py < area.top || py > area.bottom)) {
    return null
  }
  // Map pixel to bucket index directly from chartArea rather than going through
  // Chart.js's category scale (getValueForPixel) — with ~100+ narrow-tick buckets
  // that indirection was unreliable; this linear split of the plotted width is
  // exact for a bar chart's evenly spaced categories, regardless of bucket count.
  if (area.right <= area.left) return null
  const clampedPx = Math.min(Math.max(px, area.left), area.right)
  const ratio = (clampedPx - area.left) / (area.right - area.left)
  const index = Math.floor(ratio * count)
  return Math.max(0, Math.min(count - 1, index))
}

const onPointerDown = (event: PointerEvent) => {
  const index = bucketIndexFromEvent(event, true)
  if (index === null) return
  dragging.value = true
  selection.value = { anchor: index, head: index }
  ;(event.currentTarget as HTMLElement | null)?.setPointerCapture?.(event.pointerId)
}

const onPointerMove = (event: PointerEvent) => {
  if (!dragging.value || !selection.value) return
  const index = bucketIndexFromEvent(event, false)
  if (index === null || index === selection.value.head) return
  selection.value = { anchor: selection.value.anchor, head: index }
}

const onPointerUp = () => {
  if (!dragging.value) return
  dragging.value = false
  applySelection()
  selection.value = null
}

// Push the selected range into the store; the add-liquidity panel watches
// store.state.liquidityPriceRange and snaps its price range to it (see the
// bidirectional sync in AddLiquidity.vue).
const applySelection = () => {
  const current = selection.value
  const buckets = distribution.value.buckets
  if (!current || buckets.length === 0) return
  const lowIndex = Math.min(current.anchor, current.head)
  const highIndex = Math.max(current.anchor, current.head)
  const low = buckets[lowIndex]?.from
  const high = buckets[highIndex]?.to
  if (!(low > 0) || !(high > low)) return
  store.state.liquidityPriceRange = { min: low, max: high }
}

// While dragging, highlight the ticks under the pointer. Otherwise, highlight
// whatever price range is currently active in the add-liquidity panel, so moving
// its slider/inputs is reflected here too.
const selectedRange = computed(() => {
  if (dragging.value && selection.value) {
    return {
      low: Math.min(selection.value.anchor, selection.value.head),
      high: Math.max(selection.value.anchor, selection.value.head)
    }
  }
  const range = store.state.liquidityPriceRange
  const buckets = distribution.value.buckets
  if (!range || buckets.length === 0) return null
  let low = -1
  let high = -1
  buckets.forEach((bucket, index) => {
    if (bucket.to > range.min && bucket.from < range.max) {
      if (low === -1) low = index
      high = index
    }
  })
  return low === -1 ? null : { low, high }
})

// One bar per tick, colored by whether a Biatec CLAMM pool covers it: green if any
// concentrated-liquidity pool contributes TVL to that tick, orange otherwise (only
// constant-product liquidity, or no liquidity at all, is available for that tick).
// #16A34A/#EA580C validated for CVD separation and contrast on both surfaces
// (light: L 0.43-0.77 band; dark: L 0.48-0.67 band, same surface #18181b).
const tickColors = {
  hasClammPool: '#16A34A',
  noClammPool: '#EA580C'
} as const

const formatPrice = (value: number): string => {
  const decimals = tickDecimals(getTickSize(value, tickType.value))
  return value.toLocaleString(locale.value, { maximumFractionDigits: decimals + 1 })
}

const formatTvl = (value: number): string =>
  formatNumber(value, 0, 2, false, locale.value, currencyMeta.value?.symbol ?? '')

// Dim a bar's color when it's outside the selected price range (see selectedRange).
const withSelectionDimming = (color: string, index: number): string => {
  const range = selectedRange.value
  if (!range) return color
  return index >= range.low && index <= range.high ? color : `${color}55`
}

const chartData = computed(() => {
  const buckets = distribution.value.buckets
  // Bar heights are normalized to "TVL per nominal tick" so the quantized raw-tick
  // bucket widths do not produce sawtooth spikes; tooltips show the exact range TVL.
  const scales = buckets.map((bucket) =>
    bucketNormalizationScale(bucket.from, bucket.to, tickType.value)
  )
  return {
    labels: buckets.map((bucket) => formatPrice(bucket.from)),
    datasets: [
      {
        label: t('components.poolsLiquidityChart.tvl'),
        data: buckets.map((bucket, index) => bucket.total * scales[index]),
        backgroundColor: buckets.map((bucket, index) =>
          withSelectionDimming(
            bucket.concentrated > 0 ? tickColors.hasClammPool : tickColors.noClammPool,
            index
          )
        ),
        borderRadius: 3
      }
    ]
  }
})

const chartOptions = computed(() => {
  const documentStyle =
    typeof document !== 'undefined' ? getComputedStyle(document.documentElement) : null
  const textColorSecondary = documentStyle?.getPropertyValue('--text-color-secondary') || '#94a3b8'
  const surfaceBorder = documentStyle?.getPropertyValue('--surface-border') || '#33415544'
  const buckets = distribution.value.buckets
  return {
    maintainAspectRatio: false,
    animation: false,
    plugins: {
      legend: {
        display: false
      },
      tooltip: {
        callbacks: {
          title: (items: { dataIndex: number }[]) => {
            const bucket = buckets[items[0]?.dataIndex]
            if (!bucket) return ''
            return `${formatPrice(bucket.from)} – ${formatPrice(bucket.to)}`
          },
          label: (item: { dataIndex: number }) => {
            const bucket = buckets[item.dataIndex]
            if (!bucket) return ''
            const poolLabel =
              bucket.concentrated > 0
                ? t('components.poolsLiquidityChart.hasClammPool')
                : t('components.poolsLiquidityChart.noClammPool')
            return [
              `${t('components.poolsLiquidityChart.tvl')}: ${formatTvl(bucket.total)}`,
              poolLabel
            ]
          }
        }
      }
    },
    scales: {
      x: {
        ticks: {
          color: textColorSecondary,
          maxRotation: 45,
          autoSkip: true,
          maxTicksLimit: 16
        },
        grid: {
          display: false
        }
      },
      y: {
        ticks: {
          color: textColorSecondary
        },
        grid: {
          color: surfaceBorder
        },
        title: {
          display: true,
          color: textColorSecondary,
          text: t('components.poolsLiquidityChart.tvlAxis', {
            currency: currencyMeta.value?.symbol ?? ''
          })
        }
      }
    }
  }
})

const hasData = computed(() => distribution.value.buckets.some((bucket) => bucket.total > 0))

watch(pairKey, () => {
  state.pools = []
  selection.value = null
  void loadPools()
  void ensurePoolSubscription()
})

watch(tickType, () => {
  selection.value = null
})

onMounted(() => {
  signalrService.onPoolReceived(handlePoolUpdate)
  void loadPools()
  void ensurePoolSubscription()
})

onUnmounted(() => {
  signalrService.unsubscribeFromPoolUpdates(handlePoolUpdate)
  if (currentSubscription) {
    void signalrService.unregisterFilter(SUBSCRIPTION_KEY)
    currentSubscription = null
  }
})
</script>
<template>
  <Card :class="props.class">
    <template #content>
      <div class="flex items-center justify-between gap-2 mb-2 flex-wrap">
        <h2 class="text-lg font-semibold">
          {{ t('components.poolsLiquidityChart.title') }}
        </h2>
        <div class="flex items-center gap-1">
          <Button
            v-for="type in tickTypes"
            :key="type"
            size="small"
            :label="tickTypeLabel(type)"
            :variant="tickType === type ? 'outlined' : 'link'"
            @click="tickType = type"
          />
          <Button
            size="small"
            variant="link"
            :disabled="state.isLoading"
            @click="() => void loadPools()"
          >
            {{ t('components.poolsLiquidityChart.refresh') }}
          </Button>
        </div>
      </div>

      <div v-if="state.error" class="mb-2 text-sm text-red-400">
        {{ t('components.poolsLiquidityChart.error', { message: state.error }) }}
      </div>

      <div class="flex items-center gap-4 mb-2 text-xs text-gray-500 dark:text-gray-300">
        <span class="flex items-center gap-1.5">
          <span
            class="inline-block w-2.5 h-2.5 rounded-sm"
            :style="{ backgroundColor: tickColors.hasClammPool }"
          />
          {{ t('components.poolsLiquidityChart.hasClammPool') }}
        </span>
        <span class="flex items-center gap-1.5">
          <span
            class="inline-block w-2.5 h-2.5 rounded-sm"
            :style="{ backgroundColor: tickColors.noClammPool }"
          />
          {{ t('components.poolsLiquidityChart.noClammPool') }}
        </span>
      </div>

      <div
        v-if="distribution.referencePrice > 0"
        class="mb-2 text-xs text-gray-500 dark:text-gray-300"
      >
        {{
          t('components.poolsLiquidityChart.currentPrice', {
            price: formatPrice(distribution.referencePrice),
            currency: currencyMeta?.symbol ?? '',
            asset: assetMeta?.symbol ?? ''
          })
        }}
      </div>

      <div v-if="state.isLoading" class="flex items-center justify-center py-8">
        <ProgressSpinner style="width: 32px; height: 32px" strokeWidth="4" />
      </div>
      <template v-else-if="hasData">
        <div
          class="cursor-crosshair select-none"
          style="touch-action: none"
          @pointerdown="onPointerDown"
          @pointermove="onPointerMove"
          @pointerup="onPointerUp"
          @pointercancel="onPointerUp"
        >
          <Chart
            ref="chartRef"
            type="bar"
            :data="chartData"
            :options="chartOptions"
            class="h-64 w-full"
          />
        </div>
        <div class="mt-1 text-xs text-gray-500 dark:text-gray-400">
          {{ t('components.poolsLiquidityChart.selectHint') }}
        </div>
      </template>
      <div v-else class="py-8 text-center text-sm text-gray-500 dark:text-gray-300">
        {{ t('components.poolsLiquidityChart.empty') }}
      </div>
    </template>
  </Card>
</template>
