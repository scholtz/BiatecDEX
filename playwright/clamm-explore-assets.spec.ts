import { test, expect } from '@playwright/test'
import { prepare } from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/**
 * Explore Assets (home page): the asset table renders and its add-liquidity action navigates
 * to the liquidity page. Read-only, real trade API.
 */
test.beforeEach(async ({ page }) => {
  await prepare(page)
  await proxyTradeApi(page)
})

test('lists assets and routes the add-liquidity action to the liquidity page', async ({ page }) => {
  await page.goto('/en', { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('heading', { level: 1, name: 'Explore Assets' })).toBeVisible({
    timeout: 30_000
  })
  const addLiquidity = page.locator('[data-cy^="asset-add-"] button').first()
  await expect(addLiquidity).toBeVisible({ timeout: 30_000 })
  await addLiquidity.click()

  await expect(page).toHaveURL(/\/en\/liquidity\/[^/]+\/[^/]+\/[^/]+/)
})
