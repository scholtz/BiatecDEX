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

  // Guards against an older, slower run finishing after a newer one and clobbering the
  // store with stale route data - this is now a real possibility (not just theoretical)
  // since the trade-API fallback below can make a cold-cache run take a network round
  // trip, and nothing cancels an in-flight run when route params change again meanwhile.
  let latestRunToken = 0

  const setRoutesVars = async () => {
    console.log('setRoutesVars', route.params)
    const runToken = ++latestRunToken

    // ManageLiquidity.vue gates its entire content behind routesReady - a thrown error
    // partway through this run (network switch, asset lookup, pair selection) must not
    // leave that gate closed forever. finally still checks runToken so a run superseded
    // by a newer one doesn't get the last word over that newer run's own result.
    try {
      await runSetRoutesVars(runToken)
    } finally {
      if (runToken === latestRunToken) {
        routesReady.value = true
      }
    }
  }

  const runSetRoutesVars = async (runToken: number) => {
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
          // Bounded: the shared axios instance has no request timeout (axios-instance.ts),
          // and its auth interceptor awaits an algod call of its own - an unresponsive (not
          // just erroring) trade API would otherwise hang this findAsset call forever, and
          // with it setRoutesVars's routesReady latch, leaving ManageLiquidity blank with no
          // recovery. A bookmarked/shared link to an uncurated asset must degrade to "not
          // found" within a bounded time, not hang the whole page.
          const results = await Promise.race([
            fetchTradeAssets(network, { search: code, size: 5 }),
            new Promise<never>((_resolve, reject) =>
              setTimeout(() => reject(new Error('Trade API search timed out')), 5000)
            )
          ])
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

    // A newer call to setRoutesVars (triggered by a further route-param change while the
    // above was in flight) has already taken over - applying this stale result now would
    // silently revert the store to the wrong pair.
    if (runToken !== latestRunToken) return

    if (assetResolved) {
      store.state.assetCode = assetResolved.code
      store.state.assetName = assetResolved.name
    }
    if (currencyResolved) {
      store.state.currencyCode = currencyResolved.code
      store.state.currencyName = currencyResolved.name
      store.state.currencySymbol = currencyResolved.symbol
    }
    // Computed once, after both codes are applied: computing it separately after each
    // write (as this used to) meant a navigation that changes both assetCode and
    // currencyCode together ran selectPrimaryAsset/setPairIfChanged twice, the first
    // time pairing the new asset with the OLD, not-yet-updated currency - a wasted call
    // that could momentarily write a wrong intermediate pair to the store.
    if (assetResolved || currencyResolved) {
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
  }

  // Call initially to set route vars
  void setRoutesVars()

  // Watch for route parameter changes. One watcher over all three params (not three
  // separate watch() calls) so a single navigation that changes network+assetCode+
  // currencyCode together (e.g. AssetInfo.vue's pair combobox) triggers exactly one
  // setRoutesVars() run instead of up to three concurrent ones - each of which now does
  // its own live trade-API round trips via findAsset's fallback above.
  watch(
    () => [route.params.network, route.params.assetCode, route.params.currencyCode],
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
