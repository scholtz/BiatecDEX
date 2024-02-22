<script setup lang="ts">
import Layout from '@/layouts/PublicLayout.vue'
import { onMounted, reactive } from 'vue'

import Message from 'primevue/message'

import IconNFTs from '@/assets/projects/nfts.svg?raw'
import IconGold from '@/assets/projects/gold.svg?raw'
import IconAccounting from '@/assets/projects/accounting.svg?raw'
import IconBiatec from '@/assets/projects/biatec.svg?raw'
import IconDEX from '@/assets/projects/dex.svg?raw'
import AsaChart from '@/components/TradingComponents/AsaChart.vue'
import MarketOrder from '@/components/TradingComponents/MarketOrder.vue'
import MarketDepth from '@/components/TradingComponents/MarketDepth.vue'
import { useAppStore } from '@/stores/app'

const state = reactive({
  asset: 1241945177
})

const store = useAppStore()

/* eslint-disable no-useless-escape */
</script>
<template>
  <Layout :hideTopMenu="false">
    <Message severity="warn">Page is under construction</Message>
    <div class="grid flex-grow-1">
      <div class="col-9 h-full">
        <AsaChart :asset="store.state.asset" :currency="store.state.currency" class="h-full p-2" />
      </div>
      <div class="col-3 m-0 pl-0">
        <MarketOrder :asset="store.state.asset" class="mb-2 p-0 m-0" />
        <MarketDepth :asset="store.state.asset" class="m-0" />
      </div>
    </div>
  </Layout>
</template>
