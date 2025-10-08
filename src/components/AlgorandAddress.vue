<script setup lang="ts">
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

const toast = useToast()
const { t } = useI18n()
const props = defineProps<{
  address: string
}>()
const copyToClipboard = () => {
  navigator.clipboard.writeText(props.address)

  toast.add({
    severity: 'success',
    detail: t('components.algorandAddress.copied'),
    life: 5000
  })
}
</script>
<template>
  <span
    style="cursor: pointer"
    @click="copyToClipboard"
    v-if="props.address && props.address.length > 10"
    :title="t('components.algorandAddress.title', { address: props.address })"
    >{{ props.address.substring(0, 4) }}..{{
      props.address.substring(props.address.length - 4)
    }}</span
  >
</template>
