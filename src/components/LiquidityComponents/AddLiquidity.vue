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
import { useI18n } from 'vue-i18n'
import initPriceDecimals from '@/scripts/asset/initPriceDecimals'
import fetchBids from '@/scripts/asset/fetchBids'
import fetchOffers from '@/scripts/asset/fetchOffers'
import calculateMidAndRange from '@/scripts/asset/calculateMidAndRange'
import calculateDistribution from '@/scripts/asset/calculateDistribution'
import BigNumber from 'bignumber.js'

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
import { useRoute } from 'vue-router'
import { outputCalculateDistributionToString } from '@/scripts/clamm/outputCalculateDistributionToString'
interface IOutputCalculateDistribution {
  labels: string[]
  asset1: BigNumber[]
  asset2: BigNumber[]
  min: BigNumber[]
  max: BigNumber[]
}
const { authStore, getTransactionSigner } = useAVMAuthentication()
const { activeNetworkConfig } = useNetwork()
const { transactionSigner: useWalletTransactionSigner } = useWallet()
const toast = useToast()
const route = useRoute()
const store = useAppStore()
const { t } = useI18n()
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
  shape: 'focused' as 'single' | 'spread' | 'focused' | 'equal' | 'wall',
  fee: 0.3,
  lpFee: 1_000_000n,
  prices: [0, 1],
  tickLow: 1,
  priceDecimalsLow: 3,
  tickHigh: 1,
  priceDecimalsHigh: 3,
  sliderMin: 0,
  sliderMax: 10,
  minPrice: 0,
  maxPrice: 10,
  minPriceTrade: 0,
  maxPriceTrade: 10,
  chartData: null as IChartData | null,
  chartOptions: null as IChartOptions | null,
  depositAssetAmount: 0,
  depositCurrencyAmount: 0,
  balanceAsset: 0,
  balanceCurrency: 0,
  fetchingQuotes: false,
  midPrice: 0,
  midRange: 0,
  precision: 1,
  showPriceForm: true,
  pricesApplied: false,
  pools: [] as FullConfig[],
  distribution: null as null | IOutputCalculateDistribution,
  ticksCalculated: false
})

const sliderPrice2DistributionPrice = (sliderPricePoint: number, getMin: boolean): BigNumber => {
  if (!state.distribution || !state.distribution.min) return new BigNumber(1)
  if (state.distribution.min.length <= sliderPricePoint) return new BigNumber(1)
  let value = state.distribution.max.at(sliderPricePoint)
  if (getMin) {
    value = state.distribution.min.at(sliderPricePoint)
  }
  return value instanceof BigNumber ? value : new BigNumber(value ?? 1)
}
const initPriceDecimalsState = () => {
  const decLow = initPriceDecimals(
    sliderPrice2DistributionPrice(state.prices[0], true),
    new BigNumber(state.precision)
  )
  state.tickLow = decLow.tick.toNumber()
  state.priceDecimalsLow = decLow.priceDecimals.toNumber() ?? 3
  const decHigh = initPriceDecimals(
    sliderPrice2DistributionPrice(state.prices[1], false),
    new BigNumber(state.precision)
  )
  state.tickHigh = decHigh.tick.toNumber()
  state.priceDecimalsHigh = decHigh.priceDecimals.toNumber() ?? 3
  // if (decLow.fitPrice && decHigh.fitPrice) {
  //   //state.prices = [decLow.fitPrice.toNumber(), decHigh.fitPrice.toNumber()]
  //   state.minPriceTrade = decLow.fitPrice.toNumber()
  //   state.maxPriceTrade = decHigh.fitPrice.toNumber()
  // }
  setChartData()
}
const checkLoad = async () => {
  if (route.params.network) {
    if (store.state.env !== route.params.network) {
      console.log('Setting network to:', route.params.network)
      store.setChain(
        route.params.network as 'mainnet-v1.0' | 'voimain-v1.0' | 'testnet-v1.0' | 'dockernet-v1'
      )
    }
  }
  if (route.params.ammAppId && store.state.clientConfig) {
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
      appId: BigInt(route.params.ammAppId as string),
      defaultSender: dummyAddress,
      defaultSigner: dummyTransactionSigner
    })
    const ammPoolState = await biatecClammPoolClient.state.global.getAll()
    if (ammPoolState && ammPoolState.priceMin && ammPoolState.priceMax) {
      if (ammPoolState.priceMin == ammPoolState.priceMax) {
        state.shape = 'wall'
        state.minPriceTrade = Number(ammPoolState.priceMin) / 1e9
        state.maxPriceTrade = Number(ammPoolState.priceMax) / 1e9
      } else {
        state.shape = 'single'
        state.minPriceTrade = Number(ammPoolState.priceMin) / 1e9
        state.maxPriceTrade = Number(ammPoolState.priceMax) / 1e9
      }

      //state.prices = [Number(ammPoolState.priceMin) / 1e9, Number(ammPoolState.priceMax) / 1e9]
    }
  }
}
const fetchData = async () => {
  try {
    if (route.name == 'add-liquidity') {
      document.title = 'Add Liquidity | Biatec DEX'
    } else if (route.name == 'remove-liquidity') {
      document.title = 'Remove Liquidity | Biatec DEX'
    } else if (route.name == 'pool-swap') {
      document.title = 'Pool Swap | Biatec DEX'
    } else {
      document.title = 'Liquidity | Biatec DEX'
    }
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
    if (store.state.clientPP) {
      try {
        const assetAId = assetAsset.assetId
        const assetBId = assetCurrency.assetId
        console.log('getPrice', {
          appPoolId: 0n,
          assetA: assetAId,
          assetB: assetBId
        })
        const dummyAddress = 'TESTNTTTJDHIF5PJZUBTTDYYSKLCLM6KXCTWIOOTZJX5HO7263DPPMM2SU'
        const dummyTransactionSigner = async (
          txnGroup: algosdk.Transaction[],
          indexesToSign: number[]
        ): Promise<Uint8Array[]> => {
          console.log('transactionSigner', txnGroup, indexesToSign)
          return [] as Uint8Array[]
        }
        const price = await store.state.clientPP.getPrice({
          args: {
            appPoolId: 0n,
            assetA: assetAId,
            assetB: assetBId
          },
          sender: dummyAddress,
          signer: dummyTransactionSigner
        })
        console.log(
          'state.precision',
          state.precision,
          assetAsset.precision,
          assetCurrency.precision
        )
        if (price) {
          state.precision = Math.min(assetAsset.precision, assetCurrency.precision)
          if (state.precision == 1) {
            state.midPrice = Number(price.latestPrice) / 10 ** 9
          } else {
            state.midPrice = Number(price.latestPrice) / 10 ** 9
          }
          state.ticksCalculated = false
          setSliderAndTick()
        }
        state.showPriceForm = false
        state.pricesApplied = true
        await checkLoad()
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
      state.ticksCalculated = false
      document.title = t('components.addLiquidity.pageTitle', {
        price: formatNumber(state.midPrice),
        asset: store.state.pair.asset.symbol,
        currency: store.state.pair.currency.symbol
      })

      if (store.state.price == 0) {
        store.state.price = state.midPrice
      }

      state.precision = Math.min(assetAsset.precision, assetCurrency.precision)
      console.log('state.precision', state.precision, assetAsset.precision, assetCurrency.precision)
      setSliderAndTick()
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
  () => route.params.ammAppId,
  () => {
    fetchData()
  }
)
watch(
  () => route.name,
  () => {
    fetchData()
  }
)
watch(
  () => state.prices[0],
  () => {
    if (state.prices[0] > state.prices[1]) {
      const tmp = state.prices[0]
      state.prices[0] = state.prices[1]
      state.prices[1] = tmp
    }
    if (state.distribution) {
      state.minPriceTrade = state.distribution.min[state.prices[0]].toNumber()
      state.maxPriceTrade = state.distribution.max[state.prices[1]].toNumber()
      setChartData()
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
    }
    if (state.distribution) {
      state.minPriceTrade = state.distribution.min[state.prices[0]].toNumber()
      state.maxPriceTrade = state.distribution.max[state.prices[1]].toNumber()
      setChartData()
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
  () => state.distribution,
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

watch(
  () => state.minPriceTrade,
  (newVal, oldVal) => {
    if (state.prices.length != 2) return
    const origMinPriceTrade = state.minPriceTrade
    const originalTick = state.prices[0]
    console.log(
      'state.minPriceTrade changed:',
      state.minPriceTrade,
      'new:',
      newVal,
      'previous:',
      oldVal
    )
    setChartData()

    const priceFromTick = sliderPrice2DistributionPrice(state.prices[0], true)
    if (!priceFromTick.isEqualTo(new BigNumber(state.minPriceTrade))) {
      if (newVal < oldVal) {
        // going down

        // find closest tick
        const closestIndex = state.distribution?.min.findIndex((price) =>
          price.isGreaterThanOrEqualTo(new BigNumber(state.minPriceTrade))
        )
        if (closestIndex && closestIndex > 0) {
          state.prices[0] = closestIndex - 1
          state.minPriceTrade = sliderPrice2DistributionPrice(state.prices[0], true).toNumber() // round to tick
          console.log(
            'rounded state.minPriceTrade to tick:',
            originalTick,
            state.prices[0],
            origMinPriceTrade,
            state.minPriceTrade
          )
        }
      } else {
        // find closest tick
        const closestIndex = state.distribution?.min.findIndex((price) =>
          price.isGreaterThanOrEqualTo(new BigNumber(state.minPriceTrade))
        )
        if (closestIndex && closestIndex > 0) {
          state.prices[0] = closestIndex - 1
          state.minPriceTrade = sliderPrice2DistributionPrice(state.prices[0], false).toNumber() // round to tick
          console.log(
            'rounded state.minPriceTrade to tick:',
            originalTick,
            state.prices[0],
            origMinPriceTrade,
            state.minPriceTrade
          )
        }
      }
    } else {
      console.log(
        'priceFromTick is equal to state.minPriceTrade, no change needed:',
        priceFromTick.toString(),
        state.minPriceTrade
      )
    }
  }
)
watch(
  () => state.maxPriceTrade,
  () => {
    console.log('state.maxPriceTrade changed:', state.maxPriceTrade)
    setChartData()
  }
)

let lastDistributionParams: any = null

let balancesLoading = false
const loadBalances = async () => {
  if (!authStore.account) {
    state.depositAssetAmount = 0
    state.depositCurrencyAmount = 0
    state.balanceAsset = 0
    state.balanceCurrency = 0
    return
  }

  if (balancesLoading) {
    return
  }

  balancesLoading = true
  try {
    const algodClient = getAlgodClient(activeNetworkConfig.value)
    const accountInfo = await algodClient.accountInformation(authStore.account).do()

    const getBalanceForAsset = (assetId: number, decimals: number) => {
      if (assetId === 0) {
        const microAlgos =
          (BigInt(accountInfo.amount) ?? 0n) - (accountInfo.minBalance ?? 0n) - 1_000_000n
        return new BigNumber(microAlgos).dividedBy(new BigNumber(10).pow(decimals)).toNumber()
      }

      const holding = accountInfo.assets?.find((asset: any) => asset['asset-id'] === assetId)
      const amount = holding?.amount ?? 0
      return new BigNumber(amount).dividedBy(new BigNumber(10).pow(decimals)).toNumber()
    }

    state.depositAssetAmount = getBalanceForAsset(
      store.state.pair.asset.assetId,
      store.state.pair.asset.decimals
    )
    state.depositCurrencyAmount = getBalanceForAsset(
      store.state.pair.currency.assetId,
      store.state.pair.currency.decimals
    )
    state.balanceAsset = state.depositAssetAmount
    state.balanceCurrency = state.depositCurrencyAmount
  } catch (error) {
    console.error('Failed to load balances', error)
  } finally {
    balancesLoading = false
  }
}

const setChartData = () => {
  const currentParams = {
    type: state.shape,
    visibleFrom: state.minPrice,
    visibleTo: state.maxPrice,
    midPrice: state.midPrice,
    lowPrice: state.minPriceTrade,
    highPrice: state.maxPriceTrade,
    depositAssetAmount: state.depositAssetAmount,
    depositCurrencyAmount: state.depositCurrencyAmount,
    precision: state.precision
  }

  // Prevent recursion: if params are the same as last time, exit
  if (
    lastDistributionParams &&
    JSON.stringify(lastDistributionParams) === JSON.stringify(currentParams)
  ) {
    console.log('lastDistributionParams', currentParams)
    return
  }
  lastDistributionParams = { ...currentParams }
  console.log('calculateDistribution.input', currentParams)
  state.distribution = calculateDistribution({
    type: state.shape as 'single' | 'spread' | 'focused' | 'equal' | 'wall',
    visibleFrom: new BigNumber(state.minPrice),
    visibleTo: new BigNumber(state.maxPrice),
    midPrice: new BigNumber(state.midPrice),
    lowPrice: new BigNumber(state.minPriceTrade),
    highPrice: new BigNumber(state.maxPriceTrade),
    depositAssetAmount: new BigNumber(state.depositAssetAmount),
    depositCurrencyAmount: new BigNumber(state.depositCurrencyAmount),
    precision: new BigNumber(state.precision)
  })
  state.sliderMax = state.distribution.labels.length - 1
  if (state.distribution) {
    console.log(
      'distribution',
      outputCalculateDistributionToString({
        ...state.distribution,
        asset1: state.distribution.asset1.map((n) => new BigNumber(n)),
        asset2: state.distribution.asset2.map((n) => new BigNumber(n)),
        min: state.distribution.min.map((n) => new BigNumber(n)),
        max: state.distribution.max.map((n) => new BigNumber(n))
      })
    )
  }
  state.chartData = {
    labels: state.distribution.labels,
    datasets: [
      {
        label: store.state.pair.asset.name,
        data: state.distribution.asset1.map((n) => n.toNumber()),
        borderWidth: 1,
        yAxisID: 'y'
      },
      {
        label: store.state.pair.currency.name,
        data: state.distribution.asset2.map((n) => n.toNumber()),
        borderWidth: 1,
        yAxisID: 'y1'
      }
    ]
  }
  setSliderAndTick()
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
  await loadBalances()
  initPriceDecimalsState()
  setChartData()
  state.chartOptions = setChartOptions()
  // Initialize LP fee from query parameter if provided and valid
  const rawFee = route.query.fee as string | undefined
  if (rawFee) {
    try {
      const parsed = BigInt(rawFee)
      const allowed = [
        100_000n,
        1_000_000n,
        2_000_000n,
        3_000_000n,
        10_000_000n,
        20_000_000n,
        100_000_000n
      ]
      if (allowed.includes(parsed)) {
        state.lpFee = parsed
      } else {
        console.warn('Fee query not in allowed tiers', parsed.toString())
      }
    } catch (e) {
      console.warn('Invalid fee query parameter', rawFee, e)
    }
  }
})
watch(
  () => authStore.isAuthenticated,
  async (isAuthenticated) => {
    if (isAuthenticated) {
      await fetchData()
      await loadBalances()
    } else {
      state.pools = []
      state.depositAssetAmount = 0
      state.depositCurrencyAmount = 0
      state.balanceAsset = 0
      state.balanceCurrency = 0
    }
  },
  { immediate: true }
)

watch(
  () => authStore.account,
  async (account) => {
    if (account) {
      await loadBalances()
    } else {
      state.depositAssetAmount = 0
      state.depositCurrencyAmount = 0
      state.balanceAsset = 0
      state.balanceCurrency = 0
    }
  }
)

watch(
  () => [store.state.assetCode, store.state.currencyCode, store.state.env],
  async () => {
    if (authStore.isAuthenticated) {
      await loadBalances()
    }
  }
)

watch(
  () => store.state.refreshAccountBalance,
  async (shouldRefresh) => {
    if (shouldRefresh && authStore.isAuthenticated) {
      await loadBalances()
      store.state.refreshAccountBalance = false
    }
  }
)

// Watch for fee changes in query (e.g., user navigates within app changing fee tier)
watch(
  () => route.query.fee,
  (newFee) => {
    if (!newFee) return
    try {
      const parsed = BigInt(newFee as string)
      const allowed = [
        100_000n,
        1_000_000n,
        2_000_000n,
        3_000_000n,
        10_000_000n,
        20_000_000n,
        100_000_000n
      ]
      if (allowed.includes(parsed)) {
        state.lpFee = parsed
      }
    } catch (e) {
      console.warn('Invalid fee query parameter (watch)', newFee, e)
    }
  }
)

const loadPools = async (refresh: boolean = false) => {
  try {
    if (!refresh) {
      if (store.state.pools[store.state.env]) {
        state.pools = store.state.pools[store.state.env]
        console.log('Using cached pools:', state.pools)
        return
      }
    }
    // if (store.state.env !== 'dockernet-v1' || !store.state.clientPP?.appId) {
    //   store.setChain('dockernet-v1')
    // }
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
      summary: t('components.addLiquidity.errors.fetchPools'),
      detail: (error as Error).message,
      life: 5000
    })
  }
}

const addLiquidityWallOrder = async () => {
  try {
    if (!store) return
    const algodClient = getAlgodClient(activeNetworkConfig.value)
    const signer = getTransactionSigner(useWalletTransactionSigner)
    const signerAccount: TransactionSignerAccount = {
      addr: algosdk.decodeAddress(authStore.account),
      signer: signer
    }
    const assetAsset = AssetsService.getAsset(store.state.assetCode)
    if (!assetAsset) throw Error('Asset A not found')
    const assetCurrency = AssetsService.getAsset(store.state.currencyCode)
    if (!assetCurrency) throw Error('Asset currency not found')
    const assetAOrdered = BigInt(assetAsset.assetId)
    const assetBOrdered = BigInt(assetCurrency.assetId)
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
    let createdPools = 0
    await loadPools(true)

    const normalizedTickLow = BigInt(
      BigNumber(state.minPriceTrade)
        .multipliedBy(10 ** 9)
        .toFixed(0, 1)
    )
    const normalizedTickHigh = normalizedTickLow
    let pool = state.pools.find(
      (p) =>
        p.assetA === assetAOrdered &&
        p.assetB === assetBOrdered &&
        p.min == normalizedTickLow &&
        p.max == normalizedTickHigh &&
        p.fee == state.lpFee &&
        p.verificationClass == verificationClass
    )
    let biatecClammPoolClient: BiatecClammPoolClient | undefined = undefined
    if (!pool) {
      console.log('create pool', {
        assetA: assetAOrdered,
        assetB: assetBOrdered,
        appBiatecConfigProvider: store.state.clientConfig.appId,
        clientBiatecPoolProvider: store.state.clientPP,
        currentPrice: BigInt(Math.floor(state.midPrice * 10 ** 9)),
        priceMax: normalizedTickHigh,
        priceMin: normalizedTickLow,
        transactionSigner: signerAccount,
        fee: state.lpFee,
        verificationClass: verificationClass
      })
      biatecClammPoolClient = await clammCreateSender({
        assetA: assetAOrdered,
        assetB: assetBOrdered,
        appBiatecConfigProvider: store.state.clientConfig.appId,
        clientBiatecPoolProvider: store.state.clientPP,
        currentPrice: BigInt(Math.floor(state.midPrice * 10 ** 9)),
        priceMax: normalizedTickHigh,
        priceMin: normalizedTickLow,
        transactionSigner: signerAccount,
        fee: state.lpFee,
        verificationClass: verificationClass
      })

      console.log('biatecClammPoolClient', biatecClammPoolClient)

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
    if (createdPools > 0) {
      toast.add({
        severity: 'info',
        detail: t('components.addLiquidity.success.poolCreated', { count: createdPools }),
        life: 5000
      })
      await loadPools(true) // check for existing pools
    }
    // now add the liquidity

    const addLiquidityPool = state.pools.find(
      (p) =>
        p.assetA === assetAOrdered &&
        p.assetB === assetBOrdered &&
        p.min == normalizedTickLow &&
        p.max == normalizedTickHigh &&
        p.fee == state.lpFee &&
        p.verificationClass == verificationClass
    )
    if (!addLiquidityPool) {
      throw new Error('Pool not found after creation')
    }
    const addLiquidityPoolClient = new BiatecClammPoolClient({
      algorand: store.state.clientPP.algorand,
      appId: addLiquidityPool.appId,
      defaultSender: signerAccount.addr,
      defaultSigner: signerAccount.signer
    })

    const addLiquidityVars = {
      account: signerAccount,
      assetA: assetAOrdered,
      assetB: assetBOrdered,
      appBiatecConfigProvider: store.state.clientConfig.appId,
      algod: algodClient,
      clientBiatecClammPool: addLiquidityPoolClient,
      appBiatecIdentityProvider: store.state.clientIdentity.appId,
      assetADeposit: BigInt(
        BigNumber(state.depositAssetAmount)
          .multipliedBy(10 ** assetAsset.decimals)
          .toFixed(0, 1)
      ),
      assetBDeposit: BigInt(
        BigNumber(state.depositCurrencyAmount)
          .multipliedBy(10 ** assetCurrency.decimals)
          .toFixed(0, 1)
      ),
      assetLp: addLiquidityPool.lpTokenId,
      clientBiatecPoolProvider: store.state.clientPP
    }
    console.log('add liquidity', addLiquidityVars)
    const liquidity = await clammAddLiquiditySender(addLiquidityVars)
    console.log('liquidity', liquidity)

    store.state.refreshMyLiquidity = true
    toast.add({
      severity: 'info',
      detail: t('components.addLiquidity.success.liquidityAdded'),
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

const addLiquiditySingleOrder = async () => {
  try {
    if (!store) return
    const algodClient = getAlgodClient(activeNetworkConfig.value)
    const signer = getTransactionSigner(useWalletTransactionSigner)
    const signerAccount: TransactionSignerAccount = {
      addr: algosdk.decodeAddress(authStore.account),
      signer: signer
    }
    const assetAsset = AssetsService.getAsset(store.state.assetCode)
    if (!assetAsset) throw Error('Asset A not found')
    const assetCurrency = AssetsService.getAsset(store.state.currencyCode)
    if (!assetCurrency) throw Error('Asset currency not found')
    const assetAOrdered = BigInt(assetAsset.assetId)
    const assetBOrdered = BigInt(assetCurrency.assetId)
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
    let createdPools = 0
    await loadPools(true)

    const normalizedTickLow = BigInt(
      BigNumber(state.minPriceTrade)
        .multipliedBy(10 ** 9)
        .toFixed(0, 1)
    )
    const normalizedTickHigh = BigInt(
      BigNumber(state.maxPriceTrade)
        .multipliedBy(10 ** 9)
        .toFixed(0, 1)
    )
    let pool = state.pools.find(
      (p) =>
        p.assetA === assetAOrdered &&
        p.assetB === assetBOrdered &&
        p.min == normalizedTickLow &&
        p.max == normalizedTickHigh &&
        p.fee == state.lpFee &&
        p.verificationClass == verificationClass
    )
    let biatecClammPoolClient: BiatecClammPoolClient | undefined = undefined
    if (!pool) {
      console.log('create pool', {
        assetA: assetAOrdered,
        assetB: assetBOrdered,
        appBiatecConfigProvider: store.state.clientConfig.appId,
        clientBiatecPoolProvider: store.state.clientPP,
        currentPrice: BigInt(Math.floor(state.midPrice * 10 ** 9)),
        priceMax: normalizedTickHigh,
        priceMin: normalizedTickLow,
        transactionSigner: signerAccount,
        fee: state.lpFee,
        verificationClass: verificationClass
      })
      biatecClammPoolClient = await clammCreateSender({
        assetA: assetAOrdered,
        assetB: assetBOrdered,
        appBiatecConfigProvider: store.state.clientConfig.appId,
        clientBiatecPoolProvider: store.state.clientPP,
        currentPrice: BigInt(Math.floor(state.midPrice * 10 ** 9)),
        priceMax: normalizedTickHigh,
        priceMin: normalizedTickLow,
        transactionSigner: signerAccount,
        fee: state.lpFee,
        verificationClass: verificationClass
      })

      console.log('biatecClammPoolClient', biatecClammPoolClient)

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
    if (createdPools > 0) {
      toast.add({
        severity: 'info',
        detail: t('components.addLiquidity.success.poolCreated', { count: createdPools }),
        life: 5000
      })
      await loadPools(true) // check for existing pools
    }
    // now add the liquidity

    const addLiquidityPool = state.pools.find(
      (p) =>
        p.assetA === assetAOrdered &&
        p.assetB === assetBOrdered &&
        p.min == normalizedTickLow &&
        p.max == normalizedTickHigh &&
        p.fee == state.lpFee &&
        p.verificationClass == verificationClass
    )
    if (!addLiquidityPool) {
      throw new Error('Pool not found after creation')
    }
    const addLiquidityPoolClient = new BiatecClammPoolClient({
      algorand: store.state.clientPP.algorand,
      appId: addLiquidityPool.appId,
      defaultSender: signerAccount.addr,
      defaultSigner: signerAccount.signer
    })

    const addLiquidityVars = {
      account: signerAccount,
      assetA: assetAOrdered,
      assetB: assetBOrdered,
      appBiatecConfigProvider: store.state.clientConfig.appId,
      algod: algodClient,
      clientBiatecClammPool: addLiquidityPoolClient,
      appBiatecIdentityProvider: store.state.clientIdentity.appId,
      assetADeposit: BigInt(
        BigNumber(state.depositAssetAmount)
          .multipliedBy(10 ** assetAsset.decimals)
          .toFixed(0, 1)
      ),
      assetBDeposit: BigInt(
        BigNumber(state.depositCurrencyAmount)
          .multipliedBy(10 ** assetCurrency.decimals)
          .toFixed(0, 1)
      ),
      assetLp: addLiquidityPool.lpTokenId,
      clientBiatecPoolProvider: store.state.clientPP
    }
    console.log('add liquidity', addLiquidityVars)
    const liquidity = await clammAddLiquiditySender(addLiquidityVars)
    console.log('liquidity', liquidity)

    store.state.refreshMyLiquidity = true
    toast.add({
      severity: 'info',
      detail: t('components.addLiquidity.success.liquidityAdded'),
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

const addLiquidityClick = async () => {
  try {
    console.log(
      'store.state.assetCode,store.state.currencyCode',
      store.state.assetCode,
      store.state.currencyCode
    )
    console.log('state.shape', state.shape)
    if (state.shape === 'wall') {
      await addLiquidityWallOrder()
      return
    }
    if (state.shape === 'single') {
      await addLiquiditySingleOrder()
      return
    }
    //
    if (!store) return
    // if (store.state.env !== 'dockernet-v1' || !store.state.clientPP?.appId) {
    //   store.setChain('dockernet-v1')
    // }
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
    const assetAOrdered = BigInt(assetAsset.assetId)
    const assetBOrdered = BigInt(assetCurrency.assetId)

    console.log('assetAOrdered,assetBOrdered', assetAOrdered, assetBOrdered)
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
      type: state.shape as 'single' | 'spread' | 'focused' | 'equal' | 'wall',
      visibleFrom: new BigNumber(state.minPrice),
      visibleTo: new BigNumber(state.maxPrice),
      midPrice: new BigNumber(state.midPrice),
      lowPrice: sliderPrice2DistributionPrice(state.prices[0], true),
      highPrice: sliderPrice2DistributionPrice(state.prices[1], false),
      depositAssetAmount: new BigNumber(state.depositAssetAmount),
      depositCurrencyAmount: new BigNumber(state.depositCurrencyAmount),
      precision: new BigNumber(state.precision)
    })

    console.log('distribution', outputCalculateDistributionToString(distribution))
    let createdPools = 0
    await loadPools(true)

    let distributionIndexesToProcess = distribution.labels
      .map((_, index) => index)
      .filter(
        (index) =>
          distribution.asset1[index].toNumber() !== 0 || distribution.asset2[index].toNumber() !== 0
      )

    console.log(
      'distributionIndexesToProcess',
      distributionIndexesToProcess,
      distribution.labels.length
    )

    for (let index of distributionIndexesToProcess) {
      console.log('distribution.labels[index]', distribution.labels[index])

      const normalizedTickLow = BigInt(distribution.min[index].multipliedBy(10 ** 9).toFixed(0, 1))
      const normalizedTickHigh = BigInt(distribution.max[index].multipliedBy(10 ** 9).toFixed(0, 1))
      let pool = state.pools.find(
        (p) =>
          p.assetA === assetAOrdered &&
          p.assetB === assetBOrdered &&
          p.min == normalizedTickLow &&
          p.max == normalizedTickHigh &&
          p.fee == state.lpFee &&
          p.verificationClass == verificationClass
      )
      let biatecClammPoolClient: BiatecClammPoolClient | undefined = undefined
      if (!pool) {
        console.log('create pool', {
          assetA: assetAOrdered,
          assetB: assetBOrdered,
          appBiatecConfigProvider: store.state.clientConfig.appId,
          clientBiatecPoolProvider: store.state.clientPP,
          currentPrice: BigInt(Math.floor(state.midPrice * 10 ** 9)),
          priceMax: normalizedTickHigh,
          priceMin: normalizedTickLow,
          transactionSigner: signerAccount,
          fee: state.lpFee,
          verificationClass: verificationClass
        })
        biatecClammPoolClient = await clammCreateSender({
          assetA: assetAOrdered,
          assetB: assetBOrdered,
          appBiatecConfigProvider: store.state.clientConfig.appId,
          clientBiatecPoolProvider: store.state.clientPP,
          currentPrice: BigInt(Math.floor(state.midPrice * 10 ** 9)),
          priceMax: normalizedTickHigh,
          priceMin: normalizedTickLow,
          transactionSigner: signerAccount,
          fee: state.lpFee,
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
        detail: t('components.addLiquidity.success.poolCreated', { count: createdPools }),
        life: 5000
      })
    }
    // now add the liquidity

    await loadPools(true) // check for existing pools

    console.log('distribution', outputCalculateDistributionToString(distribution))
    for (let index of distributionIndexesToProcess) {
      const normalizedTickLow = BigInt(distribution.min[index].multipliedBy(10 ** 9).toFixed(0, 1))
      const normalizedTickHigh = BigInt(distribution.max[index].multipliedBy(10 ** 9).toFixed(0, 1))
      const pool = state.pools.find(
        (p) =>
          p.assetA === assetAOrdered &&
          p.assetB === assetBOrdered &&
          p.min == normalizedTickLow &&
          p.max == normalizedTickHigh &&
          p.fee == state.lpFee &&
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
      //const params = await algodClient.getTransactionParams().do()

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
      const addLiquidityVars = {
        account: signerAccount,
        assetA: assetAOrdered,
        assetB: assetBOrdered,
        appBiatecConfigProvider: store.state.clientConfig.appId,
        algod: algodClient,
        clientBiatecClammPool: biatecClammPoolClient,
        appBiatecIdentityProvider: store.state.clientIdentity.appId,
        assetADeposit: BigInt(
          distribution.asset1[index].multipliedBy(10 ** assetAsset.decimals).toFixed(0, 1)
        ),
        assetBDeposit: BigInt(
          distribution.asset2[index].multipliedBy(10 ** assetCurrency.decimals).toFixed(0, 1)
        ),
        assetLp: pool.lpTokenId,
        clientBiatecPoolProvider: store.state.clientPP
      }
      console.log('add liquidity', addLiquidityVars)
      const liquidity = await clammAddLiquiditySender(addLiquidityVars)
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

    store.state.refreshMyLiquidity = true
    toast.add({
      severity: 'info',
      detail: t('components.addLiquidity.success.liquidityAdded'),
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
  state.pricesApplied = true
  state.ticksCalculated = false
  state.prices = [0, 10]
  setSliderAndTick()
  console.log('state.pricesApplied', state.pricesApplied)
}
interface IcalculateMidTickFromDistributionRet {
  tick1Index: number
  tick2Index: number
}
const calculateMidTickFromDistribution = (): IcalculateMidTickFromDistributionRet => {
  if (!state.distribution || !state.distribution.labels || state.distribution.labels.length === 0) {
    return { tick1Index: 0, tick2Index: 0 }
  }
  let min = 0
  let max = 0
  const mid = new BigNumber(state.midPrice)
  for (let index in state.distribution.labels) {
    if (state.distribution.max[index].lt(mid)) {
      min = Number(index) + 1
    }
    if (state.distribution.max[index].lte(mid)) {
      max = Number(index) + 1
    }
  }
  return { tick1Index: min, tick2Index: max }
}
const setSliderAndTick = () => {
  console.log('setSliderAndTick')
  if (state.distribution && state.distribution.labels && state.distribution.labels.length > 0) {
    if (state.ticksCalculated) {
      // dont change the default prices
    } else {
      const ticks = calculateMidTickFromDistribution()
      const tickMinIndex = ticks.tick1Index - 4 < 0 ? 0 : ticks.tick1Index - 4
      const tickMaxIndex =
        ticks.tick2Index + 4 >= state.distribution.labels.length
          ? state.distribution.labels.length - 1
          : ticks.tick2Index + 4
      state.minPriceTrade = state.distribution.min[tickMinIndex].toNumber()
      state.maxPriceTrade = state.distribution.max[tickMaxIndex].toNumber()
      if (state.prices[0] != 0) state.ticksCalculated = true
      state.prices = [tickMinIndex, tickMaxIndex]
      console.log(
        'state.prices.with distribution',
        ticks,
        state.prices,
        state.distribution,
        state.minPriceTrade,
        state.maxPriceTrade
      )
      if (state.precision == 1) {
        state.minPrice = state.midPrice * 0.2
        state.maxPrice = state.midPrice / 0.2
      } else {
        state.minPrice = state.midPrice * 0.8
        state.maxPrice = state.midPrice / 0.8
      }
    }
  } else {
    if (state.precision == 1) {
      state.minPriceTrade = state.midPrice * 0.7
      state.maxPriceTrade = state.midPrice / 0.7
      state.minPrice = state.midPrice * 0.2
      state.maxPrice = state.midPrice / 0.2
    } else {
      state.minPriceTrade = state.midPrice * 0.95
      state.maxPriceTrade = state.midPrice / 0.95
      state.minPrice = state.midPrice * 0.8
      state.maxPrice = state.midPrice / 0.8
    }
    state.prices = [0, 10]
    console.log('state.prices.no distribution yet', state.prices)
  }
  initPriceDecimalsState()
}
const togglePrecision = () => {
  state.precision = state.precision == 1 ? 2 : 1
  state.ticksCalculated = false
  state.prices = [0, 10]
  setSliderAndTick()
}

const setMaxDepositAssetAmount = () => {
  state.depositAssetAmount = state.balanceAsset
}
const setMaxDepositCurrencyAmount = () => {
  state.depositCurrencyAmount = state.balanceCurrency
}
</script>
<template>
  <Card :class="props.class">
    <template #content>
      <h2>{{ t('components.addLiquidity.title') }}</h2>

      <div v-if="state.showPriceForm">
        <p>{{ t('components.addLiquidity.priceFormMessage') }}</p>

        <InputGroup class="my-2">
          <InputNumber v-model="state.midPrice" :min="0" :step="0.001" show-buttons></InputNumber>
          <InputGroupAddon class="w-12rem">
            <div class="px-3">
              {{ store.state.pair.asset.symbol }}/{{ store.state.pair.currency.symbol }}
            </div>
          </InputGroupAddon>
          <Button @click="applyMidPriceClick" class="my-2">{{
            t('components.addLiquidity.apply')
          }}</Button>
        </InputGroup>
      </div>
      <p>
        {{ t('components.addLiquidity.liquidityShapeDescription') }}
        <span @click="togglePrecision">{{
          t('components.addLiquidity.precision', { precision: state.precision })
        }}</span
        >.
      </p>
      <div class="flex flex-row w-full m-2 gap-2">
        <div class="w-full flex items-center">{{ t('components.addLiquidity.lpFee') }}:</div>
        <Button
          class="w-full flex items-center"
          :variant="state.lpFee === 100_000n ? 'outlined' : 'link'"
          @click="state.lpFee = 100_000n"
        >
          0.01%
        </Button>
        <Button
          class="w-full flex items-center"
          :variant="state.lpFee === 1_000_000n ? 'outlined' : 'link'"
          @click="state.lpFee = 1_000_000n"
        >
          0.1%
        </Button>
        <Button
          class="w-full flex items-center"
          :variant="state.lpFee === 2_000_000n ? 'outlined' : 'link'"
          @click="state.lpFee = 2_000_000n"
        >
          0.2%
        </Button>
        <Button
          class="w-full flex items-center"
          :variant="state.lpFee === 3_000_000n ? 'outlined' : 'link'"
          @click="state.lpFee = 3_000_000n"
        >
          0.3%
        </Button>
        <Button
          class="w-full flex items-center"
          :variant="state.lpFee === 10_000_000n ? 'outlined' : 'link'"
          @click="state.lpFee = 10_000_000n"
        >
          1%
        </Button>
        <Button
          class="w-full flex items-center"
          :variant="state.lpFee === 20_000_000n ? 'outlined' : 'link'"
          @click="state.lpFee = 20_000_000n"
        >
          2%
        </Button>
        <Button
          class="w-full flex items-center"
          :variant="state.lpFee === 100_000_000n ? 'outlined' : 'link'"
          @click="state.lpFee = 100_000_000n"
        >
          10%
        </Button>
      </div>
      <div v-if="!state.showPriceForm || (state.showPriceForm && state.pricesApplied)">
        <Button
          class="mr-2 mb-2"
          :severity="state.shape === 'focused' ? 'primary' : 'secondary'"
          @click="state.shape = 'focused'"
        >
          {{ t('components.addLiquidity.shapes.focused') }}
        </Button>
        <Button
          class="mr-2 mb-2"
          :severity="state.shape === 'spread' ? 'primary' : 'secondary'"
          @click="state.shape = 'spread'"
        >
          {{ t('components.addLiquidity.shapes.spread') }}
        </Button>
        <Button
          class="mr-2 mb-2"
          :severity="state.shape === 'equal' ? 'primary' : 'secondary'"
          @click="state.shape = 'equal'"
        >
          {{ t('components.addLiquidity.shapes.equal') }}
        </Button>
        <Button
          class="mr-2 mb-2"
          :severity="state.shape === 'single' ? 'primary' : 'secondary'"
          @click="state.shape = 'single'"
        >
          {{ t('components.addLiquidity.shapes.single') }}
        </Button>
        <Button
          class="mr-2 mb-2"
          :severity="state.shape === 'wall' ? 'primary' : 'secondary'"
          @click="state.shape = 'wall'"
        >
          {{ t('components.addLiquidity.shapes.wall') }}
        </Button>
        <p v-if="state.shape === 'focused'">
          {{ t('components.addLiquidity.descriptions.focused') }}
        </p>
        <p v-if="state.shape === 'spread'">
          {{ t('components.addLiquidity.descriptions.spread') }}
        </p>
        <p v-if="state.shape === 'equal'">
          {{ t('components.addLiquidity.descriptions.equal') }}
        </p>
        <p v-if="state.shape === 'single'">
          {{ t('components.addLiquidity.descriptions.single') }}
        </p>
        <p v-if="state.shape === 'wall'">
          {{ t('components.addLiquidity.descriptions.wall') }}
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
          <h3>{{ t('components.addLiquidity.priceWall') }}</h3>
          <Slider
            v-model="state.prices[0]"
            class="w-full my-2"
            :step="1"
            :min="0"
            :max="state.sliderMax"
          />
          <InputGroup>
            <InputNumber
              v-model="state.minPriceTrade"
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

          <div class="grid grid-cols-2 gap-2">
            <div class="col">
              <label for="depositAssetAmount">
                {{
                  t('components.addLiquidity.depositAsset', { asset: store.state.pair.asset.name })
                }}
              </label>
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
                <InputGroupAddon class="w-12rem">
                  <Button @click="setMaxDepositAssetAmount">{{
                    t('components.addLiquidity.max')
                  }}</Button>
                </InputGroupAddon>
              </InputGroup>
            </div>
            <div class="col">
              <label for="depositCurrencyAmount">
                {{
                  t('components.addLiquidity.depositCurrency', {
                    currency: store.state.pair.currency.name
                  })
                }}
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
                <InputGroupAddon class="w-12rem">
                  <Button @click="setMaxDepositCurrencyAmount">{{
                    t('components.addLiquidity.max')
                  }}</Button>
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>

          <Button v-if="!authStore.isAuthenticated" @click="store.state.forceAuth = true">
            {{ t('components.addLiquidity.authenticate') }}
          </Button>
          <Button v-else @click="addLiquidityClick" class="my-2">{{
            t('components.addLiquidity.addLiquidity')
          }}</Button>
        </div>

        <div v-else>
          <h3>{{ t('components.addLiquidity.prices') }}</h3>
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
              :step="1"
              :min="0"
              :max="state.sliderMax"
            />
          </div>
          <div class="grid grid-cols-2 gap-2">
            <div class="col">
              <label for="lowPrice"> {{ t('components.addLiquidity.lowPrice') }} </label>
              <InputGroup>
                <InputNumber
                  inputId="lowPrice"
                  v-model="state.minPriceTrade"
                  :min="0"
                  :max="state.maxPriceTrade"
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
              <label for="highPrice"> {{ t('components.addLiquidity.highPrice') }} </label>
              <InputGroup>
                <InputNumber
                  inputId="highPrice"
                  v-model="state.maxPriceTrade"
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
              <label for="depositAssetAmount">
                {{
                  t('components.addLiquidity.depositAsset', { asset: store.state.pair.asset.name })
                }}
              </label>
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
                <InputGroupAddon class="w-12rem">
                  <Button @click="setMaxDepositAssetAmount">{{
                    t('components.addLiquidity.max')
                  }}</Button>
                </InputGroupAddon>
              </InputGroup>
            </div>
            <div class="col">
              <label for="depositCurrencyAmount">
                {{
                  t('components.addLiquidity.depositCurrency', {
                    currency: store.state.pair.currency.name
                  })
                }}
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
                <InputGroupAddon class="w-12rem">
                  <Button @click="setMaxDepositCurrencyAmount">{{
                    t('components.addLiquidity.max')
                  }}</Button>
                </InputGroupAddon>
              </InputGroup>
            </div>
          </div>

          <Button v-if="!authStore.isAuthenticated" @click="store.state.forceAuth = true">
            {{ t('components.addLiquidity.authenticate') }}
          </Button>
          <Button v-else @click="addLiquidityClick" class="my-2">{{
            t('components.addLiquidity.addLiquidity')
          }}</Button>
        </div>
      </div>
    </template>
  </Card>
</template>
<style></style>
