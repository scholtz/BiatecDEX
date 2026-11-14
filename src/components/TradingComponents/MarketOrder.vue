<script setup lang="ts">
import Card from 'primevue/card'
import InputNumber from 'primevue/inputnumber'
import Tabs from 'primevue/tabs'
import TabList from 'primevue/tablist'
import Tab from 'primevue/tab'
import TabPanels from 'primevue/tabpanels'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import AuthenticateButton from '@/components/AuthenticateButton.vue'
import InputGroup from 'primevue/inputgroup'
import SymbolAddon from '@/components/SymbolAddon.vue'
import { pairLabel } from '@/scripts/common/pairLabel'
import { onMounted, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore } from '@/stores/app'
import errorMessage from '@/scripts/common/errorMessage'
import prepareSwapTransactions from '@/scripts/folks/prepareSwapTransactions'
import fetchFolksSwapQuote from '@/scripts/folks/fetchFolksSwapQuote'
import getAlgodClient from '@/scripts/algo/getAlgodClient'
import { useToast } from 'primevue/usetoast'
import initPriceDecimals from '@/scripts/asset/initPriceDecimals'
import { useAVMAuthentication } from 'algorand-authentication-component-vue'
import { useTransactionSigner } from '@/composables/useTransactionSigner'
import { useNetwork } from '@txnlab/use-wallet-vue'
import BigNumber from 'bignumber.js'
import { formatSmartNumber } from '@/scripts/common/formatSmartNumber'
import { fetchBiatecRoute, fetchBiatecRouteTxs } from '@/service/routerApi'
import { marketOrderAmount } from '@/scripts/swap/swapQuote'
import {
  executeSwap,
  SwapError,
  type ExecuteSwapResult,
  type SwapNotice
} from '@/scripts/swap/executeSwap'
import { algodSwapChain } from '@/scripts/swap/algodSwapChain'
import type { SwapVenue } from '@/interface/ISwapQuote'
const toast = useToast()
const store = useAppStore()
const { t, locale } = useI18n()
const { authStore } = useAVMAuthentication()
const signer = useTransactionSigner()

const { activeNetworkConfig } = useNetwork()
const props = defineProps<{
  class?: string
}>()

const state = reactive({ priceDecimals: 3, tick: 1, quantityTick: 1, executing: false })

const VENUE_NAMES: Record<SwapVenue, string> = {
  biatec: 'Biatec Router',
  folks: 'Folks Router'
}

/** The order's currency, captured when the order starts (the pair may change meanwhile). */
interface OrderCurrency {
  decimals: number
  symbol: string
}

/** Order units are currency base units (see marketOrderAmount). */
const formatOrderAmount = (amount: bigint, currency: OrderCurrency): string =>
  formatSmartNumber(Number(amount) / 10 ** currency.decimals, { locale: locale.value }) +
  ' ' +
  currency.symbol

const showSwapNotice = (notice: SwapNotice, currency: OrderCurrency) => {
  if (notice.kind === 'txSent') {
    toast.add({
      severity: 'info',
      detail: t('components.marketOrder.success.txSent'),
      life: 5000
    })
  } else if (notice.kind === 'stillWaiting') {
    toast.add({
      severity: 'info',
      detail: t('components.marketOrder.info.stillWaiting', {
        rounds: notice.rounds,
        lastValid: notice.lastValid.toString()
      }),
      life: 10000
    })
  } else {
    toast.add({
      severity: 'info',
      detail: t(
        notice.afterSigning
          ? 'components.marketOrder.info.fallback'
          : 'components.marketOrder.info.fallbackBeforeSigning',
        { amount: formatOrderAmount(notice.amount, currency) }
      ),
      life: 10000
    })
  }
}

const successMessage = (result: ExecuteSwapResult, currency: OrderCurrency): string => {
  const biatec = result.fills.find((fill) => fill.venue === 'biatec')
  const folks = result.fills.find((fill) => fill.venue === 'folks')
  let message =
    biatec && folks
      ? t('components.marketOrder.success.executedSplit', {
          biatec: formatOrderAmount(biatec.amount, currency),
          folks: formatOrderAmount(folks.amount, currency)
        })
      : t('components.marketOrder.success.executed', {
          venue: VENUE_NAMES[(biatec ?? folks)?.venue ?? 'folks']
        })
  if (result.notExecuted > 0n) {
    message +=
      ' ' +
      t('components.marketOrder.success.partialFill', {
        executed: formatOrderAmount(result.executed, currency),
        notExecuted: formatOrderAmount(result.notExecuted, currency)
      })
  }
  return message
}

/** Codes whose text has no {message} slot: the cause is appended instead. */
const CODES_WITHOUT_MESSAGE_SLOT = new Set(['fetchMarket', 'fetchTransactions', 'statusUnknown'])

const formatPrice = (value: string | number | undefined): string =>
  typeof value === 'number' ? formatSmartNumber(value, { locale: locale.value }) : ''

const swapErrorMessage = (error: SwapError, currency: OrderCurrency): string => {
  const message =
    error.params.reason === 'expired'
      ? t('components.marketOrder.errors.txExpired')
      : String(error.params.message ?? '')
  const text = t(`components.marketOrder.errors.${error.code}`, {
    ...error.params,
    currentQuote: formatPrice(error.params.currentQuote),
    limitPrice: formatPrice(error.params.limitPrice),
    message,
    executed: formatOrderAmount(error.executed, currency),
    notExecuted: formatOrderAmount(error.notExecuted, currency)
  })
  return message && CODES_WITHOUT_MESSAGE_SLOT.has(error.code) ? `${text}: ${message}` : text
}

const executeClick = async (type: 'buy' | 'sell') => {
  if (state.executing) return
  const currency: OrderCurrency = {
    decimals: store.state.pair.currency.decimals,
    symbol: store.state.pair.currency.symbol
  }
  try {
    const sender = authStore.account
    if (!sender) {
      toast.add({
        severity: 'error',
        detail: t('components.marketOrder.errors.authenticateFirst'),
        life: 5000
      })
      return
    }

    if (store.state.quantity <= 0) {
      toast.add({
        severity: 'error',
        detail: t('components.marketOrder.errors.quantityPositive'),
        life: 5000
      })
      return
    }

    state.executing = true
    const env = store.state.env
    const algod = getAlgodClient(activeNetworkConfig.value)
    const result = await executeSwap(
      {
        side: type,
        amount: marketOrderAmount(store.state.quantity, currency.decimals),
        sender,
        assetId: store.state.pair.asset.assetId,
        currencyId: store.state.pair.currency.assetId,
        assetDecimals: store.state.pair.asset.decimals,
        currencyDecimals: currency.decimals,
        limitPrice: store.state.price,
        slippageBps: store.state.slippage,
        slippageProtection: store.state.slippageProtection,
        lastRoundOffset: store.state.lastRoundOffset ?? 100
      },
      {
        biatecQuote: async (request) => (await fetchBiatecRoute(env, request)).quote,
        biatecRouteTxs: (params) => fetchBiatecRouteTxs(env, params),
        folksQuote: (request) => fetchFolksSwapQuote(env, request),
        folksTxns: (request, raw, slippageBps) =>
          prepareSwapTransactions(
            request.amount,
            request.fromAssetId,
            request.toAssetId,
            request.swapMode,
            sender,
            slippageBps,
            raw,
            env
          ),
        sign: async (txns) => {
          const signed = await signer(
            txns,
            txns.map((_, index) => index)
          )
          return signed.filter((txn): txn is Uint8Array => txn instanceof Uint8Array)
        },
        chain: algodSwapChain(algod),
        notify: (notice) => showSwapNotice(notice, currency)
      }
    )
    store.state.refreshAccountBalance = true
    toast.add({ severity: 'success', detail: successMessage(result, currency), life: 8000 })
  } catch (exc) {
    console.error(exc)
    if (exc instanceof SwapError) {
      if (exc.executed > 0n) store.state.refreshAccountBalance = true
      toast.add({ severity: 'error', detail: swapErrorMessage(exc, currency), life: 10000 })
    } else {
      toast.add({ severity: 'error', detail: errorMessage(exc), life: 5000 })
    }
  } finally {
    state.executing = false
  }
}

const initQuantityTick = () => {
  if (store.state.pair.asset.quotes.length > 0) {
    state.quantityTick = store.state.pair.asset.quotes[0]
    store.state.quantity = state.quantityTick
  }
}
const initPriceDecimalsState = () => {
  const dec = initPriceDecimals(new BigNumber(store.state.price))
  state.tick = dec.tick.toNumber()
  if (dec.priceDecimals) {
    state.priceDecimals = dec.priceDecimals.toNumber()
  }
}

onMounted(() => {
  initPriceDecimalsState()
  initQuantityTick()
})

watch(
  () => store.state.price,
  () => {
    initPriceDecimalsState()
  }
)
// `store.state` is shallow reactive and the pair's asset is sometimes swapped in place, which a
// watcher on `pair.asset.code` alone never sees - also watch the top-level fields that change
// with every pair switch.
watch(
  // A primitive key: fires only when the asset really changes, not on every pair re-assignment.
  () => `${store.state.assetCode}|${store.state.pair.asset.code}`,
  () => {
    initQuantityTick()
  }
)
</script>
<template>
  <Card :class="props.class" class="p-2 @container/order">
    <template #content>
      <Tabs v-model:value="store.state.side">
        <TabList>
          <Tab :value="0" class="color-green">{{ t('components.marketOrder.tabs.buy') }}</Tab>
          <Tab :value="1">{{ t('components.marketOrder.tabs.sell') }}</Tab>
        </TabList>
        <TabPanels>
          <TabPanel :value="0" class="color-green">
            <div class="px-2 py-1">
              <div class="flex flex-col @xl/order:flex-row items-start @xl/order:items-center mb-4">
                <label for="price-bid" class="w-full @xl/order:w-1/5 mb-2 @xl/order:mb-0">
                  {{ t('components.marketOrder.labels.price') }}
                </label>
                <div class="w-full @xl/order:w-4/5">
                  <InputGroup>
                    <InputNumber
                      input-id="price-bid"
                      v-model="store.state.price"
                      show-buttons
                      class="w-full"
                      :min="0"
                      :max-fraction-digits="state.priceDecimals"
                      :step="state.tick"
                    />
                    <SymbolAddon :text="pairLabel(store.state.pair)" />
                  </InputGroup>
                </div>
              </div>
              <div class="flex flex-col @xl/order:flex-row items-start @xl/order:items-center mb-4">
                <label for="quantity-bid" class="w-full @xl/order:w-1/5 mb-2 @xl/order:mb-0">
                  {{ t('components.marketOrder.labels.quantity') }}
                </label>
                <div class="w-full @xl/order:w-4/5">
                  <InputGroup>
                    <InputNumber
                      inputId="quantity-bid"
                      v-model="store.state.quantity"
                      show-buttons
                      class="w-full"
                      :min="0"
                      :max-fraction-digits="store.state.pair.currency.decimals"
                      :step="state.quantityTick"
                    />
                    <SymbolAddon :text="store.state.pair.currency.symbol" />
                  </InputGroup>
                </div>
              </div>
              <div class="flex flex-col @xl/order:flex-row items-start @xl/order:items-center mb-0">
                <label class="w-full @xl/order:w-1/5 mb-2 @xl/order:mb-0"></label>
                <div class="w-full @xl/order:w-4/5">
                  <AuthenticateButton
                    v-if="!authStore.isAuthenticated"
                    severity="success"
                    :label="t('components.marketOrder.errors.authenticateFirst')"
                    data-cy="market-order-authenticate-buy"
                  />
                  <Button
                    v-else
                    severity="success"
                    :loading="state.executing"
                    :disabled="state.executing"
                    @click="executeClick('buy')"
                  >
                    {{
                      t('components.marketOrder.buttons.buy', {
                        asset: store.state.pair.asset.name,
                        currency: store.state.pair.currency.name
                      })
                    }}
                  </Button>
                </div>
              </div>
            </div>
          </TabPanel>
          <TabPanel :value="1">
            <div class="px-2 py-1">
              <div class="flex flex-col @xl/order:flex-row items-start @xl/order:items-center mb-4">
                <label for="price-offer" class="w-full @xl/order:w-1/5 mb-2 @xl/order:mb-0">
                  {{ t('components.marketOrder.labels.price') }}
                </label>
                <div class="w-full @xl/order:w-4/5">
                  <InputGroup>
                    <InputNumber
                      inputId="price-offer"
                      v-model="store.state.price"
                      show-buttons
                      class="w-full"
                      :min="0"
                      :max-fraction-digits="state.priceDecimals"
                      :step="state.tick"
                    />
                    <SymbolAddon :text="pairLabel(store.state.pair)" />
                  </InputGroup>
                </div>
              </div>
              <div class="flex flex-col @xl/order:flex-row items-start @xl/order:items-center mb-4">
                <label for="quantity-offer" class="w-full @xl/order:w-1/5 mb-2 @xl/order:mb-0">
                  {{ t('components.marketOrder.labels.quantity') }}
                </label>
                <div class="w-full @xl/order:w-4/5">
                  <InputGroup>
                    <InputNumber
                      inputId="quantity-offer"
                      v-model="store.state.quantity"
                      show-buttons
                      class="w-full"
                      :min="0"
                      :max-fraction-digits="store.state.pair.currency.decimals"
                      :step="state.quantityTick"
                    />
                    <SymbolAddon :text="store.state.pair.currency.symbol" />
                  </InputGroup>
                </div>
              </div>
              <div class="flex flex-col @xl/order:flex-row items-start @xl/order:items-center mb-0">
                <label class="w-full @xl/order:w-1/5 mb-2 @xl/order:mb-0"></label>
                <div class="w-full @xl/order:w-4/5">
                  <AuthenticateButton
                    v-if="!authStore.isAuthenticated"
                    severity="danger"
                    :label="t('components.marketOrder.errors.authenticateFirst')"
                    data-cy="market-order-authenticate-sell"
                  />
                  <Button
                    v-else
                    severity="danger"
                    :loading="state.executing"
                    :disabled="state.executing"
                    @click="executeClick('sell')"
                  >
                    {{
                      t('components.marketOrder.buttons.sell', {
                        asset: store.state.pair.asset.name,
                        currency: store.state.pair.currency.name
                      })
                    }}
                  </Button>
                </div>
              </div>
            </div>
          </TabPanel>
        </TabPanels>
      </Tabs>
    </template>
  </Card>
</template>
<style></style>
