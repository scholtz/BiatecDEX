<script setup lang="ts">
import Card from 'primevue/card'
import Button from 'primevue/button'
import ProgressSpinner from 'primevue/progressspinner'
import { computed, reactive, watch } from 'vue'
import { useAppStore } from '../../stores/app'
import { useI18n } from 'vue-i18n'
import { getAVMTradeReporterAPI } from '../../api'
import type { Trade } from '../../api/models'
import formatNumber from '../../scripts/asset/formatNumber'

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

const pairKey = computed(() => {
  const assetId = store.state.pair?.asset?.assetId
  const currencyId = store.state.pair?.currency?.assetId
  if (!assetId || !currencyId) {
    return ''
  }
  return `${assetId}-${currencyId}`
})

let lastRequestToken = 0
const maxRows = 40

const loadTrades = async () => {
  if (!pairKey.value) {
    state.trades = []
    return
  }

  const assetId = Number(store.state.pair.asset.assetId)
  const currencyId = Number(store.state.pair.currency.assetId)

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

watch(
  pairKey,
  () => {
    void loadTrades()
  },
  { immediate: true }
)

const assetMeta = computed(() => store.state.pair?.asset)
const currencyMeta = computed(() => store.state.pair?.currency)

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

  const maximumFractionDigits = Math.max(4, currencyMeta.value?.precision ?? 2)
  return new Intl.NumberFormat(locale.value, {
    minimumFractionDigits: Math.min(2, maximumFractionDigits),
    maximumFractionDigits
  }).format(value)
}

const formattedTrades = computed(() => {
  if (!assetMeta.value || !currencyMeta.value) {
    return [] as Array<{
      id: string
      timestampLabel: string
      sideLabel: string
      sideClass: string
      assetAmountLabel: string
      currencyAmountLabel: string
      priceLabel: string
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

    const assetAmount = Number(assetAmountRaw) / 10 ** assetDecimals
    const currencyAmount = Number(currencyAmountRaw) / 10 ** currencyDecimals
    const price = assetAmount > 0 ? currencyAmount / assetAmount : null

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

    const sideClass =
      side === 'buy' ? 'text-emerald-400' : side === 'sell' ? 'text-rose-400' : 'text-slate-400'

    return {
      id:
        trade.txId ?? `${trade.blockId ?? 'trade'}-${trade.assetAmountIn}-${trade.assetAmountOut}`,
      timestampLabel: trade.timestamp ? dateFormatter.value.format(new Date(trade.timestamp)) : '—',
      sideLabel,
      sideClass,
      assetAmountLabel,
      currencyAmountLabel,
      priceLabel: formatPrice(price),
      txId: trade.txId
    }
  })
})

const handleRefresh = () => {
  void loadTrades()
}
</script>
<template>
  <Card :class="props.class">
    <template #content>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">
          {{
            t('components.tradesList.title', {
              asset: store.state.pair.asset.name,
              currency: store.state.pair.currency.name
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
        <DataTable
          v-if="formattedTrades.length"
          :value="formattedTrades"
          :rows="10"
          :paginator="formattedTrades.length > 10"
          class="mt-2"
          size="small"
        >
          <Column field="timestampLabel" :header="t('components.tradesList.columns.time')" />
          <Column field="sideLabel" :header="t('components.tradesList.columns.side')">
            <template #body="slotProps">
              <span :class="['font-medium', slotProps.data.sideClass]">
                {{ slotProps.data.sideLabel }}
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
          <Column field="priceLabel" :header="t('components.tradesList.columns.price')" />
        </DataTable>

        <div v-else class="py-6 text-center text-sm text-slate-400">
          {{ t('components.tradesList.empty') }}
        </div>
      </template>
    </template>
  </Card>
</template>
