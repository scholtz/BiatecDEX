import { onUnmounted, watch } from 'vue'
import { useAppStore } from '@/stores/app'
import { AssetsService } from '@/service/AssetsService'
import { fetchAssetStats } from '@/service/tradeApi'
import { signalrService } from '@/service/signalrService'
import type { AssetStat } from '@/types/AssetStat'
import type { BiatecAsset } from '@/api/models'
import type { SubscriptionFilter } from '@/types/SubscriptionFilter'

const SUBSCRIPTION_KEY = 'live-asset-catalog'

// Module-level ref count: AssetInfo.vue mounts on both the trade and the liquidity
// screen, so a naive per-component subscribe/unsubscribe would flicker the shared
// SignalR filter off every time the user navigates between them. Only the first
// mount subscribes; only the last unmount tears it down.
let refCount = 0
let currentHandler: ((asset: BiatecAsset) => void) | null = null

const emptyFilter = (): SubscriptionFilter => ({
  RecentBlocks: false,
  RecentTrades: false,
  RecentLiquidity: false,
  RecentPool: false,
  RecentAggregatedPool: false,
  RecentAssets: true,
  RecentAssetStats: false,
  MainAggregatedPools: false,
  PoolsAddresses: [],
  AggregatedPoolsIds: [],
  AssetIds: []
})

/**
 * Keeps AssetsService populated with every asset that actually has live pools on
 * the active network — sourced from AVMTradeReporter's asset-stat endpoint (an
 * initial bulk fetch per network) plus its SignalR 'Asset' event (assets
 * discovered afterward, e.g. right after a brand-new pool is created). This is
 * what lets the asset/currency Select dropdowns in AssetInfo.vue (shared by the
 * trade screen and the liquidity screen) list every asset actually tradeable on
 * the chain, instead of just the small hand-curated catalog in AssetsService.ts.
 *
 * Consumers reading AssetsService.getAssets()/getCurrencies() must include
 * `AssetsService.customAssetsVersion.value` in their computed to react to what
 * this registers (see the comment on that ref) — plain mutation of the
 * underlying registry isn't Vue-reactive on its own.
 *
 * Safe to call from multiple simultaneously-mounted components: the SignalR
 * subscription and per-network fetch are shared/deduped via a module-level ref
 * count, not re-subscribed per caller.
 */
export function useLiveAssetCatalog(): void {
  const store = useAppStore()

  const loadForCurrentNetwork = async () => {
    const network = store.state.env
    try {
      const stats = await fetchAssetStats(network)
      for (const stat of stats as AssetStat[]) {
        AssetsService.ensureCustomAsset({
          assetId: stat.assetId,
          network,
          name: stat.assetName ?? undefined,
          unitName: stat.unitName ?? undefined,
          decimals: stat.decimals ?? undefined
        })
      }
    } catch (error) {
      console.error('useLiveAssetCatalog: failed to load live assets for', network, error)
    }
  }

  refCount++
  if (refCount === 1) {
    currentHandler = (asset: BiatecAsset) => {
      AssetsService.ensureCustomAsset({
        assetId: asset.index,
        network: store.state.env,
        name: asset.params?.name ?? undefined,
        unitName: asset.params?.unitName ?? undefined,
        decimals: asset.params?.decimals ?? undefined
      })
    }
    signalrService.onAssetReceived(currentHandler)
    void signalrService.registerFilter(SUBSCRIPTION_KEY, emptyFilter())
  }

  void loadForCurrentNetwork()
  const stopWatch = watch(
    () => store.state.env,
    () => void loadForCurrentNetwork()
  )

  onUnmounted(() => {
    stopWatch()
    refCount--
    if (refCount === 0 && currentHandler) {
      signalrService.unsubscribeFromAssetUpdates(currentHandler)
      currentHandler = null
      void signalrService.unregisterFilter(SUBSCRIPTION_KEY)
    }
  })
}
