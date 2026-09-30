import { test, expect } from '@playwright/test'
import { MAINNET, login, prepare } from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/**
 * Arriving on Add Liquidity while signed in must not throw during component setup.
 *
 * Regression: AddLiquidity has an immediate `isAuthenticated` watcher that runs fetchData()
 * synchronously inside setup() for a signed-in visitor. fetchData touched `let` variables that
 * are declared further down the script (temporal dead zone), so setup threw
 * "Cannot access 'x' before initialization". The app's error handler mistakes that message for a
 * stale lazy chunk and answers with a full page reload - the flicker users saw right after
 * "Create pool", with the page content lost.
 */
const EMAIL = process.env.AUTH_TEST_EMAIL ?? 'testtesttest@biatec.io'
const PASSWORD = process.env.AUTH_TEST_PASSWORD ?? 'testtesttest@biatec.io'

test('a signed-in visitor opens Add Liquidity without a setup error or page reload', async ({
  page
}) => {
  test.setTimeout(240_000)
  await prepare(page)
  await proxyTradeApi(page)
  const setupErrors: string[] = []
  page.on('pageerror', (e) => setupErrors.push(e.message))
  page.on('console', (m) => {
    if (m.type() === 'error' && /before initialization/i.test(m.text())) setupErrors.push(m.text())
  })
  let documentLoads = 0
  page.on('load', () => documentLoads++)

  await page.goto('/en/explore-assets', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })
  await login(page, EMAIL, PASSWORD)
  await page.evaluate(() => {
    ;(window as unknown as { __noReload: boolean }).__noReload = true
  })
  const loadsBefore = documentLoads

  // In-app navigation to Add Liquidity (what Create pool / the "+" buttons do).
  await page.evaluate((path) => {
    interface AppWithRouter {
      config: { globalProperties: { $router: { push: (p: string) => Promise<unknown> } } }
    }
    const app = (window as unknown as { __app: AppWithRouter }).__app
    void app.config.globalProperties.$router.push(path)
  }, `/en/liquidity/${MAINNET}/vote/usd`)
  await expect(page.locator('[data-cy="tick-type-wide"]')).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(3000)

  expect(setupErrors, `setup errors:\n${setupErrors.join('\n')}`).toEqual([])
  expect(documentLoads).toBe(loadsBefore)
  expect(
    await page.evaluate(() => (window as unknown as { __noReload?: boolean }).__noReload)
  ).toBe(true)
  expect(await page.evaluate(() => window.__authStore?.isAuthenticated)).toBe(true)
})

// Same class of bug anywhere else: no page may throw during setup for a signed-in visitor
// (an immediate watcher / eager call in setup() reading a not-yet-initialised binding).
const PAGES = [
  '/en/explore-assets',
  '/en/trade/mainnet-v1.0/GD/USD',
  '/en/trader',
  '/en/liquidity-provider',
  `/en/liquidity/${MAINNET}/vote/usd`,
  `/en/liquidity/${MAINNET}/vote/usd/3725015704/add`,
  `/en/liquidity/${MAINNET}/3725015704/remove`,
  `/en/swap/${MAINNET}/3725015704`
]

test('no page throws during setup for a signed-in visitor', async ({ page }) => {
  test.setTimeout(400_000)
  await prepare(page)
  await proxyTradeApi(page)
  const errors: string[] = []
  let current = ''
  page.on('pageerror', (e) => errors.push(`${current}: ${e.message}`))
  page.on('console', (m) => {
    if (
      m.type() === 'error' &&
      /before initialization|is not defined|Cannot read properties of undefined \(reading '(toNumber|value)'\)/i.test(
        m.text()
      )
    ) {
      errors.push(`${current}: ${m.text()}`)
    }
  })

  await page.goto('/en/explore-assets', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })
  await login(page, EMAIL, PASSWORD)

  for (const path of PAGES) {
    current = path
    // A full load restores the saved session, exactly like a stale-chunk reload would.
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })
    await page.waitForTimeout(5000)
    expect(await page.evaluate(() => window.__authStore?.isAuthenticated), path).toBe(true)
  }
  expect(errors, errors.join(' | ')).toEqual([])
})
