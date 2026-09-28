import { ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import algosdk from 'algosdk'
import { useAppStore } from '@/stores/app'
import { AssetsService } from '@/service/AssetsService'
import type { IAsset } from '@/interface/IAsset'
import { setPairIfChanged, type StorePair } from '@/scripts/state/setPairIfChanged'
import { fetchTradeAssets, isTradeApiConfigured } from '@/service/tradeApi'

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

      // Last resort: a live/uncurated asset (e.g. a newly-launched token) that
      // isn't in the static catalog and has never been registered as a custom
      // asset in this browser yet. This is exactly the "cold cache" case a
      // direct deep link or first-ever visit hits - without this, the asset
      // would never resolve here (nothing else registers it before routesReady
      // latches true), leaving the pair-dependent panels (pool chart,
      // MyLiquidity, AddLiquidity) mounted against a stale/empty pair with no
      // pools shown, and nothing to trigger a re-fetch once the asset became
      // known some other way.
      if (isTradeApiConfigured(network)) {
        try {
          const results = await fetchTradeAssets(network, { search: code, size: 5 })
          const lowerCode = code.toLowerCase()
          // No unqualified results[0] fallback: the backend's search is fuzzy, and
          // blindly taking its top hit for a mistyped/delisted code would silently
          // open a completely different, unrelated trading pair. Require the code to
          // at least appear in the candidate's own name/unitName before accepting it.
          const match =
            results.find((a) => a.params?.unitName?.toLowerCase() === lowerCode) ??
            results.find((a) => a.params?.name?.toLowerCase() === lowerCode) ??
            results.find(
              (a) =>
                a.params?.unitName?.toLowerCase().includes(lowerCode) ||
                a.params?.name?.toLowerCase().includes(lowerCode)
            )
          if (match) {
            return AssetsService.ensureCustomAsset({
              assetId: match.index,
              network,
              name: match.params?.name ?? undefined,
              unitName: match.params?.unitName ?? undefined,
              decimals: match.params?.decimals
            })
          }
        } catch (e) {
          console.error(`Failed to search trade API for asset "${code}" (${network})`, e)
        }
      }

      return null
    }

    // The two lookups have no data dependency on each other (only the resulting
    // state writes do), so run them concurrently - on a cold cache where both codes
    // need the network trade-API fallback, this halves the wait before routesReady.
    // allSettled (not all): a rejection on one side must not discard the other side's
    // already-resolved asset nor skip the routesReady latch below - every findAsset
    // branch already catches its own errors and resolves to null, but a future change
    // to it (or to AssetsService) rejecting here must not regress to that fail-fast
    // behavior.
    const [assetSettled, currencySettled] = await Promise.allSettled([
      route.params.assetCode ? findAsset(route.params.assetCode as string) : Promise.resolve(null),
      route.params.currencyCode
        ? findAsset(route.params.currencyCode as string)
        : Promise.resolve(null)
    ])
    if (assetSettled.status === 'rejected') {
      console.error('Failed to resolve route assetCode', assetSettled.reason)
    }
    if (currencySettled.status === 'rejected') {
      console.error('Failed to resolve route currencyCode', currencySettled.reason)
    }
    const assetResolved = assetSettled.status === 'fulfilled' ? assetSettled.value : null
    const currencyResolved = currencySettled.status === 'fulfilled' ? currencySettled.value : null

    if (assetResolved) {
      store.state.assetCode = assetResolved.code
      store.state.assetName = assetResolved.name
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
    if (currencyResolved) {
      store.state.currencyCode = currencyResolved.code
      store.state.currencyName = currencyResolved.name
      store.state.currencySymbol = currencyResolved.symbol

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
    console.log('store.state', store.state)
    routesReady.value = true
  }

  // Call initially to set route vars
  void setRoutesVars()

  // Watch for route parameter changes
  watch(
    () => route.params.network,
    () => {
      void setRoutesVars()
    },
    { deep: true }
  )
  watch(
    () => route.params.assetCode,
    () => {
      void setRoutesVars()
    },
    { deep: true }
  )
  watch(
    () => route.params.currencyCode,
    () => {
      void setRoutesVars()
    },
    { deep: true }
  )

  return {
    setRoutesVars,
    routesReady
  }
}
