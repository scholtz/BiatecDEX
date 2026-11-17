import { test, expect } from '@playwright/test'
import {
  AUTH_EMAIL,
  AUTH_PASSWORD,
  MAINNET,
  TESTNET,
  login,
  prepare,
  switchNetwork
} from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/**
 * USDC <-> fUSDC conversion (Folks Finance lending) on the Liquidity provider dashboard
 * (BiatecDEX#106). Read-only: the throwaway ARC-76 account holds nothing, so the form is driven
 * up to the point where a funded account could sign, and never submits a transaction. The pool
 * rate and the balances are read from the real mainnet node.
 */
const DASHBOARD = '/en/liquidity-provider'
const OPEN = '[data-cy="lp-folks-lend-convert"]'

test('the conversion is not offered to a signed-out visitor', async ({ page }) => {
  await prepare(page)
  await proxyTradeApi(page)
  await page.goto(DASHBOARD, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-cy="lp-create-pool"]')).toBeVisible({ timeout: 60_000 })
  await expect(page.locator(OPEN)).toHaveCount(0)
})

test('a signed-in mainnet account can open the form, in both directions', async ({ page }) => {
  test.setTimeout(240_000)
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))
  await prepare(page)
  await proxyTradeApi(page)
  await page.goto(DASHBOARD, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })
  await login(page, AUTH_EMAIL, AUTH_PASSWORD)
  expect(await page.evaluate(() => window.__BIATEC_ENV)).toBe(MAINNET)

  await page.locator(OPEN).click()
  const dialog = page.locator('[data-cy="folks-lend-dialog"]')
  await expect(dialog).toBeVisible()

  // Rate and APY come from the Folks pool on chain: 1 fUSDC is worth more than 1 USDC.
  const rate = dialog.locator('[data-cy="folks-lend-rate"]')
  await expect(rate).toContainText(/1 fUSDC = 1\.\d+ USDC/, { timeout: 60_000 })
  await expect(dialog.locator('[data-cy="folks-lend-apy"]')).toContainText('%')
  const balance = dialog.locator('[data-cy="folks-lend-balance"]')
  await expect(balance).toHaveText('Available: 0 USDC', { timeout: 60_000 })

  // Deposit: 10 USDC buys fewer than 10 fUSDC; the empty account cannot submit.
  // The estimate follows the typing - the field is not blurred (PrimeVue commits on blur only).
  const amount = dialog.locator('[data-cy="folks-lend-amount"] input')
  const receive = dialog.locator('[data-cy="folks-lend-receive"]')
  await amount.click()
  await amount.pressSequentially('10')
  await expect(amount).toBeFocused()
  await expect(receive).toContainText(/[1-9][\d.]* fUSDC/)
  const fReceived = Number((await receive.innerText()).replace(/[^\d.]/g, ''))
  expect(fReceived).toBeGreaterThan(5)
  expect(fReceived).toBeLessThan(10)
  await expect(dialog.locator('[data-cy="folks-lend-insufficient"]')).toBeVisible()
  await expect(dialog.locator('[data-cy="folks-lend-lacks-algo"]')).toBeVisible()
  await expect(dialog.locator('[data-cy="folks-lend-submit"]')).toBeDisabled()
  await expect(dialog.locator('[data-cy="folks-lend-max"]')).toBeDisabled()

  // Withdrawal: the amount is reset, 10 fUSDC pays more than 10 USDC.
  await dialog.getByRole('button', { name: 'fUSDC → USDC' }).click()
  await expect(amount).toHaveValue('')
  await expect(balance).toHaveText('Available: 0 fUSDC')
  await expect(receive).toHaveText('≈ 0 USDC')
  await amount.click()
  await amount.pressSequentially('10')
  await expect(receive).toContainText(/[1-9][\d.]* USDC$/)
  const usdcReceived = Number((await receive.innerText()).replace(/[^\d.]/g, ''))
  expect(usdcReceived).toBeGreaterThan(10)
  await expect(dialog.locator('[data-cy="folks-lend-submit"]')).toBeDisabled()

  // Reopening starts from a clean form.
  await dialog.locator('[data-cy="folks-lend-close"]').click()
  await expect(dialog).toBeHidden()
  await page.locator(OPEN).click()
  await expect(amount).toHaveValue('')
  await expect(balance).toHaveText(/Available: 0 f?USDC/, { timeout: 60_000 })

  expect(pageErrors).toEqual([])
})

test('the conversion is not offered on a network without Folks lending', async ({ page }) => {
  test.setTimeout(240_000)
  await prepare(page)
  await proxyTradeApi(page)
  await page.goto(DASHBOARD, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })
  await login(page, AUTH_EMAIL, AUTH_PASSWORD)
  await expect(page.locator(OPEN)).toBeVisible()
  await switchNetwork(page, 'Testnet', TESTNET)
  await expect(page.locator(OPEN)).toHaveCount(0)
})
