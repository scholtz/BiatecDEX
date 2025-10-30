<script setup lang="ts">
import Card from 'primevue/card'
import { useAppStore } from '@/stores/app'
import { useToast } from 'primevue/usetoast'
import { useI18n } from 'vue-i18n'

import {
  BiatecClammPoolClient,
  getPools,
  type AmmStatus,
  type FullConfig
} from 'biatec-concentrated-liquidity-amm'
import { onMounted, reactive, watch } from 'vue'
import { useNetwork } from '@txnlab/use-wallet-vue'
import getAlgodClient from '@/scripts/algo/getAlgodClient'
import { useAVMAuthentication } from 'algorand-authentication-component-vue'
import type algosdk from 'algosdk'
import { AssetsService } from '@/service/AssetsService'
import { useRoute } from 'vue-router'

const route = useRoute()
const toast = useToast()
const store = useAppStore()
const props = defineProps<{
  class?: string
}>()
const { activeNetworkConfig } = useNetwork()
const { authStore } = useAVMAuthentication()
const { t } = useI18n()
const isE2EMode = typeof window !== 'undefined' && !!window.__BIATEC_E2E
type FullConfigWithAmmStatus = {
  appId: bigint
  assetA: bigint
  assetB: bigint
  assetAUnit: string
  assetBUnit: string
  assetADecimals: number
  assetBDecimals: number
  min: bigint
  max: bigint
  mid: bigint
  fee: bigint
  lpTokenId: bigint
  verificationClass: bigint
  scale: bigint
  assetABalance: bigint
  assetBBalance: bigint
  realABalance: bigint
  realBBalance: bigint
  priceMinSqrt: bigint
  priceMaxSqrt: bigint
  currentLiquidity: bigint
  releasedLiquidity: bigint
  liquidityUsersFromFees: bigint
  liquidityBiatecFromFees: bigint
  poolToken: bigint
  price: bigint
  biatecFee: bigint
}
const state = reactive({
  pools: [] as FullConfig[],
  fullInfo: [] as FullConfigWithAmmStatus[]
})
const loadPools = async () => {
  const e2eData = typeof window !== 'undefined' ? window.__BIATEC_E2E : undefined
  if (e2eData?.pools?.length) {
    const mappedPools = e2eData.pools.map((pool) => {
      const minScaled = BigInt(Math.round(pool.min * 1e9))
      const maxScaled = BigInt(Math.round(pool.max * 1e9))
      const midScaled = BigInt(Math.round(pool.mid * 1e9))
      const priceScaled = BigInt(Math.round(pool.price * 1e9))
      return {
        appId: BigInt(pool.appId),
        assetA: BigInt(pool.assetA),
        assetB: BigInt(pool.assetB),
        assetAUnit: pool.assetAUnit ?? 'AssetA',
        assetBUnit: pool.assetBUnit ?? 'AssetB',
        assetADecimals: pool.assetADecimals ?? 6,
        assetBDecimals: pool.assetBDecimals ?? 6,
        min: minScaled,
        max: maxScaled,
        mid: midScaled,
        price: priceScaled,
        fee: BigInt(pool.fee ?? 3_000_000),
        lpTokenId: 0n,
        verificationClass: 0n,
        scale: 0n,
        assetABalance: BigInt(pool.assetABalance ?? 0),
        assetBBalance: BigInt(pool.assetBBalance ?? 0),
        realABalance: BigInt(pool.assetABalance ?? 0),
        realBBalance: BigInt(pool.assetBBalance ?? 0),
        priceMinSqrt: 0n,
        priceMaxSqrt: 0n,
        currentLiquidity: 0n,
        releasedLiquidity: 0n,
        liquidityUsersFromFees: 0n,
        liquidityBiatecFromFees: 0n,
        poolToken: 0n,
        biatecFee: 0n
      }
    })
    state.pools = []
    const targetAssetId = store.state.pair?.asset?.assetId
    const targetCurrencyId = store.state.pair?.currency?.assetId
    if (typeof targetAssetId === 'number' && typeof targetCurrencyId === 'number') {
      const filtered = mappedPools.filter(
        (pool) => pool.assetA === BigInt(targetAssetId) && pool.assetB === BigInt(targetCurrencyId)
      )
      // If filtering yields no pools (e.g., E2E asset codes not in catalog), fall back to all mapped pools
      state.fullInfo = filtered.length ? filtered : mappedPools
    } else {
      state.fullInfo = mappedPools
    }
    if (typeof window !== 'undefined') {
      window.__MY_LIQUIDITY_E2E_DEBUG = {
        targetAssetId,
        targetCurrencyId,
        fullInfoLength: state.fullInfo.length,
        poolAppIds: mappedPools.map((pool) => pool.appId.toString())
      }
    }
    store.state.pools[store.state.env] = []
    return
  }

  try {
    // if (store.state.pools[store.state.env]) {
    //   state.pools = store.state.pools[store.state.env]
    //   console.log('Using cached pools:', state.pools)
    //   return
    // }
    // if (store.state.env !== 'dockernet-v1' || !store.state.clientPP?.appId) {
    //   store.setChain('dockernet-v1')
    // }
    console.log('store?.state?.clientPP?.appId', store?.state, store?.state?.clientPP?.appId)
    if (!store?.state?.clientPP?.appId)
      throw new Error('Pool Provider App ID is not set in the store.')
    if (!store.state.clientConfig?.appId)
      throw new Error('Biatec Config Provider App ID is not set in the store.')

    const algod = getAlgodClient(activeNetworkConfig.value)
    const pools = await getPools({
      algod: algod,
      assetId: BigInt(store.state.pair.asset.assetId),
      poolProviderAppId: store.state.clientPP.appId
    })
    const fullINfoList: FullConfigWithAmmStatus[] = []
    const dummyAddress = 'TESTNTTTJDHIF5PJZUBTTDYYSKLCLM6KXCTWIOOTZJX5HO7263DPPMM2SU'
    const dummyTransactionSigner = async (
      txnGroup: algosdk.Transaction[],
      indexesToSign: number[]
    ): Promise<Uint8Array[]> => {
      console.log('transactionSigner', txnGroup, indexesToSign)
      return [] as Uint8Array[]
    }
    for (const pool of pools) {
      try {
        const biatecClammPoolClient = new BiatecClammPoolClient({
          algorand: store.state.clientPP.algorand,
          appId: pool.appId,
          defaultSender: dummyAddress,
          defaultSigner: dummyTransactionSigner
        })
        const status = await biatecClammPoolClient.status({
          args: {
            appBiatecConfigProvider: store.state.clientConfig.appId,
            assetA: pool.assetA,
            assetB: pool.assetB,
            assetLp: pool.lpTokenId
          },
          assetReferences: [pool.assetA, pool.assetB]
        })
        console.log('status', status)
        const { verificationClass, ...poolWithoutVerificationClass } = pool

        const A = await AssetsService.getAssetById(pool.assetA)
        const B = await AssetsService.getAssetById(pool.assetB)

        fullINfoList.push({
          ...poolWithoutVerificationClass,
          ...status,
          assetAUnit: A?.symbol || 'unknown',
          assetBUnit: B?.symbol || 'unknown',
          assetADecimals: A?.decimals || 0,
          assetBDecimals: B?.decimals || 0,
          mid: (pool.min + pool.max) / 2n
        })
      } catch (error) {
        console.error('Error processing pool:', pool, error)
        toast.add({
          severity: 'error',
          summary: t('components.myLiquidity.errorProcessingPool', { appId: pool.appId }),
          detail: t('components.myLiquidity.errorProcessingPoolDetail', {
            appId: pool.appId,
            error: (error as Error).message
          }),
          life: 5000
        })
      }
    }
    console.log('state.fullInfo', state.fullInfo)

    console.log('Liquidity Pools:', state.pools)
    state.pools = pools
    state.fullInfo = fullINfoList.filter(
      (pool) =>
        pool.assetA === BigInt(store.state.pair.asset.assetId) &&
        pool.assetB === BigInt(store.state.pair.currency.assetId)
    )
    store.state.pools[store.state.env] = state.pools
  } catch (error) {
    console.error('Error fetching liquidity pools:', error, store.state)
    toast.add({
      severity: 'error',
      summary: t('components.myLiquidity.errorFetchingPools'),
      detail: (error as Error).message,
      life: 5000
    })
  }
}
watch(
  () => authStore.isAuthenticated,
  async (isAuthenticated) => {
    if (isAuthenticated || isE2EMode) {
      await loadPools()
    } else {
      state.pools = []
    }
  },
  { immediate: true }
)
watch(
  () => store.state.refreshMyLiquidity,
  async () => {
    if ((authStore.isAuthenticated || isE2EMode) && store.state.refreshMyLiquidity) {
      await loadPools()
      store.state.refreshMyLiquidity = false
    } else if (!isE2EMode) {
      state.pools = []
    }
  },
  { immediate: true }
)

onMounted(async () => {
  if (authStore.isAuthenticated || isE2EMode) {
    await loadPools()
  }
})

watch(
  () => route?.params?.assetCode,
  async () => {
    await loadPools()
  }
)
watch(
  () => route?.params?.currencyCode,
  async () => {
    await loadPools()
  }
)
watch(
  () => [store.state.pair?.asset?.assetId, store.state.pair?.currency?.assetId],
  async ([assetId, currencyId]) => {
    if (!(authStore.isAuthenticated || isE2EMode)) return
    if (typeof assetId !== 'number' || typeof currencyId !== 'number') return
    await loadPools()
  }
)
</script>
<template>
  <Card :class="props.class">
    <template #content>
      <div class="flex items-center justify-between mb-4">
        <h2 class="text-lg font-semibold">{{ t('components.myLiquidity.title') }}</h2>
        <Button @click="loadPools" size="small" variant="link" class="" style="min-width: 100px">
          {{ t('components.myLiquidity.refresh') }}
        </Button>
      </div>

      <!-- {{
        JSON.stringify(state.pools, (_, value) =>
          typeof value === 'bigint' ? `${value.toString()}n` : value
        )
      }} -->
      <DataTable
        :value="state.fullInfo"
        :paginator="true"
        :rows="10"
        class="mt-2"
        sortField="mid"
        :sortOrder="1"
      >
        <template #empty>
          <div class="py-6 text-center text-sm text-gray-500 dark:text-gray-300">
            {{ t('components.myLiquidity.empty') }}
          </div>
        </template>
        <Column>
          <template #body="slotProps">
            <div class="flex flex-row gap-1">
              <RouterLink
                :to="`/liquidity/${store.state.env}/${slotProps.data.appId}/add?fee=${slotProps.data.fee}`"
              >
                <span
                  :data-cy="`my-liquidity-add-${slotProps.data.appId.toString()}`"
                  class="inline-flex"
                >
                  <Button
                    size="small"
                    icon="pi pi-arrow-right"
                    :title="t('components.myLiquidity.addLiquidity')"
                  />
                </span>
              </RouterLink>
              <RouterLink :to="`/liquidity/${store.state.env}/${slotProps.data.appId}/remove`">
                <Button
                  size="small"
                  icon="pi pi-arrow-left"
                  :title="t('components.myLiquidity.removeLiquidity')"
                />
              </RouterLink>
              <RouterLink :to="`/swap/${store.state.env}/${slotProps.data.appId}`">
                <Button
                  size="small"
                  icon="pi pi-dollar"
                  :title="t('components.myLiquidity.swapAtPool')"
                />
              </RouterLink>
            </div>
          </template>
        </Column>
        <Column field="price" :header="t('components.myLiquidity.columns.price')" sortable>
          <template #body="slotProps">
            {{
              (Number(slotProps.data.price) / 1e9).toLocaleString(undefined, {
                maximumFractionDigits: 9
              })
            }}
          </template>
        </Column>
        <Column field="min" :header="t('components.myLiquidity.columns.min')" sortable>
          <template #body="slotProps">
            <span :data-cy="`my-liquidity-min-${slotProps.data.appId.toString()}`">
              {{
                (Number(slotProps.data.min) / 1e9).toLocaleString(undefined, {
                  maximumFractionDigits: 9
                })
              }}
            </span>
          </template>
        </Column>
        <Column field="mid" :header="t('components.myLiquidity.columns.avg')" sortable>
          <template #body="slotProps">
            {{
              (Number(slotProps.data.mid) / 1e9).toLocaleString(undefined, {
                maximumFractionDigits: 9
              })
            }}
          </template>
        </Column>
        <Column field="max" :header="t('components.myLiquidity.columns.max')" sortable>
          <template #body="slotProps">
            <span :data-cy="`my-liquidity-max-${slotProps.data.appId.toString()}`">
              {{
                (Number(slotProps.data.max) / 1e9).toLocaleString(undefined, {
                  maximumFractionDigits: 9
                })
              }}
            </span>
          </template>
        </Column>
        <Column field="assetABalance" :header="t('components.myLiquidity.columns.assetABalance')">
          <template #body="slotProps">
            {{
              (
                Number((slotProps.data as FullConfigWithAmmStatus).assetABalance) / 1e9
              ).toLocaleString(undefined, {
                maximumFractionDigits: (slotProps.data as FullConfigWithAmmStatus).assetADecimals
              })
            }}
            {{ slotProps.data.assetAUnit }}
          </template>
        </Column>

        <Column field="assetBBalance" :header="t('components.myLiquidity.columns.assetBBalance')">
          <template #body="slotProps">
            {{
              (
                Number((slotProps.data as FullConfigWithAmmStatus).assetBBalance) / 1e9
              ).toLocaleString(undefined, {
                maximumFractionDigits: (slotProps.data as FullConfigWithAmmStatus).assetBDecimals
              })
            }}
            {{ slotProps.data.assetBUnit }}
          </template>
        </Column>
        <Column field="fee" :header="t('components.myLiquidity.columns.baseLpFee')">
          <template #body="slotProps">
            {{
              (Number(slotProps.data.fee) / 1e7).toLocaleString(undefined, {
                maximumFractionDigits: 7
              })
            }}%
          </template>
        </Column>
        <Column
          field="verificationClass"
          :header="t('components.myLiquidity.columns.verificationClass')"
        ></Column>
        <Column field="appId" :header="t('components.myLiquidity.columns.appId')" sortable></Column>
      </DataTable>
    </template>
  </Card>
</template>
<style></style>
