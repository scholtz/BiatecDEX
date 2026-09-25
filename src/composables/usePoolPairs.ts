import { computed, reactive, watch, type ComputedRef } from 'vue'
import { useAppStore } from '@/stores/app'
import { useNetwork } from '@txnlab/use-wallet-vue'
import getAlgodClient from '@/scripts/algo/getAlgodClient'
import { fetchBiatecPools, isTradeApiConfigured } from '@/service/tradeApi'
import { getPools } from 'biatec-concentrated-liquidity-amm'
import {
  buildPairGraph,
  getAssetsWithPools,
  getMostLiquidPool,
  getPairedAssets,
  hasPair,
  type PairGraph,
  type PairPool
} from '@/scripts/clamm/pairGraph'

/**
 * Shared "which asset pairs have an existing pool" data source.
 *
 * Rule: existing-pool-only asset selection (Trader dashboard, Liquidity
 * Provider dashboard, AssetInfo pair selectors, Explore Assets add-liquidity
 * action) must all agree on what counts as an existing pair. This composable
 * is the single place that fetches the full pool list for the active network
 * and turns it into the pair graph consumed by every one of those selectors.
 *
 * Data source, following the repo-wide "trade reporter first, on-chain
 * fallback" rule (see CLAUDE.md): `fetchBiatecPools(env)` with no asset
 * filter (returns every Biatec pool) when the trade API is configured for
 * the network; otherwise (or when that call throws / returns empty) on-chain
 * `getPools({ assetId: 0n, poolProviderAppId })` box iteration, the same
 * pattern used elsewhere for a full pool listing. The on-chain path cannot
 * cheaply get per-pool TVL (that needs one status() call per pool), so those
 * pools carry `tvlUsd: 0` — `getMostLiquidPool` then falls back to pool count
 * as the tie-breaker, which is still a meaningful signal.
 *
 * State is cached per network at module scope so every component calling
 * this composable shares one fetch and one graph instead of re-fetching the
 * full pool list per mounted selector.
 */

interface NetworkPoolPairsState {
  graph: PairGraph
  loading: boolean
  /** Set once a load (success or failure) has completed for this network. */
  loaded: boolean
  error: string | null
}

const emptyState = (): NetworkPoolPairsState => ({
  graph: new Map(),
  loading: false,
  loaded: false,
  error: null
})

// Reactive so every component's computed()s reading `cache[network]` re-run
// when a load completes, without each caller managing its own watcher.
const cache = reactive<Record<string, NetworkPoolPairsState>>({})

// Dedup concurrent loads of the same network (e.g. several selectors mounting
// at once) into a single in-flight fetch.
const inFlight = new Map<string, Promise<void>>()

const mapPoolToPairPool = (p: {
  poolAppId?: number
  assetIdA?: number | null
  assetIdB?: number | null
  totalTVLAssetAInUSD?: number | null
  totalTVLAssetBInUSD?: number | null
}): PairPool | null => {
  if (p.poolAppId === undefined || p.assetIdA === undefined || p.assetIdA === null) return null
  if (p.assetIdB === undefined || p.assetIdB === null) return null
  return {
    appId: BigInt(p.poolAppId),
    assetA: p.assetIdA,
    assetB: p.assetIdB,
    tvlUsd: (p.totalTVLAssetAInUSD ?? 0) + (p.totalTVLAssetBInUSD ?? 0)
  }
}

/**
 * Load the pair graph for `network`, mutating the (always-kept) cache entry
 * in place rather than replacing it, so a concurrent reader's reference into
 * `cache[network]` is never orphaned mid-load.
 *
 * Concurrent calls for the same network are deduped into one in-flight fetch
 * UNLESS `force` is set (see `invalidate`), in which case a fresh fetch is
 * started and registered as the new in-flight promise regardless of one
 * already running — the previous fetch is left to finish and write the same
 * cache entry (harmless: both fetches read the same real pool list).
 *
 * Callers pass `getAlgod`/`poolProviderAppId` lazily so the on-chain fallback
 * is only evaluated when actually needed (trade API not configured, throws,
 * or returns nothing).
 */
const loadNetwork = (
  network: string,
  getAlgod: () => ReturnType<typeof getAlgodClient> | null,
  poolProviderAppId: () => bigint | null,
  force = false
): Promise<void> => {
  if (!force) {
    const existing = inFlight.get(network)
    if (existing) return existing
  }

  const state = cache[network] ?? emptyState()
  cache[network] = state
  state.loading = true
  state.error = null

  const promise = (async () => {
    let pairPools: PairPool[] = []
    let reporterFailed = false

    if (isTradeApiConfigured(network)) {
      try {
        const pools = await fetchBiatecPools(network)
        pairPools = pools.map(mapPoolToPairPool).filter((p): p is PairPool => p !== null)
        if (pairPools.length === 0) reporterFailed = true
      } catch (error) {
        console.error('usePoolPairs: trade reporter pool fetch failed', network, error)
        reporterFailed = true
      }
    } else {
      reporterFailed = true
    }

    if (reporterFailed) {
      try {
        const algod = getAlgod()
        const appId = poolProviderAppId()
        if (algod && appId) {
          const onChainPools = await getPools({ algod, assetId: 0n, poolProviderAppId: appId })
          pairPools = onChainPools.map((p) => ({
            appId: p.appId,
            assetA: Number(p.assetA),
            assetB: Number(p.assetB),
            tvlUsd: 0
          }))
        }
      } catch (error) {
        console.error('usePoolPairs: on-chain pool fallback failed', network, error)
      }
    }

    // cache[network] is never deleted (see invalidate), so `state` is always
    // still the live cache entry here — no orphaned-object risk.
    state.graph = buildPairGraph(pairPools)
    state.loading = false
    state.loaded = true
  })().finally(() => {
    // Only clear the dedup slot if it's still THIS promise — a later forced
    // load may already have registered its own promise in its place.
    if (inFlight.get(network) === promise) inFlight.delete(network)
  })

  inFlight.set(network, promise)
  return promise
}

export interface UsePoolPairsResult {
  /** Whether the pair graph for the active network is still loading. */
  loading: ComputedRef<boolean>
  /** Non-null once a load has completed, even if both sources failed. */
  loaded: ComputedRef<boolean>
  /** Every asset id that has at least one existing pool on the active network. */
  assetsWithPools: ComputedRef<Set<number>>
  /** Asset ids paired with `assetId` through an existing pool, most liquid first. */
  pairedAssets: (assetId: number) => number[]
  /** Whether an existing pool pairs the two assets (either orientation). */
  hasPair: (assetIdA: number, assetIdB: number) => boolean
  /** The single most liquid pool for `assetId`, or null when it has no pool. */
  mostLiquidPool: (assetId: number) => { otherAssetId: number; pool: PairPool } | null
  /** Force a re-fetch for the active network (e.g. after creating a new pool). */
  invalidate: () => void
}

export function usePoolPairs(): UsePoolPairsResult {
  const store = useAppStore()
  const { activeNetworkConfig } = useNetwork()

  const currentState = computed<NetworkPoolPairsState>(() => cache[store.state.env] ?? emptyState())

  const load = (force = false) => {
    const network = store.state.env
    void loadNetwork(
      network,
      () => (activeNetworkConfig.value ? getAlgodClient(activeNetworkConfig.value) : null),
      () => store.state.clientPP?.appId ?? null,
      force
    )
  }

  // Guarded by the module-level cache/in-flight map, so switching back to an
  // already-loaded network is a no-op — this converges rather than looping.
  // Wrapped (not passed directly) so watch's (newValue, oldValue) args never
  // reach `load`'s own `force` parameter.
  watch(
    () => store.state.env,
    () => load(),
    { immediate: true }
  )

  const graph = computed(() => currentState.value.graph)

  return {
    loading: computed(() => currentState.value.loading),
    loaded: computed(() => currentState.value.loaded),
    assetsWithPools: computed(() => getAssetsWithPools(graph.value)),
    pairedAssets: (assetId: number) => getPairedAssets(graph.value, assetId),
    hasPair: (assetIdA: number, assetIdB: number) => hasPair(graph.value, assetIdA, assetIdB),
    mostLiquidPool: (assetId: number) => getMostLiquidPool(graph.value, assetId),
    invalidate: () => load(true)
  }
}
