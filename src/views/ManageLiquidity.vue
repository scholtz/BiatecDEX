<script setup lang="ts">
import Layout from '@/layouts/PublicLayout.vue'
import MyLiquidity from '@/components/LiquidityComponents/MyLiquidity.vue'
import AddLiquidity from '@/components/LiquidityComponents/AddLiquidity.vue'
import { useRoute } from 'vue-router'
import RemoveLiquidity from '@/components/LiquidityComponents/RemoveLiquidity.vue'
import PoolSwap from '@/components/LiquidityComponents/PoolSwap.vue'

const route = useRoute()
</script>
<template>
  <Layout :auth-required="true">
    <div class="flex flex-grow w-full flex-col md:flex-row gap-2">
      <div class="w-full md:w-1/2">
        <MyLiquidity class="h-full p-2" />
      </div>
      <div class="w-full md:w-1/2">
        <RemoveLiquidity
          v-if="route.name == 'remove-liquidity'"
          class="h-full p-2"
        ></RemoveLiquidity>
        <PoolSwap v-else-if="route.name == 'pool-swap'" class="h-full p-2"></PoolSwap>
        <AddLiquidity v-else class="h-full p-2" />
      </div>
    </div>
  </Layout>
</template>
