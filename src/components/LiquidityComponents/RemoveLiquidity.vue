<script setup lang="ts">
import Card from 'primevue/card'
import { useAppStore } from '@/stores/app'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import InputGroup from 'primevue/inputgroup'
import InputGroupAddon from 'primevue/inputgroupaddon'
import InputNumber from 'primevue/inputnumber'
import Slider from 'primevue/slider'
import { onMounted, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  BiatecClammPoolClient,
  clammAddLiquiditySender,
  clammBootstrapSender,
  clammCreateSender,
  clammRemoveLiquiditySender,
  clientBiatecClammPool,
  getPools,
  type AmmStatus,
  type FullConfig
} from 'biatec-concentrated-liquidity-amm'
import getAlgodClient from '@/scripts/algo/getAlgodClient'
import type { Transaction } from 'algosdk'
import algosdk, { makeAssetTransferTxnWithSuggestedParamsFromObject } from 'algosdk'
import { AssetsService } from '@/service/AssetsService'
import { useAVMAuthentication } from 'algorand-authentication-component-vue'
import { useNetwork, useWallet } from '@txnlab/use-wallet-vue'
import type { TransactionSignerAccount } from '@algorandfoundation/algokit-utils/types/account'
import { AlgoAmount } from '@algorandfoundation/algokit-utils/types/amount'
import { useRoute, useRouter } from 'vue-router'

const { authStore, getTransactionSigner } = useAVMAuthentication()
const { activeNetworkConfig } = useNetwork()
const { transactionSigner: useWalletTransactionSigner } = useWallet()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const store = useAppStore()
const props = defineProps<{
  class?: string
}>()
const { t } = useI18n()
const state = reactive({
  withdrawPercent: 50,
  pool: null as AmmStatus | null,
  lpToken: 0n,
  userBalance: 0n,
  withdrawAmount: 0n
})

onMounted(async () => {
  await loadPool()
})
watch(
  () => route?.params?.assetCode,
  async () => {
    await loadPool()
  }
)
watch(
  () => route?.params?.currencyCode,
  async () => {
    await loadPool()
  }
)
watch(
  () => authStore.isAuthenticated,
  async (isAuthenticated) => {
    if (isAuthenticated) {
      await loadPool()
    } else {
      state.pool = null
      state.lpToken = 0n
      state.userBalance = 0n
      state.withdrawAmount = 0n
    }
  }
)
watch(
  () => route.params.ammAppId,
  async (isAuthenticated) => {
    if (isAuthenticated) {
      await loadPool()
    } else {
      state.pool = null
      state.lpToken = 0n
      state.userBalance = 0n
      state.withdrawAmount = 0n
    }
  }
)
const loadPool = async () => {
  try {
    if (!authStore.isAuthenticated) return
    if (!store.state.clientConfig)
      throw new Error(t('components.removeLiquidity.errorClientNotInitialized'))
    const ammAppId = route.params.ammAppId as string
    const dummyAddress = 'TESTNTTTJDHIF5PJZUBTTDYYSKLCLM6KXCTWIOOTZJX5HO7263DPPMM2SU'
    const dummyTransactionSigner = async (
      txnGroup: algosdk.Transaction[],
      indexesToSign: number[]
    ): Promise<Uint8Array[]> => {
      console.log('transactionSigner', txnGroup, indexesToSign)
      return [] as Uint8Array[]
    }
    const biatecClammPoolClient = new BiatecClammPoolClient({
      algorand: store.state.clientConfig.algorand,
      appId: BigInt(ammAppId),
      defaultSender: dummyAddress,
      defaultSigner: dummyTransactionSigner
    })
    const stateGlobal = await biatecClammPoolClient.state.global.getAll()
    state.lpToken = stateGlobal.assetLp ?? 0n

    if (stateGlobal.assetA != undefined && stateGlobal.assetB != undefined && stateGlobal.assetLp) {
      state.pool = await biatecClammPoolClient.status({
        args: {
          appBiatecConfigProvider: store.state.clientConfig.appId,
          assetA: stateGlobal.assetA,
          assetB: stateGlobal.assetB,
          assetLp: stateGlobal.assetLp
        }
      })
    } else {
      throw new Error(t('components.removeLiquidity.errorPoolAssetsNotFound'))
    }

    const accountInfo = await biatecClammPoolClient.algorand.client.algod
      .accountInformation(authStore.account)
      .do()
    state.userBalance =
      accountInfo.assets?.find((asset) => asset.assetId === stateGlobal.assetLp)?.amount ?? 0n

    calculateWithdrawAmount()
  } catch (err) {
    console.error('Error loading pool:', err)
    toast.add({
      severity: 'error',
      detail: err instanceof Error ? err.message : String(err),
      life: 5000
    })
  }
}
const calculateWithdrawAmount = () => {
  state.withdrawAmount = BigInt(
    Math.floor((Number(state.userBalance) * state.withdrawPercent) / 100)
  )
}
watch(
  () => state.withdrawPercent,
  () => {
    calculateWithdrawAmount()
  }
)
const removeLiquidityClick = async () => {
  try {
    console.log(
      'store.state.assetCode,store.state.currencyCode',
      store.state.assetCode,
      store.state.currencyCode
    )
    if (!store.state.clientConfig || !store.state.clientIdentity) {
      throw new Error(t('components.removeLiquidity.errorClientNotInitialized'))
    }
    if (state.pool?.assetA === undefined || state.pool?.assetB === undefined || !state.lpToken) {
      throw new Error(t('components.removeLiquidity.errorPoolAssetsNotFound'))
    }
    const signer = getTransactionSigner(useWalletTransactionSigner)
    const account: TransactionSignerAccount = {
      addr: algosdk.decodeAddress(authStore.account),
      signer: signer
    }
    const ammAppId = route.params.ammAppId as string
    const biatecClammPoolClient = new BiatecClammPoolClient({
      algorand: store.state.clientConfig.algorand,
      appId: BigInt(ammAppId),
      defaultSender: account.addr,
      defaultSigner: account.signer
    })
    await clammRemoveLiquiditySender({
      algod: store.state.clientConfig.algorand.client.algod,
      account: account,
      appBiatecConfigProvider: store.state.clientConfig.appId,
      appBiatecIdentityProvider: store.state.clientIdentity.appId,
      assetA: state.pool?.assetA,
      assetB: state.pool?.assetB,
      assetLp: state.lpToken,
      clientBiatecClammPool: biatecClammPoolClient,
      lpToSend: state.withdrawAmount
    })

    toast.add({
      severity: 'info',
      detail: t('components.removeLiquidity.liquidityRemoved'),
      life: 5000
    })
    store.state.refreshMyLiquidity = true
    router.push(
      '/liquidity/' + store.state.env + '/' + store.state.assetCode + '/' + store.state.currencyCode
    )
  } catch (err) {
    console.error('Error adding liquidity:', err)
    toast.add({
      severity: 'error',
      detail: err instanceof Error ? err.message : String(err),
      life: 5000
    })
  }
}
</script>
<template>
  <Card :class="props.class">
    <template #content>
      <h2>{{ t('components.removeLiquidity.title') }}</h2>

      <h3>{{ t('components.removeLiquidity.howManyPercent') }}</h3>
      <div class="m-2">
        <Slider
          v-model="state.withdrawPercent"
          class="w-full my-3"
          :step="0.001"
          :max-fraction-digits="3"
          :min="0"
          :max="100"
        />
      </div>
      <InputGroup>
        <InputNumber
          v-model="state.withdrawPercent"
          :max-fraction-digits="3"
          :min="0"
          :max="100"
          :step="0.001"
          show-buttons
        ></InputNumber>
        <InputGroupAddon class="w-12rem">
          <div class="px-3">{{ t('components.removeLiquidity.percent') }}</div>
        </InputGroupAddon>
        <Button @click="state.withdrawPercent = 100">{{
          t('components.removeLiquidity.max')
        }}</Button>
      </InputGroup>
      <div class="my-4">
        <h3>{{ t('components.removeLiquidity.lpToken', { lpToken: state.lpToken }) }}</h3>
        <div class="my-2" v-if="state.userBalance > 0n">
          {{ t('components.removeLiquidity.amountToWithdraw') }}
          {{ Number(state.withdrawAmount).toLocaleString() }} /
          {{ Number(state.userBalance).toLocaleString() }}
        </div>
        <div class="my-2" v-else>{{ t('components.removeLiquidity.tokenNotFound') }}</div>
      </div>

      <Button v-if="!authStore.isAuthenticated" @click="store.state.forceAuth = true">
        {{ t('components.removeLiquidity.authenticate') }}
      </Button>
      <Button
        v-else
        @click="removeLiquidityClick"
        class="my-2"
        :disabled="state.withdrawAmount == 0n"
        >{{ t('components.removeLiquidity.removeLiquidity') }}</Button
      >
    </template>
  </Card>
</template>
<style></style>
