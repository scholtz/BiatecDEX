<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useAppStore } from '@/stores/app'
const store = useAppStore()
import { Gradient } from 'whatamesh'
import { onMounted, watch } from 'vue'
import { Buffer } from 'buffer'
import { useNetwork } from '@txnlab/use-wallet-vue'
import { useAVMAuthentication } from 'algorand-authentication-component-vue'
// @ts-ignore
window.Buffer = Buffer

const gradient = new Gradient()
onMounted(async () => {
  console.log('gradient init')
  gradient.initGradient('#gradient-canvas')
  console.log('gradient done')

  //if (store.state.env !== activeNetworkConfig.value.genesisId) {
  console.log('Setting active network to:', store.state.env)
  await setActiveNetwork('mainnet')
  //}
})

watch(store.state, () => {}, { deep: true })

const { activeNetworkConfig, setActiveNetwork } = useNetwork()
const { authStore } = useAVMAuthentication()
watch(
  () => activeNetworkConfig.value,
  (newConfig) => {
    console.log('Network config changed:', newConfig)

    //store.setChain('dockernet-v1')
    // You can add logic here to handle network changes if needed
  }
)
watch(
  () => authStore.account,
  (newConfig) => {
    console.log('authStore.account changed:', newConfig)
    store.setChain(store.state.env)
    // You can add logic here to handle network changes if needed
  }
)

watch(
  () => store.state.env,
  async (newConfig) => {
    if (newConfig == activeNetworkConfig.value.genesisId) return

    console.log('new env detected, setting usewallet chain')
    await setActiveNetwork(newConfig)
    // You can add logic here to handle network changes if needed
  }
)
</script>

<template>
  <canvas id="gradient-canvas" data-transition-in />
  <RouterView />
</template>
<style>
#gradient-canvas {
  width: 100%;
  height: 100%;
  --gradient-color-1: #043d5d;
  --gradient-color-2: #032e46;
  --gradient-color-3: #23b684;
  --gradient-color-4: #0f595e;
  position: fixed;
  top: 0;
  left: 0;
  z-index: -10000;
}
</style>
