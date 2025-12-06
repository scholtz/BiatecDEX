<script setup lang="ts">
import Card from 'primevue/card'
import InputNumber from 'primevue/inputnumber'
import TabView from 'primevue/tabview'
import TabPanel from 'primevue/tabpanel'
import Button from 'primevue/button'
import InputGroup from 'primevue/inputgroup'
import InputGroupAddon from 'primevue/inputgroupaddon'
import { onMounted, reactive, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useAppStore, type IState } from '@/stores/app'
import fetchFolksRouterQuotes from '@/scripts/folks/fetchFolksRouterQuotes'
import prepareSwapTransactions from '@/scripts/folks/prepareSwapTransactions'
import getAlgodClient from '@/scripts/algo/getAlgodClient'
import { AssetsService } from '@/service/AssetsService'
import { useToast } from 'primevue/usetoast'
import { SwapMode, type SwapQuote, type SwapTransactions } from '@folks-router/js-sdk'
import { Buffer } from 'buffer'
import algosdk, { assignGroupID } from 'algosdk'
import initPriceDecimals from '@/scripts/asset/initPriceDecimals'
import { useAVMAuthentication } from 'algorand-authentication-component-vue'
import { useNetwork, useWallet } from '@txnlab/use-wallet-vue'
import BigNumber from 'bignumber.js'
import { applyLastRoundOffsetToTransactions } from '@/scripts/algo/applyLastRoundOffset'
const toast = useToast()
const store = useAppStore()
const { t } = useI18n()
const { authStore, getTransactionSigner } = useAVMAuthentication()

const { activeNetworkConfig } = useNetwork()
const { transactionSigner: useWalletTransactionSigner } = useWallet()
const props = defineProps<{
  class?: string
}>()

const state = reactive({ priceDecimals: 3, tick: 1, quantityTick: 1 })

const executeClick = async (type: 'buy' | 'sell') => {
  try {
    AssetsService.getAsset('ALGO')

    if (!authStore.account) {
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

    let quote: SwapQuote | null = null
    let folksTxns: SwapTransactions | null = null
    const q = BigInt(Math.floor(store.state.quantity * 10 ** store.state.pair.asset.decimals))
    if (type == 'sell') {
      quote = await fetchFolksRouterQuotes(
        q,
        store.state.pair.asset.assetId,
        store.state.pair.currency.assetId,
        SwapMode.FIXED_OUTPUT,
        store.state.env
      )
      if (quote == null) throw Error(t('components.marketOrder.errors.fetchMarket'))
      folksTxns = await prepareSwapTransactions(
        q,
        store.state.pair.asset.assetId,
        store.state.pair.currency.assetId,
        SwapMode.FIXED_OUTPUT,
        authStore.account,
        store.state.slippage,
        quote,
        store.state.env
      )
    } else {
      quote = await fetchFolksRouterQuotes(
        q,
        store.state.pair.currency.assetId,
        store.state.pair.asset.assetId,
        SwapMode.FIXED_INPUT,
        store.state.env
      )
      if (quote == null) throw Error(t('components.marketOrder.errors.fetchMarket'))
      folksTxns = await prepareSwapTransactions(
        q,
        store.state.pair.currency.assetId,
        store.state.pair.asset.assetId,
        SwapMode.FIXED_INPUT,
        authStore.account,
        store.state.slippage,
        quote,
        store.state.env
      )
    }

    if (folksTxns == null) throw Error(t('components.marketOrder.errors.fetchTransactions'))
    const price =
      ((Number(q) / Number(quote.quoteAmount)) * 10 ** store.state.pair.asset.decimals) /
      10 ** store.state.pair.currency.decimals
    if (type == 'buy') {
      if (price > store.state.price * (1 + store.state.slippage / 10000)) {
        throw Error(
          t('components.marketOrder.errors.priceTooHigh', {
            currentQuote: price,
            limitPrice: store.state.price * (1 + store.state.slippage / 10000),
            slippage: store.state.slippage
          })
        )
      }
    }

    if (type == 'sell') {
      if (price < store.state.price * (1 - store.state.slippage / 10000)) {
        throw Error(
          t('components.marketOrder.errors.priceTooLow', {
            currentQuote: price,
            limitPrice: store.state.price * (1 - store.state.slippage / 10000),
            slippage: store.state.slippage
          })
        )
      }
    }

    const unsignedTxns = folksTxns.map((txn) =>
      algosdk.decodeUnsignedTransaction(Buffer.from(txn, 'base64'))
    )
    applyLastRoundOffsetToTransactions(unsignedTxns, store.state.lastRoundOffset ?? 100)
    unsignedTxns.map((tx) => (tx.group = undefined))
    const unsignedTxnsFinal = assignGroupID(unsignedTxns)

    //const groupedEncoded = unsignedTxns.map((tx) => tx.toByte())
    const signer = getTransactionSigner(useWalletTransactionSigner)
    const signedTxs = await signer(
      unsignedTxnsFinal,
      unsignedTxnsFinal.map((tx, index) => {
        return index
      })
    )

    const algodClient = getAlgodClient(activeNetworkConfig.value)
    const { txid } = await algodClient.sendRawTransaction(signedTxs).do()
    if (txid) {
      toast.add({
        severity: 'success',
        detail: t('components.marketOrder.success.txSent'),
        life: 5000
      })
    }
    const confirmation = await algosdk.waitForConfirmation(algodClient, txid, 10)
    if (confirmation?.txn) {
      toast.add({
        severity: 'success',
        detail: t('components.marketOrder.success.txConfirmed'),
        life: 5000
      })
      store.state.refreshAccountBalance = true
    } else {
      toast.add({
        severity: 'error',
        detail: t('components.marketOrder.errors.txNotConfirmed'),
        life: 5000
      })
    }
  } catch (exc: any) {
    console.error(exc)
    toast.add({
      severity: 'error',
      detail: exc.message ?? exc,
      life: 5000
    })
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
watch(
  () => store.state.pair.asset.code,
  () => {
    initQuantityTick()
  }
)
</script>
<template>
  <Card :class="props.class" class="bg-white/90 p-2">
    <template #content>
      <TabView v-model:active-index="store.state.side">
        <TabPanel
          :header="t('components.marketOrder.tabs.buy')"
          :value="'buy-market-order'"
          class="color-green"
        >
          <div class="px-2 py-1">
            <div class="flex flex-col md:flex-row items-start md:items-center mb-4">
              <label for="price-bid" class="w-full md:w-1/5 mb-2 md:mb-0">
                {{ t('components.marketOrder.labels.price') }}
              </label>
              <div class="w-full md:w-4/5">
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
                  <InputGroupAddon class="min-w-32">
                    <div class="px-3">
                      {{ store.state.pair.asset.symbol }}/{{ store.state.pair.currency.symbol }}
                    </div>
                  </InputGroupAddon>
                </InputGroup>
              </div>
            </div>
            <div class="flex flex-col md:flex-row items-start md:items-center mb-4">
              <label for="quantity-bid" class="w-full md:w-1/5 mb-2 md:mb-0">
                {{ t('components.marketOrder.labels.quantity') }}
              </label>
              <div class="w-full md:w-4/5">
                <InputGroup>
                  <InputNumber
                    inputId="quantity-bid"
                    v-model="store.state.quantity"
                    show-buttons
                    class="w-full"
                    :min="0"
                    :max-fraction-digits="store.state.pair.asset.decimals"
                    :step="state.quantityTick"
                  />
                  <InputGroupAddon class="min-w-32">
                    <div class="px-3">
                      {{ store.state.pair.currency.symbol }}
                    </div>
                  </InputGroupAddon>
                </InputGroup>
              </div>
            </div>
            <div class="flex flex-col md:flex-row items-start md:items-center mb-0">
              <label class="w-full md:w-1/5 mb-2 md:mb-0"></label>
              <div class="w-full md:w-4/5">
                <Button severity="success" @click="executeClick('buy')">
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
        <TabPanel :header="t('components.marketOrder.tabs.sell')" :value="'sell-market-order'">
          <div class="px-2 py-1">
            <div class="flex flex-col md:flex-row items-start md:items-center mb-4">
              <label for="price-offer" class="w-full md:w-1/5 mb-2 md:mb-0">
                {{ t('components.marketOrder.labels.price') }}
              </label>
              <div class="w-full md:w-4/5">
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
                  <InputGroupAddon class="min-w-32">
                    <div class="px-3">
                      {{ store.state.pair.asset.symbol }}/{{ store.state.pair.currency.symbol }}
                    </div>
                  </InputGroupAddon>
                </InputGroup>
              </div>
            </div>
            <div class="flex flex-col md:flex-row items-start md:items-center mb-4">
              <label for="quantity-offer" class="w-full md:w-1/5 mb-2 md:mb-0">
                {{ t('components.marketOrder.labels.quantity') }}
              </label>
              <div class="w-full md:w-4/5">
                <InputGroup>
                  <InputNumber
                    inputId="quantity-offer"
                    v-model="store.state.quantity"
                    show-buttons
                    class="w-full"
                    :min="0"
                    :max-fraction-digits="store.state.pair.asset.decimals"
                    :step="state.quantityTick"
                  />
                  <InputGroupAddon class="min-w-32">
                    <div class="px-3">
                      {{ store.state.pair.currency.symbol }}
                    </div>
                  </InputGroupAddon>
                </InputGroup>
              </div>
            </div>
            <div class="flex flex-col md:flex-row items-start md:items-center mb-0">
              <label class="w-full md:w-1/5 mb-2 md:mb-0"></label>
              <div class="w-full md:w-4/5">
                <Button severity="danger" @click="executeClick('sell')">
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
      </TabView>
    </template>
  </Card>
</template>
<style></style>
