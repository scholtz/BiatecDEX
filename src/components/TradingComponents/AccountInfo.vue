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
import { useAVMAuthentication } from 'algorand-authentication-component-vue'
import { useNetwork, useWallet } from '@txnlab/use-wallet-vue'

const { activeNetworkConfig } = useNetwork()
const store = useAppStore()
const toast = useToast()
const { authStore, getTransactionSigner } = useAVMAuthentication()
const { transactionSigner: useWalletTransactionSigner } = useWallet()

const props = defineProps<{
  class?: string
}>()

const state = reactive({
  assetBalance: 0n,
  currencyBalance: 0n,
  assetOptedIn: false,
  currencyOptedIn: false,
  algoBalance: 0n,
  intervalRefreshAccountInfo: null as NodeJS.Timeout | null
})

const algoAsset = AssetsService.getAsset('ALGO')

const delay = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const loadAccountInfo = async () => {
  if (!authStore.account) return
  const algodClient = getAlgodClient(activeNetworkConfig.value)
  await delay(100)
  const info = await algodClient.accountInformation(authStore.account).do()

  state.algoBalance = BigInt(info.amount)
  if (store.state.pair.asset.assetId == 0) {
    state.assetBalance = BigInt(info.amount)
    state.assetOptedIn = true
  } else {
    const asset = info?.assets?.find((a) => a.assetId == BigInt(store.state.pair.asset.assetId))
    if (asset) {
      state.assetBalance = asset.amount
      state.assetOptedIn = true
    } else {
      state.assetBalance = 0n
      state.assetOptedIn = false
    }
  }

  if (store.state.pair.currency.assetId == 0) {
    state.currencyBalance = info.amount
    state.currencyOptedIn = true
  } else {
    const curr = info?.assets?.find((a) => a.assetId == BigInt(store.state.pair.asset.assetId))
    if (curr) {
      state.currencyBalance = curr.amount
      state.currencyOptedIn = true
    } else {
      state.currencyBalance = 0n
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
    const algodClient = getAlgodClient(activeNetworkConfig.value)
    console.log('opting into asset ' + assetId)
    const params = await algodClient.getTransactionParams().do()
    const tx = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      amount: 0,
      assetIndex: Number(assetId),
      sender: authStore.account,
      receiver: authStore.account,
      suggestedParams: params,
      note: new Uint8Array(Buffer.from(`asa.gold optin`))
    })
    const grouped = [tx]

    console.log('tosign', grouped)

    const signer = getTransactionSigner(useWalletTransactionSigner)

    const txs = (await signer(grouped, [0])) as Uint8Array[]
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
    const { txid } = await algodClient.sendRawTransaction(txs).do()
    toast.add({
      severity: 'info',
      detail: 'Transaction is being submitted to the network',
      life: 5000
    })
    await algosdk.waitForConfirmation(algodClient, txid, 4)
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
  <Card :class="props.class" class="bg-white/90 p-2">
    <template #content>
      <h2 class="text-sm font-bold mb-1">Account info</h2>
      <div v-if="authStore.isAuthenticated" class="m-2 p-1">
        <div class="flex flex-col md:flex-row md:items-center mb-4">
          <label class="w-full md:w-1/5 mb-2 md:mb-0 cursor-pointer" @click="loadAccountInfo">
            Account
          </label>
          <div class="w-full md:w-4/5">
            <AlgorandAddress :address="authStore.account"></AlgorandAddress>
          </div>
        </div>
        <div class="flex flex-col md:flex-row md:items-center mb-4">
          <label class="w-full md:w-1/5 mb-2 md:mb-0 cursor-pointer" @click="loadAccountInfo">
            {{ store.state.pair.asset.name }}
          </label>
          <div class="w-full md:w-4/5" v-if="state.assetOptedIn">
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
          <div class="w-full md:w-4/5" v-else>
            <Button size="small" class="p-1" @click="optIn(store.state.pair.asset.assetId)">
              Open {{ store.state.pair.asset.name }} account
            </Button>
          </div>
        </div>
        <div class="flex flex-col md:flex-row md:items-center mb-4">
          <label class="w-full md:w-1/5 mb-2 md:mb-0">
            {{ store.state.pair.currency.name }}
          </label>
          <div class="w-full md:w-4/5" v-if="state.currencyOptedIn">
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
          <div class="w-full md:w-4/5" v-else>
            <Button size="small" class="p-1" @click="optIn(store.state.pair.currency.assetId)">
              Open {{ store.state.pair.currency.name }} account
            </Button>
          </div>
        </div>
        <div
          class="flex flex-col md:flex-row md:items-center mb-4"
          v-if="store.state.pair.asset.code != 'ALGO' && store.state.pair.currency.code != 'ALGO'"
        >
          <label class="w-full md:w-1/5 mb-2 md:mb-0">
            {{ algoAsset?.name }}
          </label>
          <div class="w-full md:w-4/5">
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
        <Button class="w-full" @click="store.state.forceAuth = true"> Authenticate please </Button>
      </div>
    </template>
  </Card>
</template>
<style></style>
