import type { LocationQuery, RouteLocationNormalizedLoaded, Router } from 'vue-router'

/**
 * Single writer for the route query of the liquidity page. `router.replace` is async and
 * `route.query` only updates when the navigation lands, so two writers in the same tick
 * (tick width + LP fee, shape + low/high, ...) would each start from the same stale query
 * and the later navigation would silently drop the earlier one's param. Writes are
 * therefore merged into `pendingQuery` until the navigation settles.
 */
let pendingQuery: LocationQuery | null = null

/** `undefined` removes a param. Returns false (and never navigates) when nothing changes. */
export const updateRouteQuery = (
  router: Router,
  route: RouteLocationNormalizedLoaded,
  updates: Readonly<Record<string, string | undefined>>
): boolean => {
  const next: LocationQuery = { ...(pendingQuery ?? route.query) }
  let changed = false
  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined) {
      if (key in next) {
        delete next[key]
        changed = true
      }
    } else if (next[key] !== value) {
      next[key] = value
      changed = true
    }
  }
  if (!changed) return false

  pendingQuery = next
  void router
    .replace({ query: next })
    .catch(() => {
      // A superseded/cancelled navigation is expected here; the next write starts fresh.
    })
    .finally(() => {
      if (pendingQuery === next) pendingQuery = null
    })
  return true
}
