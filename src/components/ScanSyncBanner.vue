<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useScanSyncStatus } from '@/composables/useScanSyncStatus'

const { locale } = useI18n()
const { state, lagSeconds, outOfSync } = useScanSyncStatus()

// Dismissed until the data is healthy again, so a new outage is never hidden.
const dismissed = ref(false)
watch(outOfSync, (value) => {
  if (!value) dismissed.value = false
})

// Locale-aware unit formatting (never hard-coded English suffixes).
const lagText = computed(() => {
  const seconds = lagSeconds.value
  const [value, unit] =
    seconds >= 3600
      ? [Math.floor(seconds / 3600), 'hour']
      : seconds >= 60
        ? [Math.floor(seconds / 60), 'minute']
        : [seconds, 'second']
  try {
    return new Intl.NumberFormat(locale.value, {
      style: 'unit',
      unit,
      unitDisplay: 'short'
    }).format(value)
  } catch {
    return `${value} ${unit}`
  }
})
</script>

<template>
  <div
    v-if="outOfSync && !dismissed"
    class="fixed bottom-4 left-4 right-4 z-50 max-w-sm"
    role="status"
    data-testid="scan-sync-banner"
    :data-sync-state="state"
  >
    <Message severity="warn" closable @close="dismissed = true">
      <div class="font-semibold">{{ $t('components.scanSync.outOfSync') }}</div>
      <div class="text-sm">{{ $t('components.scanSync.behind', { lag: lagText }) }}</div>
      <div v-if="state === 'syncing'" class="text-sm" data-testid="scan-sync-syncing">
        {{ $t('components.scanSync.syncing') }}
      </div>
    </Message>
  </div>
</template>
