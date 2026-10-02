<script setup lang="ts">
/**
 * The symbol / pair label next to a number field ("ALGO", "VOTE/USD"). A long symbol is cut with an ellipsis instead of taking
 * the row from the number (the addon is capped at 45 % of the group - see the style below); the full text is the native `title`
 * (hover; a touch phone has no hover, but the pair is always on screen in the page header). The addon is always rendered - even while the text is still empty - so the field next
 * to it does not jump when the symbol arrives. Use this for every symbol addon so the behaviour is the same everywhere.
 * (InputGroupAddon is auto-imported by unplugin-vue-components, like every PrimeVue component.)
 */
defineProps<{ text: string }>()
</script>

<template>
  <InputGroupAddon class="symbol-addon">
    <div class="px-2 sm:px-3 min-w-0 truncate" :title="text">
      {{ text }}
    </div>
  </InputGroupAddon>
</template>

<style scoped>
/* doubled class: PrimeVue injects its theme CSS at runtime, after the component styles, with the specificity of one class */
.symbol-addon.p-inputgroupaddon {
  min-width: 2.5rem;
  max-width: 45%;
  overflow: hidden;
}
</style>
