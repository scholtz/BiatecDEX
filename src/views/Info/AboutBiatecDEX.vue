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
const store = useAppStore()

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
          <h1>About Biatec DEX</h1>
          <p>
            Self custody decentralized exchange built on AVM. We are working on
            <b>Concentrated liquidity AMM</b> protocol where person can set his liquidity in the
            specicic price range.
          </p>
          <p>
            We utilize not just our liquidity protocol, but each market order executes through whole
            {{ store.state.envName }} ecosytem using DEX aggregator.
          </p>
          <p>
            At the moment the DEX aggregator used is
            <a href="https://www.folksrouter.io">Folks Router</a>.
          </p>
          <p>
            At the moment the Chart library used is
            <a href="https://widgets.vestige.fi/">Vestige widget</a>.
          </p>
          <h2>xGov grant</h2>
          <p>
            This work has been performed with support from the Algorand Foundation xGov Grants
            Program
            <a
              href="https://github.com/algorandfoundation/xGov/blob/main/Proposals/xgov-80.md"
              target="_blank"
              >xGov#80</a
            >.

            <a href="https://github.com/scholtz/BiatecDEX" target="_blank">Source code</a>.
          </p>
          <h2>Disclaimer</h2>
          <p>
            Even though Biatec DEX trading is already working, the Concentrated liquidity smart
            contract is still under the development, and changes to the web may still occure. You
            are using the beta software, and you are responsible to verify every transaction you
            sign.
          </p>
          <p>
            SELF CUSTODY - We do not hold your assets in any moment in the time. You are interacting
            directly with smart contracts and you are responsible to self manage the security of
            your algorand accounts.
          </p>
          <p>
            We use the ARC14 authorization to verify you are holder of the account. You may use the
            ARC76 email password algorand account and you will be asked to submit the password each
            time when you do the transactions. You can use most algorand wallets to sign
            transactions.
          </p>
          <p>
            Highest security can be achieved by using multisig account with 2FA account setup with
            multiple hardware devices (fe. ledgers) included.
          </p>
          <p>
            Lowest security, but fastest ability for trading may be achieved by using the mnemonic.
          </p>
          <h2>List of assets</h2>
          <p>
            We plan to be MiCA compliant company, therefore we try to limit the use of scam coins,
            rug pull tokens, pump and dump tokens or tokens without any utilization.
          </p>
          <DataTable
            :value="tokens"
            v-model:filters="filters"
            dataKey="assetId"
            :globalFilterFields="['name', 'code', 'assetId', 'symbol', 'network']"
          >
            <template #header>
              <div class="flex justify-content-end">
                <IconField iconPosition="left">
                  <InputText v-model="filters['global'].value" placeholder="Keyword Search" />
                </IconField>
              </div>
            </template>
            <Column field="code" header="Code"></Column>
            <Column field="name" header="Name"></Column>
            <Column field="assetId" header="Asset Id"></Column>
            <Column field="symbol" header="Symbol"></Column>

            <Column field="isCurrency" header="Currency" dataType="boolean" style="min-width: 6rem">
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
            <Column field="network" header="Network"></Column>
          </DataTable>
          <h2>Legal information</h2>
          <p>
            Website dex.biatec.io is run by Scholtz & Company, jsa. Trade registry ID: 51882272; Tax
            id: 2120828105
          </p>
          <p>
            Biatec DEX is part of Biatec Group -
            <a href="https://www.biatec.io" target="_blank">www.biatec.io</a>.
          </p>
        </div>
      </template>
    </Card>
  </Layout>
</template>
