<script setup lang="ts">
import Card from 'primevue/card'
import { useAppStore } from '@/stores/app'
import { useToast } from 'primevue/usetoast'

import { getPools } from 'biatec-concentrated-liquidity-amm'
import { onMounted } from 'vue'
import { useNetwork } from '@txnlab/use-wallet-vue'
import getAlgodClient from '@/scripts/algo/getAlgodClient'

const toast = useToast()
const store = useAppStore()
const props = defineProps<{
  class?: string
}>()
const { activeNetworkConfig } = useNetwork()

onMounted(async () => {
  try {
    if (!store?.state?.clientPP?.appId)
      throw new Error('Pool Provider App ID is not set in the store.')
    const algod = getAlgodClient(activeNetworkConfig.value)
    const pools = await getPools({
      algod: algod,
      assetId: BigInt(store.state.pair.asset.assetId),
      poolProviderAppId: store.state.clientPP.appId
    })
    console.log('Liquidity Pools:', pools)
  } catch (error) {
    console.error('Error fetching liquidity pools:', error, store.state)
    toast.add({
      severity: 'error',
      summary: 'Error fetching liquidity pools',
      detail: (error as Error).message,
      life: 5000
    })
  }
})
</script>
<template>
  <Card :class="props.class">
    <template #content>
      <h2>My liquidity</h2>
    </template>
  </Card>
</template>
<style></style>
