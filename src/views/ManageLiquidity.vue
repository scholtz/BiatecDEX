<script setup lang="ts">
import Layout from '@/layouts/PublicLayout.vue'
import MyLiquidity from '@/components/LiquidityComponents/MyLiquidity.vue'
import AddLiquidity from '@/components/LiquidityComponents/AddLiquidity.vue'
</script>
<template>
  <Layout>
    <div class="grid flex-grow-1">
      <div class="col-12 md:col-6">
        <MyLiquidity class="h-full p-2" />
      </div>
      <div class="col-12 md:col-6 pl-0">
        <AddLiquidity class="h-full p-2" />
      </div>
    </div>
  </Layout>
</template>
