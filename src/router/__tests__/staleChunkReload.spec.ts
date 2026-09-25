import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import type { App } from 'vue'
import {
  isStaleChunkError,
  reloadForStaleChunk,
  installGlobalErrorRecovery
} from '../staleChunkReload'

// Minimal stub of the parts installGlobalErrorRecovery actually touches
// (app.config.errorHandler) — a full App mock isn't needed for these tests.
const stubApp = (): App => ({ config: {} }) as unknown as App

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
    expect(isStaleChunkError(new TypeError('error loading dynamically imported module'))).toBe(true)
    expect(isStaleChunkError(new TypeError('Importing a module script failed.'))).toBe(true)
    expect(isStaleChunkError(new Error('Unable to preload CSS for /assets/x-abc.css'))).toBe(true)
  })

  // A deploy can serve a fresh index.html (pinning new hashed chunk URLs) into a tab
  // that already has an older, still-cached lazy chunk loaded (or a CDN edge serving a
  // mismatched combination during rollout) — the two chunks were never built together,
  // so a shared binding between them lands at the wrong position and evaluates before
  // its module has run. This throws as a plain ReferenceError, not a fetch/import
  // failure, so it needs its own pattern — production report:
  //   ReferenceError: Cannot access '$' before initialization
  //     at ut (ManageLiquidity-w228mpvR.js:102:41984)
  //     at ft (ManageLiquidity-w228mpvR.js:102:46494)
  //     at R.immediate (ManageLiquidity-w228mpvR.js:102:56765)
  it('matches the ReferenceError thrown when mismatched chunk versions are loaded together', () => {
    expect(isStaleChunkError(new ReferenceError("Cannot access '$' before initialization"))).toBe(
      true
    )
    expect(isStaleChunkError(new ReferenceError('Cannot access uninitialized variable'))).toBe(true)
    // Chromium/V8, Firefox and Safari phrase the same TDZ condition differently.
    expect(
      isStaleChunkError(
        new ReferenceError("can't access lexical declaration 'x' before initialization")
      )
    ).toBe(true)
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

describe('installGlobalErrorRecovery', () => {
  const originalLocation = window.location
  let reload: ReturnType<typeof vi.fn>
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    sessionStorage.clear()
    reload = vi.fn()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...originalLocation, reload }
    })
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    Object.defineProperty(window, 'location', { configurable: true, value: originalLocation })
    consoleErrorSpy.mockRestore()
  })

  // Regression: a stale-chunk mismatch surfacing during component setup/render (an
  // "immediate" watcher throwing while a lazy route's component initializes) never
  // reaches router.onError — that only fires during navigation/route resolution, not
  // an already-mounting component's own errors. Without this hook the user was left
  // on a hard-crashed page instead of getting the same automatic reload a 404'd
  // chunk gets.
  it('reloads AND logs a stale-chunk error raised by app.config.errorHandler', () => {
    // Logging is not conditional on reloading (see the cooldown test below): the TDZ
    // ReferenceError this matches can't be told apart from a genuine application bug
    // by message alone, so it must never vanish silently either way.
    const app = stubApp()
    installGlobalErrorRecovery(app)
    const err = new ReferenceError("Cannot access '$' before initialization")
    app.config.errorHandler!(err, null, 'setup function')
    expect(reload).toHaveBeenCalledOnce()
    expect(consoleErrorSpy).toHaveBeenCalledWith(err, 'setup function')
  })

  it('logs (does not reload for) an unrelated error, so real bugs stay visible', () => {
    const app = stubApp()
    installGlobalErrorRecovery(app)
    const err = new TypeError('cannot read properties of undefined')
    app.config.errorHandler!(err, null, 'render function')
    expect(reload).not.toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalledWith(err, 'render function')
  })

  // Regression: reloadForStaleChunk() can itself decline to reload (the anti-freeze
  // cooldown in RELOAD_COOLDOWN_MS) — the error must still be logged in that case,
  // not silently dropped just because it looked like a stale-chunk error.
  it('still logs a stale-chunk error even when the reload cooldown blocks the reload', () => {
    const app = stubApp()
    installGlobalErrorRecovery(app)
    const err = new ReferenceError("Cannot access 'x' before initialization")
    app.config.errorHandler!(err, null, 'setup function')
    reload.mockClear()
    consoleErrorSpy.mockClear()

    app.config.errorHandler!(err, null, 'setup function')
    expect(reload).not.toHaveBeenCalled()
    expect(consoleErrorSpy).toHaveBeenCalledWith(err, 'setup function')
  })
})
