<script setup lang="ts">
import Card from 'primevue/card'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import { computed, reactive, watch, onMounted, onUnmounted } from 'vue'
import { useAppStore } from '../../stores/app'
import { useI18n } from 'vue-i18n'
import { getAVMTradeReporterAPI } from '../../api'
import type { Trade } from '../../api/models'
import formatNumber from '../../scripts/asset/formatNumber'
import { AssetsService } from '../../service/AssetsService'
import { signalrService } from '../../service/signalrService'
import type { SubscriptionFilter } from '../../types/SubscriptionFilter'
import type { AMMTrade } from '../../types/algorand'

const props = defineProps<{
  class?: string
}>()

const store = useAppStore()
const { t, locale } = useI18n()
const api = getAVMTradeReporterAPI()

const state = reactive({
  isLoading: false,
  trades: [] as Trade[],
  error: null as string | null
})

const assetCode = computed(() => store.state.assetCode)
const currencyCode = computed(() => store.state.currencyCode)

const assetMeta = computed(() => {
  const code = assetCode.value
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
  const code = currencyCode.value
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
const maxRows = 14
let currentSubscription: SubscriptionFilter | null = null

const getNumericAssetId = (asset: any): number | null => {
  if (!asset) return null
  const raw =
    (typeof asset.assetId === 'bigint' ? Number(asset.assetId) : asset.assetId) ??
    asset.index ??
    asset.id

  if (raw === undefined || raw === null) {
    return null
  }

  const id = Number(raw)
  return Number.isFinite(id) ? id : null
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
    MainAggregatedPools: false,
    PoolsAddresses: [],
    AggregatedPoolsIds: [],
    AssetIds: ids
  }
}

const ensureTradeSubscription = async () => {
  const filter = buildTradeSubscriptionFilter()
  if (!filter) {
    if (currentSubscription) {
      currentSubscription = null
      try {
        await signalrService.unsubscribe()
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
    await signalrService.subscribe(filter)
  } catch (error) {
    console.error('TradesList: failed to subscribe to SignalR trades updates', error)
  }
}

const getTradeKey = (trade: Trade) => {
  if (trade.txId && trade.txId.length > 0) {
    return trade.txId
  }
  return `${trade.blockId ?? 'no-block'}-${trade.timestamp ?? 'no-ts'}-${trade.assetAmountIn ?? 0}-${trade.assetAmountOut ?? 0}`
}

const tradeMatchesCurrentPair = (trade: AMMTrade) => {
  const assetId = getNumericAssetId(assetMeta.value)
  const currencyId = getNumericAssetId(currencyMeta.value)

  if (assetId === null || currencyId === null) {
    return false
  }

  const inId = Number(trade.assetIdIn)
  const outId = Number(trade.assetIdOut)

  return (
    (inId === assetId && outId === currencyId) ||
    (inId === currencyId && outId === assetId)
  )
}

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

  const normalized = normalizeTrade(trade)
  const incomingKey = getTradeKey(normalized)

  const existingIndex = state.trades.findIndex((t) => getTradeKey(t) === incomingKey)
  if (existingIndex !== -1) {
    state.trades.splice(existingIndex, 1)
  }

  state.trades = [normalized, ...state.trades].slice(0, maxRows)
}

const loadTrades = async () => {
  if (!pairKey.value) {
    state.trades = []
    return
  }

  const asset = assetMeta.value
  const currency = currencyMeta.value

  if (!asset || !currency) {
    state.trades = []
    return
  }

  const assetId = getNumericAssetId(asset)
  const currencyId = getNumericAssetId(currency)

  if (assetId === null || currencyId === null) {
    state.trades = []
    return
  }

  const requestToken = ++lastRequestToken
  state.isLoading = true
  state.error = null

  try {
    const [baseRes, quoteRes] = await Promise.all([
      api.getApiTrade({ assetIdIn: assetId, assetIdOut: currencyId, size: maxRows }),
      api.getApiTrade({ assetIdIn: currencyId, assetIdOut: assetId, size: maxRows })
    ])

    if (requestToken !== lastRequestToken) {
      return
    }

    const baseTrades = baseRes?.data ?? []
    const quoteTrades = quoteRes?.data ?? []
    const combined = [...baseTrades, ...quoteTrades].filter(Boolean)

    combined.sort((a, b) => {
      const aTime = a?.timestamp ? new Date(a.timestamp).getTime() : 0
      const bTime = b?.timestamp ? new Date(b.timestamp).getTime() : 0
      return bTime - aTime
    })

    state.trades = combined.slice(0, maxRows)
  } catch (error) {
    if (requestToken !== lastRequestToken) {
      return
    }
    state.error = error instanceof Error ? error.message : String(error)
    state.trades = []
  } finally {
    if (requestToken === lastRequestToken) {
      state.isLoading = false
    }
  }
}

watch(pairKey, () => {
  state.trades = []
  void loadTrades()
  void ensureTradeSubscription()
})

onMounted(() => {
  signalrService.onTradeReceived(handleTradeUpdate)
  void loadTrades()
  void ensureTradeSubscription()
})

onUnmounted(() => {
  signalrService.unsubscribeFromTradeUpdates(handleTradeUpdate)
  if (currentSubscription) {
    void signalrService.unsubscribe()
    currentSubscription = null
  }
})

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

const formatPrice = (value: number | null) => {
  if (value === null || Number.isNaN(value) || !Number.isFinite(value)) {
    return '—'
  }

  return formatNumber(value)
}

const formattedTrades = computed(() => {
  if (!assetMeta.value || !currencyMeta.value) {
    return [] as Array<{
      id: string
      timestampLabel: string
      timestampTitle?: string
      txUrl?: string
      sideLabel: string
      assetAmountLabel: string
      currencyAmountLabel: string
      priceLabel: string
      priceClass: string
      priceTitle?: string
      txId?: string | null
    }>
  }

  const assetDecimals = assetMeta.value.decimals
  const assetPrecision = assetMeta.value.precision
  const assetSymbol = assetMeta.value.symbol

  const currencyDecimals = currencyMeta.value.decimals
  const currencyPrecision = currencyMeta.value.precision
  const currencySymbol = currencyMeta.value.symbol

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
      side === 'buy' ? 'text-emerald-400' : side === 'sell' ? 'text-rose-400' : 'text-slate-300'

    return {
      id:
        trade.txId ?? `${trade.blockId ?? 'trade'}-${trade.assetAmountIn}-${trade.assetAmountOut}`,
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
      txUrl: trade.txId ? `https://algorand.scan.biatec.io/transaction/${trade.txId}` : undefined,
      sideLabel,
      assetAmountLabel,
      currencyAmountLabel,
      priceLabel: formatPrice(price),
      priceClass,
      priceTitle: sideLabel,
      txId: trade.txId
    }
  })
})

const handleRefresh = () => {
  void loadTrades()
}
</script>
<template>
  <Card :class="['trades-card', props.class]">
    <template #content>
      <div class="flex items-center justify-between mb-2">
        <h2 class="text-base font-semibold leading-tight">
          {{
            t('components.tradesList.title', {
              asset: assetDisplayName,
              currency: currencyDisplayName
            })
          }}
        </h2>
        <Button size="small" variant="link" :disabled="state.isLoading" @click="handleRefresh">
          {{ t('components.tradesList.refresh') }}
        </Button>
      </div>

      <div v-if="state.error" class="mb-3 text-sm text-red-400">
        {{
          t('components.tradesList.error', {
            message: state.error
          })
        }}
      </div>

      <div v-if="state.isLoading" class="flex justify-center py-6">
        <ProgressSpinner style="width: 32px; height: 32px" strokeWidth="4" />
      </div>

      <template v-else>
        <div v-if="formattedTrades.length" class="overflow-x-auto">
          <DataTable
            :key="pairKey"
            :value="formattedTrades"
            class="mt-1 text-sm leading-tight min-w-max"
            size="small"
          >
            <Column
              field="priceLabel"
              :header="t('components.tradesList.columns.price')"
              :style="{ textAlign: 'right' }"
            >
              <template #body="slotProps">
                <span
                  :class="['font-medium', slotProps.data.priceClass]"
                  :title="slotProps.data.priceTitle ?? slotProps.data.priceLabel"
                >
                  {{ slotProps.data.priceLabel }}
                </span>
              </template>
            </Column>
            <Column field="timestampLabel" :header="t('components.tradesList.columns.time')">
              <template #body="slotProps">
                <a
                  v-if="slotProps.data.txUrl"
                  :href="slotProps.data.txUrl"
                  class="text-blue-400 hover:underline"
                  target="_blank"
                  rel="noopener noreferrer"
                  :title="slotProps.data.timestampTitle ?? slotProps.data.timestampLabel"
                >
                  {{ slotProps.data.timestampLabel }}
                </a>
                <span
                  v-else
                  :title="slotProps.data.timestampTitle ?? slotProps.data.timestampLabel"
                >
                  {{ slotProps.data.timestampLabel }}
                </span>
              </template>
            </Column>
            <Column
              field="assetAmountLabel"
              :header="t('components.tradesList.columns.assetAmount')"
            />
            <Column
              field="currencyAmountLabel"
              :header="t('components.tradesList.columns.currencyAmount')"
            />
          </DataTable>
        </div>

        <div v-else class="py-6 text-center text-sm text-slate-400">
          {{ t('components.tradesList.empty') }}
        </div>
      </template>
    </template>
  </Card>
</template>

<style scoped>
.trades-card :deep(.p-card-body) {
  padding: 0.75rem;
}

.trades-card :deep(.p-card-content) {
  padding: 0;
}

.trades-card :deep(.p-card-footer) {
  padding: 0;
}
</style>
