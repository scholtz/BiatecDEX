<script setup lang="ts">
import Card from 'primevue/card'
import { useAppStore } from '@/stores/app'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import AuthenticateButton from '@/components/AuthenticateButton.vue'
import InputGroup from 'primevue/inputgroup'
import SymbolAddon from '@/components/SymbolAddon.vue'
import InputNumber from 'primevue/inputnumber'
import Slider from 'primevue/slider'
import { onMounted, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  BiatecClammPoolClient,
  clammRemoveLiquiditySender,
  type AmmStatus
} from 'biatec-concentrated-liquidity-amm'
import algosdk from 'algosdk'
import { useAVMAuthentication } from 'algorand-authentication-component-vue'
import type { TransactionSignerAccount } from '@algorandfoundation/algokit-utils/types/account'
import { useRoute, useRouter } from 'vue-router'
import type { RawAssetHolding } from '../../types/algorand'

const { authStore, sign: signer } = useAVMAuthentication()
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
  withdrawAmount: 0n,
  // True once loadPool() has thrown and given up (state.pool stays null). Lets
  // the isAuthenticated watcher tell "still loading" apart from "failed, needs
  // a retry" when it sees a null state.pool.
  poolLoadFailed: false
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
    // Pool/asset data is public and already loaded; only the LP-token balance
    // needs a real reload, via loadUserBalance() rather than the full loadPool()
    // (which would needlessly re-fetch the same pool config).
    if (isAuthenticated) {
      if (!state.pool) {
        // Either the initial/route-driven loadPool() is still in flight (e.g. a
        // persisted session resolves a tick after mount) - it ends with its own
        // loadUserBalance(state.lpToken) using the freshly-fetched id, so there's
        // nothing to do here - or it already failed and gave up
        // (poolLoadFailed), in which case nothing else will ever retry it; do
        // that now so signing in after a transient load error doesn't leave the
        // form permanently stuck at its zero defaults.
        if (state.poolLoadFailed) {
          await loadPool()
        }
        return
      }
      await loadUserBalance(state.lpToken)
    } else {
      state.userBalance = 0n
      state.withdrawPercent = 0
      calculateWithdrawAmount()
    }
  }
)
watch(
  () => route.params.ammAppId,
  async () => {
    await loadPool()
  }
)

// algod's JS client has returned account holdings under both 'asset-id'
// (older/REST-style) and 'assetId' (newer SDK) keys depending on SDK version -
// reading only one silently misses the LP token holding when the other shape is
// what's actually returned. Same fallback pattern already proven in
// AddLiquidity.vue's loadBalances and PoolSwap.vue's loadAccountBalances.
const extractAssetId = (a: RawAssetHolding): bigint | undefined => {
  const id = a?.['asset-id'] ?? a?.assetId
  try {
    if (typeof id === 'bigint') return id
    if (typeof id === 'number') return BigInt(id)
  } catch {
    return undefined
  }
  return undefined
}
const extractAmount = (a: RawAssetHolding): bigint => {
  const amt = a?.amount
  if (typeof amt === 'bigint') return amt
  if (typeof amt === 'number') {
    try {
      return BigInt(amt)
    } catch {
      return 0n
    }
  }
  return 0n
}

// Only the LP-token balance depends on auth state - the lpTokenId passed in here
// is public and may already be loaded, so this never re-fetches the pool itself.
// Called both from loadPool() (initial load / route changes) and directly on login
// (skipping the pool re-fetch).
const loadUserBalance = async (lpTokenId: bigint) => {
  if (authStore.isAuthenticated && authStore.account && store.state.clientConfig) {
    try {
      const accountInfo = await store.state.clientConfig.algorand.client.algod
        .accountInformation(authStore.account)
        .do()
      const holding = accountInfo.assets?.find((asset) => extractAssetId(asset) === lpTokenId)
      state.userBalance = holding ? extractAmount(holding) : 0n
    } catch (err) {
      // Called directly from the isAuthenticated watcher (outside loadPool's own
      // try/catch) as well as from loadPool - a transient algod failure here must
      // surface a warning, not an unhandled rejection, either way.
      console.error('Error loading LP token balance:', err)
      toast.add({
        severity: 'warn',
        detail: t('components.removeLiquidity.errorLoadBalances'),
        life: 5000
      })
    }
  } else {
    state.userBalance = 0n
  }
  calculateWithdrawAmount()
}

const loadPool = async () => {
  try {
    state.poolLoadFailed = false
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

    await loadUserBalance(state.lpToken)
  } catch (err) {
    // A pool switch (ammAppId route change) can fail after state.lpToken was
    // already written for the NEW pool but before state.pool itself is (re)set -
    // without this, a stale state.pool from a DIFFERENT, previously-loaded pool
    // would be left paired with the new pool's lpToken, and a submit built from
    // that mismatched pair would target the wrong pool. Null it out so every
    // guard that checks state.pool (including the isAuthenticated watcher's
    // retry logic and removeLiquidityClick's own submit guard) correctly treats
    // this as "no pool loaded" rather than "the old pool is still valid."
    state.pool = null
    state.poolLoadFailed = true
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
const setMaxWithdrawPercent = () => {
  // An unauthenticated visitor has no balance to withdraw a percentage of -
  // prompt for auth instead of silently setting the slider to 100% of zero,
  // matching PoolSwap.vue's setMaxSwapAmount.
  if (!authStore.isAuthenticated) {
    store.state.forceAuth = true
    return
  }
  state.withdrawPercent = 100
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
    // The account's balances changed: any mounted panel (Add Liquidity's max / deposit) reloads them.
    store.state.refreshAccountBalance = true
    store.state.refreshPoolsLiquidity = true
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
          inputId="withdrawPercent"
          data-cy="remove-percent"
          :max-fraction-digits="3"
          :min="0"
          :max="100"
          :step="0.001"
          show-buttons
        ></InputNumber>
        <SymbolAddon :text="t('components.removeLiquidity.percent')" />
        <Button @click="setMaxWithdrawPercent">{{ t('components.removeLiquidity.max') }}</Button>
      </InputGroup>
      <div class="my-4">
        <h3>{{ t('components.removeLiquidity.lpToken', { lpToken: state.lpToken }) }}</h3>
        <div class="my-2" v-if="state.userBalance > 0n">
          {{ t('components.removeLiquidity.amountToWithdraw') }}
          {{ Number(state.withdrawAmount).toLocaleString() }} /
          {{ Number(state.userBalance).toLocaleString() }}
        </div>
        <div class="my-2" v-else-if="!authStore.isAuthenticated">
          {{ t('components.removeLiquidity.authenticate') }}
        </div>
        <div class="my-2" v-else>{{ t('components.removeLiquidity.tokenNotFound') }}</div>
      </div>

      <AuthenticateButton
        v-if="!authStore.isAuthenticated"
        :label="t('components.removeLiquidity.authenticate')"
        data-cy="remove-liquidity-authenticate"
      />
      <Button
        v-else
        @click="removeLiquidityClick"
        class="my-2"
        data-cy="remove-submit"
        :disabled="state.withdrawAmount == 0n"
        >{{ t('components.removeLiquidity.removeLiquidity') }}</Button
      >
    </template>
  </Card>
</template>
<style></style>
