/// <reference types="vite/client" />

import type { IAuthenticationStore } from 'algorand-authentication-component-vue'

interface BiatecE2EAssetRow {
  assetId: number
  assetName: string
  assetCode: string
  assetSymbol: string
  decimals: number
  poolCount: number
  assetTvl: number
  otherAssetTvl: number
  totalTvlUsd: number
  usdPrice?: number
  currentPriceUsd?: number | null
  vwap1dUsd?: number | null
  vwap7dUsd?: number | null
  volume1dUsd?: number | null
  volume7dUsd?: number | null
  priceLoading?: boolean
}

interface BiatecE2EPool {
  appId: number
  assetA: number
  assetB: number
  assetAUnit?: string
  assetBUnit?: string
  assetADecimals?: number
  assetBDecimals?: number
  min: number
  max: number
  mid: number
  price: number
  fee?: number
  assetABalance?: number
  assetBBalance?: number
}

declare global {
  interface Window {
    __BIATEC_E2E?: {
      assetRows?: BiatecE2EAssetRow[]
      pools?: BiatecE2EPool[]
    }
    __authStore?: IAuthenticationStore
    __MY_LIQUIDITY_E2E_DEBUG?: {
      targetAssetId?: number
      targetCurrencyId?: number
      fullInfoLength: number
      poolAppIds: string[]
    }
  }
}

export {}
