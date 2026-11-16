import { test, expect, type Page } from '@playwright/test'
import { MAINNET, prepare } from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/**
 * VOTE/USD shows the asset's USD chart, VOTE/xALGO the VOTE/xALGO pair chart (one pair,
 * one chart), and the liquidity page has a one-click way back to the trading screen of the
 * same pair. Read-only: the chart page itself is stubbed, only the iframe `src` is read.
 */
const VOTE_ID = '452399768'
const XALGO_ID = '1134696561'

const chart = (page: Page) => page.locator('[data-cy="trade-chart"]')
const chartParams = async (page: Page): Promise<URLSearchParams> =>
  new URL((await chart(page).getAttribute('src')) ?? 'about:blank').searchParams

test.describe('Chart follows the pair; liquidity page links to trading', () => {
  test.beforeEach(async ({ page }) => {
    await prepare(page, { bypassAuth: true })
    await proxyTradeApi(page)
    await page.route(/\/\/(algorand|testnet)\.scan\.biatec\.io\/charts\//, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' })
    )
  })

  test('VOTE/USD charts VOTE in USD (no quote asset)', async ({ page }) => {
    await page.goto(`/en/trade/${MAINNET}/vote/usd`, { waitUntil: 'domcontentloaded' })
    await expect(chart(page)).toHaveAttribute('data-chart-provider', 'biatec', { timeout: 30_000 })
    await expect.poll(async () => (await chartParams(page)).get('assetA')).toBe(VOTE_ID)
    expect((await chartParams(page)).has('assetB')).toBe(false)
  })

  test('VOTE/xALGO charts the VOTE/xALGO pair', async ({ page }) => {
    await page.goto(`/en/trade/${MAINNET}/vote/asa-${XALGO_ID}`, { waitUntil: 'domcontentloaded' })
    await expect(chart(page)).toHaveAttribute('data-chart-provider', 'biatec', { timeout: 60_000 })
    await expect
      .poll(
        async () => {
          const p = await chartParams(page)
          return [p.get('assetA'), p.get('assetB')].sort()
        },
        { timeout: 60_000 }
      )
      .toEqual([VOTE_ID, XALGO_ID].sort())
  })

  test('liquidity page has a button to the trading screen of the same pair', async ({ page }) => {
    await page.goto(`/en/liquidity/${MAINNET}/vote/ALGO`, { waitUntil: 'domcontentloaded' })
    const button = page.locator('[data-cy="go-trade"]')
    await expect(button).toBeVisible({ timeout: 30_000 })
    await button.click()
    await expect(page).toHaveURL(/\/en\/trade\/mainnet-v1\.0\/vote\/algo/i, { timeout: 30_000 })
    await expect(chart(page)).toHaveAttribute('data-chart-provider', 'biatec', { timeout: 30_000 })
  })
})
