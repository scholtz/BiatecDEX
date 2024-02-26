<script setup lang="ts">
import Image from 'primevue/image'
import Button from 'primevue/button'
import Divider from 'primevue/divider'
import Card from 'primevue/card'
import { ref, onMounted, onBeforeUnmount } from 'vue'
const isMobile = ref(false)

function handleResize() {
  if (window.innerWidth <= 768) {
    isMobile.value = true
  } else {
    isMobile.value = false
  }
}

onMounted(() => {
  if (window.innerWidth <= 768) {
    isMobile.value = true
  }
  window.addEventListener('resize', handleResize)
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', handleResize)
})
</script>
<template>
  <Card class="mt-0 m-2 text-center">
    <template #content>
      <div class="p-2">
        <div>
          This work has been performed with support from the Algorand Foundation xGov Grants Program
          -
          <a
            href="https://github.com/algorandfoundation/xGov/blob/main/Proposals/xgov-80.md"
            target="_blank"
            >xGov#80</a
          >.

          <a href="https://github.com/scholtz/BiatecDEX" target="_blank">Source code</a>.
        </div>
        <div>
          Biatec DEX is part of Biatec Group -
          <a href="https://www.biatec.io" target="_blank">www.biatec.io</a>.
        </div>
      </div>
    </template>
  </Card>
</template>
<style scoped>
.use-text-subtitle {
  margin-bottom: 48px;
  font-size: 30px;
  line-height: 36px;
  font-weight: var(--font-medium) !important;
}
.font-style .font-medium {
  font-size: 20px !important;
  font-weight: var(--font-bold);
  text-transform: uppercase;
}
.footer-two {
  padding-top: 40px;
  border-top: 1px solid rgb(216 216 216 / 53%);
  max-width: 100%;
  clip: rect(0, auto, auto, 0);
  height: 100%;
  overflow: hidden;
  top: 0;
  width: 100%;
}
</style>
