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

interface BiatecE2EDebugBounds {
  phase: string
  min: number
  max: number
  mid: number
  e2eLocked: boolean
  tickLow: number
  tickHigh: number
  prices: number[]
}

interface BiatecE2EDebugChange {
  ts: number
  phase: string
  min: number
  max: number
  tickLow: number
  tickHigh: number
  prices: number[]
}

declare global {
  interface ImportMetaEnv {
    /** PrimeUI license token, exposed via envPrefix 'PRIMEVUE_' in vite.config.ts. */
    readonly PRIMEVUE_LICENSE?: string
  }

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
    /** Presence-only flag: the Cypress test runner sets this on window when the app runs under E2E. */
    Cypress?: object
    __BIATEC_SKIP_PRICE_FETCH?: boolean
    __CY_IGNORE_E2E_LOCK?: boolean
    __E2E_DEBUG_BOUNDS?: BiatecE2EDebugBounds
    __E2E_DEBUG_CHANGES?: BiatecE2EDebugChange[]
    /**
     * Opaque JSON.parse(JSON.stringify(state)) snapshot of AddLiquidity's reactive state,
     * exposed only for Cypress assertions that read specific keys at runtime — its shape
     * tracks that internal `state` object too closely to give it a precise static type.
     */
    __E2E_DEBUG_STATE?: Record<string, unknown>
    /**
     * Cypress-only debug bag exposing AddLiquidity's internal state/store/functions for
     * assertions and manual test control — an intentionally loose internal API surface,
     * not meant to be statically typed by consumers.
     */
    __ADD_LIQUIDITY_DEBUG?: unknown
    __BIATEC_ENV?: string
  }
}

export {}
