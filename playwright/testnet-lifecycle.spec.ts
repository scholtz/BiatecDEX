import { test, expect } from '@playwright/test'
import {
  prepare,
  login,
  switchNetwork,
  expectSuccessToast,
  testCredentials,
  TESTNET,
  TESTNET_USDC_ID
} from './helpers/app'

/**
 * Testnet ALGO / USDC pool lifecycle: create pool → add liquidity → swap →
 * remove liquidity. This performs REAL on-chain transactions on Algorand
 * testnet, signed in-browser via the ARC-76 account.
 *
 * Prerequisites (test is skipped when not met):
 *  - TESTNET_TEST_PASSWORD (and optionally TESTNET_TEST_EMAIL) env vars for the
 *    ARC-76 account.
 *  - That account must hold testnet ALGO (for fees + the ~5 ALGO pool seed) and
 *    some testnet USDC (asset 10458941).
 *
 * Run only this suite:  TESTNET_TEST_PASSWORD=... npm run pw:testnet
 *
 * NOTE: deposit amounts and the initial price below are conservative defaults.
 * Tune them to your funded balances / desired pool price if needed.
 */

const creds = testCredentials('TESTNET')

test.describe('Testnet ALGO/USDC pool lifecycle', () => {
  test.skip(!creds, 'Set TESTNET_TEST_PASSWORD to run the testnet lifecycle test')

  // On-chain testnet operations are slow (multiple signed groups + confirmation).
  test.setTimeout(600_000)

  test('create pool, add liquidity, swap, then remove', async ({ page }) => {
    const { email, password } = creds!

    await prepare(page)

    // --- Authenticate (ARC-76) ---
    await page.goto('/explore-assets', { waitUntil: 'domcontentloaded' })
    await login(page, email, password)

    // --- Switch to testnet ---
    await switchNetwork(page, 'Testnet', TESTNET)

    // --- Create the ALGO / USDC pool selection ---
    await page.goto('/explore-assets', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: /create pool/i }).first().click()

    const dialog = page.locator('.create-pool')
    await expect(dialog).toBeVisible()

    // Base asset = ALGO
    await page.locator('[data-cy="create-pool-base"] input').fill('ALGO')
    await page
      .locator('.p-autocomplete-option', { hasText: /algorand/i })
      .first()
      .click()

    // Quote asset = testnet USDC (by exact id; trade API is not configured on testnet)
    await page.locator('[data-cy="create-pool-quote"] input').fill(String(TESTNET_USDC_ID))
    await page
      .locator('.p-autocomplete-option', { hasText: String(TESTNET_USDC_ID) })
      .first()
      .click()

    await page.locator('[data-cy="create-pool-continue"]').click()

    // --- Add liquidity (this creates the pool when it does not exist) ---
    await expect(page).toHaveURL(/\/liquidity\/testnet-v1\.0\//, { timeout: 30_000 })
    await expect(page.locator('[data-cy="add-liquidity-submit"]')).toBeVisible({ timeout: 60_000 })

    // Set an initial price range (USDC per ALGO) for the new pool, when the
    // price form is shown for the selected shape.
    const lowPrice = page.locator('#lowPrice')
    const highPrice = page.locator('#highPrice')
    if (await lowPrice.isVisible().catch(() => false)) {
      await lowPrice.fill('0.15')
    }
    if (await highPrice.isVisible().catch(() => false)) {
      await highPrice.fill('0.25')
    }

    // Modest deposits.
    const depositAsset = page.locator('#depositAssetAmount').first()
    const depositCurrency = page.locator('#depositCurrencyAmount').first()
    await depositAsset.fill('1')
    await depositCurrency.fill('0.2')

    // Open the pre-sign review and confirm.
    await page.locator('[data-cy="add-liquidity-submit"]').click()
    await expect(page.locator('.alq-review')).toBeVisible()
    // A brand-new pair should be flagged as a pool creation.
    await expect(page.getByText(/new pool will be created/i)).toBeVisible()
    await page.locator('[data-cy="review-confirm"]').click()

    // Pool creation (2 groups) + add liquidity (1 group) — give it time.
    await expectSuccessToast(page, 300_000)

    // --- Swap at the new pool ---
    // The pool now appears in "My liquidity"; use its swap action.
    await page.locator('[data-cy^="my-liquidity-swap-"]').first().waitFor({ timeout: 60_000 })
    await page.locator('[data-cy^="my-liquidity-swap-"]').first().click()

    await expect(page).toHaveURL(/\/swap\/testnet-v1\.0\//, { timeout: 30_000 })
    const swapAmount = page.locator('#swapAmountFrom')
    await expect(swapAmount).toBeVisible({ timeout: 30_000 })
    await swapAmount.fill('0.1')
    await page.locator('[data-cy="swap-execute"]').click()
    await expectSuccessToast(page, 180_000)

    // --- Remove the liquidity we added ---
    await page.goBack()
    await page.locator('[data-cy^="my-liquidity-remove-"]').first().waitFor({ timeout: 60_000 })
    await page.locator('[data-cy^="my-liquidity-remove-"]').first().click()

    await expect(page).toHaveURL(/\/remove/, { timeout: 30_000 })
    const removePercent = page.locator('#withdrawPercent')
    await expect(removePercent).toBeVisible({ timeout: 30_000 })
    await removePercent.fill('100')
    await page.locator('[data-cy="remove-submit"]').click()
    await expectSuccessToast(page, 180_000)
  })
})
