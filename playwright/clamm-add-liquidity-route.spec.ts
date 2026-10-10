import { test, expect } from '@playwright/test'
import { prepare, signInVia } from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/**
 * Add Liquidity deep link: the route query (lpFee, shape, low, high) and path (pair, pool) are
 * reflected in the form and in the component's debug state. Nothing is signed. Uses the real
 * mainnet vote/ALGO pool.
 */

declare global {
  interface Window {
    Cypress?: object
    __ADD_LIQUIDITY_DEBUG?: {
      state: { shape: string; lpFee: bigint | number | string; fullInfo?: unknown[] }
      store?: { state?: { assetCode?: string; currencyCode?: string } }
    }
  }
}

const POOL_URL = '/en/liquidity/mainnet-v1.0/vote/ALGO/3136517663/add'
// 100000 is the smallest entry of LP_FEE_TIERS (src/scripts/state/liquiditySettingsRoute.ts)
const LP_FEE = '100000'
const FOCUSED_URL = `${POOL_URL}?lpFee=${LP_FEE}&shape=focused&low=0.14&high=0.16`

/** Parses an InputNumber display value ("0.14", "1,234.5", "0,14") into a number. */
function parseNumeric(value: string): number {
  let s = value.replace(/\s/g, '')
  if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.')
  s = s.replace(/,(?=\d{3}(?:\D|$))/g, '')
  return Number(s)
}

test.beforeEach(async ({ page }) => {
  await prepare(page)
  // window.Cypress makes AddLiquidity expose its state on window.__ADD_LIQUIDITY_DEBUG.
  await page.addInitScript(() => {
    window.Cypress = {}
  })
  await proxyTradeApi(page)
})

test('shows the route low/high in the price inputs', async ({ page }) => {
  await page.goto(FOCUSED_URL, { waitUntil: 'domcontentloaded' })

  const low = page.locator('[data-cy="low-price-group"] input')
  const high = page.locator('[data-cy="high-price-group"] input')
  await expect(low).toBeVisible({ timeout: 30_000 })
  await expect
    .poll(async () => parseNumeric(await low.inputValue()), { timeout: 30_000 })
    .toBeCloseTo(0.14, 2)
  await expect.poll(async () => parseNumeric(await high.inputValue())).toBeCloseTo(0.16, 2)
})

test('applies lpFee, shape and the pair from the link', async ({ page }) => {
  await page.goto(FOCUSED_URL, { waitUntil: 'domcontentloaded' })

  await expect(page.locator(`[data-cy="lp-fee-${LP_FEE}"]`)).toHaveAttribute(
    'aria-pressed',
    'true',
    { timeout: 30_000 }
  )
  await expect(page).toHaveURL(new RegExp(`lpFee=${LP_FEE}`))

  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const d = window.__ADD_LIQUIDITY_DEBUG
          return {
            shape: d?.state.shape,
            lpFee: String(d?.state.lpFee),
            asset: d?.store?.state?.assetCode?.toLowerCase(),
            currency: d?.store?.state?.currencyCode?.toLowerCase(),
            poolsLoaded: (d?.state.fullInfo?.length ?? 0) > 0
          }
        }),
      { timeout: 30_000 }
    )
    .toEqual({
      shape: 'focused',
      lpFee: LP_FEE,
      asset: 'vote',
      currency: 'algo',
      poolsLoaded: true
    })
})

test('keeps the wall shape from the link', async ({ page }) => {
  await page.goto(`${POOL_URL}?lpFee=${LP_FEE}&shape=wall&low=0.15&high=0.15`, {
    waitUntil: 'domcontentloaded'
  })

  await expect
    .poll(() => page.evaluate(() => window.__ADD_LIQUIDITY_DEBUG?.state.shape), {
      timeout: 30_000
    })
    .toBe('wall')
})

test('asks anonymous visitors to authenticate and offers submit after sign-in', async ({
  page
}) => {
  test.setTimeout(240_000)
  await page.goto(FOCUSED_URL, { waitUntil: 'domcontentloaded' })

  await expect(page.locator('[data-cy="add-liquidity-authenticate"]')).toBeVisible({
    timeout: 30_000
  })
  await expect(page.locator('[data-cy="add-liquidity-submit"]')).toHaveCount(0)
  await signInVia(page, 'add-liquidity-authenticate')
  await expect(page.locator('[data-cy="add-liquidity-submit"]')).toBeVisible({ timeout: 30_000 })
})
