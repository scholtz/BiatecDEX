<script setup lang="ts">
import Card from 'primevue/card'
import { useAppStore } from '@/stores/app'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import InputGroup from 'primevue/inputgroup'
import InputGroupAddon from 'primevue/inputgroupaddon'
import InputNumber from 'primevue/inputnumber'
import Slider from 'primevue/slider'
import { onMounted, reactive, watch } from 'vue'
import initPriceDecimals from '@/scripts/asset/initPriceDecimals'
import fetchBids from '@/scripts/asset/fetchBids'
import fetchOffers from '@/scripts/asset/fetchOffers'
import calculateMidAndRange from '@/scripts/asset/calculateMidAndRange'
import calculateDistribution from '@/scripts/asset/calculateDistribution'

import formatNumber from '@/scripts/asset/formatNumber'
import Chart from 'primevue/chart'

import {
  BiatecClammPoolClient,
  clammAddLiquiditySender,
  clammBootstrapSender,
  clammCreateSender,
  clientBiatecClammPool,
  getPools,
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

const { authStore, getTransactionSigner } = useAVMAuthentication()
const { activeNetworkConfig } = useNetwork()
const { transactionSigner: useWalletTransactionSigner } = useWallet()
const toast = useToast()
const store = useAppStore()
const props = defineProps<{
  class?: string
}>()
interface IChartData {
  labels: string[]
  datasets: {
    label: string
    data: number[]
    borderWidth: number
    yAxisID: string
  }[]
}
interface IChartOptions {
  scales: {
    x: {
      ticks: {
        color: string
      }
      grid: {
        color: string
      }
    }
    y: {
      type: string
      display: boolean
      position: string
      ticks: {
        color: string
      }
      grid: {
        color: string
      }
    }
    y1?: {
      type?: string
      display?: boolean
      position?: string
      ticks?: {
        color?: string
      }
      grid?: {
        drawOnChartArea?: boolean
        color?: string
      }
    }
  }
}
const state = reactive({
  shape: 'focused' as 'spread' | 'focused' | 'equal' | 'single' | 'wall',
  fee: 0.3,
  prices: [0, 1],
  tickLow: 1,
  priceDecimalsLow: 3,
  tickHigh: 1,
  priceDecimalsHigh: 3,
  sliderMin: 0,
  sliderMax: 10,
  chartData: null as IChartData | null,
  chartOptions: null as IChartOptions | null,
  depositAssetAmount: 100,
  depositCurrencyAmount: 100,
  fetchingQuotes: false,
  midPrice: 0,
  midRange: 0,
  showPriceForm: true,
  pricesApplied: false,
  pools: [] as FullConfig[]
})
const initPriceDecimalsState = () => {
  const decLow = initPriceDecimals(state.prices[0], 2)
  state.tickLow = decLow.tick
  state.priceDecimalsLow = decLow.priceDecimals ?? 3
  const decHigh = initPriceDecimals(state.prices[1], 2)
  state.tickHigh = decHigh.tick
  state.priceDecimalsHigh = decHigh.priceDecimals ?? 3
  if (decLow.fitPrice && decHigh.fitPrice) {
    state.prices = [decLow.fitPrice, decHigh.fitPrice]
  }
  setChartData()
}
const fetchData = async () => {
  try {
    if (store.state.clientPP) {
      try {
        console.log('loading price')
        const assetAsset = AssetsService.getAsset(store.state.assetCode)

        console.log(
          'AssetsService.getAsset(store.state.assetCode)',
          store.state.assetCode,
          store.state.currencyCode
        )
        if (!assetAsset) throw Error('Asset A not found')
        const assetCurrency = AssetsService.getAsset(store.state.currencyCode)
        if (!assetCurrency) throw Error('Asset currency not found')
        const assetAId = Math.min(assetAsset.assetId, assetCurrency.assetId)
        const assetBId = Math.max(assetAsset.assetId, assetCurrency.assetId)
        console.log('getPrice', {
          appPoolId: 0n,
          assetA: assetAId,
          assetB: assetBId
        })
        const price = await store.state.clientPP.getPrice({
          args: {
            appPoolId: 0n,
            assetA: assetAId,
            assetB: assetBId
          },
          sender: authStore.account
        })
        console.log('price', price)
        if (price) {
          state.midPrice = Number(price.latestPrice) / 10 ** 9
          state.prices = [state.midPrice * 0.95, state.midPrice / 0.95]
          state.sliderMin = state.midPrice * 0.8
          state.sliderMax = state.midPrice / 0.8
        }
        state.showPriceForm = false
        state.pricesApplied = true
        return
      } catch (e) {
        console.error('failed to fetch price', e)
      }
    }

    state.fetchingQuotes = true
    await Promise.allSettled([fetchBids(store.state), fetchOffers(store.state)])
    state.fetchingQuotes = false

    const midAndRange = calculateMidAndRange(store.state)
    console.log('midAndRange', midAndRange)
    if (midAndRange) {
      state.midPrice = midAndRange.midPrice
      state.midRange = midAndRange.midRange

      document.title =
        formatNumber(state.midPrice) +
        ' ' +
        store.state.pair.asset.symbol +
        '/' +
        store.state.pair.currency.symbol +
        ' | Biatec DEX'

      if (store.state.price == 0) {
        store.state.price = state.midPrice
      }

      state.prices = [state.midPrice * 0.95, state.midPrice / 0.95]
      state.sliderMin = state.midPrice * 0.8
      state.sliderMax = state.midPrice / 0.8
    } else {
      state.showPriceForm = true
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

watch(
  () => state.prices[0],
  () => {
    if (state.prices[0] > state.prices[1]) {
      const tmp = state.prices[0]
      state.prices[0] = state.prices[1]
      state.prices[1] = tmp
    } else {
      initPriceDecimalsState()
    }
  }
)
watch(
  () => state.prices[1],
  () => {
    if (state.prices[0] > state.prices[1]) {
      const tmp = state.prices[0]
      state.prices[0] = state.prices[1]
      state.prices[1] = tmp
    } else {
      initPriceDecimalsState()
    }
  }
)
watch(
  () => state.shape,
  () => {
    setChartData()
  }
)
watch(
  () => state.depositAssetAmount,
  () => {
    setChartData()
  }
)
watch(
  () => state.depositCurrencyAmount,
  () => {
    setChartData()
  }
)

const setChartData = () => {
  const distribution = calculateDistribution({
    type: state.shape,
    visibleFrom: state.sliderMin,
    visibleTo: state.sliderMax,
    midPrice: state.midPrice,
    lowPrice: state.prices[0],
    highPrice: state.prices[1],
    depositAssetAmount: state.depositAssetAmount,
    depositCurrencyAmount: state.depositCurrencyAmount
  })
  console.log('distribution', distribution)
  state.chartData = {
    labels: distribution.labels,
    datasets: [
      {
        label: store.state.pair.asset.name,
        data: distribution.asset1,
        borderWidth: 1,
        yAxisID: 'y'
      },
      {
        label: store.state.pair.currency.name,
        data: distribution.asset2,
        borderWidth: 1,
        yAxisID: 'y1'
      }
    ]
  }
}
const setChartOptions = () => {
  const documentStyle = getComputedStyle(document.documentElement)
  const textColor = documentStyle.getPropertyValue('--text-color')
  const textColorSecondary = documentStyle.getPropertyValue('--text-color-secondary')
  const surfaceBorder = documentStyle.getPropertyValue('--surface-border')

  return {
    scales: {
      x: {
        ticks: {
          color: textColorSecondary
        },
        grid: {
          color: surfaceBorder
        }
      },
      y: {
        type: 'linear',
        display: true,
        position: 'left',
        ticks: {
          color: textColorSecondary
        },
        grid: {
          color: surfaceBorder
        }
      },
      y1: {
        type: 'linear',
        display: true,
        position: 'right',
        ticks: {
          color: textColorSecondary
        },
        grid: {
          drawOnChartArea: false,
          color: surfaceBorder
        }
      }
    }
  }
}
onMounted(async () => {
  await fetchData()
  initPriceDecimalsState()
  setChartData()
  state.chartOptions = setChartOptions()
})

const loadPools = async (refresh: boolean = false) => {
  try {
    if (!refresh) {
      if (store.state.pools[store.state.env]) {
        state.pools = store.state.pools[store.state.env]
        console.log('Using cached pools:', state.pools)
        return
      }
    }
    store.setChain('dockernet-v1')
    console.log('store?.state?.clientPP?.appId', store?.state, store?.state?.clientPP?.appId)
    if (!store?.state?.clientPP?.appId)
      throw new Error('Pool Provider App ID is not set in the store.')

    const algod = getAlgodClient(activeNetworkConfig.value)
    state.pools = await getPools({
      algod: algod,
      assetId: BigInt(store.state.pair.asset.assetId),
      poolProviderAppId: store.state.clientPP.appId
    })
    console.log('Liquidity Pools:', state.pools)

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
const addLiquidityClick = async () => {
  try {
    console.log(
      'store.state.assetCode,store.state.currencyCode',
      store.state.assetCode,
      store.state.currencyCode
    )
    //
    if (!store) return
    store.setChain('dockernet-v1')
    const algodClient = getAlgodClient(activeNetworkConfig.value)
    // const signer = {
    //   addr: authStore.account,
    //   // eslint-disable-next-line no-unused-vars
    //   signer: async (txnGroup: Transaction[], indexesToSign: number[]) => {
    //     console.log('tosign', txnGroup)
    //     const groupedEncoded = txnGroup.map((tx) => tx.toByte())
    //     return (await store.state.authComponent.sign(groupedEncoded)) as Uint8Array[]
    //   }
    // }
    const signer = getTransactionSigner(useWalletTransactionSigner)

    console.log('signer', store.state.assetCode, store.state.currencyCode)
    const signerAccount: TransactionSignerAccount = {
      addr: algosdk.decodeAddress(authStore.account),
      signer: signer
    }
    // 1. check if the bin exists
    // type PoolConfig = {
    //   assetA: uint64;
    //   assetB: uint64;
    //   min: uint64;
    //   max: uint64;
    //   fee: uint64;
    //   verificationClass: uint64;
    // };
    const assetAsset = AssetsService.getAsset(store.state.assetCode)

    console.log(
      'AssetsService.getAsset(store.state.assetCode)',
      store.state.assetCode,
      store.state.currencyCode
    )
    if (!assetAsset) throw Error('Asset A not found')
    const assetCurrency = AssetsService.getAsset(store.state.currencyCode)
    if (!assetCurrency) throw Error('Asset currency not found')
    console.log('assetAsset,assetCurrency', assetAsset, assetCurrency)
    const assetAOrdered = BigInt(
      assetAsset.assetId < assetCurrency.assetId ? assetAsset.assetId : assetCurrency.assetId
    )
    const assetBOrdered = BigInt(
      assetAsset.assetId < assetCurrency.assetId ? assetCurrency.assetId : assetAsset.assetId
    )

    console.log('assetAOrdered,assetBOrdered', assetAOrdered, assetBOrdered)
    const lpFee = 1_000_000n // (0,001 = 0,1%)
    const verificationClass = 0 // (0,001 = 0,1%)

    if (!store.state.clientConfig) {
      throw new Error('Client configuration is not set')
    }
    if (!store.state.clientPP) {
      throw new Error('PP configuration is not set')
    }
    if (!store.state.clientIdentity) {
      throw new Error('Identity configuration is not set')
    }

    await loadPools() // check for existing pools

    console.log(
      'assetAOrdered,assetBOrdered,normalizedTickLow,normalizedTickHigh',
      assetAOrdered,
      assetBOrdered,
      state.tickLow,
      state.tickHigh
    )

    const distribution = calculateDistribution({
      type: state.shape,
      visibleFrom: state.sliderMin,
      visibleTo: state.sliderMax,
      midPrice: state.midPrice,
      lowPrice: state.prices[0],
      highPrice: state.prices[1],
      depositAssetAmount: state.depositAssetAmount,
      depositCurrencyAmount: state.depositCurrencyAmount
    })
    console.log('distribution', distribution)
    let createdPools = 0
    await loadPools(true)
    for (let index in distribution.labels) {
      if (distribution.asset1[index] === 0 && distribution.asset2[index] === 0) continue
      console.log('distribution.labels[index]', distribution.labels[index])

      const normalizedTickLow = BigInt(Math.round(distribution.min[index] * 10 ** 9))
      const normalizedTickHigh = BigInt(Math.round(distribution.max[index] * 10 ** 9))
      let pool = state.pools.find(
        (p) =>
          p.assetA === assetAOrdered &&
          p.assetB === assetBOrdered &&
          p.min == normalizedTickLow &&
          p.max == normalizedTickHigh &&
          p.fee == lpFee &&
          p.verificationClass == verificationClass
      )
      let biatecClammPoolClient: BiatecClammPoolClient | undefined = undefined
      if (!pool) {
        console.log('create pool', {
          assetA: assetAOrdered,
          assetB: assetBOrdered,
          appBiatecConfigProvider: store.state.clientConfig.appId,
          clientBiatecPoolProvider: store.state.clientPP,
          currentPrice: BigInt(state.midPrice * 10 ** 9),
          priceMax: normalizedTickHigh,
          priceMin: normalizedTickLow,
          transactionSigner: signerAccount,
          fee: lpFee,
          verificationClass: verificationClass
        })
        biatecClammPoolClient = await clammCreateSender({
          assetA: assetAOrdered,
          assetB: assetBOrdered,
          appBiatecConfigProvider: store.state.clientConfig.appId,
          clientBiatecPoolProvider: store.state.clientPP,
          currentPrice: BigInt(state.midPrice * 10 ** 9),
          priceMax: normalizedTickHigh,
          priceMin: normalizedTickLow,
          transactionSigner: signerAccount,
          fee: lpFee,
          verificationClass: verificationClass
        })

        console.log('biatecClammPoolClient', biatecClammPoolClient)

        // const bootstrapPoolTx = await clammBootstrapSender({
        //   assetA: assetAOrdered,
        //   assetB: assetBOrdered,
        //   appBiatecConfigProvider: store.state.clientConfig.appId,
        //   fee: lpFee,
        //   verificationClass: verificationClass,
        //   appBiatecPoolProvider: store.state.clientPP.appId,
        //   clientBiatecClammPool: biatecClammPoolClient
        // })
        createdPools++
        //console.log('bootstrapPoolTx', bootstrapPoolTx)
      } else {
        biatecClammPoolClient = new BiatecClammPoolClient({
          algorand: store.state.clientPP.algorand,
          appId: pool.appId,
          defaultSender: signerAccount.addr,
          defaultSigner: signerAccount.signer
        })
      }
    }
    if (createdPools > 0) {
      toast.add({
        severity: 'info',
        detail: `${createdPools} new pools created!`,
        life: 5000
      })
    }
    // now add the liquidity

    await loadPools(true) // check for existing pools

    console.log('distribution', distribution)
    for (let index in distribution.labels) {
      if (distribution.asset1[index] === 0 && distribution.asset2[index] === 0) continue
      const normalizedTickLow = BigInt(Math.round(distribution.min[index] * 10 ** 9))
      const normalizedTickHigh = BigInt(Math.round(distribution.max[index] * 10 ** 9))
      const pool = state.pools.find(
        (p) =>
          p.assetA === assetAOrdered &&
          p.assetB === assetBOrdered &&
          p.min == normalizedTickLow &&
          p.max == normalizedTickHigh &&
          p.fee == lpFee &&
          p.verificationClass == verificationClass
      )
      if (!pool) {
        throw new Error('Pool not found after creation')
      }
      const biatecClammPoolClient = new BiatecClammPoolClient({
        algorand: store.state.clientPP.algorand,
        appId: pool.appId,
        defaultSender: signerAccount.addr,
        defaultSigner: signerAccount.signer
      })
      // clammAddLiquiditySender({
      //   account: signerAccount,
      //   assetA: assetAOrdered,
      //   assetB: assetBOrdered,
      //   appBiatecConfigProvider: store.state.clientConfig.appId,
      //   algod: algodClient,
      //   clientBiatecClammPool: biatecClammPoolClient,
      //   appBiatecIdentityProvider: store.state.clientIdentity.appId,
      //   assetADeposit: BigInt(state.depositAssetAmount * 10 ** assetAsset.decimals),
      //   assetBDeposit: BigInt(state.depositCurrencyAmount * 10 ** assetCurrency.decimals),
      //   assetLp: pool.lpTokenId,
      //   clientBiatecPoolProvider: store.state.clientPP
      // })
      const params = await algodClient.getTransactionParams().do()

      // const optin = makeAssetTransferTxnWithSuggestedParamsFromObject({
      //   amount: 0n,
      //   assetIndex: pool.lpTokenId,
      //   receiver: signerAccount.addr,
      //   sender: signerAccount.addr,
      //   suggestedParams: params
      // })

      // const optinSigned = await signerAccount.signer([optin], [0])
      // if (!optinSigned) {
      //   throw new Error('Opt-in transaction signing failed')
      // }

      //const optinTx = await algodClient.sendRawTransaction(optinSigned[0]).do()
      //await algosdk.waitForConfirmation(algodClient, optinTx.txid, 4)
      console.log('add liqudity', {
        account: signerAccount,
        assetA: assetAOrdered,
        assetB: assetBOrdered,
        appBiatecConfigProvider: store.state.clientConfig.appId,
        algod: algodClient,
        clientBiatecClammPool: biatecClammPoolClient,
        appBiatecIdentityProvider: store.state.clientIdentity.appId,
        assetADeposit: BigInt(state.depositAssetAmount * 10 ** assetAsset.decimals),
        assetBDeposit: BigInt(state.depositCurrencyAmount * 10 ** assetCurrency.decimals),
        assetLp: pool.lpTokenId,
        clientBiatecPoolProvider: store.state.clientPP
      })
      const liquidity = await clammAddLiquiditySender({
        account: signerAccount,
        assetA: assetAOrdered,
        assetB: assetBOrdered,
        appBiatecConfigProvider: store.state.clientConfig.appId,
        algod: algodClient,
        clientBiatecClammPool: biatecClammPoolClient,
        appBiatecIdentityProvider: store.state.clientIdentity.appId,
        assetADeposit: BigInt(state.depositAssetAmount * 10 ** assetAsset.decimals),
        assetBDeposit: BigInt(state.depositCurrencyAmount * 10 ** assetCurrency.decimals),
        assetLp: pool.lpTokenId,
        clientBiatecPoolProvider: store.state.clientPP
      })
      // const liquidity = await biatecClammPoolClient.send.addLiquidity({
      //   args: {
      //     appBiatecConfigProvider: store.state.clientConfig.appId,
      //     appBiatecIdentityProvider: store.state.clientIdentity.appId,
      //     assetA: assetAOrdered,
      //     assetB: assetBOrdered,
      //     assetLp: pool.lpTokenId,
      //     txAssetADeposit: algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      //       amount: BigInt(state.depositAssetAmount * 10 ** assetAsset.decimals),
      //       assetIndex: assetAOrdered,
      //       receiver: biatecClammPoolClient.appAddress,
      //       sender: signerAccount.addr,
      //       suggestedParams: params
      //     }),
      //     txAssetBDeposit: algosdk.makeAssetTransferTxnWithSuggestedParamsFromObject({
      //       amount: BigInt(state.depositCurrencyAmount * 10 ** assetCurrency.decimals),
      //       assetIndex: assetBOrdered,
      //       receiver: biatecClammPoolClient.appAddress,
      //       sender: signerAccount.addr,
      //       suggestedParams: params
      //     })
      //   },
      //   extraFee: AlgoAmount.MicroAlgos(5000)
      // })
      console.log('liquidity', liquidity)
      /*
      depositAssetAmount: BigInt(state.depositAssetAmount),
    depositCurrencyAmount: BigInt(state.depositCurrencyAmount),
    poolProviderAppId: store.state.clientPP.appId

  */
    }
    toast.add({
      severity: 'info',
      detail: 'Liquidity added successfully!',
      life: 5000
    })
  } catch (err) {
    console.error('Error adding liquidity:', err)
    toast.add({
      severity: 'error',
      detail: err instanceof Error ? err.message : String(err),
      life: 5000
    })
    await loadPools() // check for existing pools
  }
}

const applyMidPriceClick = () => {
  state.prices = [state.midPrice * 0.95, state.midPrice / 0.95]
  state.sliderMin = state.midPrice * 0.8
  state.sliderMax = state.midPrice / 0.8
  initPriceDecimalsState()
  state.pricesApplied = true
  console.log('state.pricesApplied', state.pricesApplied)
}
</script>
<template>
  <Card :class="props.class">
    <template #content>
      <h2>Add liquidity</h2>
      <div v-if="state.showPriceForm">
        <p>We could not fetch the current price for the pair. Please set the prices manually.</p>

        <InputGroup class="my-2">
          <InputNumber v-model="state.midPrice" :min="0" :step="0.001" show-buttons></InputNumber>
          <InputGroupAddon class="w-12rem">
            <div class="px-3">
              {{ store.state.pair.asset.symbol }}/{{ store.state.pair.currency.symbol }}
            </div>
          </InputGroupAddon>
          <Button @click="applyMidPriceClick" class="my-2"> Apply </Button>
        </InputGroup>
      </div>
      <p>
        Liquidity shape allows you to place your liquidity into several bins and aggragete liquidity
        with other liqudity providers.
      </p>
      <div v-if="!state.showPriceForm || (state.showPriceForm && state.pricesApplied)">
        <Button
          class="mr-2 mb-2"
          :severity="state.shape === 'focused' ? 'primary' : 'secondary'"
          @click="state.shape = 'focused'"
        >
          Focused liquidity shape
        </Button>
        <Button
          class="mr-2 mb-2"
          :severity="state.shape === 'spread' ? 'primary' : 'secondary'"
          @click="state.shape = 'spread'"
        >
          Spread shape
        </Button>
        <Button
          class="mr-2 mb-2"
          :severity="state.shape === 'equal' ? 'primary' : 'secondary'"
          @click="state.shape = 'equal'"
        >
          Equal bin shape
        </Button>
        <Button
          class="mr-2 mb-2"
          :severity="state.shape === 'single' ? 'primary' : 'secondary'"
          @click="state.shape = 'single'"
        >
          Single bin shape
        </Button>
        <Button
          class="mr-2 mb-2"
          :severity="state.shape === 'wall' ? 'primary' : 'secondary'"
          @click="state.shape = 'wall'"
        >
          Wall order
        </Button>
        <p v-if="state.shape === 'focused'">
          Focused liquidity shape takes current price and adds the most liqudity to the current bin
          price. It adds little less liquidity to the surrounding bins, and adds minimum liquidity
          to the min and max price.
        </p>
        <p v-if="state.shape === 'spread'">
          Spread liquidity shape takes current price and adds the small liqudity to the current bin
          price. It adds little more liquidity to the surrounding bins, and adds maximum liquidity
          to the min and max price.
        </p>
        <p v-if="state.shape === 'equal'">
          Equal liquidity shape adds the same liquidity to all bins from min to max price.
        </p>
        <p v-if="state.shape === 'single'">
          Single bin does not use the bin tick system but uses the single liquidity pool with
          defined minimum price and maximum price.
        </p>
        <p v-if="state.shape === 'wall'">
          Wall order allows you to define the single price and when current price is below, others
          can buy at the price level, and if the current price is above the fixed price others will
          sell at the price level. This order type allows you to make a liquidity wall, and you will
          earn money whenever the price is volatile over this price level.
        </p>
        <!-- <h3>Trading fee</h3>
        <p>
          You can set the trading fee ranging from 0% to 10% with precision on 6 decimal places.
          This trading fee is the liquidity provider income. It is compounded automatically in each
          trading bin. It is recommended to use the common trading fees so that you will aggragate
          your liquidity with other LPs. Trading fee set in here is the base from which the trader's
          fee is calculated according to his engagement level. New traders will pay to you 2x of the
          base fee, while gaining the trading experience reduces the trading fee to the base level.
        </p>
        <InputGroup>
          <InputNumber
            v-model="state.fee"
            :min="0"
            :max="10"
            :step="0.1"
            :max-fraction-digits="6"
            show-buttons
          ></InputNumber>
          <InputGroupAddon>%</InputGroupAddon>
        </InputGroup> -->
        <div v-if="state.shape === 'wall'">
          <h3>Price Wall</h3>
          <Slider
            v-model="state.prices[0]"
            class="w-full my-2"
            :step="state.tickHigh"
            :max-fraction-digits="state.priceDecimalsHigh"
            :min="state.sliderMin"
            :max="state.sliderMax"
          />
          <InputGroup>
            <InputNumber
              v-model="state.prices[0]"
              :min="0"
              :max-fraction-digits="state.priceDecimalsLow"
              :step="state.tickLow"
              show-buttons
            ></InputNumber>
            <InputGroupAddon class="w-12rem">
              <div class="px-3">
                {{ store.state.pair.asset.symbol }}/{{ store.state.pair.currency.symbol }}
              </div>
            </InputGroupAddon>
          </InputGroup>
        </div>

        <div v-else>
          <h3>Prices</h3>
          <div v-if="state.shape !== 'single'">
            <Chart
              v-if="state.chartData && state.chartOptions"
              type="bar"
              :data="state.chartData"
              :options="state.chartOptions"
              :height="50"
            />
          </div>
          <div class="mx-5 my-2">
            <Slider
              v-model="state.prices"
              range
              class="w-full"
              :step="state.tickHigh"
              :max-fraction-digits="state.priceDecimalsHigh"
              :min="state.sliderMin"
              :max="state.sliderMax"
            />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="col">
              <label for="lowPrice"> Low price </label>
              <InputGroup>
                <InputNumber
                  inputId="lowPrice"
                  v-model="state.prices[0]"
                  :min="0"
                  :max="state.prices[1]"
                  :max-fraction-digits="state.priceDecimalsLow"
                  :step="state.tickLow"
                  show-buttons
                ></InputNumber>
                <InputGroupAddon class="w-12rem">
                  <div class="px-3">
                    {{ store.state.pair.asset.symbol }}/{{ store.state.pair.currency.symbol }}
                  </div>
                </InputGroupAddon>
              </InputGroup>
            </div>
            <div class="col">
              <label for="highPrice"> High price </label>
              <InputGroup>
                <InputNumber
                  inputId="highPrice"
                  v-model="state.prices[1]"
                  :min="0"
                  :max-fraction-digits="state.priceDecimalsHigh"
                  :step="state.tickHigh"
                  show-buttons
                ></InputNumber>
                <InputGroupAddon class="w-12rem">
                  <div class="px-3">
                    {{ store.state.pair.asset.symbol }}/{{ store.state.pair.currency.symbol }}
                  </div>
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-2">
            <div class="col">
              <label for="depositAssetAmount"> Deposit {{ store.state.pair.asset.name }} </label>
              <InputGroup>
                <InputNumber
                  inputId="depositAssetAmount"
                  v-model="state.depositAssetAmount"
                  :min="0"
                  :max-fraction-digits="store.state.pair.asset.decimals"
                  :step="1"
                  show-buttons
                ></InputNumber>
                <InputGroupAddon class="w-12rem">
                  <div class="px-3">
                    {{ store.state.pair.asset.symbol }}
                  </div>
                </InputGroupAddon>
              </InputGroup>
            </div>
            <div class="col">
              <label for="depositCurrencyAmount">
                Deposit {{ store.state.pair.currency.name }}
              </label>
              <InputGroup>
                <InputNumber
                  inputId="depositCurrencyAmount"
                  v-model="state.depositCurrencyAmount"
                  :min="0"
                  :step="1"
                  :max-fraction-digits="store.state.pair.currency.decimals"
                  show-buttons
                ></InputNumber>
                <InputGroupAddon class="w-12rem">
                  <div class="px-3">
                    {{ store.state.pair.currency.symbol }}
                  </div>
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>

          <Button v-if="!authStore.isAuthenticated" @click="store.state.forceAuth = true">
            Authenticate please
          </Button>
          <Button v-else @click="addLiquidityClick" class="my-2">Add liquidity</Button>
        </div>
      </div>
    </template>
  </Card>
</template>
<style></style>
