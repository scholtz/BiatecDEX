/**
 * Pair graph: which asset pairs have an existing Biatec pool, and how liquid
 * each pair is. Shared by the Trader dashboard, Liquidity Provider dashboard,
 * AssetInfo pair selectors and the Explore Assets "add liquidity" action so
 * every asset selector in the app agrees on what counts as an existing pair.
 *
 * Pure module (no Vue, no network calls) — see `@/composables/usePoolPairs`
 * for the reactive wrapper that fetches pools and builds this graph.
 */

/** One pool, reduced to what the pair graph needs. */
export interface PairPool {
  // Algorand application id — kept as bigint per CLAUDE.md's "app IDs/amounts
  // are bigint" convention (a plain number would silently lose precision for
  // ids above Number.MAX_SAFE_INTEGER and produce a wrong ammAppId route param).
  appId: bigint
  assetA: number
  assetB: number
  /** USD TVL of this single pool (0 when unknown, e.g. on-chain fallback). */
  tvlUsd: number
}

/** Aggregated info about one (assetA, assetB) pair, from one asset's side. */
export interface PairEdge {
  /** The asset on the other side of the pair. */
  otherAssetId: number
  /** Every pool of this pair. */
  pools: PairPool[]
  /** Sum of tvlUsd across every pool of this pair. */
  tvlUsd: number
}

/** assetId -> otherAssetId -> edge. Both orientations are always present. */
export type PairGraph = Map<number, Map<number, PairEdge>>

/**
 * Build the pair graph from a flat pool list. Self-paired pools (assetA ===
 * assetB, which should never occur on-chain but a malformed feed could send)
 * are skipped so they cannot create a self-loop that later code mistakes for
 * "this asset is paired with itself".
 */
export const buildPairGraph = (pools: PairPool[]): PairGraph => {
  const graph: PairGraph = new Map()

  const addEdge = (from: number, to: number, pool: PairPool) => {
    let edges = graph.get(from)
    if (!edges) {
      edges = new Map()
      graph.set(from, edges)
    }
    const existing = edges.get(to)
    if (existing) {
      existing.pools.push(pool)
      existing.tvlUsd += pool.tvlUsd
    } else {
      edges.set(to, { otherAssetId: to, pools: [pool], tvlUsd: pool.tvlUsd })
    }
  }

  for (const pool of pools) {
    if (
      pool.assetA === pool.assetB ||
      !Number.isFinite(pool.assetA) ||
      !Number.isFinite(pool.assetB)
    ) {
      continue
    }
    addEdge(pool.assetA, pool.assetB, pool)
    addEdge(pool.assetB, pool.assetA, pool)
  }

  return graph
}

/** Every asset that has at least one existing pool. */
export const getAssetsWithPools = (graph: PairGraph): Set<number> => new Set(graph.keys())

/** One deduped (unordered) pair, for a single "asset pair" combobox. */
export interface PairSummary {
  assetIdA: number
  assetIdB: number
  tvlUsd: number
}

/**
 * Every distinct existing pair, once each (the graph stores both
 * orientations internally; this collapses them back to one entry per pair),
 * sorted by descending aggregated TVL then by the lower/higher asset id so
 * the order is deterministic. Feeds a single "asset pair" selector (see
 * AssetInfo.vue) instead of two independent asset/currency dropdowns.
 */
export const getAllPairs = (graph: PairGraph): PairSummary[] => {
  const seen = new Set<string>()
  const pairs: PairSummary[] = []
  for (const [assetId, edges] of graph) {
    for (const edge of edges.values()) {
      const lo = Math.min(assetId, edge.otherAssetId)
      const hi = Math.max(assetId, edge.otherAssetId)
      const key = `${lo}:${hi}`
      if (seen.has(key)) continue
      seen.add(key)
      pairs.push({ assetIdA: lo, assetIdB: hi, tvlUsd: edge.tvlUsd })
    }
  }
  return pairs.sort(
    (a, b) => b.tvlUsd - a.tvlUsd || a.assetIdA - b.assetIdA || a.assetIdB - b.assetIdB
  )
}

/** Assets paired with `assetId` through an existing pool, sorted by descending TVL. */
export const getPairedAssets = (graph: PairGraph, assetId: number): number[] => {
  const edges = graph.get(assetId)
  if (!edges) return []
  return Array.from(edges.values())
    .sort((a, b) => b.tvlUsd - a.tvlUsd || a.otherAssetId - b.otherAssetId)
    .map((edge) => edge.otherAssetId)
}

/** Whether an existing pool pairs the two assets (either orientation). */
export const hasPair = (graph: PairGraph, assetIdA: number, assetIdB: number): boolean =>
  graph.get(assetIdA)?.has(assetIdB) ?? false

/**
 * The single most liquid pool of the (known) pair `assetIdA`/`assetIdB` —
 * the pool the "add liquidity" action should land on when both sides of the
 * pair are already chosen (e.g. the Liquidity Provider dashboard's manual
 * asset + row selection). Ties break by the lower pool app id. Returns null
 * when the pair has no existing pool.
 */
export const getMostLiquidPoolForPair = (
  graph: PairGraph,
  assetIdA: number,
  assetIdB: number
): PairPool | null => {
  const edge = graph.get(assetIdA)?.get(assetIdB)
  if (!edge || edge.pools.length === 0) return null
  let best: PairPool | null = null
  for (const pool of edge.pools) {
    if (
      !best ||
      pool.tvlUsd > best.tvlUsd ||
      (pool.tvlUsd === best.tvlUsd && pool.appId < best.appId)
    ) {
      best = pool
    }
  }
  return best
}

/**
 * The single most liquid pool for `assetId`, across every pair it takes part
 * in. Pairs are ranked by their AGGREGATED TVL (the sum of every pool of
 * that pair, from `PairEdge.tvlUsd` — see `buildPairGraph`), not by any one
 * pool's TVL, so a pair split across several shallow pools can still outrank
 * a pair with one deep pool if its combined liquidity is greater. Once the
 * most liquid pair is chosen, the single most liquid pool within it is
 * returned (the caller needs one concrete `ammAppId`). Ties (equal TVL, e.g.
 * both 0 on the on-chain fallback path where TVL is unknown) break by pool
 * count of the pair first, then by the lower other-asset id and lower pool
 * app id, so the result is deterministic regardless of fetch order.
 */
export const getMostLiquidPool = (
  graph: PairGraph,
  assetId: number
): { otherAssetId: number; pool: PairPool } | null => {
  const edges = graph.get(assetId)
  if (!edges || edges.size === 0) return null

  let best: { otherAssetId: number; pool: PairPool } | null = null
  let bestEdgeTvl = -Infinity
  let bestEdgePoolCount = -1
  let bestOtherAssetId = Infinity

  for (const edge of edges.values()) {
    const edgeBetter =
      edge.tvlUsd > bestEdgeTvl ||
      (edge.tvlUsd === bestEdgeTvl &&
        (edge.pools.length > bestEdgePoolCount ||
          (edge.pools.length === bestEdgePoolCount && edge.otherAssetId < bestOtherAssetId)))
    if (!edgeBetter) continue

    let bestPool: PairPool | null = null
    for (const pool of edge.pools) {
      if (
        !bestPool ||
        pool.tvlUsd > bestPool.tvlUsd ||
        (pool.tvlUsd === bestPool.tvlUsd && pool.appId < bestPool.appId)
      ) {
        bestPool = pool
      }
    }
    if (!bestPool) continue

    best = { otherAssetId: edge.otherAssetId, pool: bestPool }
    bestEdgeTvl = edge.tvlUsd
    bestEdgePoolCount = edge.pools.length
    bestOtherAssetId = edge.otherAssetId
  }

  return best
}
