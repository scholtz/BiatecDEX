<script setup lang="ts">
import Card from 'primevue/card'
import { useAppStore } from '@/stores/app'
const props = defineProps<{
  interval?: number

  class?: string
}>()
const store = useAppStore()
</script>
<template>
  <Card id="chart" :class="props.class">
    <template #content>
      <iframe
        v-if="store.state.pair.asset.assetId > 0"
        class="w-full h-full flex-grow-1"
        :src="`https://vestige.fi/widget/${store.state.pair.asset.assetId}/chart?noCookie=true&amp;tools=true&amp;interval=${props.interval ?? 15}&amp;currency=${store.state.pair.currency.code ?? 'USD'}&amp;invert=${store.state.pair.invert}`"
      ></iframe>
      <iframe
        v-else
        class="w-full h-full flex-grow-1"
        :src="`https://vestige.fi/widget/${store.state.pair.currency.assetId}/chart?noCookie=true&amp;tools=true&amp;interval=${props.interval ?? 15}&amp;currency=${store.state.pair.asset.code ?? 'USD'}&amp;invert=${store.state.pair.invert}`"
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
