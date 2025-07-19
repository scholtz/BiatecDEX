<script setup lang="ts">
import { getDummySigner } from '@/scripts/algo/getDummySigner'
import formatNumber from '@/scripts/asset/formatNumber'
import { useAppStore } from '@/stores/app'
import { BiatecPoolProviderClient, type AppPoolInfo } from 'biatec-concentrated-liquidity-amm'
import { stat } from 'fs'
import { onMounted, reactive, watch } from 'vue'
const props = defineProps<{
  class?: string
}>()

const store = useAppStore()

var state = reactive({
  price: null as AppPoolInfo | null
})

onMounted(async () => {
  await load()
})
watch(
  () => store.state.clientPP,
  async () => {
    await load()
  },
  { immediate: true }
)
const load = async () => {
  if (!store.state.clientPP) return
  var signer = getDummySigner()
  var price = await store.state.clientPP.getPrice({
    args: {
      appPoolId: 0,
      assetA: store.state.pair.asset.assetId,
      assetB: store.state.pair.currency.assetId
    },
    sender: signer.address,
    signer: signer.transactionSigner
  })
  if (price) {
    state.price = price
  }
}
</script>
<template>
  <Card :class="props.class">
    <template #content>
      <div v-if="state.price?.latestPrice" class="flex flex-row flex-grow gap-2 w-full">
        <h2 class="w-full flex items-center">
          Asset info {{ store.state.pair.asset.name }}/{{ store.state.pair.currency.name }}
        </h2>
        <div class="w-full flex items-center">
          Latest price: {{ formatNumber(Number(state.price.latestPrice) / 1e9) }}
          {{ state.price.latestPrice > state.price.period1NowVwap ? '↑' : '↓' }}
        </div>
        <div class="w-full flex items-center">
          Minute price: {{ formatNumber(Number(state.price.period1NowVwap) / 1e9) }}
          <span v-if="state.price.period1PrevVwap > 0">
            {{ state.price.period1NowVwap > state.price.period1PrevVwap ? '↑' : '↓' }}
          </span>
          Volume:
          {{
            formatNumber(
              Number(state.price.period1NowVolumeB) / 1e9,
              undefined,
              undefined,
              undefined,
              undefined,
              store.state.pair.currency.symbol
            )
          }}
          <span v-if="state.price.period1PrevVwap > 0">
            {{ state.price.period1NowVolumeB > state.price.period1PrevVolumeB ? '↑' : '↓' }}
          </span>
        </div>
        <div class="w-full flex items-center">
          1D price: {{ formatNumber(Number(state.price.period2NowVwap) / 1e9) }}
          <span v-if="state.price.period2PrevVwap > 0">
            {{ state.price.period2NowVwap > state.price.period2PrevVwap ? '↑' : '↓' }}
          </span>
          Volume:
          {{
            formatNumber(
              Number(state.price.period2NowVolumeB) / 1e9,
              undefined,
              undefined,
              undefined,
              undefined,
              store.state.pair.currency.symbol
            )
          }}
          <span v-if="state.price.period2PrevVwap > 0">
            {{ state.price.period2NowVolumeB > state.price.period2PrevVolumeB ? '↑' : '↓' }}
          </span>
        </div>
        <div class="w-full flex items-center">
          30D price: {{ formatNumber(Number(state.price.period3NowVwap) / 1e9) }}
          <span v-if="state.price.period3PrevVwap > 0">
            {{ state.price.period3NowVwap > state.price.period3PrevVwap ? '↑' : '↓' }}
          </span>
          Volume:
          {{
            formatNumber(
              Number(state.price.period3NowVolumeB) / 1e9,
              undefined,
              undefined,
              undefined,
              undefined,
              store.state.pair.currency.symbol
            )
          }}
          <span v-if="state.price.period3PrevVwap > 0">
            {{ state.price.period3NowVolumeB > state.price.period3PrevVolumeB ? '↑' : '↓' }}
          </span>
        </div>
        <div class="w-full flex items-center">
          1 Year price: {{ formatNumber(Number(state.price.period4NowVwap) / 1e9) }}
          <span v-if="state.price.period4PrevVwap > 0">
            {{ state.price.period4NowVwap > state.price.period4PrevVwap ? '↑' : '↓' }}
          </span>
          Volume:
          {{
            formatNumber(
              Number(state.price.period4NowVolumeB) / 1e9,
              undefined,
              undefined,
              undefined,
              undefined,
              store.state.pair.currency.symbol
            )
          }}
          <span v-if="state.price.period4PrevVwap > 0">
            {{ state.price.period4NowVolumeB > state.price.period4PrevVolumeB ? '↑' : '↓' }}
          </span>
        </div>
        <Button class="w-80" size="small" @click="load" variant="link">Refresh</Button>
      </div>
      <!-- <pre>{{
        JSON.stringify(
          state.price,
          (key, value) => (typeof value === 'bigint' ? value.toString() : value),
          2
        )
      }}</pre> -->
    </template>
  </Card>
</template>
