import { test, expect } from '@playwright/test'
import { prepare } from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/**
 * Landing page -> "add liquidity" on an asset opens its most liquid pool's Add Liquidity
 * screen. The tick width must default to the width holding the most liquidity for the pair
 * (GoldDAO: wide), not to the range of the one pool the link happens to name.
 */

declare global {
  interface Window {
    Cypress?: object
    __ADD_LIQUIDITY_DEBUG?: {
      state: { precision: number; tickTypeStats: Record<string, { count: number; tvlUsd: number }> }
    }
  }
}

const PRECISION: Record<string, number> = { wide: 0, normal: 1, narrow: 2 }

test('add liquidity from the landing page defaults to the most liquid tick width', async ({
  page
}) => {
  test.setTimeout(180_000)
  await prepare(page)
  await page.addInitScript(() => {
    window.Cypress = {}
  })
  await proxyTradeApi(page)
  // A slow reporter: the per-width pool stats arrive after AddLiquidity's initial default
  // window, so the width has to be corrected once they land.
  await page.route(/\/api\/pool\?.*assetIdA=/, async (route) => {
    await new Promise((r) => setTimeout(r, 2500))
    await route.fallback()
  })
  await page.goto('/en', { waitUntil: 'domcontentloaded' })

  const add = page.locator('[data-cy^="asset-add-"]').filter({ has: page.locator('xpath=.') })
  const gold = page.locator('[data-cy="asset-add-gd"], [data-cy="asset-add-GD"]').first()
  await expect(gold.or(add.first())).toBeVisible({ timeout: 90_000 })
  await gold.locator('button').click()

  await expect(page.locator('[data-cy="tick-type-wide"]')).toBeVisible({ timeout: 60_000 })
  // Wait for the per-width stats that decide the default.
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const s = window.__ADD_LIQUIDITY_DEBUG?.state.tickTypeStats
          return s ? Object.values(s).reduce((n, v) => n + v.count, 0) : 0
        }),
      { timeout: 60_000 }
    )
    .toBeGreaterThan(0)
  await page.waitForTimeout(3000)

  const { best, precision } = await page.evaluate(() => {
    const st = window.__ADD_LIQUIDITY_DEBUG!.state
    const entries = Object.entries(st.tickTypeStats)
    const byTvl = [...entries].sort((a, b) => b[1].tvlUsd - a[1].tvlUsd || b[1].count - a[1].count)
    return { best: byTvl[0][0], precision: st.precision }
  })
  console.log(
    'URL',
    page.url(),
    'most liquid width',
    best,
    JSON.stringify(await page.evaluate(() => window.__ADD_LIQUIDITY_DEBUG!.state.tickTypeStats))
  )
  expect(precision).toBe(PRECISION[best])
  await expect(page.locator(`[data-cy="tick-type-${best}"]`)).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  await expect(page.locator(`[data-cy="chart-tick-type-${best}"]`)).toHaveAttribute(
    'aria-pressed',
    'true'
  )
})
