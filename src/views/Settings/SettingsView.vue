<script setup lang="ts">
import Layout from '@/layouts/PublicLayout.vue'
import Panel from 'primevue/panel'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import { useAppStore, resetConfiguration } from '@/stores/app'

const store = useAppStore()
</script>

<template>
  <Layout>
    <Panel header="Settings" class="m-4 flex flex-grow-1 flex-column" toggleableContent="text">
      <p class="m-0"></p>
      <div class="card">
        <h4>Blockchain configuration</h4>
        <div class="field grid">
          <label for="algodHost" class="col-12 mb-2 md:col-2 md:mb-0">Blockchain endpoint</label>
          <div class="col-12 md:col-10">
            <InputText v-model="store.state.algodHost" id="algodHost" type="text" class="w-full" />
          </div>
        </div>
        <div class="field grid">
          <label for="algodPort" class="col-12 mb-2 md:col-2 md:mb-0"
            >Blockchain endpoint port</label
          >
          <div class="col-12 md:col-10">
            <InputText v-model="store.state.algodPort" id="algodPort" type="text" class="w-full" />
          </div>
        </div>
        <div class="field grid">
          <label for="algodToken" class="col-12 mb-2 md:col-2 md:mb-0"
            >Blockchain endpoint token</label
          >
          <div class="col-12 md:col-10">
            <InputText
              v-model="store.state.algodToken"
              id="algodToken"
              type="text"
              class="w-full"
            />
          </div>
        </div>

        <h4>SWAP configuration</h4>
        <div class="field grid">
          <label for="slippage" class="col-12 mb-2 md:col-2 md:mb-0"> Slippage BPS</label>
          <div class="col-12 md:col-10">
            <InputNumber
              show-buttons
              :min="0"
              :max="100"
              :step="1"
              v-model="store.state.slippage"
              inputId="slippage"
              class="w-full"
            />
          </div>
        </div>

        <h4>Default configuration</h4>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0">Danger zone</label>
          <div class="col-12 md:col-10">
            <Button @click="resetConfiguration" class="my-2">Reset configuration</Button>
          </div>
        </div>
      </div>
    </Panel>
  </Layout>
</template>
