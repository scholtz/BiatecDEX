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
    ;(useAppStore as any).mockReturnValue(mockStore)

    // Mock AssetsService to return null for direct lookups but find by name
    ;(AssetsService.getAsset as any).mockReturnValue(null)
    ;(AssetsService.getAssets as any).mockReturnValue([
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
    ;(AssetsService.selectPrimaryAsset as any).mockReturnValue({})

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