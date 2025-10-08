<script setup lang="ts">
import Layout from '@/layouts/PublicLayout.vue'
import Panel from 'primevue/panel'
import Button from 'primevue/button'
import InputNumber from 'primevue/inputnumber'
import InputText from 'primevue/inputtext'
import { useAppStore, resetConfiguration } from '@/stores/app'
import { useI18n } from 'vue-i18n'

const store = useAppStore()
const { t } = useI18n()

const setMainnet = () => {
  store.state.algodHost = 'https://mainnet-api.algonode.cloud'
  store.state.algodPort = 443
  store.state.algodToken = ''
}
const setLocalnet = () => {
  store.state.algodHost = 'http://localhost'
  store.state.algodPort = 4001
  store.state.algodToken = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
}
</script>

<template>
  <Layout>
    <Panel
      :header="t('views.settings.title')"
      class="m-4 flex flex-grow-1 flex-column"
      toggleableContent="text"
    >
      <p class="m-0"></p>
      <div class="card">
        <h4>{{ t('views.settings.blockchain.title') }}</h4>
        <div class="field grid">
          <label for="algodHost" class="col-12 mb-2 md:col-2 md:mb-0"></label>
          <div class="col-12 md:col-10">
            <Button class="mr-2 mb-2" @click="setMainnet">{{
              t('views.settings.blockchain.mainnet')
            }}</Button>
            <Button class="mr-2 mb-2" @click="setLocalnet">{{
              t('views.settings.blockchain.localnet')
            }}</Button>
          </div>
        </div>
        <div class="field grid">
          <label for="algodHost" class="col-12 mb-2 md:col-2 md:mb-0">{{
            t('views.settings.blockchain.endpoint')
          }}</label>
          <div class="col-12 md:col-10">
            <InputText v-model="store.state.algodHost" id="algodHost" type="text" class="w-full" />
          </div>
        </div>
        <div class="field grid">
          <label for="algodPort" class="col-12 mb-2 md:col-2 md:mb-0">{{
            t('views.settings.blockchain.endpointPort')
          }}</label>
          <div class="col-12 md:col-10">
            <InputNumber
              v-model="store.state.algodPort"
              id="algodPort"
              type="text"
              class="w-full"
            />
          </div>
        </div>
        <div class="field grid">
          <label for="algodToken" class="col-12 mb-2 md:col-2 md:mb-0">{{
            t('views.settings.blockchain.endpointToken')
          }}</label>
          <div class="col-12 md:col-10">
            <InputText
              v-model="store.state.algodToken"
              id="algodToken"
              type="text"
              class="w-full"
            />
          </div>
        </div>

        <h4>{{ t('views.settings.swap.title') }}</h4>
        <div class="field grid">
          <label for="slippage" class="col-12 mb-2 md:col-2 md:mb-0">
            {{ t('views.settings.swap.slippage') }}</label
          >
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

        <h4>{{ t('views.settings.default.title') }}</h4>
        <div class="field grid">
          <label class="col-12 mb-2 md:col-2 md:mb-0">{{
            t('views.settings.default.dangerZone')
          }}</label>
          <div class="col-12 md:col-10">
            <Button @click="resetConfiguration" class="my-2">{{
              t('views.settings.default.resetConfiguration')
            }}</Button>
          </div>
        </div>
      </div>
    </Panel>
  </Layout>
</template>
