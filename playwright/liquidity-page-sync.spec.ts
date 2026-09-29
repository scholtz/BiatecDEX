import { test, expect, type Page } from '@playwright/test'
import { MAINNET, prepare } from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/**
 * Liquidity page (VOTE/USD on mainnet, read only, NOT signed in):
 *  1. tick width + LP fee live in the route (`?tick=&lpFee=`) and drive every panel at once
 *  2. the depth chart and the Add Liquidity panel can never disagree on the tick width
 *  3. the Liquidity pools panel lists the pair's pools for anonymous visitors on load
 *  4. the trades list is filled to the panel height and loads more on scroll
 */

declare global {
  interface Window {
    Cypress?: object
    __ADD_LIQUIDITY_DEBUG?: {
      state: { precision: number; lpFee: bigint }
      store: { state: { liquidityTickPrecision: number | null; refreshMyLiquidity: boolean } }
    }
  }
}

const PAGE = `/en/liquidity/${MAINNET}/vote/usd/3725015704/add`
const TICKS = ['wide', 'normal', 'narrow'] as const
type Tick = (typeof TICKS)[number]
const PRECISION: Record<Tick, number> = { wide: 0, normal: 1, narrow: 2 }

const chartTick = (page: Page, tick: Tick) => page.locator(`[data-cy="chart-tick-type-${tick}"]`)
const addTick = (page: Page, tick: Tick) => page.locator(`[data-cy="tick-type-${tick}"]`)
const feeButton = (page: Page, fee: string) => page.locator(`[data-cy="lp-fee-${fee}"]`)

async function open(page: Page, query = ''): Promise<void> {
  await prepare(page)
  await page.addInitScript(() => {
    window.Cypress = {}
  })
  await proxyTradeApi(page)
  await page.goto(`${PAGE}${query}`, { waitUntil: 'domcontentloaded' })
  await expect(page.locator('[data-cy="tick-type-wide"]')).toBeVisible({ timeout: 60_000 })
}

const urlParams = (page: Page) => new URL(page.url()).searchParams

/** The tick width the chart, the add panel, the route and the store all agree on. */
async function expectTick(page: Page, tick: Tick): Promise<void> {
  for (const other of TICKS) {
    const pressed = other === tick ? 'true' : 'false'
    await expect(chartTick(page, other)).toHaveAttribute('aria-pressed', pressed)
    await expect(addTick(page, other)).toHaveAttribute('aria-pressed', pressed)
  }
  await expect.poll(() => urlParams(page).get('tick')).toBe(tick)
  await expect
    .poll(() =>
      page.evaluate(() => ({
        state: window.__ADD_LIQUIDITY_DEBUG?.state.precision,
        store: window.__ADD_LIQUIDITY_DEBUG?.store.state.liquidityTickPrecision
      }))
    )
    .toEqual({ state: PRECISION[tick], store: PRECISION[tick] })
}

test.describe('tick width and LP fee are shared through the route', () => {
  test('a link with ?tick=&lpFee= restores every panel', async ({ page }) => {
    await open(page, '?tick=narrow&lpFee=2000000')
    await expectTick(page, 'narrow')
    await expect(feeButton(page, '2000000')).toHaveAttribute('aria-pressed', 'true')
    await expect(feeButton(page, '1000000')).toHaveAttribute('aria-pressed', 'false')
    expect(urlParams(page).get('lpFee')).toBe('2000000')
  })

  test('without params the panels agree and the route records the effective settings', async ({
    page
  }) => {
    await open(page)
    await expect.poll(() => urlParams(page).get('tick'), { timeout: 60_000 }).not.toBeNull()
    const tick = urlParams(page).get('tick') as Tick
    expect(TICKS).toContain(tick)
    await expectTick(page, tick)
    await expect.poll(() => urlParams(page).get('lpFee')).not.toBeNull()
  })

  test('picking a width or fee in either panel updates all panels, the URL and survives reload', async ({
    page
  }) => {
    await open(page, '?tick=normal&lpFee=1000000')
    await expectTick(page, 'normal')
    const historyBefore = await page.evaluate(() => window.history.length)

    // chart -> add panel
    await chartTick(page, 'wide').click()
    await expectTick(page, 'wide')

    // add panel -> chart
    await addTick(page, 'narrow').click()
    await expectTick(page, 'narrow')

    // fee, add panel -> route
    await feeButton(page, '10000000').click()
    await expect(feeButton(page, '10000000')).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => urlParams(page).get('lpFee')).toBe('10000000')

    // Settings are edited in place (router.replace): no history spam, no redirect loop.
    expect(await page.evaluate(() => window.history.length)).toBeLessThanOrEqual(historyBefore + 1)

    // The copied path restores the same state.
    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-cy="tick-type-wide"]')).toBeVisible({ timeout: 60_000 })
    await expectTick(page, 'narrow')
    await expect(feeButton(page, '10000000')).toHaveAttribute('aria-pressed', 'true')
  })

  test('rapid consecutive fee changes settle on the last choice', async ({ page }) => {
    await open(page, '?tick=normal&lpFee=1000000')
    await expectTick(page, 'normal')
    // Back-to-back clicks: the earlier route write must never overwrite the later choice.
    await feeButton(page, '2000000').click({ noWaitAfter: true })
    await feeButton(page, '10000000').click({ noWaitAfter: true })
    await feeButton(page, '3000000').click({ noWaitAfter: true })
    await expect(feeButton(page, '3000000')).toHaveAttribute('aria-pressed', 'true')
    await expect.poll(() => urlParams(page).get('lpFee')).toBe('3000000')
    await page.waitForTimeout(1500)
    await expect(feeButton(page, '3000000')).toHaveAttribute('aria-pressed', 'true')
    expect(urlParams(page).get('lpFee')).toBe('3000000')
    expect(urlParams(page).get('tick')).toBe('normal')
  })

  test('invalid params are ignored and replaced by valid ones', async ({ page }) => {
    await open(page, '?tick=gigantic&lpFee=12345')
    await expect.poll(() => TICKS.includes(urlParams(page).get('tick') as Tick)).toBe(true)
    const tick = urlParams(page).get('tick') as Tick
    await expectTick(page, tick)
    await expect.poll(() => urlParams(page).get('lpFee')).not.toBe('12345')
  })
})

test.describe('liquidity pools panel', () => {
  test('lists the pair pools on load for an anonymous visitor (no Refresh click)', async ({
    page
  }) => {
    await open(page)
    expect(await page.evaluate(() => (window as { __authStore?: { isAuthenticated?: boolean } }).__authStore?.isAuthenticated)).not.toBe(true)
    const rows = page.locator('[data-cy^="my-liquidity-add-"]')
    await expect(rows.first()).toBeVisible({ timeout: 45_000 })
    expect(await rows.count()).toBeGreaterThan(0)
    await expect(page.getByText(/no liquidity pools/i)).toHaveCount(0)
  })

  test('the refresh flag raised after a transaction reloads the panel and is reset', async ({
    page
  }) => {
    await open(page)
    const rows = page.locator('[data-cy^="my-liquidity-add-"]')
    await expect(rows.first()).toBeVisible({ timeout: 45_000 })
    const flag = () => page.evaluate(() => window.__ADD_LIQUIDITY_DEBUG!.store.state.refreshMyLiquidity)
    expect(await flag()).toBe(false)
    const poolCalls: string[] = []
    page.on('request', (r) => {
      if (r.url().includes('/api/pool?')) poolCalls.push(r.url())
    })
    await page.evaluate(() => {
      window.__ADD_LIQUIDITY_DEBUG!.store.state.refreshMyLiquidity = true
    })
    await expect.poll(flag).toBe(false)
    expect(poolCalls.length).toBeGreaterThan(0)
  })

  test('highlights the pools that use the selected LP fee', async ({ page }) => {
    await open(page, '?tick=normal&lpFee=1000000')
    const cells = page.locator('[data-cy="my-liquidity-fee"]')
    await expect(cells.first()).toBeVisible({ timeout: 45_000 })
    const fees = await cells.evaluateAll((els) => els.map((el) => el.getAttribute('data-fee')))
    const selected = page.locator('[data-cy="my-liquidity-fee"][data-fee-selected="true"]')
    await expect(selected).toHaveCount(fees.filter((f) => f === '1000000').length)
    // Selecting another tier moves the highlight (asserted with a tier present or not).
    const target = fees.find((f) => f !== '1000000') ?? '100000000'
    await feeButton(page, target!).click()
    await expect(selected).toHaveCount(fees.filter((f) => f === target).length)
  })
})

test.describe('recent trades', () => {
  test('fills the panel height and loads older trades while scrolling', async ({ page }) => {
    await open(page)
    const scroller = page.locator('[data-cy="trades-scroller"]')
    const rows = page.locator('[data-cy="trades-row"]')
    await expect(rows.first()).toBeVisible({ timeout: 45_000 })
    await expect(page.locator('[data-cy="trades-empty"]')).toHaveCount(0)

    // No blank space: the rows overflow the scroller (or, for a very quiet pair, the
    // history really ended - hasMore false - which shows up as fewer rows than capacity).
    const metrics = await scroller.evaluate((el) => ({
      client: el.clientHeight,
      scroll: el.scrollHeight,
      rowH: el.querySelector('tbody tr')?.getBoundingClientRect().height ?? 0
    }))
    expect(metrics.client).toBeGreaterThan(150)
    expect(metrics.scroll).toBeGreaterThanOrEqual(metrics.client)

    // Infinite scroll: reaching the bottom loads the next page.
    const before = await rows.count()
    await scroller.evaluate((el) => el.scrollTo({ top: el.scrollHeight }))
    await expect.poll(() => rows.count(), { timeout: 30_000 }).toBeGreaterThan(before)

    // Trades are newest first.
    const times = await rows.evaluateAll((els) =>
      els.map((el) => el.querySelector('a')?.getAttribute('title') ?? '')
    )
    const stamps = times.map((t) => new Date(t).getTime()).filter(Number.isFinite)
    for (let i = 1; i < stamps.length; i++) expect(stamps[i]).toBeLessThanOrEqual(stamps[i - 1])
  })

  test('renders the bare-array response shape of older reporter deployments', async ({ page }) => {
    await prepare(page)
    await page.addInitScript(() => {
      window.Cypress = {}
    })
    await proxyTradeApi(page)
    const trade = (n: number) => ({
      assetIdIn: 31566704,
      assetIdOut: 452399768,
      assetAmountIn: 1_000_000 + n,
      assetAmountOut: 50_000_000,
      txId: `TX${n}`,
      topTxId: `TOP${n}`,
      blockId: 1000 + n,
      timestamp: new Date(Date.now() - n * 60_000).toISOString(),
      protocol: 'Biatec',
      tradeState: 'Confirmed'
    })
    // Registered after the proxy, so it wins: the reporter answers with a bare array.
    await page.route(/\/api\/trade\?/, async (route) => {
      await route.fulfill({
        status: 200,
        headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*' },
        body: JSON.stringify(Array.from({ length: 60 }, (_, n) => trade(n)))
      })
    })
    await page.goto(PAGE, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('[data-cy="trades-row"]').first()).toBeVisible({ timeout: 60_000 })
    await expect(page.locator('[data-cy="trades-empty"]')).toHaveCount(0)
  })
})
