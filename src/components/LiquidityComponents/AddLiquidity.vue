<script setup lang="ts">
import Card from 'primevue/card'
import { useAppStore } from '@/stores/app'
import { useToast } from 'primevue/usetoast'
import Button from 'primevue/button'
import InputGroup from 'primevue/inputgroup'
import InputGroupAddon from 'primevue/inputgroupaddon'
import InputNumber from 'primevue/inputnumber'
import Slider from 'primevue/slider'
import { computed, nextTick, onMounted, reactive, watch } from 'vue'
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
import { useRoute, useRouter } from 'vue-router'
import { outputCalculateDistributionToString } from '@/scripts/clamm/outputCalculateDistributionToString'
import type { IAsset } from '@/interface/IAsset'
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
const router = useRouter()
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
  ticksCalculated: false,
  e2eLocked: false,
  e2eOriginalMin: undefined as number | undefined,
  e2eOriginalMax: undefined as number | undefined,
  singleSliderEnabled: false,
  singleDepositPercent: 0,
  singleMaxDepositAsset: 0,
  singleMaxDepositCurrency: 0,
  singleMaxAssetBase: 0n,
  singleMaxCurrencyBase: 0n,
  singleRatioAssetBase: 0n,
  singleRatioCurrencyBase: 0n
})

const isSingleShape = computed(() => state.shape === 'single')

const allowedLpFeeTiers: readonly bigint[] = [
  100_000n,
  1_000_000n,
  2_000_000n,
  3_000_000n,
  10_000_000n,
  20_000_000n,
  100_000_000n
] as const

const allowedShapeValues = new Set(['single', 'spread', 'focused', 'equal', 'wall'])

const SCALE_1E9 = new BigNumber(10).pow(9)

type SingleBinAdjustmentResult = {
  assetBase: bigint
  currencyBase: bigint
  assetAmount: number
  currencyAmount: number
  changed: boolean
}

const toScaledPrice = (value: number) =>
  BigInt(BigNumber(value).multipliedBy(SCALE_1E9).toFixed(0, BigNumber.ROUND_DOWN))

let isApplyingSingleSlider = false
let isSyncingSingleSlider = false
let pendingRouteRange: { low?: number; high?: number } | null = null
let isApplyingRouteRange = false
let activeRouteRange: { low?: number; high?: number } | null = null
const ROUTE_ENFORCE_TOLERANCE = 1e-6

const disableSingleSlider = () => {
  state.singleSliderEnabled = false
  state.singleDepositPercent = 0
  state.singleMaxDepositAsset = 0
  state.singleMaxDepositCurrency = 0
  state.singleMaxAssetBase = 0n
  state.singleMaxCurrencyBase = 0n
  state.singleRatioAssetBase = 0n
  state.singleRatioCurrencyBase = 0n
}

const resolveAssetFromRouteCode = (code?: string): IAsset | undefined => {
  if (!code) return undefined
  const direct = AssetsService.getAsset(code)
  if (direct) return direct
  const lower = code.toLowerCase()
  if (lower !== code) {
    const lowerMatch = AssetsService.getAsset(lower)
    if (lowerMatch) return lowerMatch
  }
  const upper = code.toUpperCase()
  if (upper !== code) {
    const upperMatch = AssetsService.getAsset(upper)
    if (upperMatch) return upperMatch
  }
  return undefined
}

const syncStorePairWithRoute = () => {
  if (!route?.params) return

  const routeAsset = resolveAssetFromRouteCode(route.params.assetCode as string | undefined)
  const routeCurrency = resolveAssetFromRouteCode(route.params.currencyCode as string | undefined)

  if (routeAsset && store.state.assetCode !== routeAsset.code) {
    store.state.assetCode = routeAsset.code
    store.state.assetName = routeAsset.name
  }

  if (routeCurrency && store.state.currencyCode !== routeCurrency.code) {
    store.state.currencyCode = routeCurrency.code
    store.state.currencyName = routeCurrency.name
    store.state.currencySymbol = routeCurrency.symbol
  }

  const currentAsset: IAsset | undefined = routeAsset ?? store.state.pair?.asset
  const currentCurrency: IAsset | undefined = routeCurrency ?? store.state.pair?.currency

  if (currentAsset && currentCurrency) {
    const normalizedPair = AssetsService.selectPrimaryAsset(currentAsset.code, currentCurrency.code)

    if (normalizedPair?.asset && normalizedPair?.currency) {
      store.state.pair = normalizedPair as {
        invert: boolean
        currency: IAsset
        asset: IAsset
      }
    } else {
      store.state.pair = {
        invert: false,
        asset: currentAsset,
        currency: currentCurrency
      }
    }
  }
}

const alignSingleBinDeposits = (
  pool: FullConfig,
  assetDecimals: number,
  currencyDecimals: number,
  assetAmountInput: number,
  currencyAmountInput: number
): SingleBinAdjustmentResult | null => {
  const rawAssetBalance = (pool as any)?.assetABalance
  const rawCurrencyBalance = (pool as any)?.assetBBalance
  if (rawAssetBalance === undefined || rawCurrencyBalance === undefined) {
    return null
  }

  const assetBalance = new BigNumber(rawAssetBalance.toString())
  const currencyBalance = new BigNumber(rawCurrencyBalance.toString())
  if (!assetBalance.isFinite() || !currencyBalance.isFinite()) {
    return null
  }
  if (assetBalance.lte(0) || currencyBalance.lte(0)) {
    return null
  }

  const assetScale = new BigNumber(10).pow(assetDecimals)
  const currencyScale = new BigNumber(10).pow(currencyDecimals)
  const poolAssetBase = assetBalance.multipliedBy(assetScale).dividedBy(SCALE_1E9)
  const poolCurrencyBase = currencyBalance.multipliedBy(currencyScale).dividedBy(SCALE_1E9)
  if (!poolAssetBase.isFinite() || !poolCurrencyBase.isFinite()) {
    return null
  }
  if (poolAssetBase.lte(0) || poolCurrencyBase.lte(0)) {
    return null
  }

  const safeAssetAmount = Number.isFinite(assetAmountInput) ? assetAmountInput : 0
  const safeCurrencyAmount = Number.isFinite(currencyAmountInput) ? currencyAmountInput : 0
  const originalAssetAmount = new BigNumber(safeAssetAmount)
  const originalCurrencyAmount = new BigNumber(safeCurrencyAmount)
  let desiredAssetBase = originalAssetAmount.multipliedBy(assetScale)
  let desiredCurrencyBase = originalCurrencyAmount.multipliedBy(currencyScale)

  const inputsProvided = desiredAssetBase.gt(0) || desiredCurrencyBase.gt(0)
  if (!inputsProvided) {
    return null
  }

  if (desiredAssetBase.lte(0)) {
    desiredAssetBase = desiredCurrencyBase.multipliedBy(poolAssetBase).dividedBy(poolCurrencyBase)
  }
  if (desiredCurrencyBase.lte(0)) {
    desiredCurrencyBase = desiredAssetBase.multipliedBy(poolCurrencyBase).dividedBy(poolAssetBase)
  }

  const ratio = poolAssetBase.dividedBy(poolCurrencyBase)
  const assetFromCurrency = desiredCurrencyBase.multipliedBy(ratio)
  let adjustedAssetBase: BigNumber
  let adjustedCurrencyBase: BigNumber

  if (assetFromCurrency.lte(desiredAssetBase)) {
    adjustedAssetBase = assetFromCurrency
    adjustedCurrencyBase = desiredCurrencyBase
  } else {
    adjustedAssetBase = desiredAssetBase
    adjustedCurrencyBase = desiredAssetBase.dividedBy(ratio)
  }

  adjustedAssetBase = adjustedAssetBase.integerValue(BigNumber.ROUND_FLOOR)
  adjustedCurrencyBase = adjustedCurrencyBase.integerValue(BigNumber.ROUND_FLOOR)

  if (adjustedAssetBase.lte(0) || adjustedCurrencyBase.lte(0)) {
    throw new Error('single-ratio-too-small')
  }

  const adjustedAssetAmount = adjustedAssetBase.dividedBy(assetScale)
  const adjustedCurrencyAmount = adjustedCurrencyBase.dividedBy(currencyScale)
  const assetTolerance = new BigNumber(1).dividedBy(assetScale)
  const currencyTolerance = new BigNumber(1).dividedBy(currencyScale)

  const assetChanged = adjustedAssetAmount
    .minus(originalAssetAmount)
    .abs()
    .isGreaterThan(assetTolerance)
  const currencyChanged = adjustedCurrencyAmount
    .minus(originalCurrencyAmount)
    .abs()
    .isGreaterThan(currencyTolerance)

  return {
    assetBase: BigInt(adjustedAssetBase.toFixed(0, BigNumber.ROUND_FLOOR)),
    currencyBase: BigInt(adjustedCurrencyBase.toFixed(0, BigNumber.ROUND_FLOOR)),
    assetAmount: adjustedAssetAmount.toNumber(),
    currencyAmount: adjustedCurrencyAmount.toNumber(),
    changed: assetChanged || currencyChanged
  }
}

const SINGLE_POOL_TOLERANCE = 5n
const bigIntAbs = (value: bigint): bigint => (value < 0n ? -value : value)

const getSingleTargetPool = (
  assetAOrdered: bigint,
  assetBOrdered: bigint,
  normalizedTickLow: bigint,
  normalizedTickHigh: bigint
): { pool: FullConfig; matchedLow: bigint; matchedHigh: bigint; reversed: boolean } | null => {
  // First try exact fee match
  let candidatePools = state.pools.filter(
    (p) =>
      ((p.assetA === assetAOrdered && p.assetB === assetBOrdered) ||
        (p.assetA === assetBOrdered && p.assetB === assetAOrdered)) &&
      p.fee === state.lpFee
  )

  // If no exact fee match, try any fee
  if (candidatePools.length === 0) {
    candidatePools = state.pools.filter(
      (p) =>
        (p.assetA === assetAOrdered && p.assetB === assetBOrdered) ||
        (p.assetA === assetBOrdered && p.assetB === assetAOrdered)
    )
  }

  if (candidatePools.length === 0) {
    return null
  }

  const exactMatch = candidatePools.find(
    (p) => p.min === normalizedTickLow && p.max === normalizedTickHigh
  )
  if (exactMatch) {
    const reversed = exactMatch.assetA === assetBOrdered && exactMatch.assetB === assetAOrdered
    return {
      pool: exactMatch,
      matchedLow: normalizedTickLow,
      matchedHigh: normalizedTickHigh,
      reversed
    }
  }

  const toleranceMatch = candidatePools.find((p) => {
    const minDiff = bigIntAbs(p.min - normalizedTickLow)
    const maxDiff = bigIntAbs(p.max - normalizedTickHigh)
    return minDiff <= SINGLE_POOL_TOLERANCE && maxDiff <= SINGLE_POOL_TOLERANCE
  })

  if (toleranceMatch) {
    const reversed =
      toleranceMatch.assetA === assetBOrdered && toleranceMatch.assetB === assetAOrdered
    return {
      pool: toleranceMatch,
      matchedLow: toleranceMatch.min,
      matchedHigh: toleranceMatch.max,
      reversed
    }
  }

  let closest: { pool: FullConfig; diff: bigint; reversed: boolean } | null = null
  for (const candidate of candidatePools) {
    const diff =
      bigIntAbs(candidate.min - normalizedTickLow) + bigIntAbs(candidate.max - normalizedTickHigh)
    const reversed = candidate.assetA === assetBOrdered && candidate.assetB === assetAOrdered
    if (!closest || diff < closest.diff) {
      closest = { pool: candidate, diff, reversed }
    }
  }

  return closest
    ? {
        pool: closest.pool,
        matchedLow: closest.pool.min,
        matchedHigh: closest.pool.max,
        reversed: closest.reversed
      }
    : null
}

const recalculateSingleDepositBounds = () => {
  if (state.e2eLocked) {
    console.log('[recalculateSingleDepositBounds] Skipping: e2eLocked')
    return
  }
  if (state.shape !== 'single') {
    console.log('[recalculateSingleDepositBounds] Skipping: shape is not single', state.shape)
    disableSingleSlider()
    return
  }

  const assetAsset = AssetsService.getAsset(store.state.assetCode)
  const assetCurrency = AssetsService.getAsset(store.state.currencyCode)
  if (!assetAsset || !assetCurrency) {
    console.log('[recalculateSingleDepositBounds] Skipping: assets not found')
    disableSingleSlider()
    return
  }

  const normalizedTickLow = toScaledPrice(state.minPriceTrade)
  const normalizedTickHigh = toScaledPrice(state.maxPriceTrade)
  const assetAOrdered = BigInt(assetAsset.assetId)
  const assetBOrdered = BigInt(assetCurrency.assetId)
  const pool = getSingleTargetPool(
    assetAOrdered,
    assetBOrdered,
    normalizedTickLow,
    normalizedTickHigh
  )
  console.log('[recalculateSingleDepositBounds] Single target pool for bounds recalculation:', {
    pool: pool
      ? {
          appId: pool.pool.appId,
          min: pool.pool.min.toString(),
          max: pool.pool.max.toString(),
          reversed: pool.reversed
        }
      : null,
    normalizedTickLow: normalizedTickLow.toString(),
    normalizedTickHigh: normalizedTickHigh.toString(),
    minPriceTrade: state.minPriceTrade,
    maxPriceTrade: state.maxPriceTrade,
    poolsCount: state.pools.length
  })
  let rawAssetBalance: any
  let rawCurrencyBalance: any
  if (pool) {
    if (pool.reversed) {
      rawAssetBalance = (pool.pool as any)?.assetBBalance
      rawCurrencyBalance = (pool.pool as any)?.assetABalance
    } else {
      rawAssetBalance = (pool.pool as any)?.assetABalance
      rawCurrencyBalance = (pool.pool as any)?.assetBBalance
    }
  }
  if (
    !pool ||
    rawAssetBalance === undefined ||
    rawCurrencyBalance === undefined ||
    rawAssetBalance === null ||
    rawCurrencyBalance === null
  ) {
    console.log('[recalculateSingleDepositBounds] Pool or balances not found:', {
      hasPool: !!pool,
      rawAssetBalance,
      rawCurrencyBalance
    })
    disableSingleSlider()
    return
  }

  const assetBalance = new BigNumber(rawAssetBalance.toString())
  const currencyBalance = new BigNumber(rawCurrencyBalance.toString())
  if (assetBalance.lte(0) || currencyBalance.lte(0)) {
    console.log('[recalculateSingleDepositBounds] Pool balances are zero:', {
      assetBalance: assetBalance.toString(),
      currencyBalance: currencyBalance.toString()
    })
    disableSingleSlider()
    return
  }

  const assetScale = new BigNumber(10).pow(assetAsset.decimals)
  const currencyScale = new BigNumber(10).pow(assetCurrency.decimals)

  const poolAssetBase = assetBalance.multipliedBy(assetScale).dividedBy(SCALE_1E9)
  const poolCurrencyBase = currencyBalance.multipliedBy(currencyScale).dividedBy(SCALE_1E9)
  if (!poolAssetBase.isFinite() || !poolCurrencyBase.isFinite()) {
    disableSingleSlider()
    return
  }

  if (poolAssetBase.lte(0) || poolCurrencyBase.lte(0)) {
    disableSingleSlider()
    return
  }

  const userAssetBase = new BigNumber(state.balanceAsset).multipliedBy(assetScale)
  const userCurrencyBase = new BigNumber(state.balanceCurrency).multipliedBy(currencyScale)

  console.log('[recalculateSingleDepositBounds] User balances:', {
    balanceAsset: state.balanceAsset,
    balanceCurrency: state.balanceCurrency,
    userAssetBase: userAssetBase.toString(),
    userCurrencyBase: userCurrencyBase.toString()
  })

  if (userAssetBase.lte(0) && userCurrencyBase.lte(0)) {
    console.log('[recalculateSingleDepositBounds] User has no balances')
    disableSingleSlider()
    return
  }

  const ratio = poolAssetBase.dividedBy(poolCurrencyBase)
  if (!ratio.isFinite() || ratio.lte(0)) {
    disableSingleSlider()
    return
  }

  const assetBasedOnCurrency = userCurrencyBase.multipliedBy(ratio)
  const currencyBasedOnAsset = userAssetBase.dividedBy(ratio)

  const assetBaseMax = BigNumber.min(userAssetBase, assetBasedOnCurrency).integerValue(
    BigNumber.ROUND_FLOOR
  )
  const currencyBaseMax = BigNumber.min(userCurrencyBase, currencyBasedOnAsset).integerValue(
    BigNumber.ROUND_FLOOR
  )

  if (assetBaseMax.lte(0) || currencyBaseMax.lte(0)) {
    disableSingleSlider()
    return
  }

  state.singleMaxAssetBase = BigInt(assetBaseMax.toFixed(0))
  state.singleMaxCurrencyBase = BigInt(currencyBaseMax.toFixed(0))
  state.singleRatioAssetBase = BigInt(poolAssetBase.integerValue(BigNumber.ROUND_FLOOR).toFixed(0))
  state.singleRatioCurrencyBase = BigInt(
    poolCurrencyBase.integerValue(BigNumber.ROUND_FLOOR).toFixed(0)
  )

  state.singleMaxDepositAsset = assetBaseMax.dividedBy(assetScale).toNumber()
  state.singleMaxDepositCurrency = currencyBaseMax.dividedBy(currencyScale).toNumber()

  state.singleSliderEnabled = state.singleMaxDepositAsset > 0 && state.singleMaxDepositCurrency > 0

  if (!state.singleSliderEnabled) {
    disableSingleSlider()
    return
  }

  // Ensure slider reflects current inputs without triggering feedback
  syncSingleSliderPercent(assetAsset.decimals, assetCurrency.decimals)
}

const applySingleSliderPercent = (percent: number) => {
  if (!state.singleSliderEnabled) return
  const assetAsset = AssetsService.getAsset(store.state.assetCode)
  const assetCurrency = AssetsService.getAsset(store.state.currencyCode)
  if (!assetAsset || !assetCurrency) return

  const assetScale = new BigNumber(10).pow(assetAsset.decimals)
  const currencyScale = new BigNumber(10).pow(assetCurrency.decimals)
  const assetBaseMax = new BigNumber(state.singleMaxAssetBase.toString())
  const ratioAssetBase = new BigNumber(state.singleRatioAssetBase.toString())
  const ratioCurrencyBase = new BigNumber(state.singleRatioCurrencyBase.toString())

  if (
    assetBaseMax.lte(0) ||
    ratioAssetBase.lte(0) ||
    ratioCurrencyBase.lte(0) ||
    !assetBaseMax.isFinite()
  ) {
    return
  }

  const fraction = new BigNumber(Math.max(0, Math.min(100, percent))).dividedBy(100)
  let desiredAssetBase = assetBaseMax.multipliedBy(fraction).integerValue(BigNumber.ROUND_FLOOR)

  if (desiredAssetBase.lte(0)) {
    state.depositAssetAmount = 0
    state.depositCurrencyAmount = 0
    return
  }

  const desiredCurrencyBase = desiredAssetBase
    .multipliedBy(ratioCurrencyBase)
    .dividedBy(ratioAssetBase)
    .integerValue(BigNumber.ROUND_FLOOR)

  if (desiredCurrencyBase.lte(0)) {
    state.depositAssetAmount = 0
    state.depositCurrencyAmount = 0
    return
  }

  isApplyingSingleSlider = true
  state.depositAssetAmount = desiredAssetBase.dividedBy(assetScale).toNumber()
  state.depositCurrencyAmount = desiredCurrencyBase.dividedBy(currencyScale).toNumber()
  isApplyingSingleSlider = false
}

const syncSingleSliderPercent = (assetDecimals?: number, currencyDecimals?: number) => {
  if (!state.singleSliderEnabled || isApplyingSingleSlider) return
  const assetAsset = AssetsService.getAsset(store.state.assetCode)
  const assetCurrency = AssetsService.getAsset(store.state.currencyCode)
  const assetDec = assetDecimals ?? assetAsset?.decimals
  const currencyDec = currencyDecimals ?? assetCurrency?.decimals
  if (assetDec === undefined || currencyDec === undefined) return

  const assetScale = new BigNumber(10).pow(assetDec)
  const currentAssetBase = new BigNumber(state.depositAssetAmount)
    .multipliedBy(assetScale)
    .integerValue(BigNumber.ROUND_FLOOR)
  const assetBaseMax = new BigNumber(state.singleMaxAssetBase.toString())
  if (assetBaseMax.lte(0)) {
    state.singleDepositPercent = 0
    return
  }

  const percent = currentAssetBase.dividedBy(assetBaseMax).multipliedBy(100).toNumber()

  isSyncingSingleSlider = true
  state.singleDepositPercent = Number.isFinite(percent) ? Math.max(0, Math.min(100, percent)) : 0
  isSyncingSingleSlider = false
}

const parseScaledNumber = (value: string | undefined) => {
  if (!value) return undefined
  const normalized = value.replace(',', '.').trim()
  if (!normalized) return undefined
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : undefined
}

const applyRouteBoundsIfReady = (source: string = 'route-query') => {
  if (state.e2eLocked) return
  if (!pendingRouteRange) return
  if (isApplyingRouteRange) return

  let { low, high } = pendingRouteRange
  const hasLow = typeof low === 'number'
  const hasHigh = typeof high === 'number'

  if (!hasLow && !hasHigh) {
    pendingRouteRange = null
    return
  }

  if (hasLow && hasHigh && (low as number) > (high as number)) {
    const swappedLow = high as number
    high = low
    low = swappedLow
  }

  if (hasLow || hasHigh) {
    activeRouteRange = {
      low: hasLow ? (low as number) : activeRouteRange?.low,
      high: hasHigh ? (high as number) : activeRouteRange?.high
    }
  }

  isApplyingRouteRange = true
  let didMutate = false

  if (hasLow && state.minPriceTrade !== low) {
    state.minPriceTrade = low as number
    didMutate = true
  }

  if (hasHigh && state.maxPriceTrade !== high) {
    state.maxPriceTrade = high as number
    didMutate = true
  }

  state.ticksCalculated = true

  const dist = state.distribution
  if (dist && Array.isArray(dist.labels) && dist.labels.length > 0) {
    const clampIndex = (index: number) => Math.max(0, Math.min(index, dist.labels.length - 1))
    const findClosestIndex = (
      values: Array<{ toNumber: () => number }>,
      target: number | undefined,
      fallback: number
    ) => {
      if (typeof target !== 'number') return clampIndex(fallback)
      let closestIndex = clampIndex(fallback)
      let smallestDiff = Number.POSITIVE_INFINITY
      values.forEach((value, idx) => {
        const numeric = value.toNumber()
        const diff = Math.abs(numeric - target)
        if (diff < smallestDiff) {
          smallestDiff = diff
          closestIndex = idx
        }
      })
      return clampIndex(closestIndex)
    }

    const currentLowIdx = clampIndex(state.prices[0] ?? 0)
    const currentHighIdx = clampIndex(state.prices[1] ?? currentLowIdx)

    const lowIndex = findClosestIndex(dist.min, low, currentLowIdx)
    const highIndex = findClosestIndex(dist.max, high, currentHighIdx)
    const nextLow = Math.min(lowIndex, highIndex)
    const nextHigh = Math.max(lowIndex, highIndex)

    if (state.prices[0] !== nextLow || state.prices[1] !== nextHigh) {
      state.prices = [nextLow, nextHigh]
      didMutate = true
    }

    pendingRouteRange = null
  }

  if (didMutate || source !== 'route-query') {
    recalculateSingleDepositBounds()
  }

  isApplyingRouteRange = false
}

const updateRouteQuery = (updates: Record<string, string | undefined>) => {
  const nextQuery: Record<string, string | undefined> = {
    ...route.query
  } as Record<string, string | undefined>
  let changed = false

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) {
      if (key in nextQuery) {
        delete nextQuery[key]
        changed = true
      }
    } else if (nextQuery[key] !== value) {
      nextQuery[key] = value
      changed = true
    }
  }

  if (changed) {
    void router.replace({ query: nextQuery })
  }
}

const applyRouteOverrides = () => {
  if (state.e2eLocked) return

  const rawLpFee = route.query.lpFee as string | undefined
  if (rawLpFee) {
    try {
      const parsed = BigInt(rawLpFee)
      if (allowedLpFeeTiers.includes(parsed) && state.lpFee !== parsed) {
        state.lpFee = parsed
      } else {
        console.warn('lpFee query not in allowed tiers', rawLpFee)
      }
    } catch (e) {
      console.warn('Invalid lpFee query parameter', rawLpFee, e)
    }
  }

  const rawShape = (route.query.shape as string | undefined)?.toLowerCase()
  if (rawShape && allowedShapeValues.has(rawShape) && state.shape !== rawShape) {
    state.shape = rawShape as typeof state.shape
  }

  const low = parseScaledNumber(route.query.low as string | undefined)
  const high = parseScaledNumber(route.query.high as string | undefined)
  const hasPriceOverride = typeof low === 'number' || typeof high === 'number'

  if (hasPriceOverride) {
    pendingRouteRange = { low, high }
    applyRouteBoundsIfReady('route-query')
  } else {
    pendingRouteRange = null
    activeRouteRange = null
    recalculateSingleDepositBounds()
  }
}

const getE2EPool = (appId?: number) => {
  const e2eData = typeof window !== 'undefined' ? window.__BIATEC_E2E : undefined
  if (!e2eData?.pools?.length) return null
  const targetId = typeof appId === 'number' ? appId : e2eData.pools[0]?.appId
  if (typeof targetId !== 'number') return null
  return e2eData.pools.find((pool) => pool.appId === targetId) ?? null
}

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
  if (state.e2eLocked) {
    // Only derive tick/decimal info; avoid any distribution/slider recalculations
    const e2eMin = new BigNumber(state.minPriceTrade || 1)
    const e2eMax = new BigNumber(state.maxPriceTrade || state.minPriceTrade || 1)
    const decLow = initPriceDecimals(e2eMin, new BigNumber(state.precision))
    state.tickLow = decLow.tick.toNumber()
    state.priceDecimalsLow = decLow.priceDecimals.toNumber() ?? 3
    const decHigh = initPriceDecimals(e2eMax, new BigNumber(state.precision))
    state.tickHigh = decHigh.tick.toNumber()
    state.priceDecimalsHigh = decHigh.priceDecimals.toNumber() ?? 3
    return
  }
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
  syncStorePairWithRoute()
  // In E2E locked mode, skip any network/state derived overrides
  if (state.e2eLocked) {
    return
  }
  const e2ePool = getE2EPool(route.params.ammAppId ? Number(route.params.ammAppId) : undefined)
  if (e2ePool) {
    state.shape = e2ePool.min === e2ePool.max ? 'wall' : 'single'
    state.minPriceTrade = e2ePool.min
    state.maxPriceTrade = e2ePool.max
    return
  }
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

  const hasPoolProvider = !!store.state.clientPP?.appId
  const hasPair = !!store.state.pair?.asset && !!store.state.pair?.currency

  if (!hasPoolProvider || !hasPair) {
    return
  }

  await loadPools()
}
const fetchData = async () => {
  syncStorePairWithRoute()
  const isCypressEnv = typeof window !== 'undefined' && !!(window as any).Cypress
  const skipExternalPrice = isCypressEnv && !!(window as any).__BIATEC_SKIP_PRICE_FETCH
  const bypassE2ELock = isCypressEnv && !!(window as any).__CY_IGNORE_E2E_LOCK
  const routeLowOverride = parseScaledNumber(route.query.low as string | undefined)
  const routeHighOverride = parseScaledNumber(route.query.high as string | undefined)
  const fallbackMidFromRoute =
    typeof routeLowOverride === 'number' && typeof routeHighOverride === 'number'
      ? (routeLowOverride + routeHighOverride) / 2
      : undefined
  let priceLoadedFromProvider = false
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

    const e2ePool = getE2EPool(route.params.ammAppId ? Number(route.params.ammAppId) : undefined)
    if (e2ePool) {
      state.e2eLocked = true
      // Force shape to single so both low/high price inputs are rendered for E2E assertions
      state.shape = 'single'
      state.precision = Math.min(assetAsset.precision, assetCurrency.precision)
      state.midPrice = e2ePool.price
      state.minPriceTrade = e2ePool.min
      state.maxPriceTrade = e2ePool.max
      console.log('[E2E] Initial pool bounds assigned', {
        min: state.minPriceTrade,
        max: state.maxPriceTrade,
        appId: e2ePool.appId
      })
      // Expose immediate debug snapshot for Cypress
      if (typeof window !== 'undefined') {
        ;(window as any).__E2E_DEBUG_BOUNDS = {
          phase: 'initial',
          min: state.minPriceTrade,
          max: state.maxPriceTrade,
          mid: state.midPrice,
          e2eLocked: state.e2eLocked,
          tickLow: state.tickLow,
          tickHigh: state.tickHigh,
          prices: [...state.prices]
        }
        ;(window as any).__E2E_DEBUG_STATE = JSON.parse(JSON.stringify(state))
      }
      state.e2eOriginalMin = e2ePool.min
      state.e2eOriginalMax = e2ePool.max
      state.showPriceForm = false
      state.pricesApplied = true
      state.ticksCalculated = true
      // Use a distinct high index so distribution logic (if it runs) doesn't collapse max to min
      state.prices = [0, 1]
      initPriceDecimalsState()

      if (!bypassE2ELock) {
        // Ensure any subsequent reactive ticks restore original bounds
        setTimeout(() => {
          if (
            state.e2eLocked &&
            typeof state.e2eOriginalMin === 'number' &&
            typeof state.e2eOriginalMax === 'number'
          ) {
            state.minPriceTrade = state.e2eOriginalMin
            state.maxPriceTrade = state.e2eOriginalMax
            console.log('[E2E] Post-timeout restoration of original bounds', {
              min: state.minPriceTrade,
              max: state.maxPriceTrade
            })
            if (typeof window !== 'undefined') {
              ;(window as any).__E2E_DEBUG_BOUNDS = {
                phase: 'restored-timeout',
                min: state.minPriceTrade,
                max: state.maxPriceTrade,
                mid: state.midPrice,
                e2eLocked: state.e2eLocked,
                tickLow: state.tickLow,
                tickHigh: state.tickHigh,
                prices: [...state.prices]
              }
              ;(window as any).__E2E_DEBUG_STATE = JSON.parse(JSON.stringify(state))
            }
          }
        }, 50)
        // Skip checkLoad during E2E to avoid overriding fixture bounds
        return
      }

      state.e2eLocked = false
      pendingRouteRange = {
        low: routeLowOverride,
        high: routeHighOverride
      }
      applyRouteBoundsIfReady('cypress-bypass')
    }
    if (skipExternalPrice && typeof fallbackMidFromRoute === 'number') {
      state.midPrice = fallbackMidFromRoute
      state.ticksCalculated = false
      setSliderAndTick()
      state.showPriceForm = false
      state.pricesApplied = true
      priceLoadedFromProvider = true
    }

    if (store.state.clientPP && !skipExternalPrice) {
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
        priceLoadedFromProvider = true
      } catch (e) {
        console.error('failed to fetch price', e)
      }
    }

    if (!priceLoadedFromProvider) {
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
        console.log(
          'state.precision',
          state.precision,
          assetAsset.precision,
          assetCurrency.precision
        )
        setSliderAndTick()
      } else {
        state.showPriceForm = true
      }
    }
  } catch (exc: any) {
    console.error(exc)
    toast.add({
      severity: 'error',
      detail: exc.message ?? exc,
      life: 5000
    })
  } finally {
    state.fetchingQuotes = false
    await checkLoad()
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
  () => store.state.clientConfig,
  (config) => {
    if (config && route.params.ammAppId) {
      void checkLoad()
    }
  }
)
watch(
  () => state.prices[0],
  () => {
    if (isApplyingRouteRange) return
    if (state.e2eLocked) return
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
    if (isApplyingRouteRange) return
    if (state.e2eLocked) return
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
  (newShape) => {
    if (!state.e2eLocked) {
      updateRouteQuery({ shape: newShape.toString() })
    }
    setChartData()
    recalculateSingleDepositBounds()
  }
)
watch(
  () => state.lpFee,
  (newLpFee) => {
    if (!state.e2eLocked) {
      updateRouteQuery({ lpFee: newLpFee.toString() })
    }
    recalculateSingleDepositBounds()
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
    if (state.shape === 'single' && state.singleSliderEnabled && !isApplyingSingleSlider) {
      syncSingleSliderPercent()
    }
  }
)
watch(
  () => state.depositCurrencyAmount,
  () => {
    setChartData()
    if (state.shape === 'single' && state.singleSliderEnabled && !isApplyingSingleSlider) {
      syncSingleSliderPercent()
    }
  }
)

watch(
  () => state.singleDepositPercent,
  (percent) => {
    if (!state.singleSliderEnabled || isSyncingSingleSlider) return
    applySingleSliderPercent(percent)
  }
)

watch(
  () => state.minPriceTrade,
  (newVal, oldVal) => {
    if (isApplyingRouteRange) return
    const isE2EMode = typeof window !== 'undefined' && !!(window as any).__BIATEC_E2E
    const targetLow =
      typeof activeRouteRange?.low === 'number' ? (activeRouteRange?.low as number) : undefined
    const targetHigh =
      typeof activeRouteRange?.high === 'number' ? (activeRouteRange?.high as number) : undefined
    if (
      targetLow !== undefined &&
      Math.abs(state.minPriceTrade - targetLow) > ROUTE_ENFORCE_TOLERANCE
    ) {
      pendingRouteRange = { low: targetLow, high: targetHigh }
      applyRouteBoundsIfReady('min-enforce')
      return
    }
    if (isE2EMode) {
      // In E2E mode preserve provided pool min price exactly; still refresh chart data
      setChartData()
      return
    }
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
    recalculateSingleDepositBounds()
  }
)
watch(
  () => state.maxPriceTrade,
  () => {
    if (isApplyingRouteRange) {
      if (typeof window !== 'undefined') {
        const w: any = window
        if (w.__E2E_DEBUG_CHANGES) {
          w.__E2E_DEBUG_CHANGES.push({
            ts: Date.now(),
            phase: 'watch-maxPriceTrade-skip-route',
            min: state.minPriceTrade,
            max: state.maxPriceTrade,
            tickLow: state.tickLow,
            tickHigh: state.tickHigh,
            prices: [...state.prices]
          })
        }
      }
      return
    }
    if (state.e2eLocked) {
      // Record debug change history for E2E diagnostics
      if (typeof window !== 'undefined') {
        const w: any = window
        if (!w.__E2E_DEBUG_CHANGES) w.__E2E_DEBUG_CHANGES = []
        w.__E2E_DEBUG_CHANGES.push({
          ts: Date.now(),
          phase: 'watch-maxPriceTrade-e2eLocked',
          min: state.minPriceTrade,
          max: state.maxPriceTrade,
          tickLow: state.tickLow,
          tickHigh: state.tickHigh,
          prices: [...state.prices]
        })
        w.__E2E_DEBUG_BOUNDS = {
          phase: 'watch-maxPriceTrade-e2eLocked',
          min: state.minPriceTrade,
          max: state.maxPriceTrade,
          mid: state.midPrice,
          e2eLocked: state.e2eLocked,
          tickLow: state.tickLow,
          tickHigh: state.tickHigh,
          prices: [...state.prices]
        }
      }
      setChartData()
      return
    }
    const targetLow =
      typeof activeRouteRange?.low === 'number' ? (activeRouteRange?.low as number) : undefined
    const targetHigh =
      typeof activeRouteRange?.high === 'number' ? (activeRouteRange?.high as number) : undefined
    if (
      targetHigh !== undefined &&
      Math.abs(state.maxPriceTrade - targetHigh) > ROUTE_ENFORCE_TOLERANCE
    ) {
      pendingRouteRange = { low: targetLow, high: targetHigh }
      applyRouteBoundsIfReady('max-enforce')
      return
    }
    if (state.e2eLocked) return
    console.log('state.maxPriceTrade changed:', state.maxPriceTrade)
    setChartData()
    recalculateSingleDepositBounds()
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
    disableSingleSlider()
    return
  }

  if (balancesLoading) {
    return
  }

  balancesLoading = true
  try {
    const algodClient = getAlgodClient(activeNetworkConfig.value)
    const accountInfo = await algodClient.accountInformation(authStore.account).do()

    console.log('=== loadBalances DEBUG START ===')
    console.log('Account:', authStore.account)
    console.log('Asset code from store:', store.state.assetCode)
    console.log('Currency code from store:', store.state.currencyCode)
    console.log('Account info amount:', accountInfo.amount)
    console.log('Account info minBalance:', accountInfo.minBalance)
    console.log('Account info assets COUNT:', accountInfo.assets?.length ?? 0)

    // Debug: log RAW asset objects to see what properties they actually have
    if (accountInfo.assets && accountInfo.assets.length > 0) {
      console.log('First asset RAW keys:', Object.keys(accountInfo.assets[0]))
      console.log('First asset RAW object:', accountInfo.assets[0])
    }

    // SDK v3 returns camelCase keys (assetId, isFrozen); REST API returns kebab-case ('asset-id', 'is-frozen'). Support both.
    const extractAssetId = (a: any): number | undefined => {
      const id = a?.['asset-id'] ?? a?.assetId
      try {
        if (typeof id === 'bigint') return Number(id)
        if (typeof id === 'number') return id
        if (typeof id === 'string') return Number(id)
      } catch (_) {
        return undefined
      }
      return undefined
    }
    const extractFrozen = (a: any): boolean | undefined => a?.['is-frozen'] ?? a?.isFrozen
    const extractAmount = (a: any): bigint | number => {
      const amt = a?.amount
      return typeof amt === 'bigint' ? amt : typeof amt === 'number' ? amt : 0
    }

    const serializableAssets = accountInfo.assets?.map((asset: any) => {
      const id = extractAssetId(asset)
      const amt = extractAmount(asset)
      console.log(
        'Processing asset with keys:',
        Object.keys(asset),
        '→ id:',
        id,
        'amount(raw):',
        amt
      )
      return {
        assetId: id,
        amount: typeof amt === 'bigint' ? amt.toString() : amt,
        isFrozen: extractFrozen(asset) ?? false
      }
    })
    console.log(
      'Account info ALL assets (normalized list):',
      JSON.stringify(serializableAssets, null, 2)
    )

    // Log specifically if VoteCoin is there (452399768)
    const voteCoinHolding = accountInfo.assets?.find((a: any) => extractAssetId(a) === 452399768)
    console.log('VoteCoin (452399768) in holdings?', voteCoinHolding ? 'YES' : 'NO')
    if (voteCoinHolding) {
      console.log('VoteCoin holding details:', {
        assetId: extractAssetId(voteCoinHolding),
        amount: extractAmount(voteCoinHolding)?.toString(),
        isFrozen: extractFrozen(voteCoinHolding)
      })
    }

    const getBalanceForAsset = (assetId: number, decimals: number) => {
      console.log(`getBalanceForAsset called with assetId=${assetId}, decimals=${decimals}`)

      if (assetId === 0) {
        const microAlgos =
          (BigInt(accountInfo.amount) ?? 0n) - (accountInfo.minBalance ?? 0n) - 1_000_000n
        const balance = new BigNumber(microAlgos)
          .dividedBy(new BigNumber(10).pow(decimals))
          .toNumber()
        console.log(`  → ALGO balance: ${balance} (microAlgos: ${microAlgos})`)
        return balance
      }

      const holding = accountInfo.assets?.find((asset: any) => extractAssetId(asset) === assetId)
      console.log(`  → Looking for asset ${assetId}, found holding:`, holding)
      if (!holding) {
        console.warn(
          `  ⚠️ Asset ${assetId} not found in account holdings - account may not be opted-in (checked both 'asset-id' and 'assetId')`
        )
      }
      const rawAmount = holding ? extractAmount(holding) : 0
      const amountNumber = typeof rawAmount === 'bigint' ? Number(rawAmount) : rawAmount
      const balance = new BigNumber(amountNumber)
        .dividedBy(new BigNumber(10).pow(decimals))
        .toNumber()
      console.log(
        `  → Asset ${assetId} balance: ${balance} (raw amount: ${rawAmount.toString?.() ?? rawAmount})`
      )
      return balance
    }

    // Ensure we reference current asset/currency codes (pair object might lag behind watchers)
    const currentAsset = AssetsService.getAsset(store.state.assetCode)
    const currentCurrency = AssetsService.getAsset(store.state.currencyCode)

    console.log('Resolved currentAsset:', currentAsset)
    console.log('Resolved currentCurrency:', currentCurrency)

    if (currentAsset) {
      const assetBalance = getBalanceForAsset(currentAsset.assetId, currentAsset.decimals)
      console.log(`Setting state.balanceAsset to ${assetBalance}`)
      state.balanceAsset = assetBalance
      // Only set depositAssetAmount to balance if it's currently 0 (initial load)
      if (state.depositAssetAmount === 0) {
        console.log(`Initializing state.depositAssetAmount to ${assetBalance}`)
        state.depositAssetAmount = assetBalance
      } else {
        console.log(`Keeping existing state.depositAssetAmount: ${state.depositAssetAmount}`)
      }
      // sync pair.asset if outdated
      if (store.state.pair.asset.code !== currentAsset.code) {
        console.log(
          `Syncing store.state.pair.asset from ${store.state.pair.asset.code} to ${currentAsset.code}`
        )
        store.state.pair.asset = currentAsset
      }

      // Show warning if balance is 0 and asset is not ALGO (might need opt-in)
      if (assetBalance === 0 && currentAsset.assetId !== 0) {
        console.warn(
          `⚠️ Zero balance for ${currentAsset.name} (${currentAsset.code}). If you own this asset, your account may not be opted-in.`
        )
        toast.add({
          severity: 'warn',
          summary: t('components.addLiquidity.warnings.zeroBalance'),
          detail: t('components.addLiquidity.warnings.mayNeedOptIn', { asset: currentAsset.name }),
          life: 8000
        })
      }
    } else {
      console.warn('loadBalances: asset not found for code', store.state.assetCode)
      state.balanceAsset = 0
      state.depositAssetAmount = 0
    }
    if (currentCurrency) {
      const currencyBalance = getBalanceForAsset(currentCurrency.assetId, currentCurrency.decimals)
      console.log(`Setting state.balanceCurrency to ${currencyBalance}`)
      state.balanceCurrency = currencyBalance
      // Only set depositCurrencyAmount to balance if it's currently 0 (initial load)
      if (state.depositCurrencyAmount === 0) {
        console.log(`Initializing state.depositCurrencyAmount to ${currencyBalance}`)
        state.depositCurrencyAmount = currencyBalance
      } else {
        console.log(`Keeping existing state.depositCurrencyAmount: ${state.depositCurrencyAmount}`)
      }
      // sync pair.currency if outdated
      if (store.state.pair.currency.code !== currentCurrency.code) {
        console.log(
          `Syncing store.state.pair.currency from ${store.state.pair.currency.code} to ${currentCurrency.code}`
        )
        store.state.pair.currency = currentCurrency
      }
    } else {
      console.warn('loadBalances: currency not found for code', store.state.currencyCode)
      state.balanceCurrency = 0
      state.depositCurrencyAmount = 0
    }

    console.log('Final state:', {
      balanceAsset: state.balanceAsset,
      balanceCurrency: state.balanceCurrency,
      depositAssetAmount: state.depositAssetAmount,
      depositCurrencyAmount: state.depositCurrencyAmount
    })
    console.log('=== loadBalances DEBUG END ===')
    // Immediately attempt recalculation since balances updated; pools may already be loaded.
    recalculateSingleDepositBounds()
    // In case pools finish loading slightly after balances (race condition), schedule a deferred retry.
    setTimeout(() => {
      try {
        if (!state.singleSliderEnabled) {
          console.log('[loadBalances] Deferred slider recalculation attempt')
          recalculateSingleDepositBounds()
        }
      } catch (e) {
        console.warn('[loadBalances] Deferred recalc failed', e)
      }
    }, 100)
  } catch (error) {
    console.error('Failed to load balances', error)
  } finally {
    balancesLoading = false
  }
}

const setChartData = () => {
  if (state.e2eLocked) {
    // Preserve original bounds without generating distribution data
    return
  }
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
  applyRouteBoundsIfReady('set-chart-data')
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
  if (
    state.e2eLocked &&
    typeof state.e2eOriginalMin === 'number' &&
    typeof state.e2eOriginalMax === 'number'
  ) {
    // Re-assert original bounds in case any internal calculation tried to alter them
    state.minPriceTrade = state.e2eOriginalMin
    state.maxPriceTrade = state.e2eOriginalMax
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
  applyRouteOverrides()
  if (state.e2eLocked) {
    // Preserve original E2E fixture bounds; skip distribution/tick recalculations
    state.chartOptions = setChartOptions()
    // Periodically enforce original bounds for a short window to defeat any late overwrites
    let enforceCount = 0
    const enforceInterval = setInterval(() => {
      enforceCount++
      if (
        state.e2eLocked &&
        typeof state.e2eOriginalMin === 'number' &&
        typeof state.e2eOriginalMax === 'number'
      ) {
        if (
          state.maxPriceTrade !== state.e2eOriginalMax ||
          state.minPriceTrade !== state.e2eOriginalMin
        ) {
          console.log('[E2E] Enforcement correcting bounds', {
            currentMin: state.minPriceTrade,
            currentMax: state.maxPriceTrade,
            originalMin: state.e2eOriginalMin,
            originalMax: state.e2eOriginalMax
          })
          state.minPriceTrade = state.e2eOriginalMin
          state.maxPriceTrade = state.e2eOriginalMax
          if (typeof window !== 'undefined') {
            ;(window as any).__E2E_DEBUG_BOUNDS = {
              phase: 'enforced-interval',
              min: state.minPriceTrade,
              max: state.maxPriceTrade,
              mid: state.midPrice,
              e2eLocked: state.e2eLocked,
              tickLow: state.tickLow,
              tickHigh: state.tickHigh,
              prices: [...state.prices]
            }
          }
        }
      }
      if (enforceCount >= 10) {
        clearInterval(enforceInterval)
      }
    }, 100)
    return
  }
  await loadBalances()
  initPriceDecimalsState()
  setChartData()
  state.chartOptions = setChartOptions()
  applyRouteOverrides()
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
      // force reload balances when asset/currency code changes
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

watch(
  () => [route.query.lpFee, route.query.shape, route.query.low, route.query.high],
  () => {
    applyRouteOverrides()
  }
)

const loadPools = async (refresh: boolean = false) => {
  try {
    if (!refresh) {
      if (store.state.pools[store.state.env]) {
        state.pools = store.state.pools[store.state.env]
        console.log('Using cached pools:', state.pools)
        recalculateSingleDepositBounds()
        // If we have route parameters, apply them after pools are loaded
        if (pendingRouteRange && (pendingRouteRange.low || pendingRouteRange.high)) {
          applyRouteBoundsIfReady('loadPools-cached')
        }
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
    recalculateSingleDepositBounds()
    // If we have route parameters, apply them after pools are loaded
    if (pendingRouteRange && (pendingRouteRange.low || pendingRouteRange.high)) {
      applyRouteBoundsIfReady('loadPools-fresh')
    }
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
    let enforcedSingleBinDeposits: { asset: bigint; currency: bigint } | null = null

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
        ((p.assetA === assetAOrdered && p.assetB === assetBOrdered) ||
          (p.assetA === assetBOrdered && p.assetB === assetAOrdered)) &&
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

    try {
      const adjustment = alignSingleBinDeposits(
        addLiquidityPool,
        assetAsset.decimals,
        assetCurrency.decimals,
        state.depositAssetAmount,
        state.depositCurrencyAmount
      )
      if (adjustment) {
        if (adjustment.changed) {
          state.depositAssetAmount = adjustment.assetAmount
          state.depositCurrencyAmount = adjustment.currencyAmount
          toast.add({
            severity: 'info',
            summary: t('components.addLiquidity.title'),
            detail: t('components.addLiquidity.info.singleRatioAdjusted'),
            life: 4000
          })
        }
        enforcedSingleBinDeposits = {
          asset: adjustment.assetBase,
          currency: adjustment.currencyBase
        }
      }
    } catch (alignmentError) {
      if ((alignmentError as Error).message === 'single-ratio-too-small') {
        toast.add({
          severity: 'error',
          summary: t('components.addLiquidity.title'),
          detail: t('components.addLiquidity.errors.singleRatioTooSmall'),
          life: 5000
        })
        return
      }
      console.error('Failed to align single bin deposits', alignmentError)
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
      assetADeposit:
        enforcedSingleBinDeposits?.asset ??
        BigInt(
          BigNumber(state.depositAssetAmount)
            .multipliedBy(10 ** assetAsset.decimals)
            .toFixed(0, 1)
        ),
      assetBDeposit:
        enforcedSingleBinDeposits?.currency ??
        BigInt(
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
        ((p.assetA === assetAOrdered && p.assetB === assetBOrdered) ||
          (p.assetA === assetBOrdered && p.assetB === assetAOrdered)) &&
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
        ((p.assetA === assetAOrdered && p.assetB === assetBOrdered) ||
          (p.assetA === assetBOrdered && p.assetB === assetAOrdered)) &&
        p.min == normalizedTickLow &&
        p.max == normalizedTickHigh &&
        p.fee == state.lpFee &&
        p.verificationClass == verificationClass
    )
    if (!addLiquidityPool) {
      throw new Error('Pool not found after creation')
    }
    const poolReversed =
      addLiquidityPool.assetA === assetBOrdered && addLiquidityPool.assetB === assetAOrdered
    const addLiquidityPoolClient = new BiatecClammPoolClient({
      algorand: store.state.clientPP.algorand,
      appId: addLiquidityPool.appId,
      defaultSender: signerAccount.addr,
      defaultSigner: signerAccount.signer
    })

    const addLiquidityVars = {
      account: signerAccount,
      assetA: poolReversed ? assetBOrdered : assetAOrdered,
      assetB: poolReversed ? assetAOrdered : assetBOrdered,
      appBiatecConfigProvider: store.state.clientConfig.appId,
      algod: algodClient,
      clientBiatecClammPool: addLiquidityPoolClient,
      appBiatecIdentityProvider: store.state.clientIdentity.appId,
      assetADeposit: poolReversed
        ? BigInt(
            BigNumber(state.depositCurrencyAmount)
              .multipliedBy(10 ** assetCurrency.decimals)
              .toFixed(0, 1)
          )
        : BigInt(
            BigNumber(state.depositAssetAmount)
              .multipliedBy(10 ** assetAsset.decimals)
              .toFixed(0, 1)
          ),
      assetBDeposit: poolReversed
        ? BigInt(
            BigNumber(state.depositAssetAmount)
              .multipliedBy(10 ** assetAsset.decimals)
              .toFixed(0, 1)
          )
        : BigInt(
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
  if (!state.ticksCalculated) {
    const routeLow = typeof activeRouteRange?.low === 'number' ? activeRouteRange.low : undefined
    const routeHigh = typeof activeRouteRange?.high === 'number' ? activeRouteRange.high : undefined
    if (routeLow !== undefined || routeHigh !== undefined) {
      pendingRouteRange = { low: routeLow, high: routeHigh }
      applyRouteBoundsIfReady('set-slider-active-route')
      if (state.ticksCalculated) {
        initPriceDecimalsState()
        return
      }
    }
  }
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
  console.log(
    `setMaxDepositAssetAmount called: setting depositAssetAmount from ${state.depositAssetAmount} to ${state.balanceAsset}`
  )
  state.depositAssetAmount = state.balanceAsset
  console.log(`After setMax: state.depositAssetAmount = ${state.depositAssetAmount}`)
}
const setMaxDepositCurrencyAmount = () => {
  console.log(
    `setMaxDepositCurrencyAmount called: setting depositCurrencyAmount from ${state.depositCurrencyAmount} to ${state.balanceCurrency}`
  )
  state.depositCurrencyAmount = state.balanceCurrency
  console.log(`After setMax: state.depositCurrencyAmount = ${state.depositCurrencyAmount}`)
}

if (typeof window !== 'undefined' && (window as any).Cypress) {
  ;(window as any).__ADD_LIQUIDITY_DEBUG = {
    state,
    store,
    setSliderAndTick,
    setChartData,
    applyRouteBoundsIfReady,
    toScaledPrice,
    getSingleTargetPool,
    recalculateSingleDepositBounds,
    getRouteDebug: () => ({
      pending: pendingRouteRange,
      active: activeRouteRange,
      ticksCalculated: state.ticksCalculated
    }),
    forceRouteBounds: (low?: number, high?: number) => {
      activeRouteRange = {
        low: typeof low === 'number' ? low : activeRouteRange?.low,
        high: typeof high === 'number' ? high : activeRouteRange?.high
      }
      pendingRouteRange = { low, high }
      applyRouteBoundsIfReady('debug-force')
      void nextTick(() => applyRouteBoundsIfReady('debug-force'))
    }
  }
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
      <div
        v-if="
          state.e2eLocked || !state.showPriceForm || (state.showPriceForm && state.pricesApplied)
        "
      >
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
              <InputGroup data-cy="low-price-group" class="low-price-group">
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
              <InputGroup data-cy="high-price-group" class="high-price-group">
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

          <div v-if="isSingleShape" class="mt-3">
            <label for="singleDepositSlider" class="block text-sm font-medium">
              {{
                t('components.addLiquidity.singlePortionLabel', {
                  percent: state.singleDepositPercent.toFixed(0)
                })
              }}
            </label>
            <Slider
              id="singleDepositSlider"
              v-model="state.singleDepositPercent"
              :min="0"
              :max="100"
              :step="1"
              :disabled="!state.singleSliderEnabled"
              class="w-full mt-2"
            />
            <div class="flex justify-between text-xs opacity-70 mt-1">
              <span>0%</span>
              <span>100%</span>
            </div>
            <p class="text-xs opacity-70 mt-2">
              <template v-if="state.singleSliderEnabled">
                {{
                  t('components.addLiquidity.singlePortionHint', {
                    assetAmount: formatNumber(state.singleMaxDepositAsset ?? 0),
                    assetSymbol: store.state.pair.asset.symbol,
                    currencyAmount: formatNumber(state.singleMaxDepositCurrency ?? 0),
                    currencySymbol: store.state.pair.currency.symbol
                  })
                }}
              </template>
              <template v-else>
                {{ t('components.addLiquidity.singlePortionUnavailable') }}
              </template>
            </p>
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
