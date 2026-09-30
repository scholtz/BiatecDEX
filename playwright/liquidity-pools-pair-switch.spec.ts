import { test, expect, type Page } from '@playwright/test'
import { MAINNET, prepare } from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/**
 * Switching the asset pair on the liquidity page must replace the Liquidity pools table with
 * the new pair's pools - never keep showing the previous pair's pools (unrelated tokens).
 */

async function switchPair(page: Page, path: string) {
  await page.evaluate((p) => {
    interface AppWithRouter {
      config: { globalProperties: { $router: { push: (p: string) => Promise<unknown> } } }
    }
    const app = (window as unknown as { __app: AppWithRouter }).__app
    void app.config.globalProperties.$router.push(p)
  }, path)
}

const panel = (page: Page) => page.locator('[data-cy="my-liquidity"]')
const rowCount = (page: Page) => panel(page).locator('[data-cy^="my-liquidity-add-"]').count()
const units = async (page: Page) =>
  (await panel(page).locator('tbody').innerText()).replace(/\s+/g, ' ')

test('the pools table follows the selected pair', async ({ page }) => {
  test.setTimeout(240_000)
  await prepare(page)
  await proxyTradeApi(page)
  await page.goto(`/en/liquidity/${MAINNET}/gd/usd`, { waitUntil: 'domcontentloaded' })
  await expect(panel(page).locator('[data-cy^="my-liquidity-add-"]').first()).toBeVisible({
    timeout: 60_000
  })
  expect(await units(page)).toMatch(/GD/)

  // Another pair with pools: GoldDAO rows must be gone, VoteCoin rows shown.
  await switchPair(page, `/en/liquidity/${MAINNET}/vote/usd`)
  await expect.poll(() => units(page), { timeout: 60_000 }).toMatch(/vote/i)
  expect(await units(page)).not.toMatch(/\bGD\b/)

  // A pair without any pool: the table empties instead of keeping the previous rows.
  await switchPair(page, `/en/liquidity/${MAINNET}/gld/asa3203964481`)
  await expect.poll(() => rowCount(page), { timeout: 60_000 }).toBe(0)
  await expect(panel(page)).toContainText(/be first|no liquidity|empty/i)

  // And back again.
  await switchPair(page, `/en/liquidity/${MAINNET}/gd/usd`)
  await expect.poll(() => rowCount(page), { timeout: 60_000 }).toBeGreaterThan(0)
  expect(await units(page)).toMatch(/GD/)
})
