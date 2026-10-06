import algosdk from 'algosdk'

/**
 * Keeps an ARC-76 sign-in alive across full page loads (per browser tab).
 *
 * The sign-in state lives only in memory (`authStore` of algorand-authentication-component-vue),
 * so every full page load wipes it. The app does trigger those on purpose - most notably the
 * stale-chunk recovery (router/staleChunkReload.ts) that reloads onto the target URL when a
 * lazily loaded route chunk 404s after a deploy, which is exactly what opening Add Liquidity
 * from the (eagerly bundled) main page hits. Only NON-secret facts are stored: the derived
 * account address and the email. The password / mnemonic never leave memory - signing with an
 * ARC-76 account asks for the password every time anyway - and the ARC-14 header is not
 * restored (nothing in the app uses it; the reporter API uses its own anonymous session).
 */

/** `authStore.wallet` value of an email/password (ARC-76) sign-in; any other value is a use-wallet wallet id. */
export const ARC76_WALLET_ID = 'arc76'

/** How long a saved session may be restored (per tab; sessionStorage is cleared on close). */
export const AUTH_SESSION_MAX_AGE_MS = 12 * 60 * 60 * 1000

/** The slice of the auth store that is saved / restored. */
export interface AuthSessionSource {
  isAuthenticated: boolean
  wallet: string
  account: string
  arc76email: string
}

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** JSON to store, or null when there is no complete ARC-76 sign-in to keep. */
export const serializeAuthSession = (source: AuthSessionSource, now: number): string | null => {
  if (!source.isAuthenticated || source.wallet !== ARC76_WALLET_ID) return null
  if (!source.account || !source.arc76email) return null
  // Explicit picks (not a spread): the source is the live auth store, which also holds
  // the password and mnemonic.
  return JSON.stringify({ account: source.account, arc76email: source.arc76email, savedAt: now })
}

/** The state to restore, or null for anything missing, malformed, expired or implausible. */
export const parseAuthSession = (raw: string | null, now: number): AuthSessionSource | null => {
  if (!raw) return null
  let data: unknown
  try {
    data = JSON.parse(raw)
  } catch {
    return null
  }
  if (typeof data !== 'object' || data === null) return null
  const { account, arc76email, savedAt } = data as Record<string, unknown>
  if (typeof account !== 'string' || !algosdk.isValidAddress(account)) return null
  if (typeof arc76email !== 'string' || !EMAIL_PATTERN.test(arc76email)) return null
  if (typeof savedAt !== 'number' || !Number.isFinite(savedAt)) return null
  const age = now - savedAt
  if (age < 0 || age > AUTH_SESSION_MAX_AGE_MS) return null
  return { isAuthenticated: true, wallet: ARC76_WALLET_ID, account, arc76email }
}
