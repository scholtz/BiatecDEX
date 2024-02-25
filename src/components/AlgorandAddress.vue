<script setup lang="ts">
import { useToast } from 'primevue/usetoast'

const toast = useToast()
const props = defineProps<{
  address: string
}>()
const copyToClipboard = () => {
  navigator.clipboard.writeText(props.address)

  toast.add({
    severity: 'success',
    detail: 'Address copied to clipboard',
    life: 5000
  })
}
</script>
<template>
  <span
    style="cursor: pointer"
    @click="copyToClipboard"
    v-if="props.address && props.address.length > 10"
    :title="`Address: ${props.address}. Click to copy to clipboard.`"
    >{{ props.address.substring(0, 4) }}..{{
      props.address.substring(props.address.length - 4)
    }}</span
  >
</template>
