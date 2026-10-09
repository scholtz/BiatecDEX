import { test, expect, type Page } from '@playwright/test'
import { prepare } from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/**
 * The Biatec Wallet connect dialog follows the language selected in the DEX. The adapter reads its
 * `locale` option when the wallet manager is created and again on every connect, so the app has to
 * (a) create it in the stored language and (b) re-localize it when the user switches language
 * without a reload. Before the fix the dialog always opened in the browser language (English).
 */

const SK_TITLE = 'Pripojiť Biatec Wallet'
const DE_TITLE_FALLBACK = 'Connect Biatec Wallet' // the dialog does not ship German

test.beforeEach(async ({ page }) => {
  await prepare(page)
  await proxyTradeApi(page)
})

/** Opens the sign-in screen and clicks "Biatec Wallet"; returns the dialog title. */
async function openBiatecDialogTitle(page: Page): Promise<string> {
  await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })
  await page
    .getByRole('button', { name: /^(login|prihlásiť sa)/i })
    .first()
    .click()
  await page.locator('.aa-wallet', { hasText: 'Biatec Wallet' }).first().click()
  const title = page.locator('.bcd-title')
  await expect(title).toBeVisible()
  return (await title.innerText()).trim()
}

/** Stores the app language before the first navigation (what the language menu persists). */
async function storeAppLocale(page: Page, locale: string) {
  await page.addInitScript((l: string) => window.localStorage.setItem('biatec.locale', l), locale)
}

test('opens the Biatec Wallet dialog in Slovak when the app language is Slovak', async ({
  page
}) => {
  await storeAppLocale(page, 'sk')
  await page.goto('/sk/explore-assets', { waitUntil: 'domcontentloaded' })
  expect(await openBiatecDialogTitle(page)).toBe(SK_TITLE)
})

test('re-localizes the dialog when the language is switched without a reload', async ({ page }) => {
  await page.goto('/en/explore-assets', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })

  // Switch the app language through the header's settings menu, like a user does.
  await page.locator('[data-cy="settings-button"]').click()
  await page.getByRole('menuitem', { name: 'Slovak' }).click()
  await expect(page).toHaveURL(/\/sk\//)
  await expect(page.getByRole('button', { name: /^prihlásiť sa$/i }).first()).toBeVisible()

  expect(await openBiatecDialogTitle(page)).toBe(SK_TITLE)
})

test('falls back to English (not the browser language) for languages the dialog lacks', async ({
  page
}) => {
  await storeAppLocale(page, 'de')
  await page.goto('/de/explore-assets', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })
  await page
    .getByRole('button', { name: /^(login|anmelden)/i })
    .first()
    .click()
  await page.locator('.aa-wallet', { hasText: 'Biatec Wallet' }).first().click()
  await expect(page.locator('.bcd-title')).toHaveText(DE_TITLE_FALLBACK)
})
