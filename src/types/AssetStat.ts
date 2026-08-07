/**
 * HAND-MAINTAINED type — mirrors the AVMTradeReporter `AssetStat` DTO
 * (`GET api/asset-stat?protocol=Biatec&sortBy=TVLUSD&direction=Desc`) and the
 * SignalR `AssetStat` server-to-client event on the same hub.
 *
 * The backend endpoint is new and hasn't been exercised against a live
 * Orval `generate:api` run yet (see `AMMAggregatedPool.ts` for the established
 * precedent of hand-maintaining trade-reporter-adjacent types here). Field
 * casing follows System.Text.Json's default camelCase naming policy, verified
 * against the real Orval-generated `aggregatedPool.ts` (`TVL_A` -> `tvL_A`):
 * the algorithm lowercases a leading run of uppercase letters except the last
 * one in the run when it's immediately followed by another uppercase letter
 * that starts a new word segment — for an unbroken uppercase acronym that
 * runs to the end of the identifier (like `TVLUSD`), the whole thing is
 * lowercased. So `TVLUSD` -> `tvlusd`, `PriceUSD` -> `priceUSD` (breaks after
 * the leading `P` because `riceUSD` starts with a lowercase letter),
 * `Apr24h` -> `apr24h`.
 *
 * TODO: delete this file and switch all imports to the real Orval-generated
 * type once `npm run generate:api` has been run against a deployed backend
 * that exposes this endpoint in its Swagger spec. Until then, treat the exact
 * field casing here as a best-effort guess that should be verified against
 * the actual backend response.
 */
export interface AssetStat {
  assetId: number
  /** null means combined/aggregated across all protocols */
  protocol: 'Pact' | 'Tiny' | 'Biatec' | null
  /** `${AssetId}-${Protocol|All}` */
  id: string
  assetName: string | null
  unitName: string | null
  decimals: number | null
  imageUrl: string | null
  priceUSD: number | null
  tvlusd: number
  /**
   * TVL of the paired (other) side of each pool trading this asset, summed across pools.
   * `TVLUSD + TVLOtherUSD` == full both-sides TVL of the pools this asset participates in.
   * Casing: `TVLOtherUSD` -> `tvlOtherUSD` (the leading uppercase run breaks before `Other`,
   * keeping the `O`, same rule as `PriceUSD` -> `priceUSD` above). Optional because older
   * backend deployments don't send it yet.
   */
  tvlOtherUSD?: number
  volume24hUSD: number
  volume7dUSD: number
  fees24hUSD: number
  fees7dUSD: number
  /** Percentage, e.g. 12.5 means 12.5% */
  apr24h: number
  /** Percentage, e.g. 12.5 means 12.5% */
  apr7d: number
  poolCount: number
  /** ISO 8601 datetime */
  lastUpdated: string
}
