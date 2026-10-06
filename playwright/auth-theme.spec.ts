import { test, expect, type Page } from '@playwright/test'
import { prepare } from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/** WCAG contrast ratio of the sign-in title against its card, in the browser's current theme. */
const titleContrast = (page: Page) =>
  page
    .locator('.aa-title')
    .first()
    .evaluate((el) => {
      const rgb = (c: string) => (c.match(/[\d.]+/g) ?? []).slice(0, 3).map(Number)
      const lum = ([r, g, b]: number[]) => {
        const f = (v: number) => {
          const x = v / 255
          return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4
        }
        return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)
      }
      const card = el.closest('.aa-card') ?? el.parentElement!
      const [a, b] = [
        lum(rgb(getComputedStyle(el).color)),
        lum(rgb(getComputedStyle(card).backgroundColor))
      ]
      return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05)
    })

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
      return { colorScheme, inputBg, contrast: await titleContrast(page) }
    }

    const stored = await openScheme()
    expect(stored.colorScheme).toBe(mode)
    expect(stored.contrast).toBeGreaterThan(4.5)

    // prepare() re-seeds the stored theme on every load, so the reload starts from `mode` again.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })
    await page.locator('[data-cy="theme-toggle"]').click()
    expect(await page.evaluate(() => document.documentElement.classList.contains('p-dark'))).toBe(
      other === 'dark'
    )
    const toggled = await openScheme()
    expect(toggled.colorScheme).toBe(other)
    expect(toggled.contrast).toBeGreaterThan(4.5)
    expect(toggled.inputBg).not.toBe(stored.inputBg)
  })
}

// The `theme` prop must be reactive: with the app in "system" mode, an OS colour-scheme change
// reaches a sign-in screen that is already open.
test('system mode: an OS theme change reaches the open sign-in screen', async ({ page }) => {
  await prepare(page, { theme: 'system' })
  await proxyTradeApi(page)
  await page.emulateMedia({ colorScheme: 'dark' })
  await page.goto('/en/explore-assets', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(() => !!window.__authStore, undefined, { timeout: 60_000 })
  await page
    .getByRole('button', { name: /^login$/i })
    .first()
    .click()
  await expect(page.locator('#e')).toBeVisible()

  const scheme = () =>
    page
      .locator('.aa-root')
      .first()
      .evaluate((el) => getComputedStyle(el).colorScheme)
  const appIsDark = () => page.evaluate(() => document.documentElement.classList.contains('p-dark'))
  for (const os of ['dark', 'light', 'dark'] as const) {
    await page.emulateMedia({ colorScheme: os })
    await expect.poll(scheme).toBe(os)
    // the app chrome and the sign-in screen stay in step
    await expect.poll(appIsDark).toBe(os === 'dark')
    expect(await titleContrast(page)).toBeGreaterThan(4.5)
  }
})
