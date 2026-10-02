<script setup lang="ts">
import InputGroupAddon from 'primevue/inputgroupaddon'

/**
 * The symbol / pair label next to a number field ("ALGO", "VOTE/USD"). A long symbol is cut with an ellipsis instead of taking
 * the row from the number (the addon is capped at 45 % of the group - see the style below) and the full text stays available
 * as the tooltip (nothing is rendered while the text is empty). Use this for every symbol addon so the behaviour is the same everywhere.
 */
defineProps<{ text: string }>()
</script>

<template>
  <InputGroupAddon v-if="text" class="symbol-addon">
    <div v-tooltip.top="text" class="px-2 sm:px-3 min-w-0 truncate">{{ text }}</div>
  </InputGroupAddon>
</template>

<style scoped>
/* doubled class: PrimeVue injects its theme CSS at runtime, after the component styles, with the specificity of one class */
.symbol-addon.p-inputgroupaddon {
  max-width: 45%;
  overflow: hidden;
}
</style>
