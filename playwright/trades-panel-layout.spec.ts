import { test, expect, type Page } from '@playwright/test'
import { MAINNET, prepare } from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/**
 * Recent trades panel (liquidity page): every trade is ONE line, the panel is wide enough that
 * nothing is cut off on large screens (no scrollbars on 4K), it shows exactly as many trades as
 * fit its height (no vertical scrolling), and on mobile at least 10 trades are listed.
 */
const PAGE = `/en/liquidity/${MAINNET}/vote/usd`

async function open(page: Page, width: number, height: number) {
  await prepare(page)
  await proxyTradeApi(page)
  await page.setViewportSize({ width, height })
  await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-cy="trades-row"]').first()).toBeVisible({ timeout: 60_000 })
  await page.waitForTimeout(2500) // let the row count settle after measuring
}

const metrics = (page: Page) =>
  page.evaluate(() => {
    const scroller = document.querySelector<HTMLElement>('[data-cy="trades-scroller"]')!
    const box = scroller.getBoundingClientRect()
    const rows = [...document.querySelectorAll<HTMLElement>('[data-cy="trades-row"]')]
    const rects = rows.map((r) => r.getBoundingClientRect())
    return {
      clientW: scroller.clientWidth,
      scrollW: scroller.scrollWidth,
      clientH: scroller.clientHeight,
      scrollH: scroller.scrollHeight,
      rows: rows.length,
      maxRowH: Math.max(...rects.map((r) => r.height)),
      lastBottom: rects.length ? rects[rects.length - 1].bottom : 0,
      scrollerBottom: box.bottom,
      panelW: (scroller.closest('[data-cy="trades-list"]') as HTMLElement).getBoundingClientRect()
        .width
    }
  })

for (const [name, w, h] of [
  ['4K', 3840, 2160],
  ['1080p', 1920, 1080]
] as const) {
  test(`${name}: one line per trade, nothing cut off, no scrolling`, async ({ page }) => {
    test.setTimeout(180_000)
    await open(page, w, h)
    const m = await metrics(page)
    expect(m.maxRowH, 'every trade is a single line').toBeLessThanOrEqual(44)
    expect(m.scrollH, 'no vertical scrolling').toBeLessThanOrEqual(m.clientH + 1)
    expect(m.lastBottom, 'last row fully visible').toBeLessThanOrEqual(m.scrollerBottom + 1)
    expect(m.rows).toBeGreaterThan(5)
    if (name === '4K') {
      expect(m.scrollW, 'no horizontal scrolling on 4K').toBeLessThanOrEqual(m.clientW + 1)
      expect(m.panelW).toBeGreaterThanOrEqual(400)
    }
  })
}

test('mobile: at least 10 recent trades, one line each', async ({ page }) => {
  test.setTimeout(180_000)
  await open(page, 390, 844)
  const m = await metrics(page)
  expect(m.rows).toBeGreaterThanOrEqual(10)
  expect(m.maxRowH).toBeLessThanOrEqual(44)
  expect(m.scrollH).toBeLessThanOrEqual(m.clientH + 1)
})
