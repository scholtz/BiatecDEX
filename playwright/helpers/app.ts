import { expect, type Page } from '@playwright/test'

/**
 * Shared helpers for the Biatec DEX Playwright suites.
 *
 * Authentication uses the ARC-76 email + password sign-in exposed by the
 * algorand-authentication component (inputs #e / #p, "Continue" button). That
 * derives an Algorand account deterministically and signs transactions in the
 * browser — no wallet extension/popup is involved, which makes a full on-chain
 * testnet lifecycle drivable from Playwright.
 */

// These page.evaluate/addInitScript callbacks run in the browser, against the app's own
// window globals (see env.d.ts in the app for the authoritative shapes) — Playwright's TS
// program doesn't share that file, so the properties this suite touches are redeclared here.
declare global {
  interface Window {
    __BIATEC_E2E?: object
    __BIATEC_SKIP_PRICE_FETCH?: boolean
    __authStore?: {
      isAuthenticated?: boolean
      wallet?: string
      account?: string
      arc76email?: string
      // deprecated in the auth component 3 store, still present; auth-survives-reload asserts they stay empty
      password?: string
      m?: string
    }
    __BIATEC_ENV?: string
    __navCount?: number
  }
}

export const TESTNET = 'testnet-v1.0'
export const MAINNET = 'mainnet-v1.0'

// Algorand testnet USDC (Circle) — used by the testnet lifecycle test.
export const TESTNET_USDC_ID = 10458941

export interface PrepareOptions {
  /** Inject window.__BIATEC_E2E so auth-gated pages render without login. */
  bypassAuth?: boolean
  /** Skip heavy price fetches where the app honours the flag. */
  skipPriceFetch?: boolean
  /** App theme stored for the page (default light, which most layout specs assume). */
  theme?: 'light' | 'dark' | 'system'
}

/**
 * Install init scripts (locale, optional auth bypass) BEFORE any navigation so
 * they apply on first load. Call once per test before page.goto().
 */
export async function prepare(page: Page, opts: PrepareOptions = {}): Promise<void> {
  await page.addInitScript((o: PrepareOptions) => {
    try {
      window.localStorage.setItem('biatec.locale', 'en')
      window.localStorage.setItem('biatec-theme', o.theme ?? 'light')
    } catch {
      /* ignore */
    }
    if (o.bypassAuth) {
      window.__BIATEC_E2E = {}
    }
    if (o.skipPriceFetch) {
      window.__BIATEC_SKIP_PRICE_FETCH = true
    }
  }, opts)
}

/** True once the in-app auth store reports an authenticated account. */
export async function isAuthenticated(page: Page): Promise<boolean> {
  return page.evaluate(() => window.__authStore?.isAuthenticated === true)
}

/**
 * Sign in with ARC-76 email/password. Triggers the auth form via the header
 * "Login" button if it is not already shown, then waits for authentication.
 */
export async function login(page: Page, email: string, password: string): Promise<void> {
  const emailInput = page.locator('#e')

  if (!(await emailInput.isVisible().catch(() => false))) {
    const loginBtn = page.getByRole('button', { name: /^login$/i })
    if (await loginBtn.isVisible().catch(() => false)) {
      await loginBtn.click()
    }
  }

  await expect(emailInput).toBeVisible({ timeout: 30_000 })
  await emailInput.fill(email)
  await page.locator('#p').fill(password)
  await page.getByRole('button', { name: /continue/i }).click()

  await page.waitForFunction(() => window.__authStore?.isAuthenticated === true, undefined, {
    timeout: 45_000
  })
}

/**
 * algorand-authentication-component-vue 3 keeps no password in memory: every ARC-76 signature
 * opens a password dialog (`aa-sign-dialog`). Registers a handler that types the password into
 * every such dialog and submits it, so a test can click "confirm" / "swap" / "remove" and just
 * wait for the success toast, however many transaction groups the flow signs.
 */
export async function autoApproveArc76Signing(page: Page, password: string): Promise<void> {
  await page.addLocatorHandler(page.getByTestId('aa-sign-dialog'), async (dialog) => {
    const input = dialog.locator('#aa-sign-password')
    await input.fill(password)
    await input.press('Enter')
    await expect(dialog).toBeHidden({ timeout: 60_000 })
  })
}

/** Switch the active network via the header settings menu and await the change. */
export async function switchNetwork(
  page: Page,
  label: 'Algorand' | 'Testnet' | 'Localnet',
  genesisId: string
): Promise<void> {
  await page.locator('[data-cy="settings-button"]').click()
  await page.getByRole('menuitem', { name: label, exact: true }).click()
  await page.waitForFunction((env) => window.__BIATEC_ENV === env, genesisId, {
    timeout: 30_000
  })
}

/** Wait for a PrimeVue success toast (severity class is locale-independent). */
export async function expectSuccessToast(page: Page, timeout = 120_000): Promise<void> {
  await expect(page.locator('.p-toast-message-success').first()).toBeVisible({ timeout })
}

/** Read required env credentials for the funded test account. */
export function testCredentials(
  prefix: 'LIQUIDITY' | 'TESTNET'
): { email: string; password: string } | null {
  const email = process.env[`${prefix}_TEST_EMAIL`]
  const password = process.env[`${prefix}_TEST_PASSWORD`]
  if (!password) return null
  return { email: email || 'test@biatec.io', password }
}

/**
 * Default throwaway ARC-76 account for read-only specs that only need to prove the sign-in
 * wall opens and clears (its email doubles as its password). Same override as auth-login.spec.ts.
 */
export const AUTH_EMAIL = process.env.AUTH_TEST_EMAIL ?? 'testtesttest@biatec.io'
export const AUTH_PASSWORD = process.env.AUTH_TEST_PASSWORD ?? 'testtesttest@biatec.io'

/**
 * Click a page's own "authenticate" button (identified by its data-cy hook), then complete the
 * ARC-76 email/password form and wait until the auth store reports a session.
 */
export async function signInVia(page: Page, authenticateDataCy: string): Promise<void> {
  await page.locator(`[data-cy="${authenticateDataCy}"]`).click()
  await login(page, AUTH_EMAIL, AUTH_PASSWORD)
}
