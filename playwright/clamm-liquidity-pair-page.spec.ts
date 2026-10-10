import { test, expect } from '@playwright/test'
import { prepare } from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/** Liquidity page for an asset pair (no pool selected): renders without a wallet. */
test.beforeEach(async ({ page }) => {
  await prepare(page)
  await proxyTradeApi(page)
})

test('renders the pools depth chart and the my-liquidity panel', async ({ page }) => {
  await page.goto('/en/liquidity/mainnet-v1.0/vote/ALGO', { waitUntil: 'domcontentloaded' })

  await expect(page).toHaveURL(/\/en\/liquidity\/mainnet-v1\.0\/vote\/ALGO/)
  await expect(page.locator('[data-cy="pools-liquidity-chart"]')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('[data-cy="my-liquidity"]')).toBeVisible({ timeout: 30_000 })
})
