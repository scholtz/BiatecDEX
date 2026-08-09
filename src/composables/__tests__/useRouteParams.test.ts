import { describe, it, expect, vi } from 'vitest'
import { useRouteParams } from '@/composables/useRouteParams'
import { useAppStore } from '@/stores/app'
import { AssetsService } from '@/service/AssetsService'

// Mock dependencies
vi.mock('@/stores/app')
vi.mock('@/service/AssetsService')
vi.mock('vue-router', () => ({
  useRoute: () => ({
    params: {
      network: 'mainnet-v1.0',
      assetCode: 'vote',
      currencyCode: 'golddao'
    }
  })
}))

describe('useRouteParams', () => {
  it('should handle asset lookup with improved local search', async () => {
    // Mock the store
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
    // mockStore is a deliberately partial Pinia-store fake (only the fields this test reads),
    // not the full store shape, so it needs the unrelated-types double-cast here.
    vi.mocked(useAppStore).mockReturnValue(mockStore as unknown as ReturnType<typeof useAppStore>)

    // Mock AssetsService to return null for direct lookups but find by name
    vi.mocked(AssetsService.getAsset).mockReturnValue(null)
    vi.mocked(AssetsService.getAssets).mockReturnValue([
      {
        assetId: 123,
        name: 'Vote Token',
        code: 'VOTE',
        symbol: 'VOTE',
        decimals: 6,
        network: 'mainnet-v1.0'
      },
      {
        assetId: 456,
        name: 'Gold DAO',
        code: 'GOLDDAO',
        symbol: 'GOLDDAO',
        decimals: 6,
        network: 'mainnet-v1.0'
      }
    ])
    vi.mocked(AssetsService.selectPrimaryAsset).mockReturnValue(
      {} as ReturnType<typeof AssetsService.selectPrimaryAsset>
    )

    // Call the composable
    const { setRoutesVars } = useRouteParams()
    await setRoutesVars()

    // Verify store was updated with found assets
    expect(mockStore.state.assetCode).toBe('VOTE')
    expect(mockStore.state.assetName).toBe('Vote Token')
    expect(mockStore.state.currencyCode).toBe('GOLDDAO')
    expect(mockStore.state.currencyName).toBe('Gold DAO')
  })
})
