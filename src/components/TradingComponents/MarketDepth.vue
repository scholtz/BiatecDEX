<script setup lang="ts">
import Card from 'primevue/card'
import InputNumber from 'primevue/inputnumber'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import { onMounted, reactive, watch } from 'vue'
import {
  FolksRouterClient,
  Network,
  SwapMode,
  type SwapParams,
  type SwapQuote
} from '@folks-router/js-sdk'
import { useAppStore } from '@/stores/app'
import { useToast } from 'primevue/usetoast'

import formatNumber from '@/scripts/asset/formatNumber'
const store = useAppStore()
const toast = useToast()

const props = defineProps<{
  class?: string
}>()

const state = reactive({
  price: 0,
  quantity: 0,
  bids: [] as { amount: bigint; quote: SwapQuote }[],
  offers: [] as { amount: bigint; quote: SwapQuote }[],
  midPrice: 0,
  midRange: 0
})

const getFolksClient = () => {
  if (store.state.env == 'mainnet-v1.0') {
    return new FolksRouterClient(Network.MAINNET)
  }
  if (store.state.env == 'mainnet') {
    return new FolksRouterClient(Network.MAINNET)
  }
  if (store.state.env == 'testnet-v1.0') {
    return new FolksRouterClient(Network.TESTNET)
  }
  if (store.state.env == 'testnet') {
    return new FolksRouterClient(Network.TESTNET)
  }
  return null
}

const fetchFolksRouterQuotes = async (
  amount: bigint,
  fromAssetId: number,
  toAssetId: number,
  swapMode: SwapMode
) => {
  try {
    const folksRouterClient = getFolksClient()
    if (!folksRouterClient)
      throw Error('Unable to create folks router client for specified network')
    const fromAsset = fromAssetId > 0 ? fromAssetId : 0
    const toAsset = toAssetId > 0 ? toAssetId : 0
    const swapParams: SwapParams = {
      fromAssetId: fromAsset,
      toAssetId: toAsset,
      amount: amount,
      swapMode
    }

    return await folksRouterClient.fetchSwapQuote(
      swapParams,
      15, // max group size
      10, // feeBps
      'AWALLETCPHQPJGCZ6AHLIFPHWBHUEHQ7VBYJVVGQRRY4MEIGWUBKCQYP4Y'
    )
  } catch (e: any) {
    console.error(e)
    toast.add({
      severity: 'error',
      detail: `Error fetching quote from folks: ${e.message ?? e}`,
      life: 5000
    })
  }
}

const delay = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const fetchData = async () => {
  const amountOffer1 = BigInt(1 * 10 ** store.state.pair.asset.decimals)
  const quoteOffer1 = await fetchFolksRouterQuotes(
    amountOffer1,
    store.state.pair.currency.assetId,
    store.state.pair.asset.assetId,
    SwapMode.FIXED_INPUT
  )
  if (quoteOffer1) {
    state.offers = [{ amount: amountOffer1, quote: quoteOffer1 }]
  }
  await delay(100)

  const amount2 = BigInt(100 * 10 ** store.state.pair.asset.decimals)
  const quoteOffer2 = await fetchFolksRouterQuotes(
    amount2,
    store.state.pair.currency.assetId,
    store.state.pair.asset.assetId,
    SwapMode.FIXED_INPUT
  )
  if (quoteOffer1 && quoteOffer2) {
    state.offers = [
      { amount: amountOffer1, quote: quoteOffer1 },
      { amount: amount2, quote: quoteOffer2 }
    ]
  }
  await delay(100)

  const amount3 = BigInt(1000 * 10 ** store.state.pair.asset.decimals)
  const quoteOffer3 = await fetchFolksRouterQuotes(
    amount3,
    store.state.pair.currency.assetId,
    store.state.pair.asset.assetId,
    SwapMode.FIXED_INPUT
  )
  if (quoteOffer1 && quoteOffer2 && quoteOffer3) {
    state.offers = [
      { amount: amountOffer1, quote: quoteOffer1 },
      { amount: amount2, quote: quoteOffer2 },
      { amount: amount3, quote: quoteOffer3 }
    ]
  }
  await delay(100)
  console.log('state.offers', state.offers)

  const amountBid1 = BigInt(1 * 10 ** store.state.pair.asset.decimals)
  const quoteBid1 = await fetchFolksRouterQuotes(
    amountBid1,
    store.state.pair.asset.assetId,
    store.state.pair.currency.assetId,
    SwapMode.FIXED_OUTPUT
  )
  if (quoteBid1) {
    state.bids = [{ amount: amountBid1, quote: quoteBid1 }]
  }
  await delay(100)

  const amountBid2 = BigInt(100 * 10 ** store.state.pair.asset.decimals)
  const quoteBid2 = await fetchFolksRouterQuotes(
    amountBid2,
    store.state.pair.asset.assetId,
    store.state.pair.currency.assetId,
    SwapMode.FIXED_OUTPUT
  )
  if (quoteBid1 && quoteBid2) {
    state.bids = [
      { amount: amountBid1, quote: quoteBid1 },
      { amount: amountBid2, quote: quoteBid2 }
    ]
  }
  await delay(100)

  const amountBid3 = BigInt(1000 * 10 ** store.state.pair.asset.decimals)
  const quoteBid3 = await fetchFolksRouterQuotes(
    amountBid3,
    store.state.pair.asset.assetId,
    store.state.pair.currency.assetId,
    SwapMode.FIXED_OUTPUT
  )
  if (quoteBid1 && quoteBid2 && quoteBid3) {
    state.bids = [
      { amount: amountBid1, quote: quoteBid1 },
      { amount: amountBid2, quote: quoteBid2 },
      { amount: amountBid3, quote: quoteBid3 }
    ]
  }
  await delay(100)

  if (state.offers.length > 0 && state.bids.length > 0) {
    const bestOffer = Number(state.offers[0].amount) / Number(state.offers[0].quote.quoteAmount)
    const bestBid = Number(state.bids[0].amount) / Number(state.bids[0].quote.quoteAmount)

    state.midPrice = (bestBid + bestOffer) / 2
    state.midRange = bestOffer - bestBid
    console.log('bestBid', bestBid, bestOffer)
  }
}

onMounted(async () => {
  state.bids = []
  state.offers = []
  await fetchData()
  store.state.price = state.midPrice
})
watch(
  () => store.state.pair,
  async () => {
    state.midPrice = 0
    state.midRange = 0
    state.bids = []
    state.offers = []

    await fetchData()
  },
  { deep: true }
)

const setBid = (bid: { amount: bigint; quote: SwapQuote }) => {
  store.state.price = Number(bid.amount) / Number(bid.quote.quoteAmount)
  store.state.quantity = Number(bid.amount) / 10 ** store.state.pair.asset.decimals
  store.state.side = 0
}
const setOffer = (offer: { amount: bigint; quote: SwapQuote }) => {
  store.state.price = Number(offer.amount) / Number(offer.quote.quoteAmount)
  store.state.quantity = Number(offer.amount) / 10 ** store.state.pair.asset.decimals
  store.state.side = 1
}
</script>
<template>
  <Card :class="props.class">
    <template #content>
      <TabView>
        <TabPanel header="Market depth">
          <div class="grid">
            <div class="col-5 text-right overflow-hidden">
              <div class="text-primary">Bid</div>

              <div v-for="(bid, index) in state.bids" :key="index">
                <Button size="small" class="my-1" @click="setBid(bid)">
                  {{ formatNumber(bid.amount, store.state.pair.asset.decimals, 2, true) }} @
                  {{ formatNumber(Number(bid.amount) / Number(bid.quote.quoteAmount)) }}
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
              <div class="text-center">
                {{ store.state.pair.asset.symbol }}/{{ store.state.pair.currency.symbol }}
              </div>
              <Button @click="fetchData" class="my-2">R</Button>
            </div>
            <div class="col-5 overflow-hidden">
              <div class="text-primary">Offer</div>
              <div v-for="(offer, index) in state.offers" :key="index">
                <Button size="small" class="my-1" @click="setOffer(offer)">
                  {{ formatNumber(offer.amount, store.state.pair.asset.decimals, 2, true) }} @
                  {{ formatNumber(Number(offer.amount) / Number(offer.quote.quoteAmount)) }}
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
