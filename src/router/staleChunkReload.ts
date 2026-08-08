// ── Stale-chunk recovery ─────────────────────────────────────────────────────
// After a deploy the previous build's hashed lazy chunks (e.g.
// TraderDashboard-DuMXjAPL.js) no longer exist on the server, so navigating to
// a not-yet-loaded route 404s and the navigation dies. When that happens we
// force a full page reload so the browser fetches the new index.html and the
// fresh chunk manifest.
//
// Anti-freeze rule: a reload is a redirect too — it must not be able to loop.
// If the chunk is missing even after a fresh reload (e.g. CDN cache serving a
// stale index.html), reloading again would spin forever, so we allow at most
// one reload per RELOAD_COOLDOWN_MS, tracked in sessionStorage.

const RELOAD_FLAG_KEY = 'biatec-stale-chunk-reload-at'
const RELOAD_COOLDOWN_MS = 30_000

/** True for the error shapes browsers throw when a lazy import/preload 404s. */
export function isStaleChunkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false
  return (
    /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed|Unable to preload CSS/i.test(
      error.message
    )
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
