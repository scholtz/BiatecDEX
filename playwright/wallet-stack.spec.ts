import { test, expect } from '@playwright/test'
import { prepare } from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/**
 * use-wallet 5 + algorand-authentication-component-vue 3 + biatec-wallet-use-wallet-client:
 * the sign-in dialog offers every registered wallet, the app boots without console errors
 * from the wallet stack and the sign-in screen uses the DEX cover image.
 */

const WALLETS = ['biatec', 'pera', 'defly', 'exodus', 'kibisis', 'lute']
const NOT_ON_MAINNET = ['mnemonic']

test.beforeEach(async ({ page }) => {
  await prepare(page)
  await proxyTradeApi(page)
})

test('boots without wallet-stack errors and offers every registered wallet', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('console', (m) => {
    if (m.type() === 'error' && /wallet|resum|Production network/i.test(m.text())) {
      errors.push(`console: ${m.text()}`)
    }
  })

  await page.goto('/en/explore-assets', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })
  await page.getByRole('button', { name: /^login$/i }).first().click()
  await expect(page.locator('#e')).toBeVisible()

  const dialogText = (await page.locator('.aa-root').first().innerText()).toLowerCase()
  for (const wallet of WALLETS) {
    expect(dialogText, `wallet ${wallet} is offered`).toContain(wallet)
  }
  for (const wallet of NOT_ON_MAINNET) {
    expect(dialogText, `wallet ${wallet} is hidden on mainnet`).not.toContain(wallet)
  }
  expect(errors).toEqual([])
})

test('the sign-in screen uses the DEX cover image', async ({ page }) => {
  await page.goto('/en/explore-assets', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })
  await page.getByRole('button', { name: /^login$/i }).first().click()
  const root = page.locator('.aa-root').first()
  await expect(root).toBeVisible()
  const cover = await root.evaluate((el) => getComputedStyle(el).getPropertyValue('--aa-cover'))
  expect(cover).toContain('auth-cover.jpg')
})
