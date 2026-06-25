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

export const TESTNET = 'testnet-v1.0'
export const MAINNET = 'mainnet-v1.0'

// Algorand testnet USDC (Circle) — used by the testnet lifecycle test.
export const TESTNET_USDC_ID = 10458941

export interface PrepareOptions {
  /** Inject window.__BIATEC_E2E so auth-gated pages render without login. */
  bypassAuth?: boolean
  /** Skip heavy price fetches where the app honours the flag. */
  skipPriceFetch?: boolean
}

/**
 * Install init scripts (locale, optional auth bypass) BEFORE any navigation so
 * they apply on first load. Call once per test before page.goto().
 */
export async function prepare(page: Page, opts: PrepareOptions = {}): Promise<void> {
  await page.addInitScript(
    (o: PrepareOptions) => {
      try {
        window.localStorage.setItem('biatec.locale', 'en')
        window.localStorage.setItem('biatec-theme', 'light')
      } catch {
        /* ignore */
      }
      if (o.bypassAuth) {
        ;(window as unknown as { __BIATEC_E2E?: unknown }).__BIATEC_E2E = {}
      }
      if (o.skipPriceFetch) {
        ;(window as unknown as { __BIATEC_SKIP_PRICE_FETCH?: boolean }).__BIATEC_SKIP_PRICE_FETCH =
          true
      }
    },
    opts as unknown as Record<string, unknown>
  )
}

/** True once the in-app auth store reports an authenticated account. */
export async function isAuthenticated(page: Page): Promise<boolean> {
  return page.evaluate(
    () => (window as unknown as { __authStore?: { isAuthenticated?: boolean } }).__authStore?.isAuthenticated === true
  )
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

  await page.waitForFunction(
    () => (window as unknown as { __authStore?: { isAuthenticated?: boolean } }).__authStore?.isAuthenticated === true,
    undefined,
    { timeout: 45_000 }
  )
}

/** Switch the active network via the header settings menu and await the change. */
export async function switchNetwork(page: Page, label: 'Algorand' | 'Testnet' | 'Localnet', genesisId: string): Promise<void> {
  await page.locator('[data-cy="settings-button"]').click()
  await page.getByRole('menuitem', { name: label, exact: true }).click()
  await page.waitForFunction(
    (env) => (window as unknown as { __BIATEC_ENV?: string }).__BIATEC_ENV === env,
    genesisId,
    { timeout: 30_000 }
  )
}

/** Wait for a PrimeVue success toast (severity class is locale-independent). */
export async function expectSuccessToast(page: Page, timeout = 120_000): Promise<void> {
  await expect(page.locator('.p-toast-message-success').first()).toBeVisible({ timeout })
}

/** Read required env credentials for the funded test account. */
export function testCredentials(prefix: 'LIQUIDITY' | 'TESTNET'): { email: string; password: string } | null {
  const email = process.env[`${prefix}_TEST_EMAIL`]
  const password = process.env[`${prefix}_TEST_PASSWORD`]
  if (!password) return null
  return { email: email || 'test@biatec.io', password }
}
