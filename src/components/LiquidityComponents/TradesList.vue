<script setup lang="ts">
import { getDummySigner } from '../../scripts/algo/getDummySigner'
import { useAppStore } from '../../stores/app'
import { type AppPoolInfo } from 'biatec-concentrated-liquidity-amm'
import { onMounted, onUnmounted, reactive, watch } from 'vue'
import { AlgorandSubscriber } from '@algorandfoundation/algokit-subscriber'
import {} from 'biatec-concentrated-liquidity-amm'
import type { Arc28EventGroup } from '@algorandfoundation/algokit-subscriber/types/arc-28'
import { TransactionType } from 'algosdk'
import { useRoute } from 'vue-router'
const route = useRoute()
const props = defineProps<{
  class?: string
}>()

const store = useAppStore()

var state = reactive({
  mounted: false,
  price: null as AppPoolInfo | null
})

onMounted(async () => {
  await load()
  state.mounted = true
})
watch(
  () => store.state.clientPP,
  async () => {
    if (!state.mounted) return
    await load()
  }
)
watch(
  () => route?.params?.assetCode,
  async () => {
    await load()
  }
)
watch(
  () => route?.params?.currencyCode,
  async () => {
    await load()
  }
)
const tradeEvents: Arc28EventGroup = {
  groupName: 'tradeEvents',
  events: [
    {
      name: 'tradeEvent',
      args: [
        { type: 'uint64' },
        { type: 'uint64' },
        { type: 'uint64' },
        { type: 'uint64' },
        { type: 'uint64' },
        { type: 'uint64' },
        { type: 'uint64' },
        { type: 'uint64' },
        { type: 'uint64' },
        { type: 'uint64' }
      ]
    }
  ]
}
onUnmounted(() => {
  if (subscriber) {
    subscriber.stop('Unmounted')
    subscriber = null
  }
})
let subscriber: AlgorandSubscriber | null = null
const load = async () => {
  if (!store.state.clientPP) return
  var signer = getDummySigner()

  const algodClient = store.state.clientPP.algorand.client.algod
  const params = await algodClient.getTransactionParams().do()
  let watermark = params.firstValid - 10n
  if (!subscriber) {
    subscriber = new AlgorandSubscriber(
      {
        arc28Events: [tradeEvents],
        filters: [
          {
            name: 'trades-filter',
            filter: {
              appId: store.state.clientPP.appId,
              type: TransactionType.appl
              // Optionally filter by app ID, sender, etc.
            }
          }
        ],
        watermarkPersistence: {
          get: async () => watermark,
          set: async (newWatermark) => {
            watermark = newWatermark
          }
        },
        syncBehaviour: 'catchup-with-indexer',
        waitForBlockWhenAtTip: true,
        frequencyInSeconds: 2,
        maxIndexerRoundsToSync: 10,
        maxRoundsToSync: 10
      },
      store.state.clientPP.algorand.client.algod,
      store.state.clientPP.algorand.client.indexer
    )
    subscriber.onBatch('tradeEvents', async (events) => {
      console.log('Subscriber.tradeEvent', `Received ${events.length} asset changes`)
      // ... do stuff with the events
    })

    subscriber.onError((e) => {
      // eslint-disable-next-line no-console
      console.error('Subscriber.error', e)
    })

    subscriber.start()
  }
  console.log('Subscriber started')

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
      <h2 class="w-full flex items-center">
        Recent trades {{ store.state.pair.asset.name }}/{{ store.state.pair.currency.name }}
      </h2>
    </template>
  </Card>
</template>
