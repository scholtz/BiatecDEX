import { test, expect, type Page } from '@playwright/test'
import { MAINNET, prepare } from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/**
 * Issue #99: the trader page chart is the Biatec Scan chart by default, Vestige can be
 * chosen in Settings, the choice survives a reload and the iframe follows the pair.
 * Read-only: the chart pages themselves are stubbed (only the iframe `src` is asserted).
 */

const BIATEC_MAINNET_CHARTS = 'https://algorand.scan.biatec.io/charts/'
const VESTIGE_WIDGET = 'https://vestige.fi/widget/'
const VOTE_ID = '452399768'

const chart = (page: Page) => page.locator('[data-cy="trade-chart"]')

const chartSrc = async (page: Page): Promise<string> =>
  (await chart(page).getAttribute('src')) ?? ''

/** The two asset ids in the current chart URL, whichever provider renders it. */
const chartIds = (src: string): string[] => {
  const url = new URL(src)
  if (url.searchParams.has('assetA')) {
    return [url.searchParams.get('assetA') ?? '', url.searchParams.get('assetB') ?? '']
  }
  const asset = url.pathname.split('/')[2] ?? ''
  return [asset, url.searchParams.get('denominatingAssetId') ?? '']
}

test.describe('Trader chart provider', () => {
  test.beforeEach(async ({ page }) => {
    await prepare(page, { bypassAuth: true })
    await proxyTradeApi(page)
    // Keep the test independent of the third-party chart pages: serve an empty page.
    await page.route(/\/\/(algorand|testnet)\.scan\.biatec\.io\/charts\//, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' })
    )
    await page.route(/\/\/vestige\.fi\/widget\//, (route) =>
      route.fulfill({ status: 200, contentType: 'text/html', body: '<html></html>' })
    )
  })

  test('Biatec Scan by default, Vestige from Settings, persisted, follows the pair', async ({
    page
  }) => {
    await page.goto(`/en/trade/${MAINNET}/vote/algo`, { waitUntil: 'domcontentloaded' })

    // 1. Fresh browser: Biatec Scan chart for the pair, in the app's theme and language.
    await expect(chart(page)).toHaveAttribute('data-chart-provider', 'biatec', { timeout: 30_000 })
    await expect
      .poll(async () => chartIds(await chartSrc(page)).sort(), { timeout: 30_000 })
      .toEqual(['0', VOTE_ID].sort())
    const biatecSrc = await chartSrc(page)
    expect(biatecSrc.startsWith(BIATEC_MAINNET_CHARTS)).toBe(true)
    const biatecParams = new URL(biatecSrc).searchParams
    expect(biatecParams.has('assetA')).toBe(true)
    expect(biatecParams.has('assetB')).toBe(true)
    expect(biatecParams.get('theme')).toBe('light')
    expect(biatecParams.get('locale')).toBe('en')
    await expect(chart(page)).toHaveAttribute('title', /chart/i)
    expect(await page.locator('iframe[data-cy="trade-chart"]').count()).toBe(1)

    // 2. Choose Vestige in Settings (in-app navigation) and return.
    await page.locator('[data-cy="settings-button"]').click()
    await page.getByRole('menuitem', { name: /configuration/i }).click()
    await expect(page).toHaveURL(/\/settings/)
    const select = page.locator('[data-cy="chart-provider-select"]')
    await expect(select).toBeVisible({ timeout: 30_000 })
    await select.getByText('Vestige', { exact: true }).click()
    await expect
      .poll(() => page.evaluate(() => window.localStorage.getItem('biatecdex.chartProvider')))
      .toBe('vestige')
    await page.goBack()
    await expect(chart(page)).toHaveAttribute('data-chart-provider', 'vestige', { timeout: 30_000 })
    await expect.poll(() => chartSrc(page)).toMatch(new RegExp(`^${VESTIGE_WIDGET}`))
    expect(chartIds(await chartSrc(page)).sort()).toEqual(['0', VOTE_ID].sort())

    // 3. The choice survives a reload.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(chart(page)).toHaveAttribute('data-chart-provider', 'vestige', { timeout: 30_000 })
    await expect.poll(() => chartSrc(page)).toMatch(new RegExp(`^${VESTIGE_WIDGET}`))

    // 4. Switching the pair in the app changes the ids in the iframe src.
    const before = chartIds(await chartSrc(page)).sort()
    const pairSelect = page.locator('[data-cy="pair-select"]')
    await expect(pairSelect).toBeVisible({ timeout: 30_000 })
    await pairSelect.click()
    const options = page.locator('.p-select-option')
    await expect(options.first()).toBeVisible({ timeout: 30_000 })
    const count = await options.count()
    let switched = false
    for (let i = 0; i < Math.min(count, 10) && !switched; i++) {
      const option = options.nth(i)
      if ((await option.getAttribute('aria-selected')) === 'true') continue
      await option.click()
      switched = true
    }
    expect(switched).toBe(true)
    await expect
      .poll(async () => chartIds(await chartSrc(page)).sort(), { timeout: 30_000 })
      .not.toEqual(before)
    await expect.poll(() => chartSrc(page)).toMatch(new RegExp(`^${VESTIGE_WIDGET}`))
  })
})
