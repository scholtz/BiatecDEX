import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { prefetchRouteChunks } from '../prefetchRoutes'
import { installStaleChunkReload, setPendingNavigationTarget } from '../staleChunkReload'

describe('prefetchRouteChunks', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it('loads every route chunk one after another, after the delay', async () => {
    const order: string[] = []
    const loaders = ['a', 'b', 'c'].map((name) => () => {
      order.push(name)
      return Promise.resolve({})
    })
    const done = prefetchRouteChunks(loaders, { delayMs: 1000 })
    expect(order).toEqual([])
    await vi.advanceTimersByTimeAsync(1000)
    await done
    expect(order).toEqual(['a', 'b', 'c'])
  })

  it('keeps going when one chunk fails to load and never throws', async () => {
    const loaded: string[] = []
    const loaders = [
      () => Promise.reject(new TypeError('Failed to fetch dynamically imported module')),
      () => {
        loaded.push('second')
        return Promise.resolve({})
      }
    ]
    const done = prefetchRouteChunks(loaders, { delayMs: 0 })
    await vi.advanceTimersByTimeAsync(0)
    await expect(done).resolves.toBeUndefined()
    expect(loaded).toEqual(['second'])
  })

  it('does nothing when the user has data saving enabled', async () => {
    const loader = vi.fn(() => Promise.resolve({}))
    const original = Object.getOwnPropertyDescriptor(navigator, 'connection')
    Object.defineProperty(navigator, 'connection', {
      configurable: true,
      value: { saveData: true }
    })
    try {
      const done = prefetchRouteChunks([loader], { delayMs: 0 })
      await vi.advanceTimersByTimeAsync(0)
      await done
      expect(loader).not.toHaveBeenCalled()
    } finally {
      if (original) Object.defineProperty(navigator, 'connection', original)
      else delete (navigator as unknown as Record<string, unknown>).connection
    }
  })

  // A prefetch that hits a stale chunk must not reload the page behind the user's back (they
  // may be typing their password); only a navigation the user asked for may trigger recovery.
  it('a failing background prefetch does not trigger the stale-chunk reload', async () => {
    const originalLocation = window.location
    const reload = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload }
    })
    sessionStorage.clear()
    installStaleChunkReload()
    setPendingNavigationTarget(null)
    const loaders = [
      () => {
        // Vite reports a failed preload as this window event while the import is pending.
        window.dispatchEvent(new Event('vite:preloadError', { cancelable: true }))
        return Promise.reject(new TypeError('Failed to fetch dynamically imported module'))
      }
    ]
    const done = prefetchRouteChunks(loaders, { delayMs: 0 })
    await vi.advanceTimersByTimeAsync(0)
    await done
    expect(reload).not.toHaveBeenCalled()
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  // Review finding: a click on a lazy page while the prefetch is still running must still
  // recover - the suppression only applies when the user has no navigation in flight.
  it('still recovers a failed preload that belongs to a navigation the user started', async () => {
    const originalLocation = window.location
    const hrefSetter = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        reload: vi.fn(),
        get href() {
          return originalLocation.href
        },
        set href(value: string) {
          hrefSetter(value)
        }
      }
    })
    sessionStorage.clear()
    installStaleChunkReload()
    const loaders = [
      () => {
        setPendingNavigationTarget('/en/liquidity/mainnet-v1.0/vote/algo')
        window.dispatchEvent(new Event('vite:preloadError', { cancelable: true }))
        return Promise.resolve({})
      }
    ]
    const done = prefetchRouteChunks(loaders, { delayMs: 0 })
    await vi.advanceTimersByTimeAsync(0)
    await done
    setPendingNavigationTarget(null)
    expect(hrefSetter).toHaveBeenCalledWith('/en/liquidity/mainnet-v1.0/vote/algo')
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  it('overlapping prefetches keep the suppression until the last one finishes', async () => {
    const originalLocation = window.location
    const reload = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload }
    })
    sessionStorage.clear()
    installStaleChunkReload()
    setPendingNavigationTarget(null)
    let finishSlow: () => void = () => {}
    const slow = () => new Promise<unknown>((resolve) => (finishSlow = () => resolve({})))
    const fast = () => Promise.resolve({})
    const first = prefetchRouteChunks([slow], { delayMs: 0 })
    const second = prefetchRouteChunks([fast], { delayMs: 0 })
    await vi.advanceTimersByTimeAsync(0)
    await second // the short one is done; the slow one is still running
    window.dispatchEvent(new Event('vite:preloadError', { cancelable: true }))
    expect(reload).not.toHaveBeenCalled()
    finishSlow()
    await first
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })
})
