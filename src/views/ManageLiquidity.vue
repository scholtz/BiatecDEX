<script setup lang="ts">
import Layout from '@/layouts/PublicLayout.vue'
import MyLiquidity from '@/components/LiquidityComponents/MyLiquidity.vue'
import AddLiquidity from '@/components/LiquidityComponents/AddLiquidity.vue'
</script>
<template>
  <Layout :auth-required="true">
    <div class="flex flex-grow w-full flex-col md:flex-row gap-2">
      <div class="w-full md:w-1/2">
        <MyLiquidity class="h-full p-2" />
      </div>
      <div class="w-full md:w-1/2">
        <AddLiquidity class="h-full p-2" />
      </div>
    </div>
  </Layout>
</template>
