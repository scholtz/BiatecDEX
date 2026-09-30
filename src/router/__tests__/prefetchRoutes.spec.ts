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
})
