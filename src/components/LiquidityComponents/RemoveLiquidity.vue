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
import { computed, onMounted, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'

import {
  BiatecClammPoolClient,
  clammRemoveLiquiditySender,
  type AmmStatus
} from 'biatec-concentrated-liquidity-amm'
import algosdk from 'algosdk'
import { useAVMAuthentication } from 'algorand-authentication-component-vue'
import { useTransactionSigner } from '@/composables/useTransactionSigner'
import type { AlgorandClient } from '@algorandfoundation/algokit-utils'
import type { TransactionSignerAccount } from '@algorandfoundation/algokit-utils/types/account'
import { useRoute, useRouter } from 'vue-router'
import { getDummySigner } from '@/scripts/algo/getDummySigner'
import { fetchAssetAmounts } from '@/scripts/algo/accountAssetHoldings'
import FormattedNumber from '@/components/FormattedNumber.vue'
import { AssetsService } from '@/service/AssetsService'
import { fetchAssetStatsCached, isTradeApiConfigured } from '@/service/tradeApi'
import { estimateWithdrawal, toWholeUnits, usdValue } from '@/scripts/clamm/withdrawEstimate'

const { authStore } = useAVMAuthentication()
const signer = useTransactionSigner()
const toast = useToast()
const route = useRoute()
const router = useRouter()
const store = useAppStore()
const props = defineProps<{
  class?: string
}>()
const { t } = useI18n()
const DEFAULT_WITHDRAW_PERCENT = 50
const MAX_WITHDRAW_PERCENT = 100
const state = reactive({
  withdrawPercent: DEFAULT_WITHDRAW_PERCENT,
  pool: null as AmmStatus | null,
  lpToken: 0n,
  userBalance: 0n,
  withdrawAmount: 0n,
  // True once loadPool() has thrown and given up (state.pool stays null). Lets
  // the isAuthenticated watcher tell "still loading" apart from "failed, needs
  // a retry" when it sees a null state.pool.
  poolLoadFailed: false,
  // True once the LP balance was read successfully: only then does 0 mean "no position" (a failed
  // read must not lock the form - the error toast says an amount can still be entered).
  balanceLoaded: false,
  // A withdrawal is being prepared/signed: the button shows a spinner and ignores clicks.
  submitting: false,
  // Display metadata of the pool's two assets (symbol, decimals, USD price when known).
  assetA: null as PoolAssetMeta | null,
  assetB: null as PoolAssetMeta | null
})

interface PoolAssetMeta {
  assetId: bigint
  symbol: string
  /** Null when the asset's decimals could not be resolved: no preview rather than wrong amounts. */
  decimals: number | null
  priceUsd: number | null
}

// Quick percentage buttons shown under the percent input (Max is added after them).
const QUICK_PERCENTS = [1, 2, 10, 25, 50, 75] as const

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
      // Signing out parks the slider at 0 %: signing in brings the default back.
      if (state.withdrawPercent === 0) state.withdrawPercent = DEFAULT_WITHDRAW_PERCENT
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
      // Prices need a session: a visitor who signs in after the pool loaded gets them now.
      if (state.assetA && state.assetB)
        void loadUsdPrices(state.assetA.assetId, state.assetB.assetId)
    } else {
      state.userBalance = 0n
      state.balanceLoaded = false
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

// Only the LP-token balance depends on auth state - the lpTokenId passed in here
// is public and may already be loaded, so this never re-fetches the pool itself.
// Called both from loadPool() (initial load / route changes) and directly on login
// (skipping the pool re-fetch).
let balanceReadToken = 0
const loadUserBalance = async (lpTokenId: bigint) => {
  // Reads can overlap (sign-in watcher + pool load, account switch): only the newest may write.
  const readToken = ++balanceReadToken
  if (authStore.isAuthenticated && authStore.account && store.state.clientConfig) {
    state.balanceLoaded = false
    try {
      // One small per-asset lookup (works for accounts with any number of assets).
      const held = await fetchAssetAmounts(
        store.state.clientConfig.algorand.client.algod,
        authStore.account,
        [lpTokenId]
      )
      // Superseded by a load of another pool, or the user signed out, while algod was answering.
      if (
        readToken !== balanceReadToken ||
        lpTokenId !== state.lpToken ||
        !authStore.isAuthenticated
      )
        return
      state.userBalance = held.get(lpTokenId) ?? 0n
      state.balanceLoaded = true
    } catch (err) {
      // Called directly from the isAuthenticated watcher (outside loadPool's own
      // try/catch) as well as from loadPool - a transient algod failure here must
      // surface a warning, not an unhandled rejection, either way.
      if (readToken !== balanceReadToken || lpTokenId !== state.lpToken) return
      console.error('Error loading LP token balance:', err)
      // Never keep another pool's/account's balance: it would drive Max and the preview.
      state.userBalance = 0n
      toast.add({
        severity: 'warn',
        detail: t('components.removeLiquidity.errorLoadBalances'),
        life: 5000
      })
    }
  } else {
    state.userBalance = 0n
    state.balanceLoaded = false
  }
  calculateWithdrawAmount()
}

// The pool whose balance/asset data the form currently shows: a different one must not keep the
// previous pool's LP balance (it would drive Max and the preview) while the new data loads.
let loadedAmmAppId = ''
// The route watchers (asset, currency, pool id) can start several loads per navigation: only the
// newest may write state.
let poolLoadToken = 0
const loadPool = async () => {
  const token = ++poolLoadToken
  const isStale = () => token !== poolLoadToken
  try {
    state.poolLoadFailed = false
    const requestedAppId = String(route.params.ammAppId)
    if (requestedAppId !== loadedAmmAppId) {
      loadedAmmAppId = requestedAppId
      state.userBalance = 0n
      state.balanceLoaded = false
      // A percentage chosen for another pool (Max!) must not carry over to this one.
      state.withdrawPercent = DEFAULT_WITHDRAW_PERCENT
      // The previous pool's identity must not outlive the switch (late balance reads match on it).
      state.pool = null
      state.lpToken = 0n
      state.assetA = null
      state.assetB = null
      calculateWithdrawAmount()
    }
    if (!store.state.clientConfig)
      throw new Error(t('components.removeLiquidity.errorClientNotInitialized'))
    const biatecClammPoolClient = createReadClient(
      store.state.clientConfig.algorand,
      String(route.params.ammAppId)
    )
    const stateGlobal = await biatecClammPoolClient.state.global.getAll()
    if (isStale()) return
    state.lpToken = stateGlobal.assetLp ?? 0n

    let status: AmmStatus
    if (stateGlobal.assetA != undefined && stateGlobal.assetB != undefined && stateGlobal.assetLp) {
      status = await biatecClammPoolClient.status({
        args: {
          appBiatecConfigProvider: store.state.clientConfig.appId,
          assetA: stateGlobal.assetA,
          assetB: stateGlobal.assetB,
          assetLp: stateGlobal.assetLp
        }
      })
      if (isStale()) return
      state.pool = status
    } else {
      throw new Error(t('components.removeLiquidity.errorPoolAssetsNotFound'))
    }

    // Asset details and the LP balance are independent: read them in parallel. The details are
    // preview-only, so their failure must never fail the pool load itself.
    if (isStale()) return
    const assetsLoaded = loadPoolAssets(status.assetA, status.assetB).catch((err) =>
      console.error('Could not load pool asset details:', err)
    )
    await Promise.all([loadUserBalance(state.lpToken), assetsLoaded])
  } catch (err) {
    // A newer load owns the state now; this one's failure is moot.
    if (isStale()) return
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
// Symbol/decimals from the catalog, falling back to algod for assets outside it.
const loadAssetMeta = async (assetId: bigint): Promise<PoolAssetMeta> => {
  const catalogEntry = AssetsService.getAssetById(assetId, store.state.env)
  // Asset ids are chain-scoped: an entry of another network must not supply the decimals.
  const known = catalogEntry?.network === store.state.env ? catalogEntry : undefined
  let symbol = known?.symbol ?? (assetId === 0n ? 'ALGO' : '')
  let decimals = known?.decimals
  if (decimals === undefined && assetId === 0n) decimals = 6
  // A catalog entry with 0 decimals may be a synthetic placeholder: confirm it on-chain.
  if ((decimals === undefined || decimals === 0) && assetId !== 0n && store.state.clientConfig) {
    try {
      const info = await store.state.clientConfig.algorand.client.algod.getAssetByID(assetId).do()
      const reported = Number(info.params?.decimals ?? decimals)
      decimals = Number.isFinite(reported) ? reported : undefined
      symbol = symbol || info.params?.unitName || ''
    } catch (err) {
      console.error('Could not load asset', assetId, err)
      // An unverifiable placeholder (0 decimals) must not be previewed as if it were real.
      if (decimals === 0) decimals = undefined
    }
  }
  return {
    assetId,
    symbol: symbol || assetId.toString(),
    decimals: decimals ?? null,
    priceUsd: null
  }
}

const loadPoolAssets = async (assetA: bigint, assetB: bigint) => {
  const [a, b] = await Promise.all([loadAssetMeta(assetA), loadAssetMeta(assetB)])
  // A faster pool switch may have replaced the pool while this was in flight.
  if (state.pool?.assetA !== assetA || state.pool?.assetB !== assetB) return
  // Keep an already known USD price of the same asset (switching between pools of one pair).
  state.assetA = {
    ...a,
    priceUsd: state.assetA?.assetId === a.assetId ? state.assetA.priceUsd : null
  }
  state.assetB = {
    ...b,
    priceUsd: state.assetB?.assetId === b.assetId ? state.assetB.priceUsd : null
  }
  // The USD prices (trade reporter asset stats) arrive afterwards: the amounts show at once.
  void loadUsdPrices(assetA, assetB)
}

const loadUsdPrices = async (assetA: bigint, assetB: bigint) => {
  // The reporter's endpoints need a signed-in session: no request (and no 401) without one.
  if (!authStore.isAuthenticated || !isTradeApiConfigured(store.state.env)) return
  const env = store.state.env
  try {
    const stats = await fetchAssetStatsCached(env)
    // The network was switched while the stats were in flight: they belong to another chain.
    if (env !== store.state.env) return
    const priceOf = (assetId: bigint): number | null => {
      const price = stats.find(
        (s) => s.assetId !== undefined && BigInt(s.assetId) === assetId
      )?.priceUSD
      return typeof price === 'number' && price > 0 ? price : null
    }
    if (state.assetA?.assetId === assetA)
      state.assetA = { ...state.assetA, priceUsd: priceOf(assetA) }
    if (state.assetB?.assetId === assetB)
      state.assetB = { ...state.assetB, priceUsd: priceOf(assetB) }
  } catch (err) {
    console.error('Could not load asset USD prices', err)
  }
}

// The user holds LP tokens of this pool; without them there is nothing to withdraw.
const hasPosition = computed(() => state.userBalance > 0n)
// Signed-out visitors keep a clickable Max (it prompts to sign in); signed-in users without a
// position get every amount control disabled, like the withdraw button.
const controlsDisabled = computed(
  () => state.submitting || (authStore.isAuthenticated && state.balanceLoaded && !hasPosition.value)
)

// The payout preview of `withdrawAmount` LP tokens against the given pool status.
const buildEstimate = (pool: AmmStatus | null) => {
  // Metadata is loaded after the pool: never pair it with a different pool's assets.
  if (!pool || state.assetA?.assetId !== pool.assetA || state.assetB?.assetId !== pool.assetB)
    return null
  const { assetA: metaA, assetB: metaB } = state
  // Unknown decimals would show wrong amounts: no preview at all then.
  if (!metaA || !metaB || metaA.decimals === null || metaB.decimals === null) return null
  // Pools work in a 9-decimal base scale: assets with more decimals cannot be previewed.
  if (metaA.decimals > 9 || metaB.decimals > 9) return null
  const decimalsA = metaA.decimals
  const decimalsB = metaB.decimals
  const { amountA, amountB } = estimateWithdrawal(
    state.withdrawAmount,
    {
      assetABalance: pool.assetABalance,
      assetBBalance: pool.assetBBalance,
      currentLiquidity: pool.currentLiquidity,
      releasedLiquidity: pool.releasedLiquidity,
      liquidityUsersFromFees: pool.liquidityUsersFromFees
    },
    decimalsA,
    decimalsB
  )
  const usdA = usdValue(amountA, decimalsA, metaA.priceUsd)
  const usdB = usdValue(amountB, decimalsB, metaB.priceUsd)
  return {
    // The contract rejects a withdrawal that pays out neither asset (ERR-REM-ZERO).
    paysNothing: state.withdrawAmount > 0n && amountA === 0n && amountB === 0n,
    amountA: toWholeUnits(amountA, decimalsA),
    amountB: toWholeUnits(amountB, decimalsB),
    usdA,
    usdB,
    // A total of only one priced side would understate the value: show it when both are known.
    usdTotal: usdA === null || usdB === null ? null : usdA + usdB
  }
}
const estimate = computed(() => buildEstimate(state.pool))

const calculateWithdrawAmount = () => {
  // BigInt math (percent has at most 3 decimals): LP balances can exceed 2^53, where Number()
  // rounding could make 100 % larger than the balance.
  const percent = Number.isFinite(state.withdrawPercent) ? state.withdrawPercent : 0
  const permille = BigInt(Math.round(Math.min(Math.max(percent, 0), 100) * 1000))
  state.withdrawAmount = (state.userBalance * permille) / 100_000n
}
const setWithdrawPercent = (percent: number) => {
  // An unauthenticated visitor has no balance to withdraw a percentage of -
  // prompt for auth instead of silently setting the slider to 100% of zero,
  // matching PoolSwap.vue's setMaxSwapAmount.
  if (!authStore.isAuthenticated) {
    store.state.forceAuth = true
    return
  }
  state.withdrawPercent = percent
}
// The quick button (or Max = 100) matching the current percent; null when none matches.
const activeQuickPercent = computed<number | null>(() => {
  const percent = Number(state.withdrawPercent)
  if (percent === MAX_WITHDRAW_PERCENT) return MAX_WITHDRAW_PERCENT
  return QUICK_PERCENTS.find((p) => p === percent) ?? null
})
const setMaxWithdrawPercent = () => setWithdrawPercent(MAX_WITHDRAW_PERCENT)
watch(
  () => state.withdrawPercent,
  () => {
    calculateWithdrawAmount()
  }
)
// Pool balances move while the page is open (swaps accrue fees, other LPs come and go): the
// payout preview is re-based on a fresh status right before anything is signed.
// A payout that dropped by more than 0.5 % in either asset counts as "the pool moved".
const PAYOUT_TOLERANCE = 0.005
// Only a worse payout stops the submit: a better one (fees accrued meanwhile) only benefits the user.
const moved = (before: number, after: number): boolean => before - after > before * PAYOUT_TOLERANCE
const payoutMoved = (
  before: { amountA: number; amountB: number },
  after: { amountA: number; amountB: number }
): boolean => moved(before.amountA, after.amountA) || moved(before.amountB, after.amountB)

// The routed pool changed while a submit was preparing: that submit must not go on.
class PoolSwitchedError extends Error {
  name = 'PoolSwitchedError'
}

// Read-only client for status/state calls: nothing is ever signed with it.
const createReadClient = (algorand: AlgorandClient, appId: string) => {
  const dummy = getDummySigner()
  return new BiatecClammPoolClient({
    algorand,
    appId: BigInt(appId),
    defaultSender: dummy.address,
    defaultSigner: dummy.transactionSigner
  })
}

const refreshPoolStatus = async (ammAppId: string): Promise<AmmStatus | null> => {
  const clientConfig = store.state.clientConfig
  const current = state.pool
  if (!clientConfig || !current || !state.lpToken) return null
  const loadToken = poolLoadToken
  const client = createReadClient(clientConfig.algorand, ammAppId)
  const fresh = await client.status({
    args: {
      appBiatecConfigProvider: clientConfig.appId,
      assetA: current.assetA,
      assetB: current.assetB,
      assetLp: state.lpToken
    }
  })
  // Only for the pool it was read for: after a pool switch nothing may be signed from this form.
  if (String(route.params.ammAppId) !== ammAppId || !state.pool) {
    throw new PoolSwitchedError(t('components.removeLiquidity.poolSwitched'))
  }
  // A load that started meanwhile owns the state (and has newer data than this read).
  if (loadToken === poolLoadToken) state.pool = fresh
  return fresh
}

const removeLiquidityClick = async () => {
  // The re-read below makes the click slow enough for a double click: one flow at a time.
  if (state.submitting) return
  state.submitting = true
  // The pool the user is looking at: fixed for the whole flow, whatever the route does meanwhile.
  const ammAppId = String(route.params.ammAppId)
  try {
    // What the user confirmed: the amount is fixed for the whole flow.
    const lpToSend = state.withdrawAmount
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
    const previewed = estimate.value
    // Compared against the status that was just read (not state.pool, which a concurrent load
    // may legitimately own): what is signed is what the user sees or was told about.
    let refreshed = previewed
    try {
      const fresh = await refreshPoolStatus(ammAppId)
      if (fresh) refreshed = buildEstimate(fresh)
    } catch (err) {
      // A failed re-read is not a reason to block: the contract is the final judge of the payout.
      if (err instanceof PoolSwitchedError) throw err
      console.error('Could not refresh the pool status before signing:', err)
    }
    // The pool moved since the amounts were shown: the user signs only what they have seen.
    if (previewed && refreshed && payoutMoved(previewed, refreshed)) {
      throw new Error(t('components.removeLiquidity.poolChanged'))
    }
    if (String(route.params.ammAppId) !== ammAppId) {
      throw new PoolSwitchedError(t('components.removeLiquidity.poolSwitched'))
    }
    if (state.withdrawAmount !== lpToSend) {
      throw new Error(t('components.removeLiquidity.poolChanged'))
    }
    if (refreshed?.paysNothing) {
      throw new Error(t('components.removeLiquidity.zeroPayout'))
    }
    const account: TransactionSignerAccount = {
      addr: algosdk.decodeAddress(authStore.account),
      signer: signer
    }
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
      lpToSend
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
  } finally {
    state.submitting = false
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
          data-cy="remove-slider"
          :step="0.001"
          :max-fraction-digits="3"
          :min="0"
          :max="100"
          :disabled="controlsDisabled"
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
          :disabled="controlsDisabled"
          show-buttons
        ></InputNumber>
        <SymbolAddon :text="t('components.removeLiquidity.percent')" />
      </InputGroup>
      <div
        class="flex flex-wrap gap-2 mt-2"
        role="group"
        :aria-label="t('components.removeLiquidity.quickPercent')"
      >
        <Button
          v-for="percent in QUICK_PERCENTS"
          :key="percent"
          size="small"
          :severity="activeQuickPercent === percent ? undefined : 'secondary'"
          :variant="activeQuickPercent === percent ? undefined : 'outlined'"
          :data-cy="`remove-percent-${percent}`"
          :aria-pressed="activeQuickPercent === percent"
          :disabled="controlsDisabled"
          @click="setWithdrawPercent(percent)"
          >{{ percent }}%</Button
        >
        <Button
          size="small"
          :severity="activeQuickPercent === MAX_WITHDRAW_PERCENT ? undefined : 'secondary'"
          :variant="activeQuickPercent === MAX_WITHDRAW_PERCENT ? undefined : 'outlined'"
          data-cy="remove-max"
          :aria-pressed="activeQuickPercent === MAX_WITHDRAW_PERCENT"
          :disabled="controlsDisabled"
          @click="setMaxWithdrawPercent"
          >{{ t('components.removeLiquidity.max') }}</Button
        >
      </div>
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
        <div class="my-2" v-else-if="state.balanceLoaded">
          {{ t('components.removeLiquidity.tokenNotFound') }}
        </div>
      </div>

      <div
        v-if="estimate && hasPosition"
        class="my-4 rounded-lg border border-surface-200 dark:border-surface-700 p-3"
        data-cy="remove-estimate"
      >
        <h3 class="mt-0 mb-2">{{ t('components.removeLiquidity.youWillReceive') }}</h3>
        <dl class="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 m-0">
          <dt class="font-medium" data-cy="remove-estimate-a-label">{{ state.assetA?.symbol }}</dt>
          <dd class="m-0 text-right tabular-nums" data-cy="remove-estimate-a">
            <FormattedNumber :value="estimate.amountA" />
            <span v-if="estimate.usdA !== null" class="ml-2 text-surface-500">
              (<FormattedNumber :value="estimate.usdA" usd />)
            </span>
          </dd>
          <dt class="font-medium" data-cy="remove-estimate-b-label">{{ state.assetB?.symbol }}</dt>
          <dd class="m-0 text-right tabular-nums" data-cy="remove-estimate-b">
            <FormattedNumber :value="estimate.amountB" />
            <span v-if="estimate.usdB !== null" class="ml-2 text-surface-500">
              (<FormattedNumber :value="estimate.usdB" usd />)
            </span>
          </dd>
          <template v-if="estimate.usdTotal !== null">
            <dt class="font-semibold border-t border-surface-200 dark:border-surface-700 pt-1">
              {{ t('components.removeLiquidity.totalValue') }}
            </dt>
            <dd
              class="m-0 text-right font-semibold tabular-nums border-t border-surface-200 dark:border-surface-700 pt-1"
              data-cy="remove-estimate-total"
            >
              <FormattedNumber :value="estimate.usdTotal" usd />
            </dd>
          </template>
        </dl>
        <p
          v-if="estimate.paysNothing"
          class="mt-2 mb-0 text-sm text-amber-600"
          data-cy="remove-zero-payout"
        >
          {{ t('components.removeLiquidity.zeroPayout') }}
        </p>
        <p class="mt-2 mb-0 text-xs text-surface-500">
          {{ t('components.removeLiquidity.estimateHint') }}
        </p>
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
        :disabled="state.withdrawAmount == 0n || estimate?.paysNothing"
        :loading="state.submitting"
        >{{ t('components.removeLiquidity.removeLiquidity') }}</Button
      >
    </template>
  </Card>
</template>
<style></style>
