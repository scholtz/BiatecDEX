<script setup lang="ts">
import { formatSmartNumber } from '@/scripts/common/formatSmartNumber'
import Card from 'primevue/card'
import Button from 'primevue/button'
import { onBeforeUnmount, onMounted, reactive, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { useToast } from 'primevue/usetoast'
import ProgressSpinner from 'primevue/progressspinner'
import formatNumber from '@/scripts/asset/formatNumber'
import { useI18n } from 'vue-i18n'

import fetchBids from '@/scripts/asset/fetchBids'
import fetchOffers from '@/scripts/asset/fetchOffers'
import calculateMidAndRange from '@/scripts/asset/calculateMidAndRange'
import type { IQuoteWithAmount } from '@/interface/IQuoteWithAmount'
import errorMessage from '@/scripts/common/errorMessage'
import { quotePrice, type OrderSide } from '@/scripts/swap/swapQuote'
import { createNetworkDepthQuoter } from '@/scripts/swap/depthQuotes'

const store = useAppStore()
const toast = useToast()
const { t, locale } = useI18n()

const props = defineProps<{
  class?: string
}>()

const state = reactive({
  price: 0,
  quantity: 0,
  midPrice: 0,
  midRange: 0,
  fetchingQuotes: false,
  intervalRefreshQuotes: null as NodeJS.Timeout | null
})

const sorterOffers = (a: IQuoteWithAmount, b: IQuoteWithAmount) => {
  return a.baseAmount - b.baseAmount
}
const sorterBids = (a: IQuoteWithAmount, b: IQuoteWithAmount) => {
  return a.baseAmount - b.baseAmount
}
const fetchData = async () => {
  try {
    state.fetchingQuotes = true
    // One quoter per refresh: both sides share its router-outage memo (createDepthQuoter).
    const quote = createNetworkDepthQuoter(store.state.env)
    await Promise.allSettled([fetchBids(store.state, quote), fetchOffers(store.state, quote)])
    state.fetchingQuotes = false

    const midAndRange = calculateMidAndRange(store.state)
    if (midAndRange) {
      state.midPrice = midAndRange.midPrice
      state.midRange = midAndRange.midRange

      document.title =
        formatSmartNumber(state.midPrice, { locale: locale.value }) +
        ' ' +
        store.state.pair.asset.symbol +
        '/' +
        store.state.pair.currency.symbol +
        ' | Biatec DEX'

      if (store.state.price == 0) {
        store.state.price = state.midPrice
      }
    }
  } catch (exc) {
    console.error(exc)
    toast.add({
      severity: 'error',
      detail: errorMessage(exc),
      life: 5000
    })
  }
}

onMounted(async () => {
  store.state.bids = {}
  store.state.offers = {}
  await fetchData()
  store.state.price = state.midPrice
})
watch(
  () => store.state.pair,
  async () => {
    store.state.price = 0
    state.midPrice = 0
    state.midRange = 0
    store.state.bids = {}
    store.state.offers = {}

    await fetchData()
  },
  { deep: true }
)

// Bids are sells (asset in, currency out), offers are buys (currency in, asset out).
const rowPrice = (row: IQuoteWithAmount, side: OrderSide): number =>
  quotePrice(
    row.quote,
    side,
    store.state.pair.asset.decimals,
    store.state.pair.currency.decimals
  ) ?? 0
// The row amount is a currency amount (base units of the currency).
const rowQuantity = (row: IQuoteWithAmount): number =>
  Number(row.amount) / 10 ** store.state.pair.currency.decimals

const setBid = (bid: IQuoteWithAmount) => {
  store.state.price = rowPrice(bid, 'sell')
  store.state.quantity = rowQuantity(bid)
  store.state.side = 1
}
const setOffer = (offer: IQuoteWithAmount) => {
  store.state.price = rowPrice(offer, 'buy')
  store.state.quantity = rowQuantity(offer)
  store.state.side = 0
}
onMounted(() => {
  state.intervalRefreshQuotes = setInterval(fetchData, 30000)
})
onBeforeUnmount(() => {
  if (state.intervalRefreshQuotes) {
    clearInterval(state.intervalRefreshQuotes)
  }
})
</script>
<template>
  <Card :class="props.class" class="p-2">
    <template #content>
      <div class="flex gap-2">
        <div class="text-right overflow-hidden flex-1">
          <div class="eyebrow depth-bids mb-1">{{ t('components.marketDepth.bids') }}</div>

          <div
            v-for="(bid, index) in Object.values(store.state.bids).sort(sorterBids)"
            :key="index"
          >
            <Button
              size="small"
              variant="outlined"
              severity="info"
              class="my-1 p-1 w-full text-right"
              style="justify-content: right"
              data-cy="depth-bid"
              @click="setBid(bid)"
            >
              {{ formatNumber(bid.amount, store.state.pair.currency.decimals, 2, true) }} @
              {{ formatNumber(rowPrice(bid, 'sell')) }}
            </Button>
          </div>
        </div>
        <div class="w-3/12 overflow-hidden">
          <div class="eyebrow text-center mb-1">{{ t('components.marketDepth.mid') }}</div>
          <div class="text-center" v-if="state.midPrice">
            {{ formatSmartNumber(state.midPrice, { locale }) }}
          </div>
          <div class="text-center" v-if="state.midRange">
            {{ formatSmartNumber(state.midRange, { locale }) }}
          </div>
          <div class="text-center" v-if="state.midPrice && state.midRange">
            {{ formatNumber((100 * state.midRange) / state.midPrice) }}%
          </div>
          <div class="text-center">
            {{ store.state.pair.asset.symbol }}/{{ store.state.pair.currency.symbol }}
          </div>
          <div class="text-center" v-if="!state.fetchingQuotes">
            <Button @click="fetchData" class="my-2 p-1 self-align-center">
              <i class="pi pi-refresh"></i>
            </Button>
          </div>
          <div class="text-center my-2 p-1" v-else>
            <ProgressSpinner
              style="width: 1em; height: 1em"
              :stroke-width="8"
              animationDuration=".5s"
            />
          </div>
        </div>
        <div class="overflow-hidden flex-1">
          <div class="eyebrow depth-offers mb-1">{{ t('components.marketDepth.offers') }}</div>
          <div
            v-for="(offer, index) in Object.values(store.state.offers).sort(sorterOffers)"
            :key="index"
          >
            <Button
              size="small"
              variant="outlined"
              severity="info"
              class="my-1 p-1"
              data-cy="depth-offer"
              @click="setOffer(offer)"
            >
              {{ formatNumber(offer.amount, store.state.pair.currency.decimals, 2, true) }} @
              {{ formatNumber(rowPrice(offer, 'buy')) }}
            </Button>
          </div>
        </div>
      </div>
      <div></div>
    </template>
  </Card>
</template>
<style scoped>
.depth-bids {
  color: var(--pos);
}
.depth-offers {
  color: var(--neg);
}
</style>
