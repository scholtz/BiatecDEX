import { test, expect } from '@playwright/test'
import { AUTH_EMAIL, AUTH_PASSWORD, login, prepare, signInVia } from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/**
 * Trader dashboard, Liquidity provider dashboard and Asset opt-in render for an anonymous
 * visitor with a sign-in prompt, and the prompt disappears after signing in.
 */
test.beforeEach(async ({ page }) => {
  await prepare(page)
  await proxyTradeApi(page)
})

test('/en/trader prompts for sign-in and clears the prompt afterwards', async ({ page }) => {
  test.setTimeout(240_000)
  await page.goto('/en/trader', { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('heading', { level: 1, name: 'Trader dashboard' })).toBeVisible({
    timeout: 30_000
  })
  await expect(page).toHaveURL(/\/en\/trader/)

  await signInVia(page, 'trader-dashboard-authenticate')
  await expect(page.locator('[data-cy="trader-dashboard-authenticate"]')).toHaveCount(0)
})

// The Liquidity provider dashboard lists every pooled asset for anonymous visitors, so its
// in-table "authenticate" prompt (an empty-state slot) never renders; the header Login is the
// sign-in entry point here.
test('/en/liquidity-provider renders anonymously and signs in from the header', async ({
  page
}) => {
  test.setTimeout(240_000)
  await page.goto('/en/liquidity-provider', { waitUntil: 'domcontentloaded' })

  await expect(
    page.getByRole('heading', { level: 1, name: 'Liquidity Provider Dashboard' })
  ).toBeVisible({ timeout: 30_000 })
  await expect(page).toHaveURL(/\/en\/liquidity-provider/)
  await expect(page.getByRole('button', { name: /^login$/i })).toBeVisible()

  await login(page, AUTH_EMAIL, AUTH_PASSWORD)
  await expect(page.getByRole('button', { name: /^login$/i })).toHaveCount(0)
})

test('/en/trader/asset-opt-in prompts for sign-in', async ({ page }) => {
  test.setTimeout(240_000)
  await page.goto('/en/trader/asset-opt-in', { waitUntil: 'domcontentloaded' })

  await expect(page.locator('.p-card-title', { hasText: 'Opt-in to a new asset' })).toBeVisible({
    timeout: 30_000
  })
  await signInVia(page, 'asset-opt-in-authenticate')
  await expect(page.locator('[data-cy="asset-opt-in-authenticate"]')).toHaveCount(0)
})
