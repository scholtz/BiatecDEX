import { axiosInstance } from '@/api/axios-instance'
import type { BiatecAsset } from '@/api/models'

// ---------------------------------------------------------------------------
// Per-network Biatec trade API configuration.
//
// The trade API (asset metadata/prices, asset images, trades) is a mainnet
// indexer. Other networks have no trade API by default, so we must NOT call the
// mainnet endpoint for them (it returns mainnet assets for colliding ids, which
// corrupts metadata such as decimals). Add a base URL here to enable the trade
// API for a given network.
// ---------------------------------------------------------------------------
const TRADE_API_BY_NETWORK: Record<string, string | undefined> = {
  'mainnet-v1.0':
    (import.meta as { env?: Record<string, string | undefined> })?.env?.VITE_TRADE_API_MAINNET ||
    'https://algorand-trades.de-4.biatec.io',
  'testnet-v1.0':
    (import.meta as { env?: Record<string, string | undefined> })?.env?.VITE_TRADE_API_TESTNET ||
    undefined,
  'voimain-v1.0':
    (import.meta as { env?: Record<string, string | undefined> })?.env?.VITE_TRADE_API_VOIMAIN ||
    undefined,
  'aramidmain-v1.0':
    (import.meta as { env?: Record<string, string | undefined> })?.env?.VITE_TRADE_API_ARAMID ||
    undefined,
  'dockernet-v1':
    (import.meta as { env?: Record<string, string | undefined> })?.env?.VITE_TRADE_API_LOCALNET ||
    undefined
}

export const getTradeApiBaseUrl = (env: string): string | undefined => TRADE_API_BY_NETWORK[env]

export const isTradeApiConfigured = (env: string): boolean => !!getTradeApiBaseUrl(env)

/** Image URL for an asset, or undefined when the trade API is not configured. */
export const getAssetImageUrl = (env: string, assetId: number | bigint): string | undefined => {
  const base = getTradeApiBaseUrl(env)
  return base ? `${base}/api/asset/image/${assetId}` : undefined
}

export interface TradeAssetQuery {
  ids?: string
  search?: string
  offset?: number
  size?: number
}

/**
 * Fetch assets from the trade API for the given network. Returns an empty array
 * when the trade API is not configured for that network (never falls back to a
 * different network's endpoint).
 */
export const fetchTradeAssets = async (
  env: string,
  params: TradeAssetQuery
): Promise<BiatecAsset[]> => {
  const base = getTradeApiBaseUrl(env)
  if (!base) return []
  const res = await axiosInstance<BiatecAsset[]>({
    url: `${base}/api/asset`,
    method: 'GET',
    params
  })
  return res?.data ?? []
}
