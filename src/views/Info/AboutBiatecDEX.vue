<script setup lang="ts">
import Layout from '@/layouts/PublicLayout.vue'
import Card from 'primevue/card'
import DataTable from 'primevue/datatable'
import Column from 'primevue/column'
import { useAppStore } from '@/stores/app'
import { AssetsService } from '@/service/AssetsService'
import TriStateCheckbox from 'primevue/checkbox'

import IconField from 'primevue/iconfield'
import InputIcon from 'primevue/inputicon'
import InputText from 'primevue/inputtext'
import { FilterMatchMode } from '@primevue/core/api'
import { ref } from 'vue'
import { useI18n, I18nT } from 'vue-i18n'
const store = useAppStore()
const { t } = useI18n()

const tokens = Object.values(AssetsService.getAllAssets())

const filters = ref({
  global: { value: null, matchMode: FilterMatchMode.CONTAINS }
})
</script>
<template>
  <Layout>
    <Card class="mb-2 bg-white/90 text-gray-900 w-full">
      <template #content>
        <div class="m-3">
          <h1>{{ t('views.about.title') }}</h1>
          <p>
            <I18nT keypath="views.about.intro">
              <template #clamm>
                <b>{{ t('views.about.clamm') }}</b>
              </template>
            </I18nT>
          </p>
          <p>{{ t('views.about.ecosystem', { environment: store.state.envName }) }}</p>
          <p>
            <I18nT keypath="views.about.aggregator">
              <template #folks>
                <a href="https://www.folksrouter.io" target="_blank">Folks Router</a>
              </template>
            </I18nT>
          </p>
          <p>
            <I18nT keypath="views.about.chart">
              <template #vestige>
                <a href="https://widgets.vestige.fi/" target="_blank">Vestige widget</a>
              </template>
            </I18nT>
          </p>
          <h2>{{ t('views.about.grantTitle') }}</h2>
          <p>
            <I18nT keypath="views.about.grantText">
              <template #xgov>
                <a
                  href="https://github.com/algorandfoundation/xGov/blob/main/Proposals/xgov-80.md"
                  target="_blank"
                  >xGov#80</a
                >
              </template>
              <template #source>
                <a href="https://github.com/scholtz/BiatecDEX" target="_blank">
                  {{ t('views.about.sourceCode') }}
                </a>
              </template>
            </I18nT>
          </p>
          <h2>{{ t('views.about.disclaimerTitle') }}</h2>
          <p>{{ t('views.about.disclaimer1') }}</p>
          <p>{{ t('views.about.disclaimer2') }}</p>
          <p>{{ t('views.about.disclaimer3') }}</p>
          <p>{{ t('views.about.disclaimer4') }}</p>
          <p>{{ t('views.about.disclaimer5') }}</p>
          <h2>{{ t('views.about.assetsTitle') }}</h2>
          <p>{{ t('views.about.assetsDescription') }}</p>
          <DataTable
            :value="tokens"
            v-model:filters="filters"
            dataKey="assetId"
            :globalFilterFields="['name', 'code', 'assetId', 'symbol', 'network']"
          >
            <template #header>
              <div class="flex justify-content-end">
                <IconField iconPosition="left">
                  <InputText
                    v-model="filters['global'].value"
                    :placeholder="t('views.about.searchPlaceholder')"
                  />
                </IconField>
              </div>
            </template>
            <Column :header="t('views.about.table.code')" field="code"></Column>
            <Column :header="t('views.about.table.name')" field="name"></Column>
            <Column :header="t('views.about.table.assetId')" field="assetId"></Column>
            <Column :header="t('views.about.table.symbol')" field="symbol"></Column>

            <Column
              field="isCurrency"
              :header="t('views.about.table.currency')"
              dataType="boolean"
              style="min-width: 6rem"
            >
              <template #body="{ data }">
                <i
                  class="pi"
                  :class="{
                    'pi-check-circle text-green-500': data.isCurrency,
                    'pi-times-circle text-red-400': !data.isCurrency
                  }"
                ></i>
              </template>
              <template #filter="{ filterModel, filterCallback }">
                <TriStateCheckbox v-model="filterModel.value" @change="filterCallback()" />
              </template>
            </Column>
            <Column :header="t('views.about.table.network')" field="network"></Column>
          </DataTable>
          <h2>{{ t('views.about.legalTitle') }}</h2>
          <p>{{ t('views.about.legalInfo') }}</p>
          <p>
            <I18nT keypath="views.about.legalGroup">
              <template #biatec>
                <a href="https://www.biatec.io" target="_blank">www.biatec.io</a>
              </template>
            </I18nT>
          </p>
        </div>
      </template>
    </Card>
  </Layout>
</template>
