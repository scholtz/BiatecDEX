<script setup lang="ts">
import AuthenticateButton from '@/components/AuthenticateButton.vue'

// Shared "table is empty" state for the auth-optional dashboards (Trader,
// Liquidity Provider): distinguishes "not signed in yet" (prompt to
// authenticate) from "signed in, genuinely nothing here" (plain info message),
// and suppresses both when a load error already has its own banner above the
// table - never claim the account was successfully checked when it wasn't.
withDefaults(
  defineProps<{
    error: string
    isAuthenticated: boolean
    signInPrompt: string
    authenticateLabel: string
    emptyMessage: string
    authenticateDataCy?: string
  }>(),
  {
    authenticateDataCy: undefined
  }
)
</script>

<template>
  <template v-if="!error">
    <div v-if="!isAuthenticated" class="py-8 flex flex-col items-center gap-3 text-center">
      <i class="pi pi-lock text-2xl text-gray-400 dark:text-gray-300"></i>
      <p class="text-sm text-gray-600 dark:text-gray-300 max-w-sm">{{ signInPrompt }}</p>
      <AuthenticateButton :label="authenticateLabel" :data-cy="authenticateDataCy" />
    </div>
    <div v-else class="py-6 flex items-center justify-center gap-2">
      <i class="pi pi-info-circle text-lg text-gray-500 dark:text-gray-300"></i>
      <span class="text-sm text-gray-500 dark:text-gray-300">{{ emptyMessage }}</span>
    </div>
  </template>
</template>
