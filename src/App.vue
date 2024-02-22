<script setup lang="ts">
import { RouterView } from 'vue-router'
import { useAppStore } from '@/stores/app'
const store = useAppStore()
import { Gradient } from 'whatamesh'
import { onMounted, watch } from 'vue'

let gradient = new Gradient()
onMounted(() => {
  gradient.initGradient('#gradient-canvas')
})

watch(
  store.state,
  () => {
    setTimeout(() => {
      gradient.initGradient('#gradient-canvas')
    }, 200)
  },
  { deep: true }
)
</script>

<template>
  <canvas id="gradient-canvas"></canvas>
  <RouterView />
</template>
<style>
.p-card-body,
.p-card-content,
.p-tabview-panels {
  padding: 0;
}
</style>
