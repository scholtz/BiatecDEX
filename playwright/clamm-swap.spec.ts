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
