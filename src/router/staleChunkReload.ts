import type { App } from 'vue'

// ── Stale-chunk recovery ─────────────────────────────────────────────────────
// After a deploy the previous build's hashed lazy chunks (e.g.
// TraderDashboard-DuMXjAPL.js) no longer exist on the server, so navigating to
// a not-yet-loaded route 404s and the navigation dies. When that happens we
// force a full page reload so the browser fetches the new index.html and the
// fresh chunk manifest. The same recovery also applies to a chunk that loads
// but was never built against its currently-loaded siblings (see
// isStaleChunkError below) — that fails inside component setup/render, not
// route resolution, so it needs its own hook (installGlobalErrorRecovery)
// rather than router.onError alone.
//
// Anti-freeze rule: a reload is a redirect too — it must not be able to loop.
// If the chunk is missing even after a fresh reload (e.g. CDN cache serving a
// stale index.html), reloading again would spin forever, so we allow at most
// one reload per RELOAD_COOLDOWN_MS, tracked in sessionStorage.

const RELOAD_FLAG_KEY = 'biatec-stale-chunk-reload-at'
const RELOAD_COOLDOWN_MS = 30_000

/**
 * True for the error shapes browsers throw when a lazy import/preload 404s (a route
 * chunk from the previous build no longer exists on the server), OR when a stale
 * chunk loads *successfully* alongside a mismatched sibling — a tab that already has
 * an older lazy chunk cached loads a freshly deployed index.html (or a CDN edge
 * serves a mismatched combination mid-rollout); the two chunks were never built
 * together, so a shared binding between them lands at the wrong position and
 * evaluates before its module has run. That surfaces as a plain ReferenceError, not
 * a fetch/import failure — production report:
 *   ReferenceError: Cannot access '$' before initialization
 *     at ut (ManageLiquidity-w228mpvR.js:102:41984)
 *     at ft (ManageLiquidity-w228mpvR.js:102:46494)
 *     at R.immediate (ManageLiquidity-w228mpvR.js:102:56765)
 * The variable name is unrelated (any binding can land in the wrong slot — it's a
 * position mismatch, not a bug in that specific identifier), so this matches the
 * TDZ phrasing itself rather than any particular name; every engine (V8, Firefox,
 * Safari) phrases it slightly differently.
 */
// `unknown` is unavoidable: this classifies whatever callers pass from their own catch blocks.
export function isStaleChunkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS|Cannot access .+ before initialization|can't access lexical declaration .+ before initialization|Cannot access uninitialized variable/i.test(
    error.message
  )
}

/**
 * Reload the page (optionally onto `targetPath`) unless a stale-chunk reload
 * already happened within the cooldown window. Returns whether it reloaded.
 */
export function reloadForStaleChunk(targetPath?: string): boolean {
  let lastReloadAt = 0
  try {
    lastReloadAt = Number(sessionStorage.getItem(RELOAD_FLAG_KEY)) || 0
  } catch {
    // sessionStorage unavailable (privacy mode) — still reload, just unguarded
  }
  if (Date.now() - lastReloadAt < RELOAD_COOLDOWN_MS) return false
  try {
    sessionStorage.setItem(RELOAD_FLAG_KEY, String(Date.now()))
  } catch {
    /* ignore */
  }
  if (targetPath) {
    window.location.href = targetPath
  } else {
    window.location.reload()
  }
  return true
}

/**
 * Install the global listener for Vite's preload failures (modulepreload of a
 * lazy chunk's dependencies). Dynamic-import failures during navigation are
 * handled separately via router.onError in router/index.ts.
 */
export function installStaleChunkReload(): void {
  window.addEventListener('vite:preloadError', (event) => {
    // Prevent Vite from rethrowing — we recover by reloading instead.
    event.preventDefault()
    reloadForStaleChunk()
  })
}

/**
 * Catches a mismatched-chunk error that surfaces during component setup/render
 * (isStaleChunkError's ReferenceError case) rather than during route resolution, so
 * it never reaches `router.onError` (see router/index.ts). Vue's `errorHandler`
 * replaces the framework's own console logging for uncaught errors, so every error
 * is still logged here — otherwise real bugs would silently vanish, including a
 * stale-chunk-shaped one: the TDZ ReferenceError this also matches (see
 * isStaleChunkError's doc comment) can't be told apart from a genuine application
 * TDZ bug by message alone, and reloadForStaleChunk() itself can decline to reload
 * (the anti-freeze cooldown) — in both cases the error must not vanish silently.
 */
export function installGlobalErrorRecovery(app: App): void {
  app.config.errorHandler = (err, _instance, info) => {
    console.error(err, info)
    if (isStaleChunkError(err)) {
      reloadForStaleChunk()
    }
  }
}
