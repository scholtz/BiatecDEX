<script setup lang="ts">
import Layout from '@/layouts/PublicLayout.vue'
import { onMounted, watch } from 'vue'

import Message from 'primevue/message'
import AsaChart from '@/components/TradingComponents/AsaChart.vue'
import MarketOrder from '@/components/TradingComponents/MarketOrder.vue'
import MarketDepth from '@/components/TradingComponents/MarketDepth.vue'
import AccountInfo from '@/components/TradingComponents/AccountInfo.vue'
import { useAppStore } from '@/stores/app'
import { useRoute } from 'vue-router'
import { AssetsService } from '@/service/AssetsService'

const store = useAppStore()
const route = useRoute()

const setRoutesVars = () => {
  console.log('setRoutesVars', route.params)

  if (route.params.network as string) {
    store.state.env = route.params.network as string
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
    <div class="grid flex-grow-1">
      <div class="col-12 md:col-6 lg:col-9">
        <AsaChart class="p-2 sm:h-full h-20rem" />
      </div>
      <div class="col-12 md:col-6 lg:col-3 m-0 pl-0">
        <MarketOrder class="mb-2 p-0 m-0" />
        <MarketDepth class="mb-2 m-0" />
        <AccountInfo class="mb-2 m-0" />
      </div>
    </div>
  </Layout>
</template>
