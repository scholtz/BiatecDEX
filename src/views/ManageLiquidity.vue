<script setup lang="ts">
import Layout from '@/layouts/PublicLayout.vue'
import MyLiquidity from '@/components/LiquidityComponents/MyLiquidity.vue'
import AddLiquidity from '@/components/LiquidityComponents/AddLiquidity.vue'
import { useRoute } from 'vue-router'
import RemoveLiquidity from '@/components/LiquidityComponents/RemoveLiquidity.vue'
import PoolSwap from '@/components/LiquidityComponents/PoolSwap.vue'
import AssetInfo from '@/components/LiquidityComponents/AssetInfo.vue'
import TradesList from '@/components/LiquidityComponents/TradesList.vue'
import { useRouteParams } from '@/composables/useRouteParams'

const route = useRoute()
const { setRoutesVars } = useRouteParams()
</script>
<template>
  <Layout :auth-required="true">
    <div class="flex flex-grow flex-col gap-2 w-full min-h-0 overflow-hidden">
      <div class="flex w-full flex-col md:flex-row gap-2 flex-shrink-0">
        <div class="w-full">
          <AssetInfo class="p-2" />
        </div>
      </div>
      <div class="flex flex-grow w-full flex-col md:flex-row gap-2 min-h-0 overflow-hidden">
        <div class="w-full md:flex-1 md:min-w-0 min-h-0 flex flex-col">
          <MyLiquidity class="h-full p-2 flex-1 min-h-0" />
        </div>
        <div class="w-full md:flex-1 md:min-w-0 min-h-0 flex flex-col">
          <RemoveLiquidity
            v-if="route.name == 'remove-liquidity'"
            class="h-full p-2 flex-1 min-h-0"
          ></RemoveLiquidity>
          <PoolSwap
            v-else-if="route.name == 'pool-swap'"
            class="h-full p-2 flex-1 min-h-0"
          ></PoolSwap>
          <AddLiquidity v-else class="h-full p-2 flex-1 min-h-0" />
        </div>
        <div class="w-full md:w-72 md:max-w-sm md:flex-none min-h-0 flex flex-col">
          <TradesList class="h-full p-2 flex-1 min-h-0" />
        </div>
      </div>
    </div>
  </Layout>
</template>
