<script setup lang="ts">
import Button from 'primevue/button'
import { useAppStore } from '@/stores/app'

defineProps<{
  label: string
  icon?: string
  severity?: string
}>()

const store = useAppStore()
</script>

<template>
  <Button :label="label" :icon="icon" :severity="severity" @click="store.state.forceAuth = true" />
</template>
