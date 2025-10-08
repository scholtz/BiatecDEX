export interface AMMAggregatedPool {
  id: string // $"{AssetIdA}-{AssetIdB}"
  assetIdA: number
  assetIdB: number
  a: number
  b: number
  tvL_A: number
  tvL_B: number
  poolCount: number
  lastUpdated: string | null // ISO 8601 or null
}
