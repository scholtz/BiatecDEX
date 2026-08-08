/**
 * Anti-freeze (RESULT_CODE_HUNG) protection for navigation guards.
 *
 * A guard that redirects based on a comparison can hang the whole tab if the
 * comparison is not antisymmetric: navigation A→B triggers a redirect back to
 * A, which redirects to B, … — an unbounded synchronous loop the browser
 * eventually kills with RESULT_CODE_HUNG. This happened once with the
 * asset-pair ordering guard (see AssetsService.selectPrimaryAsset).
 *
 * The comparison itself must be fixed to converge, but this breaker is the
 * LAST LINE OF DEFENSE so no future guard bug can ever freeze the app again:
 * every redirect a guard issues must pass through allowRedirect(). Legitimate
 * navigation performs at most a couple of redirects per user action; a loop
 * performs hundreds per second. When the budget inside the sliding window is
 * exhausted the breaker refuses further redirects (the guard then lets the
 * navigation through unmodified — a non-canonical URL is infinitely better
 * than a dead tab) and recovers automatically after the window passes.
 */

export interface RedirectCircuitBreakerOptions {
  /** Sliding window size in milliseconds. */
  windowMs?: number
  /** Redirect budget inside one window before the breaker trips. */
  maxRedirects?: number
}

export interface RedirectCircuitBreaker {
  /**
   * Returns true when the redirect may proceed, false when the breaker
   * tripped. Never throws.
   */
  allowRedirect(label: string): boolean
}

export const createRedirectCircuitBreaker = (
  options: RedirectCircuitBreakerOptions = {}
): RedirectCircuitBreaker => {
  const windowMs = options.windowMs ?? 5000
  const maxRedirects = options.maxRedirects ?? 20
  let windowStart = 0
  let count = 0

  return {
    allowRedirect(label: string): boolean {
      const now = Date.now()
      if (now - windowStart > windowMs) {
        windowStart = now
        count = 0
      }
      count++
      if (count > maxRedirects) {
        console.error(
          `[redirect-circuit-breaker] "${label}" issued ${count} redirects within ${windowMs}ms — ` +
            'refusing further redirects to prevent a browser hang (RESULT_CODE_HUNG). ' +
            'A navigation guard is redirecting in a loop; fix its comparison to be antisymmetric.'
        )
        return false
      }
      return true
    }
  }
}

/** Shared breaker used by all redirecting guards in src/router/index.ts. */
export const routerRedirectBreaker = createRedirectCircuitBreaker()
