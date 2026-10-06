import { test, expect } from '@playwright/test'
import { prepare } from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/**
 * algorand-authentication-component-vue >= 3.1 has light and dark palettes; PublicLayout passes
 * the app theme (`useTheme().isDark`) through its `theme` prop. The header (with the theme
 * toggle) is replaced by the sign-in screen while it is open, so the screen is opened once per
 * assertion: first with the stored theme, then after the header toggle.
 */
for (const mode of ['dark', 'light'] as const) {
  const other = mode === 'dark' ? 'light' : 'dark'

  test(`${mode}: the sign-in palette matches the app, also after the header toggle`, async ({
    page
  }) => {
    await prepare(page, { theme: mode })
    await proxyTradeApi(page)
    await page.goto('/en/explore-assets', { waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })
    expect(await page.evaluate(() => document.documentElement.classList.contains('p-dark'))).toBe(
      mode === 'dark'
    )

    const openScheme = async () => {
      await page
        .getByRole('button', { name: /^login$/i })
        .first()
        .click()
      await expect(page.locator('#e')).toBeVisible()
      const colorScheme = await page
        .locator('.aa-root')
        .first()
        .evaluate((el) => getComputedStyle(el).colorScheme)
      const inputBg = await page
        .locator('#e')
        .evaluate((el) => getComputedStyle(el).backgroundColor)
      return { colorScheme, inputBg }
    }

    const stored = await openScheme()
    expect(stored.colorScheme).toBe(mode)

    // Reloading re-applies the stored theme (prepare() is the only thing writing it).
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })
    await page.locator('[data-cy="theme-toggle"]').click()
    const toggled = await openScheme()
    expect(toggled.colorScheme).toBe(other)
    expect(toggled.inputBg).not.toBe(stored.inputBg)
  })
}
