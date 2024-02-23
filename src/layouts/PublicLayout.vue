<script setup lang="ts">
import TopHeader from '@/components/TopHeader2.vue'
import PageFooter from '@/components/PageFooter.vue'
import Toast from 'primevue/toast'
</script>
<template>
  <div class="flex flex-column min-h-full p-0 m-0">
    <Toast />
    <TopHeader :hideTopMenu="false" />
    <div class="flex-grow-1 flex flex-column m-2">
      <slot />
    </div>
    <PageFooter />
  </div>
</template>
