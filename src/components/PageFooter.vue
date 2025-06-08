<script setup lang="ts">
import { useAppStore } from '@/stores/app'
import Card from 'primevue/card'

const store = useAppStore()
</script>
<template>
  <Card class="m-2 text-center bg-white/20 text-gray-900">
    <template #content>
      <div class="p-2">
        <div>
          This work has been partly built with support from the Algorand Foundation xGov Grants
          Program -
          <a
            href="https://github.com/algorandfoundation/xGov/blob/main/Proposals/xgov-80.md"
            target="_blank"
            >xGov#80</a
          >.

          {{ store.state.assetCode }}
          {{ store.state.currencyCode }}
        </div>
        <div>
          Biatec DEX is part of Biatec Group -
          <a href="https://www.biatec.io" target="_blank">www.biatec.io</a>. Join our discord
          channel to show us support or if you need any help -
          <a href="https://discord.gg/gvGvmZ7c8s" target="_blank">Biatec Discord</a>.
        </div>
      </div>
    </template>
  </Card>
</template>
