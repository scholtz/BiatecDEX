<script setup lang="ts">
import { reactive, ref, computed, watch } from 'vue'
import { useRouter } from 'vue-router'
import Layout from '@/layouts/PublicLayout.vue'
import Card from 'primevue/card'
import InputText from 'primevue/inputtext'
import Button from 'primevue/button'
import Message from 'primevue/message'
import Skeleton from 'primevue/skeleton'
import { useAppStore } from '@/stores/app'
import { useI18n } from 'vue-i18n'
import { useAVMAuthentication } from 'algorand-authentication-component-vue'
import { useNetwork, useWallet } from '@txnlab/use-wallet-vue'
import { getAVMTradeReporterAPI } from '@/api'
import type { BiatecAsset } from '@/api/models'
import algosdk from 'algosdk'
import getAlgodClient from '@/scripts/algo/getAlgodClient'
import { useToast } from 'primevue/usetoast'
import { applyLastRoundOffsetToSuggestedParams } from '@/scripts/algo/applyLastRoundOffset'

const { t } = useI18n()
const router = useRouter()
const store = useAppStore()
const { authStore, getTransactionSigner } = useAVMAuthentication()
const { activeNetworkConfig } = useNetwork()
const { transactionSigner: useWalletTransactionSigner } = useWallet()
const api = getAVMTradeReporterAPI()
const toast = useToast()

interface AssetResult {
  asset: BiatecAsset
  title: string
  subtitle: string
}

const state = reactive({
  query: '',
  isSearching: false,
  results: [] as AssetResult[],
  error: ''
})

const selectedAssetId = ref<number | null>(null)
const isOptingIn = ref(false)

const hasResults = computed(() => state.results.length > 0)
const isSearchDisabled = computed(() => !state.query.trim() || state.isSearching)

const searchAssets = async () => {
  if (!state.query.trim()) {
    state.results = []
    selectedAssetId.value = null
    return
  }

  state.isSearching = true
  state.error = ''
  state.results = []

  try {
    const response = await api.getApiSearch({ q: state.query.trim() })
    const assets = response.data.assets ?? []
    state.results = assets.map((asset) => ({
      asset,
      title: asset.params?.name || asset.params?.unitName || `#${asset.index}`,
      subtitle: asset.params?.unitName ?? ''
    }))
    if (state.results.length === 1) {
      selectedAssetId.value = Number(state.results[0].asset.index)
    }
  } catch (error) {
    console.error(error)
    state.error = error instanceof Error ? error.message : String(error)
  } finally {
    state.isSearching = false
  }
}

const optInToAsset = async () => {
  if (!selectedAssetId.value) return
  if (!authStore.account) {
    state.error = t('views.assetOptIn.errors.authenticate')
    return
  }
  if (!activeNetworkConfig.value) {
    state.error = t('views.assetOptIn.errors.network')
    return
  }

  isOptingIn.value = true
  state.error = ''

  try {
    const algod = getAlgodClient(activeNetworkConfig.value)
    const params = await algod.getTransactionParams().do()
    applyLastRoundOffsetToSuggestedParams(params, store.state.lastRoundOffset ?? 100)

    const txn = algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      sender: authStore.account,
      receiver: authStore.account,
      amount: 0,
      assetIndex: selectedAssetId.value,
      suggestedParams: params
    })

    const signer = getTransactionSigner(useWalletTransactionSigner)
    const signed = await signer([txn], [0])

    const { txid } = await algod.sendRawTransaction(signed).do()
    await algosdk.waitForConfirmation(algod, txid, 4)
    toast.add({
      severity: 'success',
      detail: t('views.assetOptIn.success.optInCompleted'),
      life: 5000
    })
    store.state.refreshAccountBalance = true
    void router.push({ name: 'trader-dashboard' })
  } catch (error) {
    console.error(error)
    state.error = error instanceof Error ? error.message : String(error)
  } finally {
    isOptingIn.value = false
  }
}

watch(
  () => state.query,
  () => {
    selectedAssetId.value = null
    searchAssets()
  }
)
</script>

<template>
  <Layout :authRequired="true">
    <div class="flex w-full flex-col gap-4 py-2">
      <Card class="mx-0">
        <template #title>
          <div class="m-2">{{ t('views.assetOptIn.title') }}</div>
        </template>
        <template #content>
          <div class="flex flex-col gap-4 m-2">
            <p class="text-sm text-gray-600 dark:text-gray-300">
              {{ t('views.assetOptIn.description') }}
            </p>
            <div class="flex flex-col gap-2">
              <label class="text-sm font-medium text-gray-700 dark:text-gray-200">
                {{ t('views.assetOptIn.searchLabel') }}
              </label>
              <div class="flex flex-col gap-2 sm:flex-row">
                <InputText
                  v-model="state.query"
                  :placeholder="t('views.assetOptIn.searchPlaceholder')"
                  class="sm:flex-1"
                />
                <Button
                  icon="pi pi-search"
                  :label="t('views.assetOptIn.searchCta')"
                  :loading="state.isSearching"
                  :disabled="isSearchDisabled"
                  @click="searchAssets"
                />
              </div>
            </div>
            <Message v-if="state.error" severity="error">{{ state.error }}</Message>
            <div v-if="state.isSearching" class="flex flex-col gap-2">
              <Skeleton v-for="n in 3" :key="n" height="2.5rem" />
            </div>
            <div v-else-if="hasResults" class="flex flex-col gap-2">
              <label
                v-for="result in state.results"
                :key="result.asset.index"
                class="flex items-center justify-between rounded border border-surface-200 dark:border-surface-700 p-3 cursor-pointer transition"
                :class="{
                  'ring-2 ring-primary-500 dark:ring-primary-400':
                    selectedAssetId === Number(result.asset.index)
                }"
              >
                <div class="flex flex-col flex-1">
                  <div>
                    <span class="font-medium text-gray-900 dark:text-gray-50">{{
                      result.title
                    }}</span>
                    <span class="text-xs text-gray-500 dark:text-gray-300" v-if="result.subtitle">
                      ({{ result.subtitle }})</span
                    >
                  </div>
                  <span class="text-xs text-gray-500 dark:text-gray-400">
                    {{ t('views.assetOptIn.assetId', { id: result.asset.index }) }}
                  </span>
                </div>
                <input
                  v-model="selectedAssetId"
                  type="radio"
                  class="ml-4"
                  :value="Number(result.asset.index)"
                  name="asset-selection"
                />
              </label>
            </div>
            <Message v-else-if="state.query && !state.isSearching" severity="info">
              {{ t('views.assetOptIn.noResults') }}
            </Message>
            <div class="flex justify-end gap-2">
              <Button
                severity="secondary"
                :label="t('common.actions.cancel')"
                @click="router.push({ name: 'trader-dashboard' })"
              />
              <Button
                icon="pi pi-check"
                severity="success"
                :label="t('views.assetOptIn.optInCta')"
                :loading="isOptingIn"
                :disabled="!selectedAssetId || isOptingIn"
                @click="optInToAsset"
              />
            </div>
          </div>
        </template>
      </Card>
    </div>
  </Layout>
</template>
