/**
 * Builds the Liquidity Provider dashboard's asset table rows for an unauthenticated
 * visitor: one row per asset that has an existing Biatec pool, with no holding data
 * (there is no wallet to hold anything) but a real aggregated pool USD value when the
 * trade API's asset-stat endpoint is available. This is what lets an unauthenticated
 * user browse every pool and reach the Add Liquidity screen for it, instead of the
 * table staying empty until they connect a wallet.
 */
export interface PoolAssetRow {
  assetId: number
  assetName: string
  assetCode: string
  assetSymbol: string
  decimals: number
  aggregatedAmountInPools: number
  aggregatedUsdValueInPools: number
  currentHoldingAmount: bigint
  currentHoldingUsdValue: number
  usdPrice?: number
  isSelected: boolean
}

export interface PoolAssetStatLike {
  assetName?: string | null
  unitName?: string | null
  decimals?: number | null
  tvlusd?: number
  tvlOtherUSD?: number
  priceUSD?: number | null
}

export interface PoolAssetCatalogEntryLike {
  name: string
  code: string
  symbol: string
  decimals: number
}

const assetCodeFallback = (assetId: number): string => (assetId === 0 ? 'ALGO' : `asa${assetId}`)

// Approximates the token amount of THIS asset locked in its pools from tvlusd (the
// asset's own side of its pools' TVL, per CLAUDE.md's "Asset stats" TVL split note) and
// priceUSD - so the "amount" column isn't a bare 0 sitting next to a real, nonzero "pool
// value" USD figure for the same row (tvlOtherUSD is the PAIRED asset's side, a different
// token, and must not be divided by this asset's own price).
const approximateAmountInPools = (stat: PoolAssetStatLike | undefined): number => {
  if (!stat || !stat.tvlusd || !stat.priceUSD || stat.priceUSD <= 0) return 0
  const amount = stat.tvlusd / stat.priceUSD
  return Number.isFinite(amount) ? amount : 0
}

/**
 * One row per id in `assetIds` (every asset with an existing pool - see
 * usePoolPairs.ts's `assetsWithPools`, the trade-reporter-first/on-chain-fallback
 * source of truth for "has a pool"). `catalogById`/`statsByAssetId` are both
 * best-effort enrichment: an id missing from either still gets a row, falling back
 * to a synthetic name/code and zero USD value rather than being dropped - a partial
 * name lookup must never hide an otherwise real, clickable pool.
 */
export function buildPoolAssetRows(
  assetIds: number[],
  catalogById: Map<number, PoolAssetCatalogEntryLike>,
  statsByAssetId: Map<number, PoolAssetStatLike>
): PoolAssetRow[] {
  const rows = assetIds.map((assetId) => {
    const managed = catalogById.get(assetId)
    const stat = statsByAssetId.get(assetId)
    return {
      assetId,
      assetName: managed?.name ?? stat?.assetName ?? `Asset #${assetId}`,
      assetCode: managed?.code ?? assetCodeFallback(assetId),
      assetSymbol: managed?.symbol ?? stat?.unitName ?? '',
      decimals: managed?.decimals ?? stat?.decimals ?? 0,
      aggregatedAmountInPools: approximateAmountInPools(stat),
      aggregatedUsdValueInPools: (stat?.tvlusd ?? 0) + (stat?.tvlOtherUSD ?? 0),
      currentHoldingAmount: 0n,
      currentHoldingUsdValue: 0,
      usdPrice: stat?.priceUSD ?? undefined,
      isSelected: false
    } satisfies PoolAssetRow
  })
  return rows.sort((a, b) => b.aggregatedUsdValueInPools - a.aggregatedUsdValueInPools)
}
