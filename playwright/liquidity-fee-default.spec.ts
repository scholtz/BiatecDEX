import { test, expect, type Page } from '@playwright/test'
import { MAINNET, prepare } from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/**
 * LP fee handling on the liquidity page (GoldDAO/USD, mainnet, anonymous):
 *  - the default fee is the pair's most used one and lands in the URL (?lpFee=)
 *  - an explicit ?lpFee= is never overridden
 *  - depth chart ticks whose pool uses another fee than the selected one are marked
 */

interface PoolRow {
  lpFee?: number | null
  pMin?: number | null
  pMax?: number | null
  totalTVLAssetAInUSD?: number | null
  totalTVLAssetBInUSD?: number | null
}

const PAGE = `/en/liquidity/${MAINNET}/gd/usd/3109603139/add`
const TIERS = ['100000', '1000000', '2000000', '3000000', '10000000', '20000000', '100000000']

async function open(page: Page, query = ''): Promise<PoolRow[]> {
  await prepare(page)
  await proxyTradeApi(page)
  const rows: PoolRow[] = []
  page.on('response', async (res) => {
    if (
      !/\/api\/pool\?.*assetIdA=.*protocol=Biatec|\/api\/pool\?.*protocol=Biatec.*assetIdA=/.test(
        res.url()
      )
    )
      return
    const body = await res.json().catch(() => null)
    const list: PoolRow[] = Array.isArray(body) ? body : (body?.items ?? [])
    if (list.length && !rows.length) rows.push(...list)
  })
  await page.goto(`${PAGE}${query}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-cy="tick-type-wide"]')).toBeVisible({ timeout: 60_000 })
  await expect.poll(() => rows.length, { timeout: 60_000 }).toBeGreaterThan(0)
  await page.waitForTimeout(3000)
  return rows
}

const mostUsedFee = (rows: PoolRow[]): string => {
  const byFee = new Map<string, number>()
  for (const r of rows) {
    const fee = String(Math.round((r.lpFee ?? 0) * 1e9))
    byFee.set(
      fee,
      (byFee.get(fee) ?? 0) + (r.totalTVLAssetAInUSD ?? 0) + (r.totalTVLAssetBInUSD ?? 0)
    )
  }
  return [...byFee.entries()].sort((a, b) => b[1] - a[1])[0][0]
}

const chartAttr = (page: Page, name: string) =>
  page
    .locator('[data-cy="pools-liquidity-chart"]')
    .getAttribute(name)
    .then((v) => Number(v ?? 0))

test("default LP fee is the pair's most used fee and is recorded in the URL", async ({ page }) => {
  test.setTimeout(180_000)
  const rows = await open(page)
  const expected = mostUsedFee(rows)
  expect(TIERS).toContain(expected)
  await expect.poll(() => new URL(page.url()).searchParams.get('lpFee')).toBe(expected)
  await expect(page.locator(`[data-cy="lp-fee-${expected}"]`)).toHaveAttribute(
    'aria-pressed',
    'true'
  )
})

test('an explicit ?lpFee= in the link is kept', async ({ page }) => {
  test.setTimeout(180_000)
  await open(page, '?lpFee=100000000')
  await expect(page.locator('[data-cy="lp-fee-100000000"]')).toHaveAttribute('aria-pressed', 'true')
  expect(new URL(page.url()).searchParams.get('lpFee')).toBe('100000000')
})

test('ticks whose pool uses another fee are marked in the depth chart', async ({ page }) => {
  test.setTimeout(180_000)
  const rows = await open(page)
  const used = new Set(rows.map((r) => String(Math.round((r.lpFee ?? 0) * 1e9))))
  const unused = TIERS.find((t) => !used.has(t))!
  const best = mostUsedFee(rows)

  await page.locator(`[data-cy="lp-fee-${unused}"]`).click()
  await expect(page.locator(`[data-cy="lp-fee-${unused}"]`)).toHaveAttribute('aria-pressed', 'true')
  await expect.poll(() => chartAttr(page, 'data-exact-pool-ticks')).toBeGreaterThan(0)
  const exact = await chartAttr(page, 'data-exact-pool-ticks')
  // No pool uses this fee: every tick that already has a pool is a "change the fee" tick.
  await expect.poll(() => chartAttr(page, 'data-other-fee-ticks')).toBe(exact)
  await expect(page.locator('[data-cy="chart-legend-other-fee"]')).toBeVisible()

  // At the most used fee the matching ticks are green again.
  await page.locator(`[data-cy="lp-fee-${best}"]`).click()
  await expect.poll(() => chartAttr(page, 'data-other-fee-ticks')).toBeLessThan(exact)
})
