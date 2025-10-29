import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { AssetsService } from '@/service/AssetsService'
import { getAVMTradeReporterAPI } from '@/api'
import type { IAsset } from '@/interface/IAsset'

export function useRouteParams() {
  const store = useAppStore()
  const route = useRoute()
  const api = getAVMTradeReporterAPI()

  const setRoutesVars = async () => {
    console.log('setRoutesVars', route.params)

    if (route.params.network as 'mainnet-v1.0' | 'voimain-v1.0' | 'testnet-v1.0' | 'dockernet-v1') {
      store.state.env = route.params.network as
        | 'mainnet-v1.0'
        | 'voimain-v1.0'
        | 'testnet-v1.0'
        | 'dockernet-v1'
    }

    // Helper function to find asset by various methods
    const findAsset = async (code: string) => {
      // Try exact code match
      let asset = AssetsService.getAsset(code)
      if (asset) return asset

      // Try lowercase code match
      asset = AssetsService.getAsset(code.toLowerCase())
      if (asset) return asset

      // Try to find by name (lowercased)
      const allAssets = AssetsService.getAssets()
      asset = allAssets.find((a) => a.name.toLowerCase() === code.toLowerCase())
      if (asset) return asset

      // Try to find by name containing the code (case-insensitive)
      asset = allAssets.find((a) => a.name.toLowerCase().includes(code.toLowerCase()))
      if (asset) return asset

      // Try to find by code containing the search term (case-insensitive)
      asset = allAssets.find((a) => a.code.toLowerCase().includes(code.toLowerCase()))
      if (asset) return asset

      return null
    }

    if (route.params.assetCode) {
      const code = route.params.assetCode as string
      const asset = await findAsset(code)
      if (asset) {
        store.state.assetCode = asset.code
        store.state.assetName = asset.name
        var pair = AssetsService.selectPrimaryAsset(store.state.currencyCode, store.state.assetCode)
        if (pair && pair.asset && pair.currency) {
          store.state.pair = pair as {
            invert: boolean
            currency: IAsset
            asset: IAsset
          }
        }
      }
    }
    if (route.params.currencyCode) {
      const code = route.params.currencyCode as string
      const asset = await findAsset(code)
      if (asset) {
        store.state.currencyCode = asset.code
        store.state.currencyName = asset.name
        store.state.currencySymbol = asset.symbol

        var pair = AssetsService.selectPrimaryAsset(store.state.currencyCode, store.state.assetCode)
        if (pair && pair.asset && pair.currency) {
          store.state.pair = pair as {
            invert: boolean
            currency: IAsset
            asset: IAsset
          }
        }
      }
    }
    console.log('store.state', store.state)
  }

  // Call initially to set route vars
  setRoutesVars()

  // Watch for route parameter changes
  watch(
    () => route.params.network,
    () => {
      setRoutesVars()
    },
    { deep: true }
  )
  watch(
    () => route.params.assetCode,
    () => {
      setRoutesVars()
    },
    { deep: true }
  )
  watch(
    () => route.params.currencyCode,
    () => {
      setRoutesVars()
    },
    { deep: true }
  )

  return {
    setRoutesVars
  }
}
