import { test, expect, type Page } from '@playwright/test'
import { prepare, signInVia } from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/** Pool swap page for a pool. Nothing is signed. */
test.beforeEach(async ({ page }) => {
  await prepare(page)
  await proxyTradeApi(page)
})

/** The amount input only renders once a swap direction is chosen (PoolSwap.vue). */
async function chooseDirection(page: Page): Promise<void> {
  await page
    .getByRole('button', { name: /^Swap .+ to .+/ })
    .first()
    .click({ timeout: 30_000 })
  await expect(page.locator('[data-cy="swap-amount"]')).toBeVisible()
}

test('shows the amount input and keeps execute disabled while the amount is 0', async ({
  page
}) => {
  test.setTimeout(240_000)
  await page.goto('/en/swap/mainnet-v1.0/3136517663', { waitUntil: 'domcontentloaded' })

  await chooseDirection(page)
  await expect(page.locator('[data-cy="swap-execute"]')).toHaveCount(0)

  await signInVia(page, 'pool-swap-authenticate')

  // Re-select the direction: sign-in re-runs the pool load, which can reset it.
  await chooseDirection(page)
  // swapAmountFrom starts at 0 and the button is disabled while it is 0 (PoolSwap.vue)
  await expect(page.locator('[data-cy="swap-execute"]')).toBeDisabled()
})

/**
 * Trade page market depth on mainnet (issue #100): offers are quoted by Biatec Router first,
 * bids fall back to Folks Router while the router has no fixed-output mode, and both sides
 * must fill either way. Nothing is signed.
 */
test('fills the market depth on mainnet with Biatec Router first', async ({ page }) => {
  test.setTimeout(240_000)
  const routerCalls: string[] = []
  page.on('request', (req) => {
    if (/\/\/router\.api\.biatec\.io\/api\/v1\/router\//.test(req.url()))
      routerCalls.push(req.url())
  })
  // ALGO/USD: Folks Router quotes this pair too, so the bid side (fixed output) fills
  // even before the router has a fixed-output mode.
  await page.goto('/en/trade/mainnet-v1.0/ALGO/USD', { waitUntil: 'domcontentloaded' })

  await expect(page.locator('[data-cy="depth-offer"]').first()).toBeVisible({ timeout: 120_000 })
  await expect(page.locator('[data-cy="depth-bid"]').first()).toBeVisible({ timeout: 120_000 })
  // Every row reads "<amount> @ <price>" with a positive price.
  const offer = (await page.locator('[data-cy="depth-offer"]').first().innerText()).trim()
  expect(offer).toMatch(/@\s*[0-9]/)
  expect(offer).not.toMatch(/@\s*0([.,]0+)?$/)
  expect(routerCalls.some((url) => url.includes('/route?'))).toBe(true)
})
