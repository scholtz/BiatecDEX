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
import fetchBids from '@/scripts/asset/fetchBids'
import fetchOffers from '@/scripts/asset/fetchOffers'
import type { IQuoteWithAmount } from '@/interface/IQuoteWithAmount'

const store = useAppStore()
const toast = useToast()

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


const sorterOffers = (a: any, b: any) => {
  return (a as IQuoteWithAmount).baseAmount - (b as IQuoteWithAmount).baseAmount
}
const sorterBids = (a: any, b: any) => {
  return (a as IQuoteWithAmount).baseAmount - (b as IQuoteWithAmount).baseAmount
}
const fetchData = async () => {
  try {
    state.fetchingQuotes = true
    await Promise.allSettled([fetchBids(store.state), fetchOffers(store.state)])
    state.fetchingQuotes = false
    if (Object.values(store.state.offers).length > 0 && Object.values(store.state.bids).length > 0) {
      const firstOffer = Number(Object.keys(store.state.offers)[0])
      const firstBid = Number(Object.keys(store.state.bids)[0])
      const bestOffer =
        ((Number(store.state.offers[firstOffer].amount) /
          Number(store.state.offers[firstOffer].quote.quoteAmount)) *
          10 ** store.state.pair.asset.decimals) /
        10 ** store.state.pair.currency.decimals
      const bestBid =
        ((Number(store.state.bids[firstBid].amount) / Number(store.state.bids[firstBid].quote.quoteAmount)) *
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

              <div v-for="(bid, index) in Object.values(store.state.bids).sort(sorterBids)" :key="index">
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
                v-for="(offer, index) in Object.values(store.state.offers).sort(sorterOffers)"
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
