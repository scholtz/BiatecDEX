<script setup lang="ts">
import Button from 'primevue/button'
import { useAppStore } from '@/stores/app'

withDefaults(
  defineProps<{
    label: string
    icon?: string
    severity?: string
  }>(),
  {
    icon: undefined,
    severity: undefined
  }
)

const store = useAppStore()
</script>

<template>
  <Button :label="label" :icon="icon" :severity="severity" @click="store.state.forceAuth = true" />
</template>
