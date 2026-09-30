import { test, expect, type Page } from '@playwright/test'
import { isAuthenticated, login, prepare } from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/**
 * Landing page -> "Create pool" (Vote Coin / Algo) -> Add Liquidity must keep the sign-in.
 * Real ARC-76 form login (see auth-login.spec.ts for the account).
 */
const EMAIL = process.env.AUTH_TEST_EMAIL ?? 'testtesttest@biatec.io'
const PASSWORD = process.env.AUTH_TEST_PASSWORD ?? 'testtesttest@biatec.io'

async function pickAsset(page: Page, cy: string, query: string, optionText: RegExp) {
  const input = page.locator(`[data-cy="${cy}"] input, input[data-cy="${cy}"]`).first()
  await input.click()
  await input.fill(query)
  await page.getByRole('option', { name: optionText }).first().click()
}

test('creating a new pair from the landing page keeps the user signed in', async ({ page }) => {
  test.setTimeout(240_000)
  await prepare(page)
  await proxyTradeApi(page)
  const documentLoads: string[] = []
  page.on('framenavigated', (f) => {
    if (f === page.mainFrame()) documentLoads.push(f.url())
  })
  await page.goto('/en', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })
  await login(page, EMAIL, PASSWORD)
  const account = await page.evaluate(() => window.__authStore!.account)
  expect(account).toBeTruthy()

  await page
    .getByRole('button', { name: /create pool/i })
    .first()
    .click()
  await pickAsset(page, 'create-pool-base', 'vote', /vote/i)
  await pickAsset(page, 'create-pool-quote', 'algo', /algo/i)
  await page.locator('[data-cy="create-pool-continue"]').click()

  await expect(page).toHaveURL(/\/liquidity\//, { timeout: 60_000 })
  await expect(page.locator('[data-cy="tick-type-wide"]')).toBeVisible({ timeout: 60_000 })
  // Still the same signed-in account, without a wall or "Authenticate" prompt.
  expect(await isAuthenticated(page)).toBe(true)
  expect(await page.evaluate(() => window.__authStore!.account)).toBe(account)
  await expect(page.locator('#e')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^login$/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /authenticate/i })).toHaveCount(0)
  console.log('main-frame navigations:', JSON.stringify(documentLoads))
})

test('creating a brand-new pair (no pool yet, custom asset id) keeps the user signed in', async ({
  page
}) => {
  test.setTimeout(240_000)
  await prepare(page)
  await proxyTradeApi(page)
  await page.goto('/en', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })
  await login(page, EMAIL, PASSWORD)
  const account = await page.evaluate(() => window.__authStore!.account)

  await page
    .getByRole('button', { name: /create pool/i })
    .first()
    .click()
  await pickAsset(page, 'create-pool-base', 'vote', /vote/i)
  // An asset id that has no pool with VoteCoin: typing the id resolves it.
  await pickAsset(page, 'create-pool-quote', '2537013734', /2537013734/)
  await page.locator('[data-cy="create-pool-continue"]').click()

  await expect(page).toHaveURL(/\/liquidity\//, { timeout: 60_000 })
  await expect(page.locator('[data-cy="tick-type-wide"]')).toBeVisible({ timeout: 90_000 })
  console.log('landed on', page.url())
  expect(await isAuthenticated(page)).toBe(true)
  expect(await page.evaluate(() => window.__authStore!.account)).toBe(account)
  await expect(page.locator('#e')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /^login$/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /authenticate/i })).toHaveCount(0)
})

test('create pair keeps the sign-in when the lazy Add Liquidity chunk is stale (full reload)', async ({
  page
}) => {
  test.setTimeout(240_000)
  await prepare(page)
  await proxyTradeApi(page)
  await page.goto('/en', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })
  await login(page, EMAIL, PASSWORD)
  const account = await page.evaluate(() => window.__authStore!.account)

  let failed = false
  await page.route(/ManageLiquidity/, async (route) => {
    if (!failed) {
      failed = true
      // Production builds first modulepreload the chunk: Vite reports the 404 as a
      // `vite:preloadError` window event, which carries no route information.
      await page
        .evaluate(() => window.dispatchEvent(new Event('vite:preloadError', { cancelable: true })))
        .catch(() => {})
      await route.fulfill({ status: 404, body: 'not found' }).catch(() => {})
    } else {
      await route.continue()
    }
  })
  await page
    .getByRole('button', { name: /create pool/i })
    .first()
    .click()
  await pickAsset(page, 'create-pool-base', 'vote', /vote/i)
  await pickAsset(page, 'create-pool-quote', 'algo', /algo/i)
  await page.locator('[data-cy="create-pool-continue"]').click()

  await expect(page).toHaveURL(/\/liquidity\//, { timeout: 60_000 })
  await expect(page.locator('[data-cy="tick-type-wide"]')).toBeVisible({ timeout: 90_000 })
  expect(failed).toBe(true)
  await page.waitForFunction(() => !!window.__authStore)
  expect(await isAuthenticated(page)).toBe(true)
  expect(await page.evaluate(() => window.__authStore!.account)).toBe(account)
  await expect(page.getByRole('button', { name: /^login$/i })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /authenticate/i })).toHaveCount(0)
})
