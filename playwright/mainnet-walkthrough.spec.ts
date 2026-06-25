import { test, expect, type Page } from '@playwright/test'
import { prepare } from './helpers/app'

/**
 * Mainnet read-only walkthrough.
 *
 * Visits every page of the app on mainnet and asserts it renders without
 * crashing. Auth-gated pages are reached via the window.__BIATEC_E2E bypass so
 * no login is needed. The test NEVER submits a transaction (no buy/sell, no
 * add/remove liquidity, no confirm) — so it cannot affect any pools.
 */

interface RouteCheck {
  name: string
  path: string
  // Optional extra assertion run after the page has rendered.
  marker?: (page: Page) => Promise<void>
}

const routes: RouteCheck[] = [
  { name: 'Home / trade screen', path: '/' },
  {
    name: 'Explore assets',
    path: '/explore-assets',
    marker: async (page) => {
      await expect(page.getByRole('button', { name: /create pool/i }).first()).toBeVisible()
    }
  },
  { name: 'Trader dashboard', path: '/trader' },
  { name: 'Asset opt-in', path: '/trader/asset-opt-in' },
  { name: 'Liquidity provider dashboard', path: '/liquidity-provider' },
  { name: 'Trade with assets (GD/USD)', path: '/trade/mainnet-v1.0/GD/USD' },
  { name: 'Manage liquidity (GD/USD)', path: '/liquidity/mainnet-v1.0/GD/USD' },
  {
    name: 'About',
    path: '/about',
    marker: async (page) => {
      await expect(page.getByRole('heading').first()).toBeVisible()
    }
  },
  {
    name: 'Settings',
    path: '/settings',
    marker: async (page) => {
      await expect(page.getByRole('heading').first()).toBeVisible()
    }
  }
]

test.describe('Mainnet read-only walkthrough', () => {
  test('renders every page without affecting pools', async ({ page }) => {
    // Collect uncaught errors to surface real crashes (logged, not hard-failed,
    // since third-party wallet libs can emit benign async errors).
    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(`${err.name}: ${err.message}`))

    await prepare(page, { bypassAuth: true })

    for (const route of routes) {
      await test.step(`visit ${route.name} (${route.path})`, async () => {
        await page.goto(route.path, { waitUntil: 'domcontentloaded' })

        // App shell mounted = header logo is present. This is a strong
        // crash/blank-page indicator that works on every page.
        await expect(page.locator('.svg-image').first()).toBeVisible({ timeout: 30_000 })

        // The app footer community line is present on every page.
        await expect(page.locator('body')).toContainText(/biatec/i, { timeout: 30_000 })

        if (route.marker) {
          await route.marker(page)
        }
      })
    }

    if (pageErrors.length) {
      console.warn(`Uncaught page errors during walkthrough:\n${pageErrors.join('\n')}`)
    }
  })
})
