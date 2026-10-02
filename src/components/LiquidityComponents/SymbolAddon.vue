<script setup lang="ts">
import InputGroupAddon from 'primevue/inputgroupaddon'

/**
 * The symbol / pair label next to a number field ("ALGO", "VOTE/USD"). A long symbol is cut with an ellipsis instead of taking
 * the row from the number (app.css: `.p-inputgroup > .p-inputgroupaddon:has(> .truncate)` caps it at 45 %), and the full text
 * stays available as the native tooltip. Use this for every symbol addon so the behaviour is the same everywhere.
 */
defineProps<{ text: string }>()
</script>

<template>
  <InputGroupAddon>
    <div class="px-2 sm:px-3 min-w-0 truncate" :title="text">{{ text }}</div>
  </InputGroupAddon>
</template>
