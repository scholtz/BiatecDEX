<script setup lang="ts">
import Card from 'primevue/card'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import { onBeforeUnmount, onMounted, reactive, watch } from 'vue'
import { SwapMode, type SwapQuote } from '@folks-router/js-sdk'
import { useAppStore } from '@/stores/app'
import { useToast } from 'primevue/usetoast'
import ProgressSpinner from 'primevue/progressspinner'
import formatNumber from '@/scripts/asset/formatNumber'

import fetchFolksRouterQuotes from '@/scripts/folks/fetchFolksRouterQuotes'

const store = useAppStore()
const toast = useToast()

const props = defineProps<{
  class?: string
}>()
interface IQuoteWithAmount {
  baseAmount: number
  amount: bigint
  quote: SwapQuote
}
interface ISide {
  [key: number]: IQuoteWithAmount
}

const state = reactive({
  price: 0,
  quantity: 0,
  bids: [] as ISide,
  offers: [] as ISide,
  midPrice: 0,
  midRange: 0,
  fetchingQuotes: false,
  intervalRefreshQuotes: null as NodeJS.Timeout | null
})

const delay = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const fetchBids = async () => {
  try {
    for (const baseAmount of store.state.pair.asset.quotes) {
      const amountBid1 = BigInt(baseAmount * 10 ** store.state.pair.asset.decimals)
      const quoteBid1 = await fetchFolksRouterQuotes(
        amountBid1,
        store.state.pair.asset.assetId,
        store.state.pair.currency.assetId,
        SwapMode.FIXED_OUTPUT,
        store.state.env
      )
      if (quoteBid1) {
        state.bids[baseAmount] = { baseAmount, amount: amountBid1, quote: quoteBid1 }
      }
      await delay(200)
    }
  } catch (exc: any) {
    console.error(exc)
    toast.add({
      severity: 'error',
      detail: exc.message ?? exc,
      life: 5000
    })
  }
}
const fetchOffers = async () => {
  try {
    for (const baseAmount of store.state.pair.asset.quotes) {
      const amountOffer1 = BigInt(baseAmount * 10 ** store.state.pair.asset.decimals)
      const quoteOffer1 = await fetchFolksRouterQuotes(
        amountOffer1,
        store.state.pair.currency.assetId,
        store.state.pair.asset.assetId,
        SwapMode.FIXED_INPUT,
        store.state.env
      )
      await delay(200)
      if (quoteOffer1) {
        state.offers[baseAmount] = { baseAmount, amount: amountOffer1, quote: quoteOffer1 }
      }
    }
  } catch (exc: any) {
    console.error(exc)
    toast.add({
      severity: 'error',
      detail: exc.message ?? exc,
      life: 5000
    })
  }
}

const sorterOffers = (a: any, b: any) => {
  return (a as IQuoteWithAmount).baseAmount - (b as IQuoteWithAmount).baseAmount
}
const sorterBids = (a: any, b: any) => {
  return (a as IQuoteWithAmount).baseAmount - (b as IQuoteWithAmount).baseAmount
}
const fetchData = async () => {
  try {
    state.fetchingQuotes = true
    await Promise.allSettled([fetchBids(), fetchOffers()])
    state.fetchingQuotes = false
    if (Object.values(state.offers).length > 0 && Object.values(state.bids).length > 0) {
      const firstOffer = Number(Object.keys(state.offers)[0])
      const firstBid = Number(Object.keys(state.bids)[0])
      const bestOffer =
        ((Number(state.offers[firstOffer].amount) /
          Number(state.offers[firstOffer].quote.quoteAmount)) *
          10 ** store.state.pair.asset.decimals) /
        10 ** store.state.pair.currency.decimals
      const bestBid =
        ((Number(state.bids[firstBid].amount) / Number(state.bids[firstBid].quote.quoteAmount)) *
          10 ** store.state.pair.asset.decimals) /
        10 ** store.state.pair.currency.decimals

      state.midPrice = (bestBid + bestOffer) / 2
      state.midRange = bestOffer - bestBid

      document.title =
        formatNumber(state.midPrice) +
        ' ' +
        store.state.pair.asset.symbol +
        '/' +
        store.state.pair.currency.symbol +
        ' | Biatec DEX'

      if (store.state.price == 0) {
        store.state.price = state.midPrice
      }
    }
  } catch (exc: any) {
    console.error(exc)
    toast.add({
      severity: 'error',
      detail: exc.message ?? exc,
      life: 5000
    })
  }
}

onMounted(async () => {
  state.bids = {}
  state.offers = {}
  await fetchData()
  store.state.price = state.midPrice
})
watch(
  () => store.state.pair,
  async () => {
    store.state.price = 0
    state.midPrice = 0
    state.midRange = 0
    state.bids = {}
    state.offers = {}

    await fetchData()
  },
  { deep: true }
)

const setBid = (bid: { amount: bigint; quote: SwapQuote }) => {
  store.state.price =
    ((Number(bid.amount) / Number(bid.quote.quoteAmount)) * 10 ** store.state.pair.asset.decimals) /
    10 ** store.state.pair.currency.decimals
  store.state.quantity = Number(bid.amount) / 10 ** store.state.pair.asset.decimals
  store.state.side = 1
}
const setOffer = (offer: { amount: bigint; quote: SwapQuote }) => {
  store.state.price =
    ((Number(offer.amount) / Number(offer.quote.quoteAmount)) *
      10 ** store.state.pair.asset.decimals) /
    10 ** store.state.pair.currency.decimals
  store.state.quantity = Number(offer.amount) / 10 ** store.state.pair.asset.decimals
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
  <Card :class="props.class">
    <template #content>
      <TabView>
        <TabPanel header="Market depth">
          <div class="grid">
            <div class="col-5 text-right overflow-hidden">
              <div class="text-primary">Bids</div>

              <div v-for="(bid, index) in Object.values(state.bids).sort(sorterBids)" :key="index">
                <Button size="small" class="my-1 p-1" @click="setBid(bid)">
                  {{ formatNumber(bid.amount, store.state.pair.asset.decimals, 2, true) }} @
                  {{
                    formatNumber(
                      ((Number(bid.amount) / Number(bid.quote.quoteAmount)) *
                        10 ** store.state.pair.asset.decimals) /
                        10 ** store.state.pair.currency.decimals
                    )
                  }}
                </Button>
              </div>
            </div>
            <div class="col-2 overflow-hidden">
              <div class="text-primary text-center">Mid</div>
              <div class="text-center" v-if="state.midPrice">
                {{ formatNumber(state.midPrice) }}
              </div>
              <div class="text-center" v-if="state.midRange">
                {{ formatNumber(state.midRange) }}
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
                  strokeWidth="8"
                  animationDuration=".5s"
                />
              </div>
            </div>
            <div class="col-5 overflow-hidden">
              <div class="text-primary">Offers</div>
              <div
                v-for="(offer, index) in Object.values(state.offers).sort(sorterOffers)"
                :key="index"
              >
                <Button size="small" class="my-1 p-1" @click="setOffer(offer)">
                  {{ formatNumber(offer.amount, store.state.pair.asset.decimals, 2, true) }} @
                  {{
                    formatNumber(
                      ((Number(offer.amount) / Number(offer.quote.quoteAmount)) *
                        10 ** store.state.pair.asset.decimals) /
                        10 ** store.state.pair.currency.decimals
                    )
                  }}
                </Button>
              </div>
            </div>
          </div>
          <div></div>
        </TabPanel>
      </TabView>
    </template>
  </Card>
</template>
<style></style>
