// Shape of the app-under-test's window.__ADD_LIQUIDITY_DEBUG bag (see AddLiquidity.vue),
// typed loosely there too — it's an internal debug API surface, not a public contract.
export interface AddLiquidityDebugState {
  shape?: string
  lpFee?: bigint
  minPriceTrade?: number
  maxPriceTrade?: number
  // Real element type is the CLAMM package's FullConfig; tests here only check `.length`.
  fullInfo?: unknown[]
  // Same rationale as fullInfo above.
  pools?: unknown[]
  balanceAsset?: number
  balanceCurrency?: number
  singleSliderEnabled?: boolean
  singleMaxDepositAsset?: number
  singleMaxDepositCurrency?: number
  showPriceForm?: boolean
  pricesApplied?: boolean
  ticksCalculated?: boolean
}

export interface AddLiquidityDebug {
  state: AddLiquidityDebugState
  store?: { state?: { assetCode?: string; currencyCode?: string } }
  setChartData: () => void
  forceRouteBounds?: (low?: number, high?: number) => void
}

declare global {
  interface Window {
    __ADD_LIQUIDITY_DEBUG?: AddLiquidityDebug
    // These four are only ever truthy-checked then deleted by these specs (never read) —
    // their real shapes live in the app's own env.d.ts, not duplicated here.
    __E2E_DEBUG_BOUNDS?: unknown
    __E2E_DEBUG_CHANGES?: unknown
    __E2E_DEBUG_STATE?: unknown
    __BIATEC_E2E?: unknown
    __BIATEC_SKIP_PRICE_FETCH?: boolean
    __CY_IGNORE_E2E_LOCK?: boolean
  }
}
