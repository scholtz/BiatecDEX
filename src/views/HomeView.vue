<script setup lang="ts">
import Layout from '@/layouts/PublicLayout.vue'
import { onMounted, watch } from 'vue'

import Message from 'primevue/message'
import AsaChart from '@/components/TradingComponents/AsaChart.vue'
import MarketOrder from '@/components/TradingComponents/MarketOrder.vue'
import MarketDepth from '@/components/TradingComponents/MarketDepth.vue'
import AccountInfo from '@/components/TradingComponents/AccountInfo.vue'
import TradesList from '@/components/LiquidityComponents/TradesList.vue'
import { useAppStore } from '@/stores/app'
import { useRoute } from 'vue-router'
import { AssetsService } from '@/service/AssetsService'

const store = useAppStore()
const route = useRoute()

const setRoutesVars = () => {
  console.log('setRoutesVars', route.params)

  if (route.params.network as 'mainnet-v1.0' | 'voimain-v1.0' | 'testnet-v1.0' | 'dockernet-v1') {
    store.state.env = route.params.network as
      | 'mainnet-v1.0'
      | 'voimain-v1.0'
      | 'testnet-v1.0'
      | 'dockernet-v1'
  }
  if (route.params.assetCode) {
    const code = route.params.assetCode as string
    const asset = AssetsService.getAsset(code)
    if (asset) {
      store.state.assetCode = asset.code
      store.state.assetName = asset.name

      store.state.pair = AssetsService.selectPrimaryAsset(
        store.state.currencyCode,
        store.state.assetCode
      )
    }
  }
  if (route.params.currencyCode) {
    const code = route.params.currencyCode as string
    const asset = AssetsService.getAsset(code)
    if (asset) {
      store.state.currencyCode = asset.code
      store.state.currencyName = asset.name
      store.state.currencySymbol = asset.symbol

      store.state.pair = AssetsService.selectPrimaryAsset(
        store.state.currencyCode,
        store.state.assetCode
      )
    }
  }
  console.log('store.state', store.state)
}

watch(
  () => route.params.network,
  () => {
    setRoutesVars()
  },
  { deep: true }
)
watch(
  () => route.params.assetCode,
  () => {
    setRoutesVars()
  },
  { deep: true }
)
watch(
  () => route.params.currencyCode,
  () => {
    setRoutesVars()
  },
  { deep: true }
)

onMounted(async () => {
  setRoutesVars()
})
/* eslint-disable no-useless-escape */
</script>
<template>
  <Layout>
    <div class="flex flex-1 flex-col md:flex-row gap-2">
      <div class="hidden md:block md:flex-1 lg:flex-[2]">
        <AsaChart class="p-2 h-80 md:h-full" />
      </div>
      <div class="flex flex-col w-full md:w-72 lg:w-80 xl:w-96 gap-2">
        <MarketOrder class="p-2" />
        <MarketDepth class="p-2" />
        <AccountInfo class="p-2" />
      </div>
      <div class="w-full md:flex-1 lg:w-72 xl:w-80">
        <TradesList class="p-2 h-full" />
      </div>
    </div>
  </Layout>
</template>
