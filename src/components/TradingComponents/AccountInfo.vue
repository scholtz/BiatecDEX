<script setup lang="ts">
import Card from 'primevue/card'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import { onBeforeUnmount, onMounted, reactive, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { useToast } from 'primevue/usetoast'

import AlgorandAddress from '@/components/AlgorandAddress.vue'

import formatNumber from '@/scripts/asset/formatNumber'
import { AssetsService } from '@/service/AssetsService'
import getAlgodClient from '@/scripts/algo/getAlgodClient'
import algosdk from 'algosdk'

const store = useAppStore()
const toast = useToast()

const props = defineProps<{
  class?: string
}>()

const state = reactive({
  assetBalance: 0,
  currencyBalance: 0,
  assetOptedIn: false,
  currencyOptedIn: false,
  algoBalance: 0,
  intervalRefreshAccountInfo: null as NodeJS.Timeout | null
})

const algoAsset = AssetsService.getAsset('ALGO')

const delay = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const loadAccountInfo = async () => {
  if (!store.state.authState.account) return
  const algodClient = getAlgodClient(store.state)
  await delay(100)
  const info = await algodClient.accountInformation(store.state.authState.account).do()

  state.algoBalance = info.amount
  if (store.state.pair.asset.assetId == 0) {
    state.assetBalance = info.amount
    state.assetOptedIn = true
  } else {
    const asset = info.assets.find((a: any) => a['asset-id'] == store.state.pair.asset.assetId)
    if (asset) {
      state.assetBalance = asset.amount
      state.assetOptedIn = true
    } else {
      state.assetBalance = 0
      state.assetOptedIn = false
    }
  }

  if (store.state.pair.currency.assetId == 0) {
    state.currencyBalance = info.amount
    state.currencyOptedIn = true
  } else {
    const curr = info.assets.find((a: any) => a['asset-id'] == store.state.pair.currency.assetId)
    if (curr) {
      state.currencyBalance = curr.amount
      state.currencyOptedIn = true
    } else {
      state.currencyBalance = 0
      state.currencyOptedIn = false
    }
  }
}

watch(
  () => store.state.pair,
  async () => {
    await loadAccountInfo()
  },
  { deep: true }
)
watch(
  () => store.state.refreshAccountBalance,
  async () => {
    if (store.state.refreshAccountBalance) {
      await loadAccountInfo()
      store.state.refreshAccountBalance = false
    }
  },
  { deep: true }
)

onMounted(async () => {
  state.intervalRefreshAccountInfo = setInterval(loadAccountInfo, 60000)
  await loadAccountInfo()
})
onBeforeUnmount(() => {
  if (state.intervalRefreshAccountInfo) {
    clearInterval(state.intervalRefreshAccountInfo)
  }
})

const optIn = async (assetId: number) => {
  try {
    const algodClient = getAlgodClient(store.state)
    console.log('opting into asset ' + assetId)
    const params = await algodClient.getTransactionParams().do()
    const txParams = {
      amount: 0,
      assetIndex: Number(assetId),
      from: store.state.authState.account,
      to: store.state.authState.account,
      suggestedParams: params,
      note: new Uint8Array(Buffer.from(`asa.gold optin`))
    }
    console.log('txParams', txParams)
    const tx = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject(txParams)
    const grouped = [tx]

    console.log('tosign', grouped)
    const groupedEncoded = grouped.map((tx) => tx.toByte())
    const txs = (await store.state.authComponent.sign(groupedEncoded)) as Uint8Array[]
    console.log('txs', txs)
    if (txs.length != grouped.length) {
      throw new Error(
        `Signing did not return same number of transactions. To be signed was ${grouped.length}, signed: ${txs.length}`
      )
    }
    txs.forEach((tx) => {
      const decoded = algosdk.decodeSignedTransaction(tx)
      const found = grouped.find((tx) => tx.txID() == decoded.txn.txID())
      if (!found) {
        throw new Error(
          `We received transaction we did not requested to be signed: ${decoded.txn.txID()}`
        )
      }
    })
    if (txs.length != grouped.length) {
      throw new Error(
        `Signing did not return same number of transactions. To be signed was ${grouped.length}, signed: ${txs.length}`
      )
    }
    const { txId } = await algodClient.sendRawTransaction(txs).do()
    toast.add({
      severity: 'info',
      detail: 'Transaction is being submitted to the network',
      life: 5000
    })
    await algosdk.waitForConfirmation(algodClient, txId, 4)
    toast.add({
      severity: 'success',
      detail: 'Transaction has been processed',
      life: 5000
    })

    store.state.refreshAccountBalance = true
  } catch (e: any) {
    console.error(e)
    toast.add({ severity: 'error', detail: e.message, life: 5000 })
  }
}
</script>
<template>
  <Card :class="props.class">
    <template #content>
      <TabView>
        <TabPanel header="Account info">
          <div v-if="store.state.authState.isAuthenticated" class="m-2 p-1">
            <div class="field grid">
              <label class="col-12 mb-2 md:col-2 md:mb-0" @click="loadAccountInfo"> Account </label>
              <AlgorandAddress :address="store.state.authState.account"></AlgorandAddress>
            </div>
            <div class="field grid">
              <label class="col-12 mb-2 md:col-2 md:mb-0" @click="loadAccountInfo">
                {{ store.state.pair.asset.name }}
              </label>
              <div class="col-12 md:col-10" v-if="state.assetOptedIn">
                {{
                  formatNumber(
                    state.assetBalance,
                    store.state.pair.asset.decimals,
                    undefined,
                    true,
                    undefined,
                    store.state.pair.asset.symbol
                  )
                }}
              </div>
              <div class="col-12 md:col-10" v-else>
                <Button size="small" class="p-1" @click="optIn(store.state.pair.asset.assetId)">
                  Open {{ store.state.pair.asset.name }} account</Button
                >
              </div>
            </div>
            <div class="field grid">
              <label class="col-12 mb-2 md:col-2 md:mb-0">
                {{ store.state.pair.currency.name }}
              </label>
              <div class="col-12 md:col-10" v-if="state.currencyOptedIn">
                {{
                  formatNumber(
                    state.currencyBalance,
                    store.state.pair.currency.decimals,
                    undefined,
                    true,
                    undefined,
                    store.state.pair.currency.symbol
                  )
                }}
              </div>
              <div class="col-12 md:col-10" v-else>
                <Button size="small" class="p-1" @click="optIn(store.state.pair.currency.assetId)">
                  Open {{ store.state.pair.currency.name }} account</Button
                >
              </div>
            </div>
            <div
              class="field grid"
              v-if="
                store.state.pair.asset.code != 'ALGO' && store.state.pair.currency.code != 'ALGO'
              "
            >
              <label class="col-12 mb-2 md:col-2 md:mb-0">
                {{ algoAsset?.name }}
              </label>
              <div class="col-12 md:col-10">
                {{
                  formatNumber(
                    state.algoBalance,
                    algoAsset?.decimals,
                    undefined,
                    true,
                    undefined,
                    algoAsset?.symbol
                  )
                }}
              </div>
            </div>
          </div>
          <div v-else class="m-2 p-1">
            <Button class="w-full" @click="store.state.forceAuth = true">
              Authenticate please
            </Button>
          </div>
        </TabPanel>
      </TabView>
    </template>
  </Card>
</template>
<style></style>
