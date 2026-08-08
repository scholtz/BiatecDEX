import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import algosdk from 'algosdk'
import { useAppStore } from '@/stores/app'
import { AssetsService } from '@/service/AssetsService'
import type { IAsset } from '@/interface/IAsset'
import { setPairIfChanged, type StorePair } from '@/scripts/state/setPairIfChanged'

export function useRouteParams() {
  const store = useAppStore()
  const route = useRoute()

  // Latched true once the first setRoutesVars run (network switch + asset
  // resolution, including any async algod lookup for unknown asa-<id> slugs) has
  // completed, so views can defer mounting pair-dependent panels until the store
  // actually reflects the route.
  const routesReady = ref(false)

  const setRoutesVars = async () => {
    console.log('setRoutesVars', route.params)

    if (route.params.network as 'mainnet-v1.0' | 'voimain-v1.0' | 'testnet-v1.0' | 'dockernet-v1') {
      const network = route.params.network as
        'mainnet-v1.0' | 'voimain-v1.0' | 'testnet-v1.0' | 'dockernet-v1'
      // Must go through setChain (not a bare env assignment): setChain is what
      // reconfigures algod/indexer and the Biatec client apps (clientPP etc.) for
      // the routed chain. Assigning env directly left all of those pointing at the
      // previously active network, so e.g. a direct testnet URL kept querying the
      // MAINNET pool provider for prices.
      if (store.state.env !== network) {
        store.setChain(network)
      }
    }
    const network = store.state.env

    // Helper function to find asset by various methods, preferring assets on the
    // routed network (codes and names can collide across chains).
    const findAsset = async (code: string) => {
      // Exact/case-insensitive code match, including asa-<id>/asa<id> slugs of
      // already-registered custom assets.
      let asset = AssetsService.getAsset(code, network)
      if (asset) return asset

      // An asa-<id> slug for an asset not (yet) registered on this device: fetch
      // its params from the routed network's algod and register it, so bookmarked
      // and shared liquidity URLs work on a fresh browser.
      const idMatch = /^asa-?(\d+)$/i.exec(code.trim())
      if (idMatch) {
        const assetId = Number(idMatch[1])
        try {
          const algod = new algosdk.Algodv2(
            store.state.algodToken ?? '',
            store.state.algodHost,
            store.state.algodPort
          )
          const info = await algod.getAssetByID(assetId).do()
          return AssetsService.ensureCustomAsset({
            assetId,
            network,
            name: info.params?.name,
            unitName: info.params?.unitName,
            decimals: Number(info.params?.decimals ?? 0)
          })
        } catch (e) {
          console.error(`Failed to load asset ${assetId} from algod (${network})`, e)
          return null
        }
      }

      const allAssets = AssetsService.getAssets()
      const preferNetwork = (predicate: (a: IAsset) => boolean): IAsset | undefined =>
        allAssets.find((a) => a.network === network && predicate(a)) ?? allAssets.find(predicate)

      // Try to find by name (lowercased)
      asset = preferNetwork((a) => a.name.toLowerCase() === code.toLowerCase())
      if (asset) return asset

      // Try to find by name containing the code (case-insensitive)
      asset = preferNetwork((a) => a.name.toLowerCase().includes(code.toLowerCase()))
      if (asset) return asset

      // Try to find by code containing the search term (case-insensitive)
      asset = preferNetwork((a) => a.code.toLowerCase().includes(code.toLowerCase()))
      if (asset) return asset

      return null
    }

    if (route.params.assetCode) {
      const code = route.params.assetCode as string
      const asset = await findAsset(code)
      if (asset) {
        store.state.assetCode = asset.code
        store.state.assetName = asset.name
        const pair = AssetsService.selectPrimaryAsset(
          store.state.assetCode,
          store.state.currencyCode,
          network
        )
        if (pair && pair.asset && pair.currency) {
          // Anti-freeze rule: never assign store.state.pair directly — a fresh
          // but identical object re-fires every pair watcher (see setPairIfChanged).
          setPairIfChanged(store.state, pair as StorePair)
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

        const pair = AssetsService.selectPrimaryAsset(
          store.state.assetCode,
          store.state.currencyCode,
          network
        )
        if (pair && pair.asset && pair.currency) {
          // Anti-freeze rule: never assign store.state.pair directly — a fresh
          // but identical object re-fires every pair watcher (see setPairIfChanged).
          setPairIfChanged(store.state, pair as StorePair)
        }
      }
    }
    console.log('store.state', store.state)
    routesReady.value = true
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
    setRoutesVars,
    routesReady
  }
}
