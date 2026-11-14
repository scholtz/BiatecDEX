// ---------------------------------------------------------------------------
// Trader page price chart: which provider a network offers and the iframe URL.
//
// Biatec Scan serves a TradingView chart per network under /charts/ (parameters
// assetA, assetB (quote, 0 = ALGO), interval, theme, locale). Vestige only covers
// Algorand mainnet. The user's choice (store.state.chartProvider, persisted under
// CHART_PROVIDER_STORAGE_KEY) is only a preference: resolveChartProvider falls back
// to the other provider when the network does not have the preferred one.
// ---------------------------------------------------------------------------

export const CHART_PROVIDERS = ['biatec', 'vestige'] as const
export type ChartProvider = (typeof CHART_PROVIDERS)[number]

export const DEFAULT_CHART_PROVIDER: ChartProvider = 'biatec'
export const CHART_PROVIDER_STORAGE_KEY = 'biatecdex.chartProvider'

export const isChartProvider = (value: string | null | undefined): value is ChartProvider =>
  value === 'biatec' || value === 'vestige'

const viteEnv = (import.meta as { env?: Record<string, string | undefined> })?.env

const BIATEC_CHARTS_BY_NETWORK: Record<string, string | undefined> = {
  'mainnet-v1.0': viteEnv?.VITE_BIATEC_CHARTS_MAINNET || 'https://algorand.scan.biatec.io/charts/',
  'testnet-v1.0': viteEnv?.VITE_BIATEC_CHARTS_TESTNET || 'https://testnet.scan.biatec.io/charts/'
}

const VESTIGE_NETWORKS = new Set(['mainnet-v1.0'])

export const getBiatecChartsBaseUrl = (env: string): string | undefined =>
  BIATEC_CHARTS_BY_NETWORK[env]

/** Providers that have a chart for this network, in the order they are offered. */
export const chartProvidersForNetwork = (env: string): ChartProvider[] =>
  CHART_PROVIDERS.filter((provider) =>
    provider === 'biatec' ? !!getBiatecChartsBaseUrl(env) : VESTIGE_NETWORKS.has(env)
  )

/**
 * The provider to show: the preferred one when the network has it, else the other one,
 * else null (no chart on this network). An unknown preference counts as the default.
 */
export const resolveChartProvider = (
  preferred: string | null | undefined,
  env: string
): ChartProvider | null => {
  const wanted = isChartProvider(preferred) ? preferred : DEFAULT_CHART_PROVIDER
  const available = chartProvidersForNetwork(env)
  if (available.includes(wanted)) return wanted
  return available[0] ?? null
}

/** Biatec Scan chart intervals; the app passes minutes (Vestige's unit). */
const BIATEC_INTERVALS: Record<number, string> = {
  15: '15',
  60: '60',
  240: '4H',
  1440: '1D'
}
const DEFAULT_INTERVAL = 15

export interface ChartUrlInput {
  provider: ChartProvider
  env: string
  assetId: number | bigint | null | undefined
  currencyId: number | bigint | null | undefined
  /** Candle interval in minutes (15, 60, 240, 1440). */
  interval?: number
  dark: boolean
  locale: string
}

/** ALGO is id 0 for both providers (same normalisation as fetchFolksRouterQuotes). */
const normaliseAssetId = (id: number | bigint | null | undefined): bigint | null => {
  if (id === null || id === undefined) return null
  if (typeof id === 'number' && !Number.isFinite(id)) return null
  const value = typeof id === 'bigint' ? id : BigInt(Math.trunc(id))
  return value > 0n ? value : 0n
}

/** The chart iframe URL, or null when the pair or the network has no chart. */
export const buildChartUrl = (input: ChartUrlInput): string | null => {
  const assetId = normaliseAssetId(input.assetId)
  const currencyId = normaliseAssetId(input.currencyId)
  if (assetId === null || currencyId === null || assetId === currencyId) return null
  const interval = input.interval ?? DEFAULT_INTERVAL

  if (input.provider === 'biatec') {
    const base = getBiatecChartsBaseUrl(input.env)
    if (!base) return null
    const url = new URL(base.endsWith('/') ? base : `${base}/`)
    url.search = new URLSearchParams({
      assetA: assetId.toString(),
      assetB: currencyId.toString(),
      interval: BIATEC_INTERVALS[interval] ?? BIATEC_INTERVALS[DEFAULT_INTERVAL],
      theme: input.dark ? 'dark' : 'light',
      locale: input.locale
    }).toString()
    return url.toString()
  }

  if (!VESTIGE_NETWORKS.has(input.env)) return null
  const url = new URL(`https://vestige.fi/widget/${assetId.toString()}/chart`)
  url.search = new URLSearchParams({
    noCookie: 'true',
    tools: 'true',
    interval: String(interval),
    denominatingAssetId: currencyId.toString()
  }).toString()
  return url.toString()
}

/** The stored preference, or the default when storage is empty, unreadable or holds garbage. */
export const readStoredChartProvider = (): ChartProvider => {
  try {
    const stored = globalThis.localStorage?.getItem(CHART_PROVIDER_STORAGE_KEY)
    return isChartProvider(stored) ? stored : DEFAULT_CHART_PROVIDER
  } catch {
    return DEFAULT_CHART_PROVIDER
  }
}

export const writeStoredChartProvider = (provider: ChartProvider): void => {
  try {
    globalThis.localStorage?.setItem(CHART_PROVIDER_STORAGE_KEY, provider)
  } catch {
    // Storage blocked (private mode, quota): the choice still applies to this session.
  }
}
