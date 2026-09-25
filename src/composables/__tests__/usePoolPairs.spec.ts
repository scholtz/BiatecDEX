import { describe, it, expect, vi, beforeEach } from 'vitest'
import { effectScope, type EffectScope } from 'vue'
import { usePoolPairs } from '@/composables/usePoolPairs'
import { useAppStore } from '@/stores/app'
import * as tradeApi from '@/service/tradeApi'
import * as clammPkg from 'biatec-concentrated-liquidity-amm'
import type { Pool } from '@/api/models'
import type { FullConfig } from 'biatec-concentrated-liquidity-amm'

vi.mock('@/stores/app')
vi.mock('@txnlab/use-wallet-vue', () => ({
  useNetwork: () => ({ activeNetworkConfig: { value: { algodServer: 'https://x' } } })
}))
vi.mock('@/scripts/algo/getAlgodClient', () => ({
  default: () => ({ mockAlgod: true })
}))
vi.mock('@/service/tradeApi')
vi.mock('biatec-concentrated-liquidity-amm', () => ({
  getPools: vi.fn()
}))

// One (env, clientPP appId) pair per test so the module-level cache/inFlight
// maps (keyed by network) never leak state between tests in this file.
let networkCounter = 0
const freshNetwork = () => `test-net-${++networkCounter}`

const mockStoreFor = (network: string, poolProviderAppId: bigint | null = 123n) => {
  const store = {
    state: {
      env: network,
      clientPP: poolProviderAppId !== null ? { appId: poolProviderAppId } : undefined
    }
  }
  // mockStore is a deliberately partial Pinia-store fake (only the fields
  // usePoolPairs reads), not the full store shape, so it needs the
  // unrelated-types double-cast here (same pattern as useRouteParams.test.ts).
  vi.mocked(useAppStore).mockReturnValue(store as unknown as ReturnType<typeof useAppStore>)
  return store
}

const pool = (poolAppId: number, assetIdA: number, assetIdB: number, tvlA = 0, tvlB = 0): Pool => ({
  poolAppId,
  assetIdA,
  assetIdB,
  totalTVLAssetAInUSD: tvlA,
  totalTVLAssetBInUSD: tvlB
})

const fullConfig = (appId: number, assetA: number, assetB: number): FullConfig =>
  ({
    appId: BigInt(appId),
    assetA: BigInt(assetA),
    assetB: BigInt(assetB),
    min: 0n,
    max: 0n,
    fee: 0n,
    lpTokenId: 0n,
    verificationClass: 0
  }) as FullConfig

const waitUntilLoaded = async (loaded: { value: boolean }) => {
  for (let i = 0; i < 200 && !loaded.value; i++) {
    await new Promise((r) => setTimeout(r, 5))
  }
}

// usePoolPairs() calls Vue's watch(..., { immediate: true }) which needs an
// active effect scope to attach to outside a component; run each test inside
// one and dispose it afterward so no watcher leaks across tests. Mock call
// history must also be cleared between tests — the `vi.mock()`-auto-mocked
// functions are shared module-level spies, so a `not.toHaveBeenCalled()` in
// one test would otherwise see calls made by an earlier test.
let scope: EffectScope
beforeEach(() => {
  vi.clearAllMocks()
  scope = effectScope()
})

describe('usePoolPairs', () => {
  it('loads pools from the trade reporter when configured', async () => {
    const network = freshNetwork()
    mockStoreFor(network)
    vi.mocked(tradeApi.isTradeApiConfigured).mockReturnValue(true)
    vi.mocked(tradeApi.fetchBiatecPools).mockResolvedValue([pool(1, 10, 20, 5, 5)])

    const result = scope.run(() => usePoolPairs())!
    await waitUntilLoaded(result.loaded)

    expect(result.loaded.value).toBe(true)
    expect(result.hasPair(10, 20)).toBe(true)
    expect(tradeApi.fetchBiatecPools).toHaveBeenCalledWith(network)
    expect(result.error.value).toBeNull()
    scope.stop()
  })

  it('falls back to on-chain pools when the reporter returns nothing', async () => {
    const network = freshNetwork()
    mockStoreFor(network)
    vi.mocked(tradeApi.isTradeApiConfigured).mockReturnValue(true)
    vi.mocked(tradeApi.fetchBiatecPools).mockResolvedValue([])
    vi.mocked(clammPkg.getPools).mockResolvedValue([fullConfig(2, 30, 40)])

    const result = scope.run(() => usePoolPairs())!
    await waitUntilLoaded(result.loaded)

    expect(result.hasPair(30, 40)).toBe(true)
    scope.stop()
  })

  it('falls back to on-chain pools when the trade API is not configured', async () => {
    const network = freshNetwork()
    mockStoreFor(network)
    vi.mocked(tradeApi.isTradeApiConfigured).mockReturnValue(false)
    vi.mocked(clammPkg.getPools).mockResolvedValue([fullConfig(3, 50, 60)])

    const result = scope.run(() => usePoolPairs())!
    await waitUntilLoaded(result.loaded)

    expect(tradeApi.fetchBiatecPools).not.toHaveBeenCalled()
    expect(result.hasPair(50, 60)).toBe(true)
    scope.stop()
  })

  it('resolves to an empty (but loaded) graph when both sources fail', async () => {
    const network = freshNetwork()
    mockStoreFor(network)
    vi.mocked(tradeApi.isTradeApiConfigured).mockReturnValue(true)
    vi.mocked(tradeApi.fetchBiatecPools).mockRejectedValue(new Error('network down'))
    vi.mocked(clammPkg.getPools).mockRejectedValue(new Error('chain down'))

    const result = scope.run(() => usePoolPairs())!
    await waitUntilLoaded(result.loaded)

    expect(result.loaded.value).toBe(true)
    expect(result.assetsWithPools.value.size).toBe(0)
    // Both sources genuinely failed — consumers (e.g. AssetInfo's pair
    // selector) need to tell this apart from "this network has zero pools".
    expect(result.error.value).not.toBeNull()
    scope.stop()
  })

  it('resolves to an empty (but loaded) graph when the pool provider app id is unavailable for the on-chain fallback', async () => {
    const network = freshNetwork()
    mockStoreFor(network, null)
    vi.mocked(tradeApi.isTradeApiConfigured).mockReturnValue(false)

    const result = scope.run(() => usePoolPairs())!
    await waitUntilLoaded(result.loaded)

    expect(result.loaded.value).toBe(true)
    expect(clammPkg.getPools).not.toHaveBeenCalled()
    expect(result.assetsWithPools.value.size).toBe(0)
    expect(result.error.value).not.toBeNull()
    scope.stop()
  })

  it('invalidate() during an in-flight load does not orphan the cache entry (regression)', async () => {
    const network = freshNetwork()
    mockStoreFor(network)
    vi.mocked(tradeApi.isTradeApiConfigured).mockReturnValue(true)
    // First call (the initial immediate load) resolves slowly; invalidate()
    // is called while it's still pending.
    let resolveFirst: (pools: Pool[]) => void = () => {}
    const firstCall = new Promise<Pool[]>((resolve) => {
      resolveFirst = resolve
    })
    vi.mocked(tradeApi.fetchBiatecPools)
      .mockImplementationOnce(() => firstCall)
      .mockResolvedValueOnce([pool(9, 70, 80, 1, 1)])

    const result = scope.run(() => usePoolPairs())!
    // Kick off invalidate() while the initial load is still pending, and let
    // it complete BEFORE the stale first load resolves.
    result.invalidate()
    await waitUntilLoaded(result.loaded)

    // The cache entry must still be reachable and reflect a real fetch (not
    // stuck at an orphaned emptyState() forever, which was the original bug).
    expect(result.loaded.value).toBe(true)
    expect(result.hasPair(70, 80)).toBe(true)

    // Now let the stale first load resolve. Its result must be discarded,
    // not overwrite the fresher (invalidated) graph (a second regression:
    // an older fetch resolving after a newer one must never win).
    resolveFirst([pool(1, 10, 20, 1, 1)])
    await new Promise((r) => setTimeout(r, 20))

    expect(result.hasPair(70, 80)).toBe(true)
    expect(result.hasPair(10, 20)).toBe(false)
    scope.stop()
  })
})
