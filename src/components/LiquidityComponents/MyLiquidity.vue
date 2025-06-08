<script setup lang="ts">
import Card from 'primevue/card'
import { useAppStore } from '@/stores/app'
import { useToast } from 'primevue/usetoast'

import { getPools, type FullConfig } from 'biatec-concentrated-liquidity-amm'
import { onMounted, reactive, watch } from 'vue'
import { useNetwork } from '@txnlab/use-wallet-vue'
import getAlgodClient from '@/scripts/algo/getAlgodClient'
import { useAVMAuthentication } from 'algorand-authentication-component-vue'

const toast = useToast()
const store = useAppStore()
const props = defineProps<{
  class?: string
}>()
const { activeNetworkConfig } = useNetwork()
const { authStore } = useAVMAuthentication()
const state = reactive({
  pools: [] as FullConfig[]
})
const loadPools = async () => {
  try {
    if (store.state.pools[store.state.env]) {
      state.pools = store.state.pools[store.state.env]
      console.log('Using cached pools:', state.pools)
      return
    }
    store.setChain('dockernet-v1')
    console.log('store?.state?.clientPP?.appId', store?.state, store?.state?.clientPP?.appId)
    if (!store?.state?.clientPP?.appId)
      throw new Error('Pool Provider App ID is not set in the store.')

    const algod = getAlgodClient(activeNetworkConfig.value)
    state.pools = await getPools({
      algod: algod,
      assetId: BigInt(store.state.pair.asset.assetId),
      poolProviderAppId: store.state.clientPP.appId
    })
    console.log('Liquidity Pools:', state.pools)

    store.state.pools[store.state.env] = state.pools
  } catch (error) {
    console.error('Error fetching liquidity pools:', error, store.state)
    toast.add({
      severity: 'error',
      summary: 'Error fetching liquidity pools',
      detail: (error as Error).message,
      life: 5000
    })
  }
}
watch(
  () => authStore.isAuthenticated,
  async (isAuthenticated) => {
    if (isAuthenticated) {
      await loadPools()
    } else {
      state.pools = []
    }
  },
  { immediate: true }
)
onMounted(async () => {
  if (authStore.isAuthenticated) {
    await loadPools()
  }
})
</script>
<template>
  <Card :class="props.class">
    <template #content>
      <h2>My liquidity</h2>
      <!-- {{
        JSON.stringify(state.pools, (_, value) =>
          typeof value === 'bigint' ? `${value.toString()}n` : value
        )
      }} -->
      <DataTable :value="state.pools" :paginator="true" :rows="10" class="mt-2">
        <Column field="appId" header="App ID"></Column>
        <Column field="assetA" header="Asset A"></Column>
        <Column field="assetB" header="Asset B"></Column>
        <Column field="fee" header="Fee"></Column>
        <Column field="max" header="Max"></Column>
        <Column field="min" header="Min"></Column>
        <Column field="lpTokenId" header="LP Token ID"></Column>
        <Column field="verificationClass" header="Verification Class"></Column>
      </DataTable>
    </template>
  </Card>
</template>
<style></style>
