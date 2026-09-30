import { watch } from 'vue'
import { useAVMAuthentication } from 'algorand-authentication-component-vue'
import { parseAuthSession, serializeAuthSession } from './authSession'

export const AUTH_SESSION_STORAGE_KEY = 'biatec-auth-session'

const read = (): string | null => {
  try {
    return sessionStorage.getItem(AUTH_SESSION_STORAGE_KEY)
  } catch {
    return null // storage unavailable (privacy mode): behave as before, in-memory only
  }
}

const write = (value: string | null) => {
  try {
    if (value === null) sessionStorage.removeItem(AUTH_SESSION_STORAGE_KEY)
    else sessionStorage.setItem(AUTH_SESSION_STORAGE_KEY, value)
  } catch {
    /* ignore */
  }
}

/**
 * Restores a saved ARC-76 sign-in into the auth store (call before the app mounts, so the
 * first render is already signed in) and keeps the saved copy in step with it: written on
 * sign-in, removed on logout. See authSession.ts for what is (not) stored.
 */
export function installAuthSessionPersistence(): void {
  const { authStore } = useAVMAuthentication()

  const restored = parseAuthSession(read(), Date.now())
  if (restored && !authStore.isAuthenticated) {
    authStore.account = restored.account
    authStore.arc76email = restored.arc76email
    authStore.wallet = restored.wallet
    authStore.isAuthenticated = true
  } else if (!restored) {
    write(null) // drop an expired / corrupt entry
  }

  watch(
    () => [authStore.isAuthenticated, authStore.wallet, authStore.account, authStore.arc76email],
    () => write(serializeAuthSession(authStore, Date.now()))
  )
}
