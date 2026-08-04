export interface SubscriptionFilter {
  RecentBlocks: boolean
  RecentTrades: boolean
  RecentLiquidity: boolean
  RecentPool: boolean
  RecentAggregatedPool: boolean
  RecentAssets: boolean
  /** Mirrors RecentAggregatedPool's naming style for the new AssetStat channel. */
  RecentAssetStats: boolean

  MainAggregatedPools: boolean

  PoolsAddresses: string[]
  AggregatedPoolsIds: string[]
  AssetIds: string[]
}

export const createDashboardSubscriptionFilter = (): SubscriptionFilter => ({
  RecentBlocks: true,
  RecentTrades: true,
  RecentLiquidity: true,
  RecentPool: true,
  RecentAssets: true,
  RecentAggregatedPool: true,
  RecentAssetStats: false,
  MainAggregatedPools: true,

  PoolsAddresses: [],
  AggregatedPoolsIds: [],
  AssetIds: []
})
