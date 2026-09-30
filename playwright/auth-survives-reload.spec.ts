import { test, expect, type Page } from '@playwright/test'
import { prepare } from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/**
 * A signed-in user must stay signed in when the app does a full page load on their behalf.
 * The sign-in state lives in memory only, and the stale-chunk recovery reloads the page
 * when a lazy route chunk 404s after a deploy - which is what "main page -> Add Liquidity"
 * hits (the main page is bundled eagerly, Add Liquidity is a lazy chunk). Logging in needs
 * real credentials, so the signed-in state is injected through the exposed auth store;
 * everything after that (persist, reload, restore, logout) is the real code path.
 */

declare global {
  interface Window {
    __authStore?: {
      isAuthenticated: boolean
      wallet: string
      account: string
      arc76email: string
      password: string
      m: string
    }
  }
}

const ACCOUNT = 'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAY5HFKQ'
const EMAIL = 'user@example.com'
const KEY = 'biatec-auth-session'

async function signIn(page: Page): Promise<void> {
  await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })
  await page.evaluate(
    ({ account, email }) => {
      const s = window.__authStore!
      s.password = 'a very secret password 12345'
      s.m = 'secret mnemonic words'
      s.arc76email = email
      s.account = account
      s.wallet = 'arc76'
      s.isAuthenticated = true
    },
    { account: ACCOUNT, email: EMAIL }
  )
  await expect(page.getByRole('button', { name: /^login$/i })).toHaveCount(0)
}

const auth = (page: Page) =>
  page.evaluate(() => ({
    isAuthenticated: window.__authStore?.isAuthenticated,
    account: window.__authStore?.account
  }))

test.beforeEach(async ({ page }) => {
  await prepare(page)
  await proxyTradeApi(page)
})

test('stays signed in when Add Liquidity triggers the stale-chunk reload', async ({ page }) => {
  test.setTimeout(180_000)
  await page.goto('/en', { waitUntil: 'domcontentloaded' })
  await signIn(page)
  await expect.poll(() => page.evaluate((k) => sessionStorage.getItem(k), KEY)).not.toBeNull()

  // The first request for the lazy Add Liquidity chunk 404s (a stale chunk after a deploy);
  // the recovery reloads onto the target URL, where the chunk then loads fine.
  let failed = false
  await page.route(/ManageLiquidity/, async (route) => {
    if (!failed) {
      failed = true
      await route.fulfill({ status: 404, body: 'not found' })
    } else {
      await route.continue()
    }
  })

  await page.locator('[data-cy^="asset-add-"] button').first().click()
  await expect(page).toHaveURL(/\/liquidity\//, { timeout: 60_000 })
  await expect(page.locator('[data-cy="tick-type-wide"]')).toBeVisible({ timeout: 60_000 })
  expect(failed).toBe(true)

  expect(await auth(page)).toEqual({ isAuthenticated: true, account: ACCOUNT })
  await expect(page.getByRole('button', { name: /^login$/i })).toHaveCount(0)
})

test('a plain reload keeps the session; secrets are never stored', async ({ page }) => {
  await page.goto('/en/explore-assets', { waitUntil: 'domcontentloaded' })
  await signIn(page)
  await expect.poll(() => page.evaluate((k) => sessionStorage.getItem(k), KEY)).not.toBeNull()

  const stored = (await page.evaluate((k) => sessionStorage.getItem(k), KEY)) ?? ''
  expect(stored).not.toMatch(/secret|password|mnemonic/i)
  expect(JSON.parse(stored)).toMatchObject({ account: ACCOUNT, arc76email: EMAIL })

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })
  expect(await auth(page)).toEqual({ isAuthenticated: true, account: ACCOUNT })
  // Signing prompts for the password again: it was never kept.
  expect(await page.evaluate(() => window.__authStore!.password)).toBe('')
})

test('logging out removes the saved session', async ({ page }) => {
  await page.goto('/en/explore-assets', { waitUntil: 'domcontentloaded' })
  await signIn(page)
  await expect.poll(() => page.evaluate((k) => sessionStorage.getItem(k), KEY)).not.toBeNull()

  await page.evaluate(() => {
    const s = window.__authStore!
    s.isAuthenticated = false
    s.account = ''
    s.wallet = ''
    s.arc76email = ''
  })
  await expect.poll(() => page.evaluate((k) => sessionStorage.getItem(k), KEY)).toBeNull()

  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })
  expect((await auth(page)).isAuthenticated).toBe(false)
})
