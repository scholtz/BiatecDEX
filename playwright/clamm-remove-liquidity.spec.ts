import { test, expect } from '@playwright/test'
import { prepare, signInVia } from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/**
 * Remove Liquidity page for a pool. Nothing is signed; the withdraw amount depends on the
 * account's position, so only the form structure and the sign-in gate are asserted.
 */
test.beforeEach(async ({ page }) => {
  await prepare(page)
  await proxyTradeApi(page)
})

test('shows the percent input and swaps the authenticate button for submit after sign-in', async ({
  page
}) => {
  test.setTimeout(240_000)
  await page.goto('/en/liquidity/mainnet-v1.0/3136517663/remove', {
    waitUntil: 'domcontentloaded'
  })

  await expect(page.locator('[data-cy="remove-percent"]')).toBeVisible({ timeout: 30_000 })
  await expect(page.locator('[data-cy="remove-submit"]')).toHaveCount(0)

  await signInVia(page, 'remove-liquidity-authenticate')

  await expect(page.locator('[data-cy="remove-liquidity-authenticate"]')).toHaveCount(0)
  await expect(page.locator('[data-cy="remove-submit"]')).toBeVisible({ timeout: 30_000 })
})

test('highlights the quick button that matches the percent (50 by default)', async ({ page }) => {
  test.setTimeout(120_000)
  await page.goto('/en/liquidity/mainnet-v1.0/3136517663/remove', {
    waitUntil: 'domcontentloaded'
  })
  const input = page.locator('[data-cy="remove-percent"]')
  await expect(input).toBeVisible({ timeout: 30_000 })

  const pressed = page.locator('[data-cy^="remove-"][aria-pressed="true"]')
  await expect(page.locator('[data-cy="remove-percent-50"]')).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await expect(pressed).toHaveCount(1)
})
