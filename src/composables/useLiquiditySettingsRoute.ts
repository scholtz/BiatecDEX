import { watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { precisionForTickType, tickTypeForPrecision } from 'biatec-concentrated-liquidity-amm'
import { useAppStore } from '@/stores/app'
import { buildPairKey } from '@/scripts/state/buildPairKey'
import { parseLpFeeParam, parseTickParam } from '@/scripts/state/liquiditySettingsRoute'
import {
  isRouteWritePending,
  routeWritesSettled,
  updateRouteQuery
} from '@/scripts/state/routeQueryWriter'

/**
 * Keeps the liquidity page's shared settings - tick width and base LP fee - in the route
 * query (`?tick=wide|normal|narrow&lpFee=1000000`) and in the store, in both directions,
 * so one link restores them for every panel (depth chart, Add Liquidity, pools table) and
 * changing them in any panel changes the URL and the other panels together.
 *
 * - route -> store: a valid param wins over whatever the store holds. The tick is stamped
 *   with the pair on screen so Add Liquidity's "same pair keeps its stored width" rule
 *   (resolvePrecisionChoice) honours it instead of deriving a default.
 * - store -> route: the effective settings are written back with `router.replace` (no
 *   history entries). The tick is only written once it was resolved/chosen for the pair
 *   currently on screen, so a previous pair's leftover width never reaches the URL.
 *
 * Anti-freeze: both directions compare before writing, so they converge after one pass.
 * Call once from the page that hosts the panels; `routesReady` gates it until the routed
 * network/pair is in the store.
 */
export function useLiquiditySettingsRoute(routesReady: Ref<boolean>) {
  const store = useAppStore()
  const route = useRoute()
  const router = useRouter()

  const currentPairKey = () =>
    buildPairKey(store.state.env, store.state.assetCode, store.state.currencyCode)

  const applyRouteToStore = () => {
    if (!routesReady.value) return
    // A write of ours is still travelling: the route lags the store, and applying it now
    // would overwrite a newer choice (two quick fee clicks bounced B -> A -> B). Re-check
    // once it has landed, so an external change that superseded it is still picked up.
    if (isRouteWritePending()) {
      void routeWritesSettled().then(applyRouteToStore)
      return
    }
    const tick = parseTickParam(route.query.tick)
    if (tick !== null) {
      const precision = precisionForTickType(tick)
      const pairKey = currentPairKey()
      if (
        store.state.liquidityTickPrecision !== precision ||
        store.state.liquidityTickPrecisionPairKey !== pairKey
      ) {
        store.state.liquidityTickPrecisionPairKey = pairKey
        store.state.liquidityTickPrecision = precision
      }
    }
    const lpFee = parseLpFeeParam(route.query.lpFee)
    if (lpFee !== null && store.state.liquidityLpFee !== lpFee) {
      store.state.liquidityLpFee = lpFee
    }
  }

  const applyStoreToRoute = () => {
    if (!routesReady.value) return
    const precision = store.state.liquidityTickPrecision
    const tickResolvedForThisPair =
      store.state.liquidityTickPrecisionPairKey === currentPairKey() &&
      typeof precision === 'number'
    const lpFee = store.state.liquidityLpFee
    updateRouteQuery(router, route, {
      ...(tickResolvedForThisPair ? { tick: tickTypeForPrecision(precision) } : {}),
      ...(lpFee !== null ? { lpFee: lpFee.toString() } : {})
    })
  }

  watch([routesReady, () => route.query.tick, () => route.query.lpFee], applyRouteToStore, {
    immediate: true
  })

  watch(
    [
      routesReady,
      () => store.state.liquidityTickPrecision,
      () => store.state.liquidityTickPrecisionPairKey,
      () => store.state.liquidityLpFee,
      // Re-assert the settings if some other navigation dropped them from the URL.
      () => route.query.tick,
      () => route.query.lpFee
    ],
    applyStoreToRoute,
    { immediate: true }
  )

  // A tick width belongs to one pair: when the pair changes, the previous pair's `tick`
  // must not linger in the URL (it would be read as an explicit choice for the new pair).
  // Starts tracking only once the routed pair is known, so a shared link's own `tick` is
  // not mistaken for the "previous pair" while the initial route resolves.
  let lastPairKey: string | null = null
  watch(
    [routesReady, currentPairKey],
    ([ready, pairKey]) => {
      if (!ready) return
      if (lastPairKey !== null && pairKey !== lastPairKey) {
        updateRouteQuery(router, route, { tick: undefined })
      }
      lastPairKey = pairKey
    },
    { immediate: true }
  )
}
