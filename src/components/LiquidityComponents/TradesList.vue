<script setup lang="ts">
import Card from 'primevue/card'
import Button from 'primevue/button'
import Skeleton from 'primevue/skeleton'
import { computed, reactive, watch, onMounted, onUnmounted, ref, nextTick } from 'vue'
import { useAppStore } from '../../stores/app'
import { useI18n } from 'vue-i18n'
import { getAVMTradeReporterAPI } from '../../api'
import type { Trade } from '../../api/models'
import formatNumber from '../../scripts/asset/formatNumber'
import {
  mergeTrades,
  tradePageSize,
  tradeRowCapacity,
  tradesFromResponse
} from '../../scripts/trades/tradePage'
import { AssetsService } from '../../service/AssetsService'
import { signalrService } from '../../service/signalrService'
import { getScanExplorerBaseUrl } from '../../service/tradeApi'
import type { SubscriptionFilter } from '../../types/SubscriptionFilter'
import type { AMMTrade } from '../../types/algorand'
import type { IAsset } from '../../interface/IAsset'

const props = defineProps<{
  class?: string
}>()

const store = useAppStore()
const { t, locale } = useI18n()
const api = getAVMTradeReporterAPI()

const state = reactive({
  isLoading: false,
  isLoadingMore: false,
  trades: [] as Trade[],
  hasMore: false,
  error: null as string | null
})

const assetCode = computed(() => store.state.assetCode)
const currencyCode = computed(() => store.state.currencyCode)

const assetMeta = computed(() => {
  const code = assetCode.value
  if (code) {
    const byCode = AssetsService.getAsset(code, store.state.env)
    if (byCode) {
      return byCode
    }
  }

  const pairAsset = store.state.pair?.asset
  if (pairAsset?.assetId !== undefined) {
    return AssetsService.getAssetById(pairAsset.assetId, store.state.env) ?? pairAsset
  }

  return pairAsset
})

const currencyMeta = computed(() => {
  const code = currencyCode.value
  if (code) {
    const byCode = AssetsService.getAsset(code, store.state.env)
    if (byCode) {
      return byCode
    }
  }

  const pairCurrency = store.state.pair?.currency
  if (pairCurrency?.assetId !== undefined) {
    return AssetsService.getAssetById(pairCurrency.assetId, store.state.env) ?? pairCurrency
  }

  return pairCurrency
})

const pairKey = computed(() => {
  const asset = assetMeta.value
  const currency = currencyMeta.value
  if (!asset || !currency) {
    return ''
  }

  return `${asset.assetId}-${currency.assetId}`
})

const assetDisplayName = computed(() => assetMeta.value?.name ?? store.state.assetName ?? '')
const currencyDisplayName = computed(
  () => currencyMeta.value?.name ?? store.state.currencyName ?? ''
)

let lastRequestToken = 0
let currentSubscription: SubscriptionFilter | null = null

// The list fills the panel: its body is measured, enough rows are requested to cover it
// (plus about one extra screen), and further pages load on scroll / while it isn't full.
const TRADE_CACHE_LIMIT = 500
// Fallbacks used until the real header/row heights can be measured from the DOM.
const DEFAULT_HEADER_HEIGHT = 32
const DEFAULT_ROW_HEIGHT = 32
// Bound on consecutive "still not full" follow-up page loads (anti-freeze rule 4).
const MAX_AUTO_FILL_PAGES = 10
const SKELETON_ROWS = 14
const SCROLL_LOAD_THRESHOLD_PX = 160

const scrollerRef = ref<HTMLElement | null>(null)
const headerRef = ref<HTMLElement | null>(null)
const firstRowRef = ref<HTMLElement | null>(null)
let resizeObserver: ResizeObserver | null = null

const measureCapacity = (): number => {
  const bodyHeight = scrollerRef.value?.clientHeight ?? 0
  const headerHeight = headerRef.value?.offsetHeight || DEFAULT_HEADER_HEIGHT
  const rowHeight = firstRowRef.value?.offsetHeight || DEFAULT_ROW_HEIGHT
  return tradeRowCapacity(bodyHeight, headerHeight, rowHeight)
}

const getNumericAssetId = (asset: IAsset | undefined): number | null => {
  if (!asset) return null
  return Number.isFinite(asset.assetId) ? asset.assetId : null
}

const buildTradeSubscriptionFilter = (): SubscriptionFilter | null => {
  const assetId = getNumericAssetId(assetMeta.value)
  const currencyId = getNumericAssetId(currencyMeta.value)

  if (assetId === null || currencyId === null) {
    return null
  }

  const ids = Array.from(new Set([assetId, currencyId]))
    .filter((id) => id !== null)
    .map((id) => BigInt(id).toString())

  return {
    RecentBlocks: false,
    RecentTrades: true,
    RecentLiquidity: false,
    RecentPool: false,
    RecentAggregatedPool: false,
    RecentAssets: false,
    RecentAssetStats: false,
    MainAggregatedPools: false,
    PoolsAddresses: [],
    AggregatedPoolsIds: [],
    AssetIds: ids
  }
}

const SUBSCRIPTION_KEY = 'trades-list'

const ensureTradeSubscription = async () => {
  const filter = buildTradeSubscriptionFilter()
  if (!filter) {
    if (currentSubscription) {
      currentSubscription = null
      try {
        await signalrService.unregisterFilter(SUBSCRIPTION_KEY)
      } catch (error) {
        console.error('TradesList: failed to unsubscribe from SignalR trades updates', error)
      }
    }
    return
  }

  if (currentSubscription && JSON.stringify(currentSubscription) === JSON.stringify(filter)) {
    return
  }

  currentSubscription = filter
  try {
    await signalrService.registerFilter(SUBSCRIPTION_KEY, filter)
  } catch (error) {
    console.error('TradesList: failed to subscribe to SignalR trades updates', error)
  }
}

const tradeIdsMatchPair = (idIn: number, idOut: number) => {
  const assetId = getNumericAssetId(assetMeta.value)
  const currencyId = getNumericAssetId(currencyMeta.value)

  if (assetId === null || currencyId === null) {
    return false
  }

  return (idIn === assetId && idOut === currencyId) || (idIn === currencyId && idOut === assetId)
}

const tradeMatchesCurrentPair = (trade: AMMTrade) =>
  tradeIdsMatchPair(Number(trade.assetIdIn), Number(trade.assetIdOut))

const normalizeTrade = (trade: AMMTrade): Trade => ({
  assetIdIn: Number(trade.assetIdIn),
  assetIdOut: Number(trade.assetIdOut),
  assetAmountIn: trade.assetAmountIn,
  assetAmountOut: trade.assetAmountOut,
  txId: trade.txId,
  blockId: trade.blockId !== undefined ? Number(trade.blockId) : undefined,
  txGroup: trade.txGroup,
  timestamp: trade.timestamp,
  protocol: trade.protocol as Trade['protocol'],
  trader: trade.trader,
  poolAddress: trade.poolAddress,
  poolAppId: trade.poolAppId !== undefined ? Number(trade.poolAppId) : undefined,
  topTxId: trade.topTxId,
  tradeState: trade.tradeState as Trade['tradeState']
})

const handleTradeUpdate = (trade: AMMTrade) => {
  if (!tradeMatchesCurrentPair(trade)) {
    return
  }

  state.trades = mergeTrades(state.trades, [normalizeTrade(trade)], TRADE_CACHE_LIMIT)
}

// One query covers both trade directions of the pair. assetIdA/assetIdB are "advanced"
// filters, which is also what makes the reporter answer with the paged { items, hasMore }
// shape and honour offset/sort. A bare-array answer (older deployments) is handled too.
const fetchTradePage = async (
  assetId: number,
  currencyId: number,
  offset: number,
  size: number
) => {
  const res = await api.getApiTrade({
    assetIdA: assetId,
    assetIdB: currencyId,
    sortBy: 'timestamp',
    sortDirection: 'desc',
    offset,
    size
  })
  const page = tradesFromResponse(res?.data, size)
  return {
    // Defensive: a deployment that ignored the pair filter must not leak other pairs in.
    items: page.items.filter((trade) =>
      tradeIdsMatchPair(Number(trade.assetIdIn), Number(trade.assetIdOut))
    ),
    rawCount: page.items.length,
    hasMore: page.hasMore
  }
}

let loadedOffset = 0

const loadTrades = async () => {
  // Bumped first, even when there is nothing to load: an in-flight request of the previous
  // pair must not land in this pair's (empty) list.
  const requestToken = ++lastRequestToken
  const assetId = getNumericAssetId(assetMeta.value)
  const currencyId = getNumericAssetId(currencyMeta.value)
  if (!pairKey.value || assetId === null || currencyId === null) {
    state.trades = []
    state.hasMore = false
    state.isLoading = false
    state.isLoadingMore = false
    return
  }

  loadedOffset = 0
  state.isLoading = true
  state.isLoadingMore = false
  state.error = null

  try {
    const page = await fetchTradePage(assetId, currencyId, 0, tradePageSize(measureCapacity()))
    if (requestToken !== lastRequestToken) {
      return
    }
    loadedOffset = page.rawCount
    state.trades = mergeTrades([], page.items, TRADE_CACHE_LIMIT)
    state.hasMore = page.hasMore
  } catch (error) {
    if (requestToken !== lastRequestToken) {
      return
    }
    state.error = error instanceof Error ? error.message : String(error)
    state.trades = []
    state.hasMore = false
  } finally {
    if (requestToken === lastRequestToken) {
      state.isLoading = false
    }
  }
  if (requestToken === lastRequestToken) {
    await fillPanel(requestToken)
  }
}

const loadMore = async (): Promise<boolean> => {
  const assetId = getNumericAssetId(assetMeta.value)
  const currencyId = getNumericAssetId(currencyMeta.value)
  if (
    state.isLoading ||
    state.isLoadingMore ||
    !state.hasMore ||
    state.trades.length >= TRADE_CACHE_LIMIT ||
    assetId === null ||
    currencyId === null
  ) {
    return false
  }

  const requestToken = lastRequestToken
  state.isLoadingMore = true
  try {
    const page = await fetchTradePage(
      assetId,
      currencyId,
      loadedOffset,
      tradePageSize(measureCapacity())
    )
    if (requestToken !== lastRequestToken) {
      return false
    }
    loadedOffset += page.rawCount
    const before = state.trades.length
    state.trades = mergeTrades(state.trades, page.items, TRADE_CACHE_LIMIT)
    // A page that adds nothing new (empty, or a server that ignored `offset`, or live
    // inserts that shifted the window onto rows we already have) is the end no matter what
    // the server claimed - guarantees termination instead of refetching the same rows.
    const grew = state.trades.length > before
    state.hasMore = page.hasMore && grew
    return grew
  } catch (error) {
    if (requestToken === lastRequestToken) {
      console.error('TradesList: failed to load more trades', error)
      state.hasMore = false
    }
    return false
  } finally {
    if (requestToken === lastRequestToken) {
      state.isLoadingMore = false
    }
  }
}

// A panel taller than the loaded rows would show blank space (and could never scroll to
// trigger the next page), so keep loading until the rows overflow it or the history ends.
const fillPanel = async (requestToken: number) => {
  for (let i = 0; i < MAX_AUTO_FILL_PAGES; i++) {
    await nextTick()
    const scroller = scrollerRef.value
    if (requestToken !== lastRequestToken || !scroller || !state.hasMore) return
    if (scroller.scrollHeight > scroller.clientHeight + 1) return
    if (!(await loadMore())) return
  }
}

const onScroll = () => {
  const scroller = scrollerRef.value
  if (!scroller) return
  const remaining = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight
  if (remaining < SCROLL_LOAD_THRESHOLD_PX) {
    void loadMore()
  }
}

watch(pairKey, () => {
  state.trades = []
  state.hasMore = false
  void loadTrades()
  void ensureTradeSubscription()
})

onMounted(async () => {
  signalrService.onTradeReceived(handleTradeUpdate)
  if (typeof ResizeObserver !== 'undefined' && scrollerRef.value) {
    // A taller panel (window resize, layout change) may now have blank space to fill.
    resizeObserver = new ResizeObserver(() => {
      void fillPanel(lastRequestToken)
    })
    resizeObserver.observe(scrollerRef.value)
  }
  await loadTrades()
  await ensureTradeSubscription()
})

onUnmounted(() => {
  ++lastRequestToken
  resizeObserver?.disconnect()
  resizeObserver = null
  signalrService.unsubscribeFromTradeUpdates(handleTradeUpdate)
  if (currentSubscription) {
    void signalrService.unregisterFilter(SUBSCRIPTION_KEY)
    currentSubscription = null
  }
})

const formatPrice = (value: number | null) => {
  if (value === null || Number.isNaN(value) || !Number.isFinite(value)) {
    return '—'
  }

  return formatNumber(value)
}

interface TradeRow {
  id: string
  timestampLabel: string
  timestampTitle?: string
  txUrl?: string
  sideLabel: string
  assetAmountLabel: string
  currencyAmountLabel: string
  priceLabel: string
  priceClass: string
}

const formattedTrades = computed<TradeRow[]>(() => {
  if (!assetMeta.value || !currencyMeta.value) {
    return []
  }

  const assetDecimals = assetMeta.value.decimals
  const assetPrecision = assetMeta.value.precision
  const assetSymbol = assetMeta.value.symbol

  const currencyDecimals = currencyMeta.value.decimals
  const currencyPrecision = currencyMeta.value.precision
  const currencySymbol = currencyMeta.value.symbol

  // Row keys must not depend on the array position: a live trade is prepended, and
  // index-based keys would re-create every row. A repeat of the same id (trades without a
  // transaction id) gets an occurrence suffix instead.
  const seenIds = new Map<string, number>()
  return state.trades.map((trade) => {
    const assetAmountRaw =
      trade.assetIdIn === assetMeta.value!.assetId
        ? (trade.assetAmountIn ?? 0)
        : trade.assetIdOut === assetMeta.value!.assetId
          ? (trade.assetAmountOut ?? 0)
          : 0

    const currencyAmountRaw =
      trade.assetIdIn === currencyMeta.value!.assetId
        ? (trade.assetAmountIn ?? 0)
        : trade.assetIdOut === currencyMeta.value!.assetId
          ? (trade.assetAmountOut ?? 0)
          : 0

    const assetAmountLabel = formatNumber(
      assetAmountRaw,
      assetDecimals,
      assetPrecision,
      true,
      locale.value,
      assetSymbol
    )

    const currencyAmountLabel = formatNumber(
      currencyAmountRaw,
      currencyDecimals,
      currencyPrecision,
      true,
      locale.value,
      currencySymbol
    )

    const rawAssetAmount = Number(assetAmountRaw ?? 0)
    const rawCurrencyAmount = Number(currencyAmountRaw ?? 0)

    const assetAmount = rawAssetAmount / 10 ** assetDecimals
    const currencyAmount = rawCurrencyAmount / 10 ** currencyDecimals

    let price: number | null = null

    if (rawAssetAmount > 0) {
      price = currencyAmount / assetAmount
    } else if (trade.af && trade.bf && trade.af > 0) {
      price = trade.bf / trade.af
    }

    if (price !== null && !Number.isFinite(price)) {
      price = null
    }

    let side: 'buy' | 'sell' | 'other' = 'other'
    if (
      trade.assetIdIn === currencyMeta.value!.assetId &&
      trade.assetIdOut === assetMeta.value!.assetId
    ) {
      side = 'buy'
    } else if (
      trade.assetIdIn === assetMeta.value!.assetId &&
      trade.assetIdOut === currencyMeta.value!.assetId
    ) {
      side = 'sell'
    }

    const sideLabel =
      side === 'buy'
        ? t('components.tradesList.buySide', { asset: assetSymbol })
        : side === 'sell'
          ? t('components.tradesList.sellSide', { asset: assetSymbol })
          : t('components.tradesList.otherSide')

    const priceClass =
      side === 'buy'
        ? 'text-emerald-600 dark:text-emerald-400'
        : side === 'sell'
          ? 'text-rose-600 dark:text-rose-400'
          : 'text-slate-500 dark:text-slate-300'

    return {
      id: (() => {
        const base = `${trade.txId ?? trade.topTxId ?? trade.blockId ?? 'trade'}-${trade.assetAmountIn}-${trade.assetAmountOut}`
        const occurrence = (seenIds.get(base) ?? 0) + 1
        seenIds.set(base, occurrence)
        return occurrence === 1 ? base : `${base}-${occurrence}`
      })(),
      timestampLabel: (() => {
        if (!trade.timestamp) return '—'
        const tradeDate = new Date(trade.timestamp)
        const now = new Date()
        const diffMs = now.getTime() - tradeDate.getTime()
        const isWithin24Hours = diffMs < 24 * 60 * 60 * 1000
        return isWithin24Hours
          ? tradeDate.toLocaleTimeString(locale.value)
          : tradeDate.toLocaleDateString(locale.value)
      })(),
      timestampTitle: trade.timestamp
        ? new Date(trade.timestamp).toLocaleString(locale.value)
        : undefined,
      txUrl:
        trade.topTxId || trade.txId
          ? `${getScanExplorerBaseUrl(store.state.env)}/transaction/${trade.topTxId ?? trade.txId}`
          : undefined,
      sideLabel,
      assetAmountLabel,
      currencyAmountLabel,
      priceLabel: formatPrice(price),
      priceClass
    }
  })
})

const handleRefresh = () => {
  void loadTrades()
}
</script>
<template>
  <Card :class="['trades-card', 'max-h-[calc(100vh-8rem)]', props.class]" data-cy="trades-list">
    <template #content>
      <div class="trades-container flex h-full flex-col min-h-0">
        <div class="flex items-center justify-between mb-2 flex-shrink-0">
          <h2 class="text-base font-semibold leading-tight">
            {{
              t('components.tradesList.title', {
                asset: assetDisplayName,
                currency: currencyDisplayName
              })
            }}
          </h2>
          <Button
            size="small"
            variant="link"
            :disabled="state.isLoading"
            data-cy="trades-refresh"
            @click="handleRefresh"
          >
            {{ t('components.tradesList.refresh') }}
          </Button>
        </div>

        <div
          v-if="state.error"
          class="mb-3 text-sm text-red-500 dark:text-red-400 flex-shrink-0"
          role="alert"
          data-cy="trades-error"
        >
          {{
            t('components.tradesList.error', {
              message: state.error
            })
          }}
        </div>

        <!-- The scroller is always rendered: it is what gets measured to size the pages. -->
        <div
          ref="scrollerRef"
          class="trades-scroller flex-1 min-h-0 overflow-y-auto overflow-x-auto overscroll-contain"
          data-cy="trades-scroller"
          :aria-busy="state.isLoading"
          @scroll.passive="onScroll"
        >
          <table class="w-full border-collapse text-sm leading-tight tabular-nums">
            <thead ref="headerRef" class="sticky top-0 z-10 bg-surface-0 dark:bg-surface-900">
              <tr class="text-xs uppercase tracking-wide text-surface-500 dark:text-surface-400">
                <th class="py-2 pr-2 text-right font-semibold">
                  {{ t('components.tradesList.columns.price') }}
                </th>
                <th class="py-2 px-2 text-left font-semibold">
                  {{ t('components.tradesList.columns.time') }}
                </th>
                <th class="py-2 pl-2 text-right font-semibold">
                  {{ t('components.tradesList.columns.assetAmount') }}
                  <span class="opacity-60">/</span>
                  {{ t('components.tradesList.columns.currencyAmount') }}
                </th>
              </tr>
            </thead>
            <tbody>
              <template v-if="state.isLoading && !formattedTrades.length">
                <tr v-for="n in SKELETON_ROWS" :key="`sk-${n}`" aria-hidden="true">
                  <td class="py-2 pr-2"><Skeleton height="0.9rem" class="ml-auto w-14" /></td>
                  <td class="py-2 px-2"><Skeleton height="0.9rem" class="w-16" /></td>
                  <td class="py-2 pl-2"><Skeleton height="1.6rem" class="ml-auto w-20" /></td>
                </tr>
              </template>
              <template v-else>
                <tr
                  v-for="(row, index) in formattedTrades"
                  :key="row.id"
                  :ref="
                    (el) => {
                      if (index === 0) firstRowRef = el as HTMLElement | null
                    }
                  "
                  class="border-t border-surface-100 dark:border-surface-800 hover:bg-surface-50 dark:hover:bg-surface-800/60"
                  data-cy="trades-row"
                >
                  <td class="py-1.5 pr-2 text-right">
                    <span :class="['font-medium', row.priceClass]" :title="row.sideLabel">
                      {{ row.priceLabel }}
                    </span>
                  </td>
                  <td class="py-1.5 px-2 whitespace-nowrap">
                    <a
                      v-if="row.txUrl"
                      :href="row.txUrl"
                      class="text-blue-600 dark:text-blue-400 hover:underline"
                      target="_blank"
                      rel="noopener noreferrer"
                      :title="row.timestampTitle ?? row.timestampLabel"
                    >
                      {{ row.timestampLabel }}
                    </a>
                    <span v-else :title="row.timestampTitle ?? row.timestampLabel">
                      {{ row.timestampLabel }}
                    </span>
                  </td>
                  <td class="py-1.5 pl-2 text-right whitespace-nowrap">
                    <div>{{ row.assetAmountLabel }}</div>
                    <div class="text-xs text-surface-500 dark:text-surface-400">
                      {{ row.currencyAmountLabel }}
                    </div>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>

          <div
            v-if="state.isLoadingMore"
            class="py-2 text-center text-xs text-surface-500 dark:text-surface-400"
            data-cy="trades-loading-more"
          >
            <i class="pi pi-spin pi-spinner mr-1" aria-hidden="true"></i>
            {{ t('components.tradesList.loadingMore') }}
          </div>

          <div
            v-if="!state.isLoading && !state.error && !formattedTrades.length"
            class="py-6 text-center text-sm text-surface-500 dark:text-surface-400"
            data-cy="trades-empty"
          >
            {{ t('components.tradesList.empty') }}
          </div>
        </div>
      </div>
    </template>
  </Card>
</template>

<style scoped>
.trades-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.trades-card :deep(.p-card-body) {
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

.trades-card :deep(.p-card-content) {
  padding: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
}

.trades-card :deep(.p-card-footer) {
  padding: 0;
}

.trades-container {
  min-height: 0;
  flex: 1;
}
</style>
