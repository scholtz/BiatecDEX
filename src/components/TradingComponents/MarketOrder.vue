<script setup lang="ts">
import Card from 'primevue/card'
import InputNumber from 'primevue/inputnumber'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import InputGroup from 'primevue/inputgroup'
import InputGroupAddon from 'primevue/inputgroupaddon'
import { reactive } from 'vue'
import { useAppStore } from '@/stores/app'
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

const store = useAppStore()
</script>
<template>
  <Card :class="props.class">
    <template #content>
      <TabView>
        <TabPanel header="Buy market order">
          <div class="px-2 py-1">
            <div class="field grid">
              <label for="price" class="col-12 mb-2 md:col-2 md:mb-0"> Price </label>
              <div class="col-12 md:col-10">
                <InputGroup>
                  <InputNumber inputId="price" v-model="state.price" show-buttons class="w-full" />
                  <InputGroupAddon>
                    <div class="px-3">
                      {{ store.state.assetName }}/{{ store.state.currencyName }}
                    </div>
                  </InputGroupAddon>
                </InputGroup>
              </div>
            </div>
            <div class="field grid">
              <label for="quantity" class="col-12 mb-2 md:col-2 md:mb-0"> Quantity </label>
              <div class="col-12 md:col-10">
                <InputGroup>
                  <InputNumber
                    inputId="quantity"
                    v-model="state.quantity"
                    show-buttons
                    class="w-full"
                  />
                  <InputGroupAddon>
                    <div class="px-3">
                      {{ store.state.assetName }}
                    </div>
                  </InputGroupAddon>
                </InputGroup>
              </div>
            </div>
            <div class="field grid mb-0">
              <label class="col-12 mb-2 md:col-2 md:mb-0"> </label>
              <div class="col-12 md:col-10">
                <Button severity="success">Buy</Button>
              </div>
            </div>
          </div>
        </TabPanel>
        <TabPanel header="Sell market order">
          <div class="px-2 py-1">
            <div class="field grid">
              <label for="price" class="col-12 mb-2 md:col-2 md:mb-0"> Price </label>
              <div class="col-12 md:col-10">
                <InputNumber inputId="price" v-model="state.price" show-buttons class="w-full" />
              </div>
            </div>
            <div class="field grid">
              <label for="quantity" class="col-12 mb-2 md:col-2 md:mb-0"> Quantity </label>
              <div class="col-12 md:col-10">
                <InputNumber
                  inputId="quantity"
                  v-model="state.quantity"
                  show-buttons
                  class="w-full"
                />
              </div>
            </div>
            <div class="field grid mb-0">
              <label class="col-12 mb-2 md:col-2 md:mb-0"> </label>
              <div class="col-12 md:col-10">
                <Button severity="danger">Sell</Button>
              </div>
            </div>
          </div>
        </TabPanel>
      </TabView>
    </template>
  </Card>
</template>
<style></style>
