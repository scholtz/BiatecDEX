<script setup lang="ts">
import { useScanSyncStatus } from '@/composables/useScanSyncStatus'

const { state, lagSeconds, outOfSync } = useScanSyncStatus()

const lagText = (seconds: number): string =>
  seconds >= 3600
    ? `${Math.floor(seconds / 3600)} h`
    : seconds >= 60
      ? `${Math.floor(seconds / 60)} min`
      : `${seconds} s`
</script>

<template>
  <div
    v-if="outOfSync"
    class="fixed bottom-4 left-4 z-50 max-w-sm"
    role="status"
    data-testid="scan-sync-banner"
    :data-sync-state="state"
  >
    <Message severity="warn" :closable="false">
      <div class="font-semibold">{{ $t('components.scanSync.outOfSync') }}</div>
      <div class="text-sm">
        {{ $t('components.scanSync.behind', { lag: lagText(lagSeconds) }) }}
      </div>
      <div v-if="state === 'syncing'" class="text-sm" data-testid="scan-sync-syncing">
        {{ $t('components.scanSync.syncing') }}
      </div>
    </Message>
  </div>
</template>
