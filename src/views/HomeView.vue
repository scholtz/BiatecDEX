<script setup lang="ts">
import Layout from '@/layouts/PublicLayout.vue'
import { useAppStore } from '@/stores/app'
import { useRoute } from 'vue-router'
import { AssetsService } from '@/service/AssetsService'
import { useRouteParams } from '@/composables/useRouteParams'

const store = useAppStore()
const route = useRoute()
const { setRoutesVars } = useRouteParams()
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
