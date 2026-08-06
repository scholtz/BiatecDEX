import { axiosInstance } from '@/api/axios-instance'
import type { BiatecAsset, Pool } from '@/api/models'
import type { AssetStat } from '@/types/AssetStat'
import type { FullConfig } from 'biatec-concentrated-liquidity-amm'

// ---------------------------------------------------------------------------
// Per-network Biatec trade API configuration.
//
// The trade API (asset metadata/prices, asset images, trades) is backed by
// AVMTradeReporter, deployed separately per network: api.algorand.scan.biatec.io
// indexes Algorand mainnet, api.testnet.scan.biatec.io indexes Algorand testnet.
// Other networks have no trade API by default, so we must NOT call the mainnet
// endpoint for them (it returns mainnet assets for colliding ids, which corrupts
// metadata such as decimals). Add a base URL here to enable the trade API for a
// given network.
// ---------------------------------------------------------------------------
const TRADE_API_BY_NETWORK: Record<string, string | undefined> = {
  'mainnet-v1.0':
    (import.meta as { env?: Record<string, string | undefined> })?.env?.VITE_TRADE_API_MAINNET ||
    'https://api.algorand.scan.biatec.io',
  'testnet-v1.0':
    (import.meta as { env?: Record<string, string | undefined> })?.env?.VITE_TRADE_API_TESTNET ||
    'https://api.testnet.scan.biatec.io',
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

export interface AssetStatQuery {
  protocol?: 'Pact' | 'Tiny' | 'Biatec'
  sortBy?: string
  direction?: 'Asc' | 'Desc'
}

/**
 * Fetch server-computed per-asset stats (TVL, volume, fees, APR) from the trade
 * API's `api/asset-stat` endpoint for the given network. This replaces the
 * frontend's slow on-chain aggregation for first paint; callers should fall
 * back to on-chain aggregation if this throws (network/auth error) or when the
 * trade API is not configured for the active network.
 *
 * NOTE: this hand-rolled call bypasses the Orval-generated client (`src/api/`)
 * because the endpoint is not yet reflected in a live Swagger spec this
 * sandbox can reach — see `src/types/AssetStat.ts` for the reconciliation TODO.
 */
export interface BiatecPoolQuery {
  assetIdA?: number
  assetIdB?: number
  size?: number
}

/**
 * Fetch pre-indexed Biatec pool state (reserves, price range, fee, LP token id)
 * from the trade API's `api/pool` endpoint. When both assetIdA and assetIdB are
 * given the server matches the pair in either orientation. This replaces the
 * slow on-chain pattern of listing pool-provider boxes and calling status() per
 * pool; callers must fall back to that on-chain path when this throws, returns
 * an empty array, or the trade API is not configured for the active network.
 */
export const fetchBiatecPools = async (
  env: string,
  params: BiatecPoolQuery = {}
): Promise<Pool[]> => {
  const base = getTradeApiBaseUrl(env)
  if (!base) return []
  const res = await axiosInstance<Pool[]>({
    url: `${base}/api/pool`,
    method: 'GET',
    params: { protocol: 'Biatec', size: 10000, ...params }
  })
  return res?.data ?? []
}

/**
 * Map a trade-reporter Pool to the on-chain FullConfig shape produced by
 * getPools() (box iteration). Prices/fee come back as real decimals from the
 * API and are rescaled to the contract's 1e9 fixed-point representation.
 * Returns null for rows missing the identifying fields.
 */
export const mapBiatecPoolToFullConfig = (p: Pool): FullConfig | null => {
  if (!p.poolAppId || p.assetIdA === undefined || p.assetIdA === null) return null
  if (p.assetIdB === undefined || p.assetIdB === null) return null
  return {
    appId: BigInt(p.poolAppId),
    assetA: BigInt(p.assetIdA),
    assetB: BigInt(p.assetIdB),
    min: BigInt(Math.round((p.pMin ?? 0) * 1e9)),
    max: BigInt(Math.round((p.pMax ?? 0) * 1e9)),
    fee: BigInt(Math.round((p.lpFee ?? 0) * 1e9)),
    lpTokenId: BigInt(p.assetIdLP ?? 0),
    verificationClass: Number(p.verificationClass ?? 0)
  }
}

export const fetchAssetStats = async (
  env: string,
  params: AssetStatQuery = {}
): Promise<AssetStat[]> => {
  const base = getTradeApiBaseUrl(env)
  if (!base) return []
  const res = await axiosInstance<AssetStat[]>({
    url: `${base}/api/asset-stat`,
    method: 'GET',
    params
  })
  return res?.data ?? []
}
