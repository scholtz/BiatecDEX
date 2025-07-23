<script setup lang="ts">
import Card from 'primevue/card'
import { useAppStore } from '@/stores/app'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import InputGroup from 'primevue/inputgroup'
import InputGroupAddon from 'primevue/inputgroupaddon'
import InputNumber from 'primevue/inputnumber'
import Slider from 'primevue/slider'
import { computed, onMounted, reactive, watch } from 'vue'
import {
  BiatecClammPoolClient,
  clammAddLiquiditySender,
  clammBootstrapSender,
  clammCreateSender,
  clammRemoveLiquiditySender,
  clammSwapSender,
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
import type { IAsset } from '@/interface/IAsset'
import { stat } from 'fs'

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
const state = reactive({
  swapPercent: 0,
  pool: null as AmmStatus | null,
  lpToken: 0n,
  userBalanceA: 0n,
  userBalanceB: 0n,
  poolBalanceA: 0n,
  poolBalanceB: 0n,
  maxA: 0,
  maxB: 0,
  swapAmountFrom: 0,
  quoteToReceive: null as bigint | null,
  direction: null as 'AtoB' | 'BtoA' | null,
  assetA: undefined as undefined | IAsset,
  assetB: undefined as undefined | IAsset,
  clientDummy: null as BiatecClammPoolClient | null
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
      state.userBalanceA = 0n
      state.userBalanceB = 0n

      state.swapAmountFrom = 0
    }
  }
)
watch(
  () => route.params.ammAppId,
  async () => {
    state.direction = null
    await loadPool()
  }
)
const loadPool = async () => {
  try {
    if (!authStore.isAuthenticated) return
    if (!store.state.clientConfig) throw new Error('Client not initialized')
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
    state.assetA = AssetsService.getAssetById(stateGlobal.assetA ?? 0n)
    state.assetB = AssetsService.getAssetById(stateGlobal.assetB ?? 0n)
    if (
      stateGlobal.assetA !== undefined &&
      stateGlobal.assetB !== undefined &&
      stateGlobal.assetLp
    ) {
      state.clientDummy = biatecClammPoolClient
      state.pool = await biatecClammPoolClient.status({
        args: {
          appBiatecConfigProvider: store.state.clientConfig.appId,
          assetA: stateGlobal.assetA,
          assetB: stateGlobal.assetB,
          assetLp: stateGlobal.assetLp
        }
      })
      state.poolBalanceA =
        (state.pool.assetABalance * 10n ** BigInt(state.assetA?.decimals ?? 0n)) / 10n ** 9n
      state.poolBalanceB =
        (state.pool.assetBBalance * 10n ** BigInt(state.assetB?.decimals ?? 0n)) / 10n ** 9n
    } else {
      throw new Error('Pool assets not found in state')
    }

    const accountInfo = await biatecClammPoolClient.algorand.client.algod
      .accountInformation(authStore.account)
      .do()
    if (stateGlobal.assetA > 0n) {
      state.userBalanceA =
        accountInfo.assets?.find((asset) => asset.assetId === stateGlobal.assetA)?.amount ?? 0n
    } else {
      state.userBalanceA = accountInfo.amount ?? 0n
    }
    if (stateGlobal.assetB > 0n) {
      state.userBalanceB =
        accountInfo.assets?.find((asset) => asset.assetId === stateGlobal.assetB)?.amount ?? 0n
    } else {
      state.userBalanceB = accountInfo.amount ?? 0n
    }

    const priceMaxSqrtNum = Number(state.pool.priceMaxSqrt) / 1e9
    const priceMax = priceMaxSqrtNum * priceMaxSqrtNum

    const priceMinSqrtNum = Number(state.pool.priceMinSqrt) / 1e9
    const priceMin = priceMinSqrtNum * priceMinSqrtNum

    state.maxA =
      Math.min(Number(state.userBalanceA), Number(state.poolBalanceB) / priceMin) /
      10 ** (state.assetA?.decimals ?? 0)

    state.maxB =
      Math.min(Number(state.userBalanceB), Number(state.poolBalanceA) * priceMax) /
      10 ** (state.assetB?.decimals ?? 0)

    console.log('state.maxA, state.maxB', state.maxA, state.maxB, max.value)
    calculateSwapAmount()
  } catch (err) {
    console.error('Error loading pool:', err)
    toast.add({
      severity: 'error',
      detail: err instanceof Error ? err.message : String(err),
      life: 5000
    })
  }
}

let quoteTimeout: ReturnType<typeof setTimeout> | null = null

const max = computed(() => {
  if (state.direction === 'AtoB') {
    return state.maxA
  } else if (state.direction === 'BtoA') {
    return state.maxB
  }
  return 0
})
const step = computed(() => {
  if (state.direction === 'AtoB') {
    return 1 / 10 ** (state.assetA?.decimals ?? 0)
  } else if (state.direction === 'BtoA') {
    return 1 / 10 ** (state.assetB?.decimals ?? 0)
  }
  return 0
})
const maxDigits = computed(() => {
  if (state.direction === 'AtoB') {
    return state.assetA?.decimals ?? 0
  } else if (state.direction === 'BtoA') {
    return state.assetB?.decimals ?? 0
  }
  return 0
})

const calculateQuoteAsync = async () => {
  if (!state.clientDummy || !state.pool) {
    state.quoteToReceive = 0n
    return
  }
  if (state.direction === 'AtoB') {
    const quote = await state.clientDummy.calculateAssetBWithdrawOnAssetADeposit({
      args: {
        assetABalance: state.pool.assetABalance,
        assetBBalance: state.pool.assetBBalance,
        inAmount: Math.round(state.swapAmountFrom * 10 ** maxDigits.value),
        liquidity: state.pool.currentLiquidity,
        priceMaxSqrt: state.pool.priceMaxSqrt,
        priceMinSqrt: state.pool.priceMinSqrt
      }
    })
    state.quoteToReceive = BigInt(Math.floor(Math.min(Number(quote), Number(state.poolBalanceB))))
  } else if (state.direction === 'BtoA') {
    const quote = await state.clientDummy.calculateAssetAWithdrawOnAssetBDeposit({
      args: {
        assetABalance: state.pool.assetABalance,
        assetBBalance: state.pool.assetBBalance,
        inAmount: Math.round(state.swapAmountFrom * 10 ** maxDigits.value),
        liquidity: state.pool.currentLiquidity,
        priceMaxSqrt: state.pool.priceMaxSqrt,
        priceMinSqrt: state.pool.priceMinSqrt
      }
    })
    state.quoteToReceive = BigInt(Math.floor(Math.min(Number(quote), Number(state.poolBalanceA))))
  } else {
    state.quoteToReceive = 0n
  }
  console.log('calculateQuoteAsync', state.quoteToReceive, state.swapAmountFrom, maxDigits.value)
}

// Watch relevant state for changes and debounce calculation
watch(
  [
    () => state.clientDummy,
    () => state.pool,
    () => state.direction,
    () => state.swapAmountFrom,
    () => maxDigits.value
  ],
  () => {
    state.quoteToReceive = null
    if (quoteTimeout) clearTimeout(quoteTimeout)
    quoteTimeout = setTimeout(async () => {
      await calculateQuoteAsync()
    }, 1000)
  },
  { immediate: true }
)
const calculateSwapAmount = () => {
  state.swapAmountFrom = (max.value * state.swapPercent) / 100
}
watch(
  () => state.swapPercent,
  () => {
    calculateSwapAmount()
  }
)
const executeSwapClick = async () => {
  try {
    console.log(
      'store.state.assetCode,store.state.currencyCode',
      store.state.assetCode,
      store.state.currencyCode
    )
    if (!store.state.clientConfig || !store.state.clientIdentity || !store.state.clientPP) {
      throw new Error('Client not initialized')
    }
    if (state.pool?.assetA === undefined || state.pool?.assetB === undefined || !state.lpToken) {
      throw new Error('Pool assets not found')
    }
    if (!state.quoteToReceive) {
      throw new Error('Quote not available, please wait for the calculation to finish.')
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
    console.log('Executing swap with params:', {
      algod: store.state.clientConfig.algorand.client.algod,
      account: account,
      appBiatecConfigProvider: store.state.clientConfig.appId,
      appBiatecIdentityProvider: store.state.clientIdentity.appId,
      assetA: state.pool?.assetA,
      assetB: state.pool?.assetB,
      appBiatecPoolProvider: store.state.clientPP.appId,
      fromAmount: BigInt(
        Math.floor(
          state.swapAmountFrom *
            10 **
              (state.direction === 'AtoB'
                ? (state.assetA?.decimals ?? 0)
                : (state.assetB?.decimals ?? 0))
        )
      ),
      fromAsset: state.direction === 'AtoB' ? state.pool?.assetA : state.pool?.assetB,
      minimumToReceive: BigInt(Math.floor(Number(state.quoteToReceive) * 0.99)),
      clientBiatecClammPool: biatecClammPoolClient
    })
    const ret = await clammSwapSender({
      algod: store.state.clientConfig.algorand.client.algod,
      account: account,
      appBiatecConfigProvider: store.state.clientConfig.appId,
      appBiatecIdentityProvider: store.state.clientIdentity.appId,
      assetA: state.pool?.assetA,
      assetB: state.pool?.assetB,
      appBiatecPoolProvider: store.state.clientPP.appId,
      fromAmount: BigInt(
        Math.floor(
          state.swapAmountFrom *
            10 **
              (state.direction === 'AtoB'
                ? (state.assetA?.decimals ?? 0)
                : (state.assetB?.decimals ?? 0))
        )
      ),
      fromAsset: state.direction === 'AtoB' ? state.pool?.assetA : state.pool?.assetB,
      minimumToReceive: BigInt(Math.floor(Number(state.quoteToReceive) * 0.99)),
      clientBiatecClammPool: biatecClammPoolClient
    })

    toast.add({
      severity: 'info',
      detail: 'Swap executed successfully! ' + ret,
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
const setAtoB = async () => {
  state.direction = 'AtoB'
  state.swapAmountFrom = 0
  state.swapPercent = 0
  await loadPool()
}
const setBtoA = async () => {
  state.direction = 'BtoA'
  state.swapAmountFrom = 0
  state.swapPercent = 0
  await loadPool()
}
</script>
<template>
  <Card :class="props.class">
    <template #content>
      <h2>Direct AMM pool swap</h2>
      <!-- {{
        // JSON.stringify(state.pool, (_, value) =>
        //   typeof value === 'bigint' ? `${value.toString()}n` : value
        // )
      }} -->
      <Button
        class="my-2"
        :severity="!state.direction || state.direction == 'AtoB' ? 'primary' : 'secondary'"
        @click="setAtoB"
      >
        Swap {{ state.assetA?.name }} to {{ state.assetB?.name }}
      </Button>
      <Button
        class="m-2"
        :severity="!state.direction || state.direction == 'BtoA' ? 'primary' : 'secondary'"
        @click="setBtoA"
      >
        Swap {{ state.assetB?.name }} to {{ state.assetA?.name }}
      </Button>
      <div v-if="state.direction">
        <div class="m-2">
          <Slider
            v-model="state.swapPercent"
            class="w-full my-3"
            :step="0.001"
            :max-fraction-digits="3"
            :min="0"
            :max="100"
          />
        </div>
        <InputGroup>
          <InputNumber
            v-model="state.swapAmountFrom"
            :max-fraction-digits="maxDigits"
            :min="0"
            :max="max"
            :step="step"
            show-buttons
          ></InputNumber>
          <InputGroupAddon class="w-12rem">
            <div class="px-3" v-if="state.direction == 'AtoB'">
              {{ state.assetA?.symbol }}
            </div>
            <div class="px-3" v-if="state.direction == 'BtoA'">
              {{ state.assetB?.symbol }}
            </div>
          </InputGroupAddon>
          <Button @click="state.swapPercent = 100">Max</Button>
        </InputGroup>
        <div class="my-4" v-if="state.direction == 'AtoB'">
          <h3>Send {{ state.assetA?.name }}</h3>
          <div class="my-2" v-if="state.userBalanceA > 0n">
            Amount to send:
            {{ Number(state.swapAmountFrom).toLocaleString() }}
            {{ state.assetA?.symbol }}
          </div>
          <div class="my-2" v-else>We did not find this token in your account.</div>

          <h3>Receive {{ state.assetB?.name }}</h3>
          <div class="my-2" v-if="state.quoteToReceive">
            Amount to receive:
            {{
              (Number(state.quoteToReceive) / 10 ** (state.assetB?.decimals ?? 0)).toLocaleString()
            }}
            {{ state.assetB?.symbol }}
          </div>
          <div class="my-2" v-else-if="state.swapAmountFrom">Fetching the quote</div>
        </div>

        <div class="my-4" v-if="state.direction == 'BtoA'">
          <h3>Send {{ state.assetB?.name }}</h3>
          <div class="my-2" v-if="state.userBalanceB > 0n">
            Amount to send:
            {{ Number(state.swapAmountFrom).toLocaleString() }}
            {{ state.assetB?.symbol }}
          </div>
          <div class="my-2" v-else>We did not find this token in your account.</div>

          <h3>Receive {{ state.assetA?.name }}</h3>
          <div class="my-2" v-if="state.quoteToReceive">
            Amount to receive:
            {{
              (Number(state.quoteToReceive) / 10 ** (state.assetA?.decimals ?? 0)).toLocaleString()
            }}
            {{ state.assetA?.symbol }}
          </div>
          <div class="my-2" v-else-if="state.swapAmountFrom">Fetching the quote</div>
        </div>

        <Button v-if="!authStore.isAuthenticated" @click="store.state.forceAuth = true">
          Authenticate please
        </Button>
        <Button v-else @click="executeSwapClick" class="my-2" :disabled="state.swapAmountFrom == 0">
          Execute swap
        </Button>
      </div>
    </template>
  </Card>
</template>
<style></style>
