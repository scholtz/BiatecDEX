import { test, expect } from '@playwright/test'
import { prepare } from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/**
 * use-wallet 5 + algorand-authentication-component-vue 3 + biatec-wallet-use-wallet-client:
 * the sign-in dialog offers every registered wallet, the app boots without console errors
 * from the wallet stack and the sign-in screen uses the DEX cover image.
 */

// Button labels of the wallet list on Algorand mainnet (the app's default network).
const MAINNET_WALLETS = ['Biatec Wallet', 'Pera', 'Defly', 'Exodus', 'Kibisis', 'Lute']
const NOT_ON_MAINNET = 'Mnemonic'

test.beforeEach(async ({ page }) => {
  await prepare(page)
  await proxyTradeApi(page)
})

test('boots without wallet-stack errors and offers every registered wallet', async ({ page }) => {
  // The one expected resume error (mnemonic wallet on mainnet) is dropped by
  // walletResumeNoiseFilter; this catches a resume failure of any other wallet.
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error' && /Error resuming sessions/.test(m.text())) {
      errors.push(`console: ${m.text()}`)
    }
  })

  await page.goto('/en/explore-assets', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })
  await page
    .getByRole('button', { name: /^login$/i })
    .first()
    .click()
  await expect(page.locator('#e')).toBeVisible()

  // Exact wallet buttons, not substrings of the whole dialog text.
  const labels = (await page.locator('.aa-wallet').allInnerTexts()).map((t) => t.trim())
  expect(labels).toEqual(expect.arrayContaining(MAINNET_WALLETS))
  expect(labels).not.toContain(NOT_ON_MAINNET)
  expect(errors).toEqual([])
})

test('the sign-in screen uses the DEX cover image', async ({ page }) => {
  await page.goto('/en/explore-assets', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })
  await page
    .getByRole('button', { name: /^login$/i })
    .first()
    .click()
  const root = page.locator('.aa-root').first()
  await expect(root).toBeVisible()
  const cover = await root.evaluate((el) => getComputedStyle(el).getPropertyValue('--aa-cover'))
  expect(cover).toContain('auth-cover.jpg')
})
