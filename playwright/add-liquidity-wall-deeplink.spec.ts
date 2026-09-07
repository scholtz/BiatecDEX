import { test, expect, type Page } from '@playwright/test'
import { MAINNET, prepare } from './helpers/app'

/**
 * Regression test for the tab freeze on a wall-pool deep link
 * (/liquidity/mainnet-v1.0/GD/USD/<appId>/add?lpFee=1000000&shape=wall&low=1&high=1).
 *
 * The `low`/`high` route query used to be fed straight into the range-pin machinery
 * (pendingRouteRange/activeRouteRange). For a wall pool `low === high`, so the pin landed
 * `state.prices` on two adjacent grid cells; the prices watcher widened min/maxPriceTrade
 * to those cells, the pin-enforce watchers pulled them back, the grid snap pushed them
 * out again, and the main thread busy-looped forever (browser RESULT_CODE_HUNG).
 *
 * This spec drives the real app read-only (nothing is signed): it opens the exact deep
 * link, waits for the price range wiring to run, and asserts the page still answers,
 * the panel settled on the wall shape at the deep-linked price, and no Vue
 * "Maximum recursive updates" error surfaced.
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
      }
    }
  }
}

const GD_USD_WALL_POOL = 3109603139
const WALL_PRICE = 1

/**
 * The trade reporter API rejects localhost origins (CORS), so requests from the preview
 * server are forwarded Node-side with the original headers (minus origin/referer/host).
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

test.describe('wall pool deep link does not freeze the tab', () => {
  test('GD/USD wall pool with shape=wall&low=1&high=1 settles on the wall price', async ({
    page
  }) => {
    test.setTimeout(180_000)
    await prepare(page, { bypassAuth: true })
    await page.addInitScript(() => {
      // window.Cypress exposes AddLiquidity state on window.__ADD_LIQUIDITY_DEBUG.
      window.Cypress = {}
      // window.__BIATEC_E2E (set by prepare) is only needed to get past the auth wall,
      // which PublicLayout evaluates once in a cached computed. AddLiquidity, however,
      // re-reads the flag inside its price watchers and SKIPS grid snapping while it is
      // set - and the snap is one half of the oscillation under test. Drop the flag the
      // moment the panel has mounted (its debug handle appears during setup, before the
      // async fetchData/applyRouteOverrides chain in onMounted runs) so the watchers
      // take the same path as a logged-in user.
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
    const consoleErrors: string[] = []
    page.on('console', (msg) => {
      if (msg.type() === 'error' || msg.type() === 'warning') consoleErrors.push(msg.text())
    })

    await page.goto(
      `/en/liquidity/${MAINNET}/GD/USD/${GD_USD_WALL_POOL}/add?lpFee=1000000&shape=wall&low=${WALL_PRICE}&high=${WALL_PRICE}`,
      { waitUntil: 'domcontentloaded' }
    )

    // Let the price fetch, pool load and route overrides run (and loop, if broken).
    await page.waitForTimeout(8000)

    // With the bug present the renderer busy-loops and this evaluate never resolves.
    const responsive = await Promise.race([
      page.evaluate(() => true).catch(() => false),
      new Promise<false>((resolve) => setTimeout(() => resolve(false), 15_000))
    ])
    expect(responsive, 'renderer did not answer a trivial evaluate — main thread hung').toBe(true)

    await page.waitForFunction(
      (price) => {
        const s = window.__ADD_LIQUIDITY_DEBUG?.state
        return !!s && s.shape === 'wall' && Math.abs(s.minPriceTrade - price) < 1e-6
      },
      WALL_PRICE,
      { timeout: 30_000 }
    )

    // The state must be stable: sample it twice and require no further movement.
    const first = await page.evaluate(() => {
      const s = window.__ADD_LIQUIDITY_DEBUG!.state
      return { shape: s.shape, min: s.minPriceTrade, prices: [...s.prices] }
    })
    await page.waitForTimeout(3000)
    const second = await page.evaluate(() => {
      const s = window.__ADD_LIQUIDITY_DEBUG!.state
      return { shape: s.shape, min: s.minPriceTrade, prices: [...s.prices] }
    })
    expect(second).toEqual(first)

    const recursion = [...pageErrors, ...consoleErrors].filter((m) =>
      /Maximum recursive updates/i.test(m)
    )
    expect(recursion, recursion.join('\n')).toEqual([])
    expect(pageErrors, pageErrors.join('\n')).toEqual([])
  })
})
