import { test, expect, type Page } from '@playwright/test'
import { MAINNET, login, prepare, testCredentials } from './helpers/app'

/**
 * Regression test for the "Liquidity added successfully!" toast that fired without any
 * wallet prompt (VOTE/GD on mainnet, issue #12).
 *
 * The add-liquidity panel used to take its mid price only from the on-chain Biatec pool
 * provider, which reported ~0.024 for VOTE/GD while every other venue valued the pair
 * below 0.02. With that mid price the range 0.02 - 0.022 sat entirely below the price,
 * every tick bucket received 0 VOTE and 0 GD, the submit loop ran zero times and the
 * success toast fired anyway.
 *
 * This spec drives the real app on mainnet read-only (nothing is ever signed): it
 * reproduces the mis-priced state by setting the price manually, publishes the chart
 * click through the same store field the depth chart uses, enters 10000 VOTE + 0 GD and
 * asserts the live warning. With LIQUIDITY_TEST_EMAIL/PASSWORD set it also logs in and
 * checks that submitting is refused with an explanation (no review dialog, no success
 * toast), then corrects the price below the range and checks the plan is accepted (the
 * pre-sign review opens and is cancelled) - which is what the user wanted to do.
 */

declare global {
  interface Window {
    Cypress?: object
    __ADD_LIQUIDITY_DEBUG?: {
      state: {
        midPrice: number
        midPriceSource: string
        minPriceTrade: number
        maxPriceTrade: number
        showPriceForm: boolean
      }
      store: { state: { liquidityPriceRange: { min: number; max: number } | null } }
    }
  }
}

const RANGE = { min: 0.02, max: 0.022 }
const STALE_PRICE = 0.024
const CORRECTED_PRICE = 0.019

/**
 * The trade reporter API rejects localhost origins (CORS), so requests from the preview
 * server are forwarded Node-side with the original headers (minus origin/referer/host -
 * stripping everything would drop the ARC-14 Authorization and yield 401).
 */
async function proxyTradeApi(page: Page): Promise<void> {
  await page.route('**://api.algorand.scan.biatec.io/**', async (route) => {
    const req = route.request()
    const headers: Record<string, string> = {}
    for (const [k, v] of Object.entries(req.headers())) {
      if (!['origin', 'referer', 'host', 'content-length'].includes(k.toLowerCase())) headers[k] = v
    }
    try {
      const res = await fetch(req.url(), {
        method: req.method(),
        headers,
        body: req.method() === 'GET' ? undefined : req.postData()
      })
      const body = Buffer.from(await res.arrayBuffer())
      await route.fulfill({
        status: res.status,
        headers: {
          'content-type': res.headers.get('content-type') ?? 'application/json',
          'access-control-allow-origin': '*'
        },
        body
      })
    } catch (e) {
      await route.abort()
      console.warn('proxy failed', req.url(), e)
    }
  })
}

async function setMidPrice(page: Page, price: number): Promise<void> {
  await page.locator('[data-cy="edit-mid-price"]').click()
  const input = page.locator('[data-cy="mid-price-input"] input')
  await input.fill(String(price))
  await input.press('Tab')
  await page.locator('[data-cy="mid-price-apply"]').click()
  await expect(page.locator('[data-cy="mid-price-summary"]')).toBeVisible()
  await page.waitForFunction(
    (p) => Math.abs((window.__ADD_LIQUIDITY_DEBUG?.state.midPrice ?? 0) - p) < 1e-9,
    price
  )
}

async function publishChartRange(page: Page): Promise<void> {
  // Same store field the pool liquidity depth chart publishes on click.
  await page.evaluate((range) => {
    window.__ADD_LIQUIDITY_DEBUG!.store.state.liquidityPriceRange = { ...range }
  }, RANGE)
  await page.waitForFunction(
    (r) => {
      const s = window.__ADD_LIQUIDITY_DEBUG?.state
      return (
        !!s && Math.abs(s.minPriceTrade - r.min) < 1e-6 && Math.abs(s.maxPriceTrade - r.max) < 1e-6
      )
    },
    RANGE,
    { timeout: 30_000 }
  )
}

async function fillDeposits(page: Page, asset: number, currency: number): Promise<void> {
  for (const [id, value] of [
    ['depositAssetAmount', asset],
    ['depositCurrencyAmount', currency]
  ] as const) {
    const input = page.locator(`#${id}`)
    await input.fill(String(value))
    await input.press('Tab')
  }
}

test.describe('add liquidity never reports success without a submission', () => {
  test('VOTE/GD: asset-only deposit below the price is refused, accepted once the price is corrected', async ({
    page
  }) => {
    test.setTimeout(300_000)
    const creds = testCredentials('LIQUIDITY')
    await prepare(page, { bypassAuth: !creds })
    // window.Cypress exposes AddLiquidity's state/store on window.__ADD_LIQUIDITY_DEBUG.
    await page.addInitScript(() => {
      window.Cypress = {}
    })
    await proxyTradeApi(page)

    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(`${err.name}: ${err.message}`))
    page.on('response', (res) => {
      if (res.url().includes('/api/aggregated-pool')) {
        console.log(`aggregated-pool -> ${res.status()} ${res.url()}`)
      }
    })

    await page.goto(`/en/liquidity/${MAINNET}/vote/GD`, { waitUntil: 'domcontentloaded' })
    if (creds) await login(page, creds.email, creds.password)

    // The panel resolves a mid price (aggregated cross-DEX first, then fallbacks) and
    // shows it together with its source and a "Change price" button.
    const summary = page.locator('[data-cy="mid-price-summary"]')
    await expect(summary).toBeVisible({ timeout: 90_000 })
    const source = await page.locator('[data-cy="mid-price-source"]').innerText()
    const auto = await page.evaluate(() => ({
      price: window.__ADD_LIQUIDITY_DEBUG?.state.midPrice ?? 0,
      source: window.__ADD_LIQUIDITY_DEBUG?.state.midPriceSource
    }))
    console.log(`mid price ${auto.price} (${auto.source}) shown as "${source}"`)
    expect(auto.price).toBeGreaterThan(0)

    // Reproduce the stale valuation the bug report described.
    await setMidPrice(page, STALE_PRICE)
    await expect(page.locator('[data-cy="mid-price-source"]')).toContainText(/manual/i)
    await publishChartRange(page)
    await fillDeposits(page, 10000, 0)

    // Live warning: the range is below the price, so VOTE has nowhere to go.
    const warning = page.locator('[data-cy="deposit-allocation-warning"]')
    await expect(warning).toBeVisible({ timeout: 15_000 })
    await expect(warning).toContainText(/below the current price/i)

    if (creds) {
      // Submitting must produce an error toast, no review dialog and no success toast.
      await page.locator('[data-cy="add-liquidity-submit"]').first().click()
      const errorToast = page.locator('.p-toast-message-error').first()
      await expect(errorToast).toBeVisible({ timeout: 15_000 })
      await expect(errorToast).toContainText(/below the current price/i)
      await expect(page.getByRole('dialog')).toHaveCount(0)
      await expect(page.locator('.p-toast-message-success, .p-toast-message-info')).toHaveCount(0)
    }

    // Correct the price below the range: the VOTE deposit is now placeable.
    await setMidPrice(page, CORRECTED_PRICE)
    await publishChartRange(page)
    await fillDeposits(page, 10000, 0)
    await expect(warning).toHaveCount(0)

    if (creds) {
      // The pre-sign review opens; nothing is signed - the dialog is dismissed.
      await page.locator('[data-cy="add-liquidity-submit"]').first().click()
      const dialog = page.getByRole('dialog')
      await expect(dialog).toBeVisible({ timeout: 60_000 })
      await expect(dialog).toContainText(/10[,.]?000/)
      await page.keyboard.press('Escape')
      await expect(dialog).toHaveCount(0)
      await expect(page.locator('.p-toast-message-success')).toHaveCount(0)
    }

    if (pageErrors.length) {
      console.warn(`Uncaught page errors:\n${pageErrors.join('\n')}`)
    }
  })
})
