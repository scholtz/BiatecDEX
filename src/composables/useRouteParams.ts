import { watch } from 'vue'
import { useRoute } from 'vue-router'
import { useAppStore } from '@/stores/app'
import { AssetsService } from '@/service/AssetsService'

export function useRouteParams() {
  const store = useAppStore()
  const route = useRoute()

  const setRoutesVars = () => {
    console.log('setRoutesVars', route.params)

    if (route.params.network as 'mainnet-v1.0' | 'voimain-v1.0' | 'testnet-v1.0' | 'dockernet-v1') {
      store.state.env = route.params.network as
        | 'mainnet-v1.0'
        | 'voimain-v1.0'
        | 'testnet-v1.0'
        | 'dockernet-v1'
    }
    if (route.params.assetCode) {
      const code = route.params.assetCode as string
      const asset = AssetsService.getAsset(code)
      if (asset) {
        store.state.assetCode = asset.code
        store.state.assetName = asset.name

        store.state.pair = AssetsService.selectPrimaryAsset(
          store.state.currencyCode,
          store.state.assetCode
        )
      }
    }
    if (route.params.currencyCode) {
      const code = route.params.currencyCode as string
      const asset = AssetsService.getAsset(code)
      if (asset) {
        store.state.currencyCode = asset.code
        store.state.currencyName = asset.name
        store.state.currencySymbol = asset.symbol

        store.state.pair = AssetsService.selectPrimaryAsset(
          store.state.currencyCode,
          store.state.assetCode
        )
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
