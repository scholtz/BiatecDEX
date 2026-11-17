<script setup lang="ts">
/**
 * USDC <-> fUSDC conversion (Folks Finance lending deposit / withdrawal) for the Liquidity
 * provider dashboard. Many pools are quoted in fUSDC, so a provider holding USDC converts here
 * before adding liquidity and back after removing it. Mainnet only. The maths and the
 * transaction group (with its pre-signing safety check) live in `scripts/folksLend`.
 * PrimeVue components are auto-imported (unplugin-vue-components).
 */
import { computed, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import type { InputNumberInputEvent } from 'primevue/inputnumber'
import { useToast } from 'primevue/usetoast'
import { useNetwork } from '@txnlab/use-wallet-vue'
import { useAVMAuthentication } from 'algorand-authentication-component-vue'
import SymbolAddon from '@/components/SymbolAddon.vue'
import { useAppStore } from '@/stores/app'
import { useTransactionSigner } from '@/composables/useTransactionSigner'
import { useFolksLendInFlight } from '@/composables/useFolksLendInFlight'
import getAlgodClient from '@/scripts/algo/getAlgodClient'
import { fetchAssetAmounts } from '@/scripts/algo/accountAssetHoldings'
import { applyLastRoundOffsetToSuggestedParams } from '@/scripts/algo/applyLastRoundOffset'
import errorMessage from '@/scripts/common/errorMessage'
import { formatSmartNumber } from '@/scripts/common/formatSmartNumber'
import { withTimeout } from '@/scripts/common/withTimeout'
import {
  calcFolksLendReceived,
  exchangeRate,
  formatBaseUnits,
  fromBaseUnits,
  MAX_AMOUNT_INPUT,
  toBaseUnits,
  type FolksLendDirection
} from '@/scripts/folksLend/convert'
import { submitGroup } from '@/scripts/folksLend/confirm'
import {
  assertFolksLendTxnsSafe,
  buildFolksLendTxns,
  fetchFolksPoolRate,
  folksLendAssets,
  FolksLendRefusedError,
  FOLKS_FUSDC_ASSET_ID,
  FOLKS_USDC_ASSET_ID,
  FOLKS_USDC_DECIMALS,
  isFolksLendNetwork,
  requiredSpendableMicroAlgo,
  type FolksLendRequest,
  type FolksPoolRate
} from '@/scripts/folksLend/transactions'

const props = defineProps<{ modelValue: boolean }>()
const emit = defineEmits<{
  (e: 'update:modelValue', value: boolean): void
}>()

const { t, locale } = useI18n()
const store = useAppStore()
const toast = useToast()
const { authStore } = useAVMAuthentication()
const { activeNetworkConfig } = useNetwork()
const signer = useTransactionSigner()

const DECIMALS = FOLKS_USDC_DECIMALS
const RATE_REFRESH_MS = 60_000
/** A stalled node must not keep the form locked: the request for the parameters gives up. */
const PARAMS_TIMEOUT_MS = 20_000

interface AccountSnapshot {
  /** The account and the network the snapshot belongs to. */
  account: string
  network: string
  /** Held amounts; an asset the account is not opted in to is absent. */
  holdings: Map<bigint, bigint>
  /** ALGO above the account's minimum balance (microalgo). */
  spendableMicroAlgo: bigint
}

const direction = ref<FolksLendDirection>('deposit')
// `amount` is the model of the field, which PrimeVue commits on blur / Enter only; `typedAmount`
// follows every keystroke, so the estimate and the checks never lag behind what is on screen.
const amount = ref<number | null>(null)
const typedAmount = ref<number | null>(null)
// "Max" keeps the exact balance in base units: a number field cannot hold every bigint amount.
const exactMax = ref<{ shown: number; base: bigint } | null>(null)
const snapshot = ref<AccountSnapshot | null>(null)
const accountLoading = ref(false)
const accountError = ref(false)
const pool = ref<FolksPoolRate | null>(null)
const rateError = ref(false)
// Building and signing lock this instance (`busy`). Once the group is sent, `waiting` is
// shared by every instance of the dialog (see useFolksLendInFlight): the form stays locked,
// also after leaving the page and coming back, because the group can still confirm.
const busy = ref(false)
const { waiting, begin: beginInFlight } = useFolksLendInFlight()
const processing = computed(() => busy.value || waiting.value)
const lastTxId = ref('')
// The user picked a direction in this session of the dialog: the automatic pick keeps out.
let directionTouched = false

const supported = computed(() => isFolksLendNetwork(store.state.env))
const account = computed(() => (authStore.isAuthenticated ? (authStore.account ?? '') : ''))
// Only a snapshot of the current account counts: missing data is never read as "not opted in".
const current = computed(() =>
  snapshot.value !== null &&
  snapshot.value.account === account.value &&
  snapshot.value.network === store.state.env
    ? snapshot.value
    : null
)

const assets = computed(() => folksLendAssets(direction.value))
const directionOptions = computed(() => [
  { value: 'deposit' as const, label: t('components.folksLend.directionDeposit') },
  { value: 'withdraw' as const, label: t('components.folksLend.directionWithdraw') }
])

const balanceOf = (assetId: bigint): bigint => current.value?.holdings.get(assetId) ?? 0n
const balance = computed(() => balanceOf(assets.value.from))
const needsOptIn = computed(
  () => current.value !== null && !current.value.holdings.has(assets.value.to)
)
const lacksAlgo = computed(
  () =>
    current.value !== null &&
    current.value.spendableMicroAlgo < requiredSpendableMicroAlgo(direction.value, needsOptIn.value)
)

const amountBase = computed(() =>
  exactMax.value !== null && exactMax.value.shown === typedAmount.value
    ? exactMax.value.base
    : toBaseUnits(typedAmount.value, DECIMALS)
)
const insufficient = computed(() => current.value !== null && amountBase.value > balance.value)
const receivedBase = computed(() =>
  pool.value !== null && amountBase.value > 0n
    ? calcFolksLendReceived(direction.value, amountBase.value, pool.value.depositIndex)
    : 0n
)
// Too small to be worth one base unit of the other asset: the pool would pay nothing.
const dust = computed(
  () => pool.value !== null && amountBase.value > 0n && receivedBase.value === 0n
)

// The decimal separator of the locale, so the amounts agree with the number field.
const decimalSeparator = computed(
  () =>
    new Intl.NumberFormat(locale.value).formatToParts(1.5).find((part) => part.type === 'decimal')
      ?.value ?? '.'
)
const formatAmount = (value: bigint): string =>
  formatBaseUnits(value, DECIMALS, decimalSeparator.value)
const balanceText = computed(() => `${formatAmount(balance.value)} ${assets.value.fromSymbol}`)
const receiveText = computed(() => `${formatAmount(receivedBase.value)} ${assets.value.toSymbol}`)
const rateText = computed(() =>
  pool.value !== null
    ? formatSmartNumber(exchangeRate(pool.value.depositIndex), { locale: locale.value })
    : ''
)
const apyText = computed(() =>
  pool.value !== null && Number.isFinite(pool.value.apy)
    ? new Intl.NumberFormat(locale.value, {
        style: 'percent',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(pool.value.apy)
    : ''
)

const canSubmit = computed(
  () =>
    !processing.value &&
    supported.value &&
    current.value !== null &&
    pool.value !== null &&
    amountBase.value > 0n &&
    receivedBase.value > 0n &&
    !insufficient.value &&
    !lacksAlgo.value
)

const close = () => emit('update:modelValue', false)

// Only the newest request may update the state, so a slow older answer (another account, the
// refresh timer against a submit) never overwrites a newer one.
let accountRequestId = 0
const loadAccount = async (): Promise<void> => {
  const requestId = ++accountRequestId
  const address = account.value
  const network = activeNetworkConfig.value
  const env = store.state.env
  if (!address || !network || !supported.value) {
    snapshot.value = null
    accountLoading.value = false
    return
  }
  accountLoading.value = true
  accountError.value = false
  try {
    const algod = getAlgodClient(network)
    // Per-asset lookups and the account without its asset list: algod refuses the whole
    // accountInformation for accounts holding very many assets.
    const [holdings, info] = await Promise.all([
      fetchAssetAmounts(algod, address, [FOLKS_USDC_ASSET_ID, FOLKS_FUSDC_ASSET_ID]),
      algod.accountInformation(address).exclude('all').do()
    ])
    if (requestId !== accountRequestId) return
    const spendable = BigInt(info.amount) - BigInt(info.minBalance)
    snapshot.value = {
      account: address,
      network: env,
      holdings,
      spendableMicroAlgo: spendable > 0n ? spendable : 0n
    }
  } catch (error) {
    console.error('Unable to load the USDC / fUSDC balances', error)
    if (requestId !== accountRequestId) return
    snapshot.value = null
    accountError.value = true
  } finally {
    if (requestId === accountRequestId) accountLoading.value = false
  }
}

let rateRequestId = 0
/** A background refresh that fails keeps the last good rate instead of blanking the estimate. */
const loadRate = async (background = false): Promise<void> => {
  const requestId = ++rateRequestId
  const network = activeNetworkConfig.value
  if (!network || !supported.value) {
    pool.value = null
    return
  }
  if (!background) rateError.value = false
  try {
    const rate = await fetchFolksPoolRate(getAlgodClient(network))
    if (requestId !== rateRequestId) return
    pool.value = rate
    rateError.value = false
  } catch (error) {
    console.error('Unable to load the Folks Finance pool rate', error)
    if (requestId !== rateRequestId) return
    if (!background || pool.value === null) {
      pool.value = null
      rateError.value = true
    }
  }
}

const setAmount = (value: number | null) => {
  amount.value = value
  typedAmount.value = value
}
// Blur / Enter / spin commit the model: the typed value follows it.
watch(amount, (value) => {
  typedAmount.value = value
})
const onAmountInput = (event: InputNumberInputEvent) => {
  typedAmount.value =
    typeof event.value === 'number' && Number.isFinite(event.value) ? event.value : null
}

// Bumped on every reset: remounts the field, whose text is otherwise kept while it is focused
// with an uncommitted value (the model is already null, so nothing tells it to clear).
const amountFieldKey = ref(0)
const resetForm = () => {
  amountFieldKey.value++
  setAmount(null)
  exactMax.value = null
  lastTxId.value = ''
}

const setMax = () => {
  const shown = fromBaseUnits(balance.value, DECIMALS)
  exactMax.value = { shown, base: balance.value }
  setAmount(shown)
}

const setDirection = (value: FolksLendDirection | null) => {
  // SelectButton reports null when the active option is clicked again: keep the direction.
  if (value === null || value === direction.value || processing.value) return
  directionTouched = true
  direction.value = value
  resetForm()
}

const submit = async () => {
  if (!canSubmit.value) return
  const network = activeNetworkConfig.value
  const sender = account.value
  if (!network || !sender) return
  busy.value = true
  lastTxId.value = ''
  const request: FolksLendRequest = {
    direction: direction.value,
    sender,
    amount: amountBase.value,
    optIn: needsOptIn.value
  }
  const symbols = folksLendAssets(request.direction)
  // Nothing to release until the group is sent.
  let release = () => {}
  try {
    const algod = getAlgodClient(network)
    // The group carries no client-side rate (a deposit sends the USDC amount, a withdrawal asks
    // the pool for a variable payout), so the estimate on screen is informational.
    const params = await withTimeout(algod.getTransactionParams().do(), PARAMS_TIMEOUT_MS)
    applyLastRoundOffsetToSuggestedParams(params, store.state.lastRoundOffset ?? 100)
    const txns = buildFolksLendTxns(request, params)
    assertFolksLendTxnsSafe(txns, request)
    const signed = await signer(
      txns,
      txns.map((_, index) => index)
    )
    const txid = txns[0].txID()
    // The group can confirm until its last valid round. The form stays locked until the
    // outcome is definite: offering it again earlier would let the user convert twice. That
    // includes a send whose answer got lost (submitGroup).
    // The shared lock is released by this submit only (see useFolksLendInFlight). The wait
    // runs on after the dialog is unmounted: the lock needs the real outcome.
    release = beginInFlight()
    const outcome = await submitGroup(algod, signed, txid, txns[0].lastValid)
    if (outcome.status === 'confirmed') {
      // The form may meanwhile belong to another account: its message stays out of it.
      if (account.value === sender) {
        lastTxId.value = txid
        setAmount(null)
        exactMax.value = null
      }
      toast.add({
        severity: 'success',
        summary: t('components.folksLend.successTitle'),
        detail: t('components.folksLend.success', {
          from: symbols.fromSymbol,
          to: symbols.toSymbol,
          txid
        }),
        life: 8000
      })
    } else if (outcome.status === 'rejected') {
      toast.add({
        severity: 'error',
        summary: t('components.folksLend.failedTitle'),
        detail: t('components.folksLend.rejected', { reason: outcome.reason }),
        life: 12000
      })
    } else if (outcome.status === 'expired') {
      toast.add({
        severity: 'error',
        summary: t('components.folksLend.failedTitle'),
        detail: t('components.folksLend.expired'),
        life: 12000
      })
    } else {
      // The node could not be asked: the group may still confirm. Check before retrying -
      // the amount is cleared so that one more click cannot repeat it (the form may meanwhile
      // belong to another account, whose input stays).
      if (account.value === sender) resetForm()
      toast.add({
        severity: 'warn',
        detail: t('components.folksLend.notConfirmed', { txid }),
        life: 15000
      })
    }
    // Confirmed, or possibly confirmed: the page reloads its holdings. Through the store, not
    // an event: the dialog that started the conversion may be unmounted by now.
    if (outcome.status === 'confirmed' || outcome.status === 'unknown') {
      store.state.refreshAccountBalance = true
    }
  } catch (error) {
    console.error('USDC / fUSDC conversion failed', error)
    toast.add({
      severity: 'error',
      summary: t('components.folksLend.failedTitle'),
      detail:
        error instanceof FolksLendRefusedError
          ? t('components.folksLend.refused')
          : errorMessage(error),
      life: 10000
    })
  } finally {
    release()
    busy.value = false
  }
}

let rateTimer: ReturnType<typeof setInterval> | undefined
const stopRateTimer = () => {
  if (rateTimer !== undefined) clearInterval(rateTimer)
  rateTimer = undefined
}

const reload = async () => {
  await Promise.all([loadAccount(), loadRate()])
}

// A conversion ended (in this or an earlier instance of the dialog): balances changed, or may
// have, and the loads skipped while it was in flight are due (an instance opened mid-flight
// has neither balances nor a rate yet). Never keep offering a spent amount.
watch(processing, (now, before) => {
  if (before && !now && props.modelValue) void reload()
})

// The dialog loads only while it is open (no requests for a closed dialog).
watch(
  () => props.modelValue,
  async (open) => {
    stopRateTimer()
    if (!open) return
    // Hidden tabs do not poll; the next visible tick refreshes the rate.
    rateTimer = setInterval(() => {
      if (!document.hidden) void loadRate(true)
    }, RATE_REFRESH_MS)
    // Reopened while a conversion is still in flight: its state stays as it is.
    if (processing.value) return
    resetForm()
    directionTouched = false
    // Balances of an earlier session of the dialog are never shown as current.
    snapshot.value = null
    await reload()
    // Start on the side the account can convert, unless the user already chose or typed.
    if (!props.modelValue || directionTouched || processing.value || typedAmount.value !== null) {
      return
    }
    if (balanceOf(FOLKS_USDC_ASSET_ID) > 0n) {
      direction.value = 'deposit'
    } else if (balanceOf(FOLKS_FUSDC_ASSET_ID) > 0n) {
      direction.value = 'withdraw'
    }
  }
)

// Another account or network while the dialog is open: nothing of the previous one may stay.
watch([account, () => store.state.env], () => {
  if (!props.modelValue) return
  snapshot.value = null
  resetForm()
  if (!supported.value || !account.value) {
    close()
    return
  }
  void reload()
})

onUnmounted(stopRateTimer)
</script>

<template>
  <Dialog
    :visible="props.modelValue"
    modal
    :draggable="false"
    :style="{ width: '32rem', maxWidth: '95vw' }"
    data-cy="folks-lend-dialog"
    @update:visible="(v: boolean) => emit('update:modelValue', v)"
  >
    <template #header>
      <div class="flex flex-col">
        <span class="text-lg font-semibold text-strong">{{ t('components.folksLend.title') }}</span>
        <span class="text-sm text-muted">{{ t('components.folksLend.subtitle') }}</span>
      </div>
    </template>

    <div class="flex flex-col gap-4">
      <SelectButton
        :modelValue="direction"
        :options="directionOptions"
        optionLabel="label"
        optionValue="value"
        :allowEmpty="false"
        :disabled="processing"
        :aria-label="t('components.folksLend.direction')"
        data-cy="folks-lend-direction"
        @update:modelValue="setDirection"
      />

      <div class="flex flex-col gap-1.5">
        <div class="flex items-center justify-between gap-2">
          <label for="folksLendAmount" class="eyebrow">{{
            t('components.folksLend.amount')
          }}</label>
          <span class="text-sm text-muted" data-cy="folks-lend-balance">
            <template v-if="accountLoading && current === null">{{
              t('components.folksLend.loadingBalance')
            }}</template>
            <template v-else-if="current !== null">{{
              t('components.folksLend.available', { amount: balanceText })
            }}</template>
          </span>
        </div>
        <div class="flex items-stretch gap-2">
          <InputGroup>
            <InputNumber
              :key="amountFieldKey"
              v-model="amount"
              inputId="folksLendAmount"
              :min="0"
              :max="MAX_AMOUNT_INPUT"
              :minFractionDigits="0"
              :maxFractionDigits="DECIMALS"
              :locale="locale"
              :disabled="processing"
              data-cy="folks-lend-amount"
              @input="onAmountInput"
            />
            <SymbolAddon :text="assets.fromSymbol" />
          </InputGroup>
          <Button
            :label="t('components.folksLend.max')"
            severity="secondary"
            class="shrink-0"
            :disabled="processing || balance === 0n"
            data-cy="folks-lend-max"
            @click="setMax"
          />
        </div>
      </div>

      <dl class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
        <dt class="text-muted">{{ t('components.folksLend.receive') }}</dt>
        <dd class="text-right font-semibold" data-cy="folks-lend-receive">≈ {{ receiveText }}</dd>
        <template v-if="pool !== null">
          <dt class="text-muted">{{ t('components.folksLend.rate') }}</dt>
          <dd class="text-right" data-cy="folks-lend-rate">1 fUSDC = {{ rateText }} USDC</dd>
          <template v-if="apyText">
            <dt class="text-muted">{{ t('components.folksLend.apy') }}</dt>
            <dd class="text-right" data-cy="folks-lend-apy">{{ apyText }}</dd>
          </template>
        </template>
      </dl>

      <div class="flex flex-col gap-2">
        <Message v-if="accountError" severity="error" data-cy="folks-lend-account-error">{{
          t('components.folksLend.accountError')
        }}</Message>
        <Message v-if="rateError" severity="error" data-cy="folks-lend-rate-error">{{
          t('components.folksLend.rateError')
        }}</Message>
        <Message v-if="insufficient" severity="error" data-cy="folks-lend-insufficient">{{
          t('components.folksLend.insufficient', { asset: assets.fromSymbol })
        }}</Message>
        <Message v-if="dust" severity="warn">{{ t('components.folksLend.tooSmall') }}</Message>
        <Message v-if="lacksAlgo" severity="error" data-cy="folks-lend-lacks-algo">{{
          needsOptIn
            ? t('components.folksLend.insufficientAlgoOptIn', { asset: assets.toSymbol })
            : t('components.folksLend.insufficientAlgo')
        }}</Message>
        <Message v-else-if="needsOptIn" severity="info" data-cy="folks-lend-opt-in">{{
          t('components.folksLend.optInNote', { asset: assets.toSymbol })
        }}</Message>
        <Message v-if="waiting" severity="info" data-cy="folks-lend-waiting">{{
          t('components.folksLend.waiting')
        }}</Message>
        <Message v-if="lastTxId" severity="success" data-cy="folks-lend-success">
          <span class="break-all">{{
            t('components.folksLend.confirmed', { txid: lastTxId })
          }}</span>
        </Message>
      </div>
    </div>

    <template #footer>
      <Button
        :label="t('components.folksLend.close')"
        severity="secondary"
        text
        data-cy="folks-lend-close"
        @click="close"
      />
      <Button
        :label="
          direction === 'deposit'
            ? t('components.folksLend.submitDeposit')
            : t('components.folksLend.submitWithdraw')
        "
        icon="pi pi-arrow-right-arrow-left"
        :disabled="!canSubmit"
        :loading="processing"
        data-cy="folks-lend-submit"
        @click="submit"
      />
    </template>
  </Dialog>
</template>
