import type { LocationQuery, RouteLocationNormalizedLoaded, Router } from 'vue-router'

/**
 * Single writer for the route query of the liquidity page. `router.replace` is async and
 * `route.query` only updates when the navigation lands, so two writers in the same tick
 * (tick width + LP fee, shape + low/high, ...) would each start from the same stale query
 * and the later navigation would silently drop the earlier one's param. Writes are
 * therefore merged into `pendingQuery` until the navigation settles.
 */
let pendingQuery: LocationQuery | null = null
let pendingPath: string | null = null
let inflight: Promise<void> | null = null

/** True while a write of ours is still navigating (route.query has not caught up yet). */
export const isRouteWritePending = (): boolean => pendingQuery !== null

/** Resolves once the most recent write has landed (immediately when none is pending). */
export const routeWritesSettled = (): Promise<void> => inflight ?? Promise.resolve()

/** `undefined` removes a param. Returns false (and never navigates) when nothing changes. */
export const updateRouteQuery = (
  router: Router,
  route: RouteLocationNormalizedLoaded,
  updates: Readonly<Record<string, string | undefined>>
): boolean => {
  // The merge base only applies to the page it was captured on: after an unrelated
  // navigation the old page's params must not be re-applied to the new location.
  if (pendingQuery !== null && pendingPath !== route.path) pendingQuery = null
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
  pendingPath = route.path
  const settled: Promise<void> = router
    .replace({ query: next })
    .catch(() => {
      // A superseded/cancelled navigation is expected here; the next write starts fresh.
    })
    .then(() => {
      if (pendingQuery === next) {
        pendingQuery = null
        pendingPath = null
        inflight = null
      }
    })
  inflight = settled
  return true
}
