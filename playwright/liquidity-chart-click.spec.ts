import { test, expect, type Page } from '@playwright/test'
import { MAINNET, prepare } from './helpers/app'

/**
 * Regression test for clicking a tick on the pool liquidity depth chart
 * (PoolsLiquidityChart.vue, shown beside AddLiquidity.vue on the manage-liquidity page)
 * eventually freezing the tab (browser RESULT_CODE_HUNG), reported against a live
 * "add liquidity" deep link (the same kind of link `MyLiquidity.vue`'s
 * `buildAddLiquidityLink`/the pools table produce, and that
 * `add-liquidity-wall-deeplink.spec.ts` already covers for a DIFFERENT hazard —
 * see that spec's own comment for the low===high pin oscillation it guards).
 *
 * ROOT CAUSE (this spec's hazard, distinct from the one above): AddLiquidity.vue's own
 * price-distribution `<Chart>` used to live inside the `state.shape === 'wall'` / `v-else`
 * template split. Clicking almost anywhere on the depth chart drives that route-pinned
 * price range through AddLiquidity's route-pin state machine (see "AddLiquidity.vue's
 * route-pin state machine" and "Cross-panel sync" in copilot-instructions.md), which can
 * flip `state.shape` to/from 'wall' several times within under 100ms while it settles.
 * Every flip fully UNMOUNTED and REMOUNTED that whole template branch, including the
 * `<Chart>`. PrimeVue's Chart component builds its underlying chart.js instance via an
 * async `import('chart.js/auto').then(...)` with no guard against having been unmounted
 * by the time that promise resolves (node_modules/primevue/chart's initChart — not ours
 * to change): when it resolves after unmount, `$refs.canvas` is null, and chart.js's own
 * constructor throws "Cannot read properties of null (reading 'id')" trying to build its
 * "canvas already in use" error message off a stale, already-nulled registry entry (see
 * node_modules/.vite/deps/auto-*.js's Chart constructor). This threw as an UNCAUGHT
 * exception on nearly every click while a route pin was active (measured 31-32 of 35
 * bucket clicks in one sweep) and, since the failed construction never completes, orphans
 * a chart.js registry entry each time — compounding over a session instead of
 * self-healing, consistent with the reported "froze... after a while".
 *
 * Fix: the chart was hoisted out of that shape-driven v-if/v-else split entirely and is
 * now shown/hidden with `v-show` (which never unmounts it) instead of being structurally
 * present only in one branch. See the ROOT CAUSE comment on `chartDataStable` in
 * AddLiquidity.vue for the full trace.
 *
 * This spec drives the real app read-only (nothing is signed): it opens a route-pinned
 * add-liquidity deep link, then clicks through every tick on the depth chart via the
 * SAME pointer handlers a real user would trigger, asserting throughout that the page
 * stays responsive and throws no uncaught exception.
 */

declare global {
  interface Window {
    Cypress?: object
    __ADD_LIQUIDITY_DEBUG?: {
      state: {
        shape: string
        minPriceTrade: number
        maxPriceTrade: number
        prices: number[]
        balanceAsset: number
        balanceCurrency: number
        depositAssetAmount: number
        depositCurrencyAmount: number
        midPrice: number
      }
      getRouteDebug: () => { pending: unknown; active: unknown; ticksCalculated: boolean }
    }
    __POOLS_LIQUIDITY_CHART_DEBUG?: {
      getBuckets: () => Array<{ from: number; to: number; isWall: boolean; total: number }>
      getReferencePrice: () => number
      getChartArea: () => { left: number; right: number; top: number; bottom: number } | null
      getSelectedRange: () => { low: number; high: number } | null
    }
  }
}

const GD_USD_WALL_POOL = 3109603139

/**
 * The trade reporter API rejects localhost origins (CORS), so requests from the preview
 * server are forwarded Node-side with the original headers (minus origin/referer/host) —
 * same helper as add-liquidity-wall-deeplink.spec.ts.
 */
async function proxyTradeApi(page: Page): Promise<void> {
  await page.route('**://api.algorand.scan.biatec.io/**', async (route) => {
    const req = route.request()
    const headers: Record<string, string> = {}
    for (const [k, v] of Object.entries(req.headers())) {
      if (!['origin', 'referer', 'host', 'content-length'].includes(k.toLowerCase())) headers[k] = v
    }
    try {
      const res = await fetch(req.url(), {
        method: req.method(),
        headers,
        body: req.method() === 'GET' ? undefined : req.postData()
      })
      const body = Buffer.from(await res.arrayBuffer())
      await route.fulfill({
        status: res.status,
        headers: {
          'content-type': res.headers.get('content-type') ?? 'application/json',
          'access-control-allow-origin': '*'
        },
        body
      })
    } catch (e) {
      await route.abort()
      console.warn('proxy failed', req.url(), e)
    }
  })
}

test.describe('depth chart clicks never freeze the tab or crash the price chart', () => {
  test('clicking every tick on a route-pinned add-liquidity page stays responsive with no uncaught error', async ({
    page
  }) => {
    test.setTimeout(180_000)
    await prepare(page, { bypassAuth: true })
    await page.addInitScript(() => {
      // See add-liquidity-wall-deeplink.spec.ts's own comment: __BIATEC_E2E is only
      // needed to get past the auth wall; AddLiquidity's own price watchers re-read it
      // and skip the real (snapping/route-pin) code path while it's set, so drop it the
      // moment the panel's debug handle appears (before onMounted's async chain runs).
      window.Cypress = {}
      const timer = window.setInterval(() => {
        if (window.__ADD_LIQUIDITY_DEBUG) {
          delete window.__BIATEC_E2E
          window.clearInterval(timer)
        }
      }, 1)
    })
    await proxyTradeApi(page)

    const pageErrors: string[] = []
    page.on('pageerror', (err) => pageErrors.push(`${err.name}: ${err.message}`))
    const consoleProblems: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') consoleProblems.push(msg.text())
    })

    // A route-pinned "add liquidity" deep link (the kind the pools table / MyLiquidity's
    // buildAddLiquidityLink produce) — this is what drives AddLiquidity's route-pin state
    // machine hard enough for state.shape to flip transiently during a click.
    await page.goto(
      `/en/liquidity/${MAINNET}/GD/USD/${GD_USD_WALL_POOL}/add?lpFee=1000000&shape=wall&low=1&high=1`,
      { waitUntil: 'domcontentloaded' }
    )

    await page.waitForFunction(
      () =>
        !!window.__POOLS_LIQUIDITY_CHART_DEBUG?.getChartArea() &&
        !!window.__ADD_LIQUIDITY_DEBUG?.getRouteDebug().ticksCalculated,
      undefined,
      { timeout: 60_000 }
    )
    await page.waitForTimeout(2000)

    // Give the deposit fields real amounts (matches a logged-in user with a balance) so
    // the deposit-ratio-lock watchers (AddLiquidity.vue's depositRatioMode chain) are also
    // exercised during the clicks, not just the price-range machinery.
    await page.evaluate(() => {
      const s = window.__ADD_LIQUIDITY_DEBUG!.state
      s.balanceAsset = 1000
      s.balanceCurrency = 1000
      s.depositAssetAmount = 100
      s.depositCurrencyAmount = Number((100 * s.midPrice).toFixed(6))
    })
    await page.waitForTimeout(1000)

    const { buckets } = await page.evaluate(() => {
      const d = window.__POOLS_LIQUIDITY_CHART_DEBUG!
      return { buckets: d.getBuckets(), area: d.getChartArea()! }
    })
    const n = buckets.length
    expect(n, 'depth chart should have rendered buckets').toBeGreaterThan(0)

    // Click through EVERY tick (wall ticks included) via the real pointer handlers,
    // exactly like add-liquidity-wall-deeplink.spec.ts asserts a single deep link stays
    // responsive — here across a full sweep of every bucket, since the reported freeze
    // happened after repeated interaction ("froze... after a while"), not necessarily on
    // the very first click.
    for (let i = 0; i < n; i++) {
      const liveArea = await page.evaluate(() => window.__POOLS_LIQUIDITY_CHART_DEBUG!.getChartArea()!)
      const x = liveArea.left + ((i + 0.5) / n) * (liveArea.right - liveArea.left)
      const y = (liveArea.top + liveArea.bottom) / 2
      await page.mouse.click(x, y)
      await page.waitForTimeout(150)

      // With the bug present, chart.js's constructor throws on the vast majority of
      // clicks — fail fast with a clear pointer to which click, instead of only
      // asserting at the very end.
      if (pageErrors.length > 0) {
        expect(pageErrors, `uncaught error after clicking bucket ${i} of ${n}: ${JSON.stringify(buckets[i])}`).toEqual(
          []
        )
      }
    }

    // With the bug present, the renderer can also fully busy-loop; a trivial evaluate
    // must still resolve (same responsiveness probe as add-liquidity-wall-deeplink.spec.ts).
    const responsive = await Promise.race([
      page.evaluate(() => true).catch(() => false),
      new Promise<false>((resolve) => setTimeout(() => resolve(false), 15_000))
    ])
    expect(responsive, 'renderer did not answer a trivial evaluate — main thread hung').toBe(true)

    expect(pageErrors, pageErrors.join('\n')).toEqual([])
    const recursion = consoleProblems.filter((m) => /Maximum recursive updates/i.test(m))
    expect(recursion, recursion.join('\n')).toEqual([])
  })
})
