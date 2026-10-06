<script setup lang="ts">
import Card from 'primevue/card'
import { useAppStore } from '../../stores/app'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import AuthenticateButton from '@/components/AuthenticateButton.vue'
import InputGroup from 'primevue/inputgroup'
import SymbolAddon from '@/components/SymbolAddon.vue'
import InputNumber from 'primevue/inputnumber'
import Slider from 'primevue/slider'
import { computed, onMounted, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  BiatecClammPoolClient,
  clammSwapSender,
  type AmmStatus
} from 'biatec-concentrated-liquidity-amm'
import algosdk from 'algosdk'
import { AssetsService } from '../../service/AssetsService'
import { useAVMAuthentication } from 'algorand-authentication-component-vue'
import type { TransactionSignerAccount } from '@algorandfoundation/algokit-utils/types/account'
import { useRoute, useRouter } from 'vue-router'
import type { IAsset } from '../../interface/IAsset'
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
  swapPercent: 0,
  pool: null as AmmStatus | null,
  lpToken: 0n,
  userBalanceA: 0n,
  userBalanceB: 0n,
  poolBalanceA: 0n,
  poolBalanceB: 0n,
  maxA: 0,
  maxB: 0,
  // True once accountInfo has been fetched successfully at least once for the
  // current pool load. While false, maxA/maxB are not trustworthy (still their
  // stale/zero defaults) - see the `max` computed below, which must not clamp the
  // swap input to 0 in that case (that would make it impossible to type ANY
  // amount, even though the user may well hold the asset).
  balancesLoaded: false,
  swapAmountFrom: 0,
  quoteToReceive: null as bigint | null,
  direction: null as 'AtoB' | 'BtoA' | null,
  assetA: undefined as undefined | IAsset,
  assetB: undefined as undefined | IAsset,
  // Raw on-chain asset ids for the pool, set directly from stateGlobal (unlike
  // assetA/assetB above, which go through AssetsService.getAssetById and can be
  // undefined for a pool asset outside its curated catalog) - used wherever an
  // account-holding lookup needs the real id, never the catalog-resolved asset.
  assetAId: 0n,
  assetBId: 0n,
  // True once loadPool() has thrown and given up (state.pool stays null). Lets
  // the isAuthenticated watcher tell "still loading" apart from "failed, needs
  // a retry" when it sees a null state.pool.
  poolLoadFailed: false,
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
    // Pool/asset data is public and already loaded; only the account-specific
    // balances need a real reload, via loadAccountBalances() rather than the
    // full loadPool() (which would needlessly re-fetch the same pool config).
    if (isAuthenticated) {
      if (!state.pool) {
        // Either the initial/route-driven loadPool() is still in flight (e.g. a
        // persisted session resolves a tick after mount) - it ends with its own
        // loadAccountBalances(stateGlobal.assetA, stateGlobal.assetB) using the
        // freshly-fetched ids, so there's nothing to do here - or it already
        // failed and gave up (poolLoadFailed), in which case nothing else will
        // ever retry it; do that now so signing in after a transient load error
        // doesn't leave the form permanently stuck at its zero defaults.
        if (state.poolLoadFailed) {
          await loadPool()
        }
        return
      }
      await loadAccountBalances(state.assetAId, state.assetBId)
    } else {
      state.userBalanceA = 0n
      state.userBalanceB = 0n
      state.balancesLoaded = false
      state.swapAmountFrom = 0
      state.swapPercent = 0
      state.maxA = 0
      state.maxB = 0
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
// algod's JS client has returned account holdings under both 'asset-id'
// (older/REST-style) and 'assetId' (newer SDK) keys depending on SDK version -
// reading only one silently misses every holding when the other shape is what's
// actually returned, which is exactly what made this show max=0 for accounts
// that DO hold the asset. Same fallback pattern already proven in
// AddLiquidity.vue's loadBalances.
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

// Only the account-specific balances (and the maxA/maxB they feed into) depend
// on auth state - the pool/asset data passed in here is public and may already
// be loaded, so this never re-fetches it. Called both from loadPool() (initial
// load / route changes) and directly on login (skipping the pool re-fetch).
const loadAccountBalances = async (assetAId: bigint, assetBId: bigint) => {
  state.balancesLoaded = false
  if (!authStore.isAuthenticated || !authStore.account || !store.state.clientConfig) {
    state.userBalanceA = 0n
    state.userBalanceB = 0n
  } else {
    // Deliberately a SEPARATE try/catch from the pool load: a balance-query
    // failure here must not prevent the pool itself (already loaded) from being
    // usable, and must not silently leave userBalanceA/B at a stale/zero value
    // that then gets treated as "confirmed zero balance" - see balancesLoaded.
    try {
      const accountInfo = await store.state.clientConfig.algorand.client.algod
        .accountInformation(authStore.account)
        .do()

      if (assetAId > 0n) {
        const holding = accountInfo.assets?.find((asset) => extractAssetId(asset) === assetAId)
        state.userBalanceA = holding ? extractAmount(holding) : 0n
      } else {
        state.userBalanceA = accountInfo.amount ?? 0n
      }
      if (assetBId > 0n) {
        const holding = accountInfo.assets?.find((asset) => extractAssetId(asset) === assetBId)
        state.userBalanceB = holding ? extractAmount(holding) : 0n
      } else {
        state.userBalanceB = accountInfo.amount ?? 0n
      }
      state.balancesLoaded = true
    } catch (err) {
      console.error('Error loading account balances for swap:', err)
      toast.add({
        severity: 'warn',
        detail: t('components.poolSwap.errorLoadBalances'),
        life: 5000
      })
      // Leave balancesLoaded=false: the `max` computed treats that as "unknown",
      // not "zero", so the amount input stays usable instead of being clamped shut.
    }
  }

  if (state.pool) {
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
  }

  calculateSwapAmount()
}

const loadPool = async () => {
  try {
    state.poolLoadFailed = false
    if (!store.state.clientConfig)
      throw new Error(t('components.poolSwap.errorClientNotInitialized'))
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
    state.assetA = AssetsService.getAssetById(stateGlobal.assetA ?? 0n, store.state.env)
    state.assetB = AssetsService.getAssetById(stateGlobal.assetB ?? 0n, store.state.env)
    if (
      stateGlobal.assetA !== undefined &&
      stateGlobal.assetB !== undefined &&
      stateGlobal.assetLp
    ) {
      state.clientDummy = biatecClammPoolClient
      state.assetAId = stateGlobal.assetA
      state.assetBId = stateGlobal.assetB
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
      throw new Error(t('components.poolSwap.errorPoolAssetsNotFound'))
    }

    await loadAccountBalances(stateGlobal.assetA, stateGlobal.assetB)
  } catch (err) {
    // A pool switch (ammAppId route change) can fail after assetAId/assetBId were
    // already written for the NEW pool but before state.pool itself is (re)set -
    // without this, a stale state.pool from a DIFFERENT, previously-loaded pool
    // would be left paired with the new pool's ids, and a submit built from that
    // mismatched pair would target the wrong pool. Null it out so every guard
    // that checks state.pool (including the isAuthenticated watcher's retry
    // logic and executeSwapClick's own submit guard) correctly treats this as
    // "no pool loaded" rather than "the old pool is still valid."
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

let quoteTimeout: ReturnType<typeof setTimeout> | null = null

const max = computed(() => {
  if (state.direction === 'AtoB') {
    return state.maxA
  } else if (state.direction === 'BtoA') {
    return state.maxB
  }
  return 0
})

// Upper bound actually applied to the amount input. A computed max of 0 is
// ambiguous: it means either "you genuinely hold none of this asset" (a real cap
// worth enforcing) or "we don't know your balance yet / the query just failed"
// (nothing to enforce - forcing the input to 0 in that case would make it
// impossible to type ANY amount even though the user may well hold the asset,
// which is exactly the bug this guards against). Only apply the cap once balances
// have actually loaded successfully; otherwise leave the input unrestricted.
const inputMax = computed(() => (state.balancesLoaded && max.value > 0 ? max.value : undefined))
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
  // assetA/assetB must be resolved (with real decimals) before computing inAmount -
  // maxDigits falls back to 0 when they aren't, which would silently scale the
  // input 10^6x too small (e.g. treating "1 USDC" as 1 microUSDC) instead of
  // failing loudly. That previously produced either a bogus near-zero quote or an
  // SDK error swallowed by the unguarded setTimeout below (see watcher).
  if (!state.assetA || !state.assetB) {
    throw new Error(t('components.poolSwap.errorAssetsNotResolved'))
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
      try {
        await calculateQuoteAsync()
      } catch (err) {
        // Without this, a failure here (bad SDK input, network error, ...) left
        // quoteToReceive permanently null with no explanation - executeSwapClick
        // would then just keep reporting "Quote not available, please wait for the
        // calculation to finish." forever, even though it never will finish.
        console.error('Error calculating swap quote:', err)
        toast.add({
          severity: 'error',
          detail: err instanceof Error ? err.message : String(err),
          life: 5000
        })
      }
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

// Dedicated handler for the "Max" button rather than binding it straight to
// `state.swapPercent = 100`: when the balance query failed or hasn't completed yet
// (balancesLoaded false), max.value is not a real balance and silently writing it
// into swapAmountFrom would zero out the field the user is trying to fill in.
// Warn instead, and leave whatever the user already typed untouched.
const setMaxSwapAmount = () => {
  // balancesLoaded never becomes true for an unauthenticated visitor (there is no
  // account to query) - that's not a failed load, so don't show the "could not
  // load your balance" error for it; prompt for auth instead, same as the actual
  // swap submit button already does.
  if (!authStore.isAuthenticated) {
    store.state.forceAuth = true
    return
  }
  if (!state.balancesLoaded) {
    toast.add({
      severity: 'warn',
      detail: t('components.poolSwap.errorLoadBalances'),
      life: 5000
    })
    return
  }
  state.swapPercent = 100
}
const executeSwapClick = async () => {
  try {
    console.log(
      'store.state.assetCode,store.state.currencyCode',
      store.state.assetCode,
      store.state.currencyCode
    )
    if (!store.state.clientConfig || !store.state.clientIdentity || !store.state.clientPP) {
      throw new Error(t('components.poolSwap.errorClientNotInitialized'))
    }
    if (state.pool?.assetA === undefined || state.pool?.assetB === undefined || !state.lpToken) {
      throw new Error(t('components.poolSwap.errorPoolAssetsNotFound'))
    }
    // `!state.quoteToReceive` would also be true for a quote that legitimately
    // resolved to 0n (e.g. an amount too small to produce any output at the
    // current price) - that's a different, more specific problem than "still
    // calculating" and deserves its own message rather than being told to wait
    // for a calculation that has already finished.
    if (state.quoteToReceive === null) {
      throw new Error(t('components.poolSwap.errorQuoteNotAvailable'))
    }
    if (state.quoteToReceive <= 0n) {
      throw new Error(t('components.poolSwap.errorQuoteZero'))
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
      minimumToReceive: store.state.slippageProtection
        ? BigInt(Math.floor(Number(state.quoteToReceive) * 0.99))
        : 0n,
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
      minimumToReceive: store.state.slippageProtection
        ? BigInt(Math.floor(Number(state.quoteToReceive) * 0.99))
        : 0n,
      clientBiatecClammPool: biatecClammPoolClient
    })

    toast.add({
      severity: 'info',
      detail: t('components.poolSwap.swapSuccess', { ret }),
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
    console.error('Error executing swap:', err)
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
      <h2>{{ t('components.poolSwap.title') }}</h2>
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
        {{
          t('components.poolSwap.swapAtoB', {
            assetA: state.assetA?.name,
            assetB: state.assetB?.name
          })
        }}
      </Button>
      <Button
        class="m-2"
        :severity="!state.direction || state.direction == 'BtoA' ? 'primary' : 'secondary'"
        @click="setBtoA"
      >
        {{
          t('components.poolSwap.swapBtoA', {
            assetA: state.assetA?.name,
            assetB: state.assetB?.name
          })
        }}
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
            inputId="swapAmountFrom"
            data-cy="swap-amount"
            :max-fraction-digits="maxDigits"
            :min="0"
            :max="inputMax"
            :step="step"
            show-buttons
          ></InputNumber>
          <SymbolAddon
            :text="(state.direction == 'AtoB' ? state.assetA?.symbol : state.assetB?.symbol) ?? ''"
          />
          <Button @click="setMaxSwapAmount">{{ t('components.poolSwap.max') }}</Button>
        </InputGroup>
        <div class="my-4" v-if="state.direction == 'AtoB'">
          <h3>{{ t('components.poolSwap.send', { asset: state.assetA?.name }) }}</h3>
          <div class="my-2" v-if="state.userBalanceA > 0n">
            {{ t('components.poolSwap.amountToSend') }}
            {{ Number(state.swapAmountFrom).toLocaleString() }}
            {{ state.assetA?.symbol }}
          </div>
          <div class="my-2" v-else-if="!authStore.isAuthenticated">
            {{ t('components.poolSwap.authenticate') }}
          </div>
          <div class="my-2" v-else>{{ t('components.poolSwap.tokenNotFound') }}</div>

          <h3>{{ t('components.poolSwap.receive', { asset: state.assetB?.name }) }}</h3>
          <!-- quoteToReceive is bigint | null: null means "still calculating", but a
               legitimately computed 0n is falsy too - a plain truthy v-if here showed
               "Fetching the quote" forever for a genuine (if unswappable) zero quote,
               with no error and no way out. Check for null specifically instead. -->
          <div class="my-2" v-if="state.quoteToReceive !== null">
            {{ t('components.poolSwap.amountToReceive') }}
            {{
              (Number(state.quoteToReceive) / 10 ** (state.assetB?.decimals ?? 0)).toLocaleString()
            }}
            {{ state.assetB?.symbol }}
          </div>
          <div class="my-2" v-else-if="state.swapAmountFrom">
            {{ t('components.poolSwap.fetchingQuote') }}
          </div>
        </div>

        <div class="my-4" v-if="state.direction == 'BtoA'">
          <h3>{{ t('components.poolSwap.send', { asset: state.assetB?.name }) }}</h3>
          <div class="my-2" v-if="state.userBalanceB > 0n">
            {{ t('components.poolSwap.amountToSend') }}
            {{ Number(state.swapAmountFrom).toLocaleString() }}
            {{ state.assetB?.symbol }}
          </div>
          <div class="my-2" v-else-if="!authStore.isAuthenticated">
            {{ t('components.poolSwap.authenticate') }}
          </div>
          <div class="my-2" v-else>{{ t('components.poolSwap.tokenNotFound') }}</div>

          <h3>{{ t('components.poolSwap.receive', { asset: state.assetA?.name }) }}</h3>
          <div class="my-2" v-if="state.quoteToReceive !== null">
            {{ t('components.poolSwap.amountToReceive') }}
            {{
              (Number(state.quoteToReceive) / 10 ** (state.assetA?.decimals ?? 0)).toLocaleString()
            }}
            {{ state.assetA?.symbol }}
          </div>
          <div class="my-2" v-else-if="state.swapAmountFrom">
            {{ t('components.poolSwap.fetchingQuote') }}
          </div>
        </div>

        <AuthenticateButton
          v-if="!authStore.isAuthenticated"
          :label="t('components.poolSwap.authenticate')"
          data-cy="pool-swap-authenticate"
        />
        <Button
          v-else
          @click="executeSwapClick"
          class="my-2"
          data-cy="swap-execute"
          :disabled="state.swapAmountFrom == 0"
        >
          {{ t('components.poolSwap.executeSwap') }}
        </Button>
      </div>
    </template>
  </Card>
</template>
<style></style>
