<script setup lang="ts">
import Layout from '@/layouts/PublicLayout.vue'
import MyLiquidity from '@/components/LiquidityComponents/MyLiquidity.vue'
import AddLiquidity from '@/components/LiquidityComponents/AddLiquidity.vue'
import { useRoute } from 'vue-router'
import RemoveLiquidity from '@/components/LiquidityComponents/RemoveLiquidity.vue'
import PoolSwap from '@/components/LiquidityComponents/PoolSwap.vue'
import AssetInfo from '@/components/LiquidityComponents/AssetInfo.vue'
import PoolsLiquidityChart from '@/components/LiquidityComponents/PoolsLiquidityChart.vue'
import TradesList from '@/components/LiquidityComponents/TradesList.vue'
import { useRouteParams } from '@/composables/useRouteParams'
import { useLiquiditySettingsRoute } from '@/composables/useLiquiditySettingsRoute'

const route = useRoute()
// routesReady latches true once the routed network is applied (setChain) and the
// route's asset/currency slugs — including asa-<id> ids fetched from algod — are
// resolved into the store. Mounting the pair-dependent panels before that made them
// fetch prices/pools/trades for the previous (or default EUR/USD mainnet) pair.
const { routesReady } = useRouteParams()
// Tick width + LP fee live in the route (?tick=&lpFee=) and are shared by every panel below.
useLiquiditySettingsRoute(routesReady)
</script>
<template>
  <Layout :auth-required="false">
    <div v-if="routesReady" class="flex flex-grow flex-col gap-2 w-full min-h-0 overflow-hidden">
      <div class="flex w-full flex-col md:flex-row gap-2 flex-shrink-0">
        <div class="w-full">
          <AssetInfo class="p-2" />
        </div>
      </div>
      <!-- Layout by width: stacked on phones; from md two columns (pools | form) with the trades list below, so the depth chart and
           the form stay side by side on tablets and laptops; from xl three columns (pools | form | trades). The form column is a
           Tailwind @container: its fields size themselves by the room the column has, not by the viewport (app.css, AddLiquidity). -->
      <div
        class="flex flex-grow w-full flex-col md:grid md:grid-cols-2 xl:flex xl:flex-row gap-2 min-h-0 overflow-hidden"
      >
        <div class="w-full xl:flex-1 xl:min-w-0 min-h-0 flex flex-col gap-2">
          <PoolsLiquidityChart
            class="p-2 flex-shrink-0"
            :expect-precision-derivation="
              route.name !== 'remove-liquidity' && route.name !== 'pool-swap'
            "
          />
          <MyLiquidity class="h-full p-2 flex-1 min-h-0" />
        </div>
        <div class="@container w-full xl:flex-1 xl:min-w-0 min-h-0 flex flex-col">
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
        <!-- Wide enough for a one-line trade (price, time, both amounts) without cut-off. -->
        <div
          class="w-full md:col-span-2 md:h-[28rem] xl:h-auto xl:col-span-1 xl:w-[28rem] 2xl:w-[32rem] xl:flex-none min-h-0 flex flex-col"
        >
          <TradesList class="h-full p-2 flex-1 min-h-0" />
        </div>
      </div>
    </div>
  </Layout>
</template>
