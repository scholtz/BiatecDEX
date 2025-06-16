<script setup lang="ts">
import Card from 'primevue/card'
import { useAppStore } from '@/stores/app'
import { useToast } from 'primevue/usetoast'

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
  currentLiqudity: bigint
  releasedLiqudity: bigint
  liqudityUsersFromFees: bigint
  liqudityBiatecFromFees: bigint
  poolToken: bigint
  price: bigint
  biatecFee: bigint
}
const state = reactive({
  pools: [] as FullConfig[],
  fullInfo: [] as FullConfigWithAmmStatus[]
})
const loadPools = async () => {
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
        }
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
      summary: 'Error fetching liquidity pools',
      detail: (error as Error).message,
      life: 5000
    })
  }
}
watch(
  () => authStore.isAuthenticated,
  async (isAuthenticated) => {
    if (isAuthenticated) {
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
    if (authStore.isAuthenticated && store.state.refreshMyLiquidity) {
      await loadPools()
      store.state.refreshMyLiquidity = false
    } else {
      state.pools = []
    }
  },
  { immediate: true }
)

onMounted(async () => {
  if (authStore.isAuthenticated) {
    await loadPools()
  }
})
</script>
<template>
  <Card :class="props.class">
    <template #content>
      <h2>Liquidity pools</h2>
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
        <Column field="appId" header="App ID" sortable></Column>
        <Column field="min" header="Min" sortable>
          <template #body="slotProps">
            {{
              (Number(slotProps.data.min) / 1e9).toLocaleString(undefined, {
                maximumFractionDigits: 9
              })
            }}
          </template>
        </Column>
        <Column field="mid" header="Avg" sortable>
          <template #body="slotProps">
            {{
              (Number(slotProps.data.mid) / 1e9).toLocaleString(undefined, {
                maximumFractionDigits: 9
              })
            }}
          </template>
        </Column>
        <Column field="max" header="Max" sortable>
          <template #body="slotProps">
            {{
              (Number(slotProps.data.max) / 1e9).toLocaleString(undefined, {
                maximumFractionDigits: 9
              })
            }}
          </template>
        </Column>
        <Column field="assetABalance" header="Asset A Balance">
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

        <Column field="assetBBalance" header="Asset B Balance">
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
        <Column field="fee" header="Fee">
          <template #body="slotProps">
            {{
              (Number(slotProps.data.fee) / 1e7).toLocaleString(undefined, {
                maximumFractionDigits: 7
              })
            }}%
          </template>
        </Column>
        <Column field="verificationClass" header="Verification Class"></Column>
        <Column>
          <template #body="slotProps">
            <div class="flex flex-row gap-1">
              <RouterLink :to="`/liquidity/${store.state.env}/${slotProps.data.appId}/add`">
                <Button size="small" icon="pi pi-arrow-right" title="Add liquidity" />
              </RouterLink>
              <RouterLink :to="`/liquidity/${store.state.env}/${slotProps.data.appId}/remove`">
                <Button size="small" icon="pi pi-arrow-left" title="Remove liquidity" />
              </RouterLink>
              <RouterLink :to="`/swap/${store.state.env}/${slotProps.data.appId}`">
                <Button size="small" icon="pi pi-dollar" title="Swap at this pool" />
              </RouterLink>
            </div>
          </template>
        </Column>
      </DataTable>
    </template>
  </Card>
</template>
<style></style>
