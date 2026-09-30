import { test, expect } from '@playwright/test'
import algosdk from 'algosdk'
import { isAuthenticated, login, prepare } from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/**
 * Real ARC-76 sign-in through the email/password form (no injected state), using a
 * throwaway test account whose email doubles as its password (the form needs >16 chars).
 * Nothing is signed or sent; the account only proves that authentication, the restored
 * session after a full page load, and logout work end to end.
 *
 * Override with AUTH_TEST_EMAIL / AUTH_TEST_PASSWORD to use another account.
 */

const EMAIL = process.env.AUTH_TEST_EMAIL ?? 'testtesttest@biatec.io'
const PASSWORD = process.env.AUTH_TEST_PASSWORD ?? 'testtesttest@biatec.io'

const session = (page: import('@playwright/test').Page) =>
  page.evaluate(() => ({
    isAuthenticated: window.__authStore?.isAuthenticated === true,
    account: window.__authStore?.account ?? '',
    email: window.__authStore?.arc76email ?? '',
    wallet: window.__authStore?.wallet ?? ''
  }))

test.beforeEach(async ({ page }) => {
  await prepare(page)
  await proxyTradeApi(page)
})

test('signs in with the ARC-76 email/password form and stays signed in across reloads', async ({
  page
}) => {
  test.setTimeout(240_000)
  await page.goto('/en/explore-assets', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })
  expect(await isAuthenticated(page)).toBe(false)

  // Fills #e / #p and presses Continue (the account is derived in the browser, PBKDF2).
  await login(page, EMAIL, PASSWORD)

  const signedIn = await session(page)
  expect(signedIn).toMatchObject({ isAuthenticated: true, wallet: 'arc76', email: EMAIL })
  expect(algosdk.isValidAddress(signedIn.account)).toBe(true)
  await expect(page.getByRole('button', { name: /^login$/i })).toHaveCount(0)

  // The same account is derived every time: sign-in is deterministic per email/password.
  // A full page load restores the session without asking again.
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })
  expect(await session(page)).toEqual(signedIn)
  await expect(page.locator('#e')).toHaveCount(0)

  // ...also when navigating from the main page to the lazy Add Liquidity page while its
  // chunk is stale (first request 404s -> the app reloads onto the target).
  await page.goto('/en', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })
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
  expect(await session(page)).toEqual(signedIn)
  // Signed in: the submit button asks to review/add, not "Authenticate please".
  await expect(page.getByRole('button', { name: /authenticate/i })).toHaveCount(0)
})

test('rejects a password shorter than 17 characters and a malformed email', async ({ page }) => {
  await page.goto('/en/explore-assets', { waitUntil: 'domcontentloaded' })
  await page.getByRole('button', { name: /^login$/i }).click()
  await page.locator('#e').fill('not-an-email')
  await page.locator('#p').fill('short')
  await expect(page.getByRole('button', { name: /continue/i })).toBeDisabled()
  await page.locator('#e').fill(EMAIL)
  await expect(page.getByRole('button', { name: /continue/i })).toBeDisabled()
  await page.locator('#p').fill(PASSWORD)
  await expect(page.getByRole('button', { name: /continue/i })).toBeEnabled()
})

test('signing in from the header keeps the page the user was on', async ({ page }) => {
  test.setTimeout(240_000)
  // Regression: the header Login button used to navigate to the liquidity provider dashboard
  // to raise the sign-in wall, so signing in on an Add Liquidity link ended up there.
  const path = '/en/liquidity/mainnet-v1.0/vote/usd'
  const query = '?lpFee=1000000&tick=normal'
  await page.goto(`${path}${query}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-cy="tick-type-wide"]')).toBeVisible({ timeout: 60_000 })

  await login(page, EMAIL, PASSWORD)

  expect(new URL(page.url()).pathname).toBe(path)
  expect(new URL(page.url()).searchParams.get('tick')).toBe('normal')
  expect(new URL(page.url()).searchParams.get('lpFee')).toBe('1000000')
  // Back on the page itself, signed in, with the wall gone.
  await expect(page.locator('[data-cy="tick-type-wide"]')).toBeVisible({ timeout: 60_000 })
  await expect(page.locator('#e')).toHaveCount(0)
  expect(await isAuthenticated(page)).toBe(true)
})
