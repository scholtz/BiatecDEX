<script setup lang="ts">
import Card from 'primevue/card'
import InputNumber from 'primevue/inputnumber'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import { reactive } from 'vue'
const props = defineProps<{
  currency?: string
  interval?: number
  asset: number
  class?: string
}>()

const state = reactive({
  price: 0,
  quantity: 0
})
</script>
<template>
  <Card :class="props.class">
    <template #content>
      <TabView>
        <TabPanel header="Market depth">
          <div class="grid">
            <div class="col-6 text-right">
              <div class="text-primary">Bid</div>
              <div>2</div>
              <div>1</div>
              <div>1</div>
              <div>1</div>
              <div>1</div>
            </div>
            <div class="col-6">
              <div class="text-primary">Offer</div>
              <div>3</div>
              <div>4</div>
              <div>5</div>
            </div>
          </div>
        </TabPanel>
      </TabView>
    </template>
  </Card>
</template>
<style></style>
