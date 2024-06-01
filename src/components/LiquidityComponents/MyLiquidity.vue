<script setup lang="ts">
import Card from 'primevue/card'
import { useAppStore } from '@/stores/app'
import { useToast } from 'primevue/usetoast'
const toast = useToast()
const store = useAppStore()
const props = defineProps<{
  class?: string
}>()
</script>
<template>
  <Card :class="props.class">
    <template #content>
      <h2>My liquidity</h2>
    </template>
  </Card>
</template>
<style></style>
