import { describe, it, expect, vi, beforeEach } from 'vitest'
import { useRouteParams } from '@/composables/useRouteParams'
import { useAppStore } from '@/stores/app'
import { AssetsService } from '@/service/AssetsService'
import { fetchTradeAssets, isTradeApiConfigured } from '@/service/tradeApi'
import type { BiatecAsset } from '@/api/models'
import type { IAsset } from '@/interface/IAsset'

// Mock dependencies
vi.mock('@/stores/app')
vi.mock('@/service/AssetsService')
vi.mock('@/service/tradeApi')
vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: {
      network: 'mainnet-v1.0',
      assetCode: 'folks',
      currencyCode: 'algo'
    }
  })
}))

// Regression: a direct deep link (or a fresh/incognito browser) to an Add
// Liquidity URL for a live-but-uncurated asset (not in the static catalog and
// never registered as a customAsset in this browser) used to leave
// store.state.assetCode/pair untouched while still latching routesReady=true -
// so the pair-dependent panels (pool chart, MyLiquidity, AddLiquidity) mounted
// against the wrong/stale pair and never re-fetched once the asset was later
// discovered by an unrelated component (AssetInfo.vue's useLiveAssetCatalog).
describe('useRouteParams live trade-API lookup fallback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('resolves a code that exists in no local registry via the network-scoped trade API', async () => {
    const mockStore = {
      state: {
        env: 'mainnet-v1.0',
        assetCode: '',
        assetName: '',
        currencyCode: '',
        currencyName: '',
        currencySymbol: '',
        pair: null
      }
    }
    vi.mocked(useAppStore).mockReturnValue(mockStore as unknown as ReturnType<typeof useAppStore>)

    // Cold cache: neither the curated catalog nor any previously-registered
    // custom asset knows about "folks" or "algo".
    vi.mocked(AssetsService.getAsset).mockReturnValue(undefined)
    vi.mocked(AssetsService.getAssets).mockReturnValue([])
    vi.mocked(AssetsService.selectPrimaryAsset).mockReturnValue(
      {} as ReturnType<typeof AssetsService.selectPrimaryAsset>
    )
    vi.mocked(AssetsService.ensureCustomAsset).mockImplementation(
      (input) =>
        ({
          assetId: input.assetId,
          name: input.name ?? `Asset #${input.assetId}`,
          symbol: input.unitName ?? '',
          code: input.unitName ?? `asa${input.assetId}`,
          decimals: input.decimals ?? 0,
          isCurrency: false,
          isAsa: true,
          isArc200: false,
          quotes: [1, 10, 100, 1000],
          network: input.network,
          precision: 1
        }) satisfies IAsset
    )

    vi.mocked(isTradeApiConfigured).mockReturnValue(true)
    vi.mocked(fetchTradeAssets).mockImplementation(async (_env, params) => {
      if (params?.search === 'folks') {
        return [
          {
            index: 987654,
            params: { name: 'Folks Finance', unitName: 'FOLKS', decimals: 6 }
          } as unknown as BiatecAsset
        ]
      }
      return []
    })

    const { setRoutesVars } = useRouteParams()
    await setRoutesVars()

    expect(fetchTradeAssets).toHaveBeenCalledWith(
      'mainnet-v1.0',
      expect.objectContaining({ search: 'folks' })
    )
    expect(AssetsService.ensureCustomAsset).toHaveBeenCalledWith(
      expect.objectContaining({ assetId: 987654, network: 'mainnet-v1.0', unitName: 'FOLKS' })
    )
    expect(mockStore.state.assetCode).toBe('FOLKS')
    expect(mockStore.state.assetName).toBe('Folks Finance')
  })

  it('does not call the trade API when it is not configured for the active network', async () => {
    const mockStore = {
      state: {
        env: 'mainnet-v1.0',
        assetCode: '',
        assetName: '',
        currencyCode: '',
        currencyName: '',
        currencySymbol: '',
        pair: null
      }
    }
    vi.mocked(useAppStore).mockReturnValue(mockStore as unknown as ReturnType<typeof useAppStore>)
    vi.mocked(AssetsService.getAsset).mockReturnValue(undefined)
    vi.mocked(AssetsService.getAssets).mockReturnValue([])
    vi.mocked(isTradeApiConfigured).mockReturnValue(false)

    const { setRoutesVars } = useRouteParams()
    await setRoutesVars()

    expect(fetchTradeAssets).not.toHaveBeenCalled()
    expect(mockStore.state.assetCode).toBe('')
  })
})
