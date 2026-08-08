import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isStaleChunkError, reloadForStaleChunk } from '../staleChunkReload'

describe('isStaleChunkError', () => {
  it('matches the browser messages thrown when a hashed chunk 404s', () => {
    expect(
      isStaleChunkError(
        new TypeError(
          'Failed to fetch dynamically imported module: https://beta.dex.biatec.io/assets/TraderDashboard-DuMXjAPL.js'
        )
      )
    ).toBe(true)
    // Firefox / Safari phrasings
    expect(isStaleChunkError(new TypeError('error loading dynamically imported module'))).toBe(
      true
    )
    expect(isStaleChunkError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isStaleChunkError(new Error('Unable to preload CSS for /assets/x-abc.css'))).toBe(true)
  })

  it('ignores unrelated errors and non-errors', () => {
    expect(isStaleChunkError(new Error('network timeout'))).toBe(false)
    expect(isStaleChunkError('Failed to fetch dynamically imported module')).toBe(false)
    expect(isStaleChunkError(undefined)).toBe(false)
  })
})

describe('reloadForStaleChunk', () => {
  const originalLocation = window.location
  let hrefSetter: ReturnType<typeof vi.fn>
  let reload: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.useFakeTimers()
    sessionStorage.clear()
    hrefSetter = vi.fn()
    reload = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...originalLocation,
        reload,
        get href() {
          return originalLocation.href
        },
        set href(value: string) {
          hrefSetter(value)
        }
      }
    })
  })

  afterEach(() => {
    vi.useRealTimers()
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
  })

  it('navigates to the target path when one is given', () => {
    expect(reloadForStaleChunk('/en/trader')).toBe(true)
    expect(hrefSetter).toHaveBeenCalledWith('/en/trader')
    expect(reload).not.toHaveBeenCalled()
  })

  it('falls back to a plain reload without a target path', () => {
    expect(reloadForStaleChunk()).toBe(true)
    expect(reload).toHaveBeenCalledOnce()
  })

  it('refuses a second reload inside the cooldown window (anti-freeze)', () => {
    expect(reloadForStaleChunk('/en/trader')).toBe(true)
    // Chunk still missing after reload (stale CDN index.html) — must not loop.
    expect(reloadForStaleChunk('/en/trader')).toBe(false)
    expect(hrefSetter).toHaveBeenCalledTimes(1)
  })

  it('allows another reload after the cooldown has passed', () => {
    expect(reloadForStaleChunk()).toBe(true)
    vi.advanceTimersByTime(31_000)
    expect(reloadForStaleChunk()).toBe(true)
    expect(reload).toHaveBeenCalledTimes(2)
  })
})
