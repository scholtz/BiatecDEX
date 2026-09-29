import { describe, expect, it } from 'vitest'
import type { LocationQuery, RouteLocationNormalizedLoaded, Router } from 'vue-router'
import { isRouteWritePending, routeWritesSettled, updateRouteQuery } from '../routeQueryWriter'

/** Minimal router double: navigations resolve on the next macrotask, like real ones. */
const createFakeRouter = (initial: LocationQuery) => {
  const route = { query: initial } as RouteLocationNormalizedLoaded
  const replaced: LocationQuery[] = []
  const router = {
    replace: ({ query }: { query: LocationQuery }) => {
      replaced.push(query)
      return new Promise<void>((resolve) =>
        setTimeout(() => {
          route.query = query
          resolve()
        }, 0)
      )
    }
  } as unknown as Router
  return { router, route, replaced }
}

describe('updateRouteQuery', () => {
  it('sets, replaces and removes params while keeping the rest', async () => {
    const { router, route, replaced } = createFakeRouter({ low: '1', tick: 'wide' })
    expect(
      updateRouteQuery(router, route, { tick: 'narrow', lpFee: '1000000', low: undefined })
    ).toBe(true)
    expect(replaced).toEqual([{ tick: 'narrow', lpFee: '1000000' }])
    await new Promise((r) => setTimeout(r, 5))
  })

  it('is a no-op (no navigation) when nothing changes', () => {
    const { router, route, replaced } = createFakeRouter({ tick: 'wide' })
    expect(updateRouteQuery(router, route, { tick: 'wide', missing: undefined })).toBe(false)
    expect(replaced).toEqual([])
  })

  // Regression guard: two writers in one tick (tick width + LP fee) must not overwrite each
  // other - the second replace() used to start from the not-yet-updated route.query and
  // silently dropped the first writer's param.
  it('merges writes issued before the previous navigation has settled', async () => {
    const { router, route, replaced } = createFakeRouter({})
    updateRouteQuery(router, route, { tick: 'narrow' })
    updateRouteQuery(router, route, { lpFee: '2000000' })
    expect(replaced[replaced.length - 1]).toEqual({ tick: 'narrow', lpFee: '2000000' })
    await new Promise((r) => setTimeout(r, 5))
    expect(route.query).toEqual({ tick: 'narrow', lpFee: '2000000' })
  })

  it('does not leak the pending state once navigations settle', async () => {
    const { router, route, replaced } = createFakeRouter({})
    updateRouteQuery(router, route, { tick: 'wide' })
    await new Promise((r) => setTimeout(r, 5))
    // External navigation changed the query in the meantime; the next write starts from it.
    route.query = { other: '1' }
    updateRouteQuery(router, route, { tick: 'normal' })
    expect(replaced[replaced.length - 1]).toEqual({ other: '1', tick: 'normal' })
    await new Promise((r) => setTimeout(r, 5))
  })

  it('survives a rejected navigation', async () => {
    const route = { query: {} } as RouteLocationNormalizedLoaded
    const router = { replace: () => Promise.reject(new Error('cancelled')) } as unknown as Router
    expect(updateRouteQuery(router, route, { tick: 'wide' })).toBe(true)
    await new Promise((r) => setTimeout(r, 5))
    const ok = createFakeRouter({})
    updateRouteQuery(ok.router, ok.route, { tick: 'narrow' })
    expect(ok.replaced).toEqual([{ tick: 'narrow' }])
    await new Promise((r) => setTimeout(r, 5))
  })

  // Review finding: a lagging route value must not overwrite a newer store value, so the
  // route->store direction needs to know a write of ours is still travelling.
  it('reports pending writes until the navigation settles', async () => {
    const { router, route } = createFakeRouter({})
    expect(isRouteWritePending()).toBe(false)
    updateRouteQuery(router, route, { lpFee: '2000000' })
    expect(isRouteWritePending()).toBe(true)
    await routeWritesSettled()
    expect(isRouteWritePending()).toBe(false)
    expect(route.query).toEqual({ lpFee: '2000000' })
  })

  it('routeWritesSettled resolves immediately when nothing is pending', async () => {
    await expect(routeWritesSettled()).resolves.toBeUndefined()
  })
})
