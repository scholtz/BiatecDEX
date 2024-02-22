<script setup lang="ts">
import Card from 'primevue/card'
import Button from 'primevue/button'
import { onMounted, reactive, watch } from 'vue'
import { useAppStore } from '@/stores/app'
const props = defineProps<{
  currency?: string
  interval?: number
  asset: number
  class?: string
}>()
const store = useAppStore()
const state = reactive({ invert: false, currency: props.currency, asset: props.asset })
onMounted(() => {
  init()
})

watch(
  store.state,
  () => {
    init()
  },
  { deep: true }
)

const init = () => {
  if (props.currency == 'EUR' && props.asset == 31566704) {
    state.asset = 227855942
    state.currency = 'USD'
  } else {
    state.asset = props.asset
    state.currency = props.currency
  }
}
</script>
<template>
  <Card id="chart" :class="props.class">
    <template #content>
      <iframe
        class="w-full h-full flex-grow-1"
        :src="`https://vestige.fi/widget/${state.asset}/chart?interval=${props.interval ?? 60}&amp;currency=${state.currency ?? 'USD'}&amp;invert=${state.invert}`"
      ></iframe>
    </template>
  </Card>
</template>

<style>
#chart .p-card-body,
#chart .p-card-content {
  height: 100%;
  margin: 0;
  padding: 0;
}
</style>
