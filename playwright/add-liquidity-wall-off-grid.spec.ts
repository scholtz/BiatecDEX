import { test, expect, type Page } from '@playwright/test'
import { MAINNET, prepare } from './helpers/app'

/**
 * Regression test for wall orders whose price is NOT on the widest tick grid
 * (GD/USD, pool 3132508926: a 0.9-0.9 wall; the "wide" grid only has 1/2/5 anchors).
 *
 * Opening such a wall (pools table -> /add?shape=wall&low=0.9&high=0.9, with the default
 * "wide" width) used to snap the price onto the nearest wide boundary (1), so the form
 * showed 1 instead of 0.9, and the snap watchers / depth chart sync kept moving the value
 * (tab freeze). The wall must keep its exact price: the panel switches to the tick width
 * on whose grid the wall price is a boundary (normal for 0.9) and stays there.
 */

declare global {
  interface Window {
    Cypress?: object
    __ADD_LIQUIDITY_DEBUG?: {
      state: {
        shape: string
        precision: number
        minPriceTrade: number
        maxPriceTrade: number
        prices: number[]
      }
    }
  }
}

const GD_USD_WALL_POOL = 3132508926
const WALL_PRICE = 0.9

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

async function openWall(page: Page, query: string) {
  await prepare(page, { bypassAuth: true })
  await page.addInitScript(() => {
    window.Cypress = {}
    const timer = window.setInterval(() => {
      if (window.__ADD_LIQUIDITY_DEBUG) {
        delete window.__BIATEC_E2E
        window.clearInterval(timer)
      }
    }, 1)
  })
  await proxyTradeApi(page)
  await page.goto(`/en/liquidity/${MAINNET}/GD/USD/${GD_USD_WALL_POOL}/add?${query}`, {
    waitUntil: 'domcontentloaded'
  })
  await page.waitForTimeout(8000)
  const responsive = await Promise.race([
    page.evaluate(() => true).catch(() => false),
    new Promise<false>((resolve) => setTimeout(() => resolve(false), 15_000))
  ])
  expect(responsive, 'renderer did not answer a trivial evaluate - main thread hung').toBe(true)
}

const snapshot = (page: Page) =>
  page.evaluate(() => {
    const s = window.__ADD_LIQUIDITY_DEBUG!.state
    return { shape: s.shape, precision: s.precision, min: s.minPriceTrade, prices: [...s.prices] }
  })

test.describe('wall order off the widest grid keeps its exact price', () => {
  for (const [name, query] of [
    ['default width', `lpFee=1000000&shape=wall&low=${WALL_PRICE}&high=${WALL_PRICE}`],
    [
      'explicit tick=wide',
      `lpFee=1000000&tick=wide&shape=wall&low=${WALL_PRICE}&high=${WALL_PRICE}`
    ]
  ] as const) {
    test(`GD/USD 0.9 wall, ${name}`, async ({ page }) => {
      test.setTimeout(180_000)
      const pageErrors: string[] = []
      page.on('pageerror', (err) => pageErrors.push(`${err.name}: ${err.message}`))
      const consoleErrors: string[] = []
      page.on('console', (msg) => {
        if (msg.type() === 'error' || msg.type() === 'warning') consoleErrors.push(msg.text())
      })
      await openWall(page, query)

      await page.waitForFunction(
        (price) => {
          const s = window.__ADD_LIQUIDITY_DEBUG?.state
          return !!s && s.shape === 'wall' && Math.abs(s.minPriceTrade - price) < 1e-9
        },
        WALL_PRICE,
        { timeout: 30_000 }
      )
      const first = await snapshot(page)
      await page.waitForTimeout(3000)
      expect(await snapshot(page)).toEqual(first)
      // 0.9 only exists on the normal (1) and narrow (2) grids.
      expect(first.precision).toBeGreaterThanOrEqual(1)

      const recursion = [...pageErrors, ...consoleErrors].filter((m) =>
        /Maximum recursive updates/i.test(m)
      )
      expect(recursion, recursion.join(', ')).toEqual([])
      expect(pageErrors, pageErrors.join(', ')).toEqual([])
    })
  }

  test('clicking the wall tick on the depth chart (store min === max) keeps 0.9', async ({
    page
  }) => {
    test.setTimeout(180_000)
    await openWall(page, 'lpFee=1000000&tick=wide')
    await page.evaluate((price) => {
      // window.Cypress also exposes the Pinia store next to the AddLiquidity state.
      const dbg = window.__ADD_LIQUIDITY_DEBUG as unknown as {
        store: { state: { liquidityPriceRange: { min: number; max: number } | null } }
      }
      dbg.store.state.liquidityPriceRange = { min: price, max: price }
    }, WALL_PRICE)
    await page.waitForFunction(
      (price) => {
        const s = window.__ADD_LIQUIDITY_DEBUG?.state
        return !!s && s.shape === 'wall' && Math.abs(s.minPriceTrade - price) < 1e-9
      },
      WALL_PRICE,
      { timeout: 30_000 }
    )
    const first = await snapshot(page)
    await page.waitForTimeout(3000)
    expect(await snapshot(page)).toEqual(first)
  })

  test('hopping remove -> other wall -> 0.9 wall in the app stays responsive at 0.9', async ({
    page
  }) => {
    test.setTimeout(240_000)
    await openWall(page, `lpFee=1000000&shape=wall&low=${WALL_PRICE}&high=${WALL_PRICE}`)
    const go = (path: string) =>
      page.evaluate(async (target) => {
        const app = (
          document.querySelector('#app') as unknown as {
            __vue_app__: {
              config: { globalProperties: { $router: { push: (p: string) => Promise<unknown> } } }
            }
          }
        ).__vue_app__
        await app.config.globalProperties.$router.push(target)
      }, path)
    await go(`/en/liquidity/${MAINNET}/${GD_USD_WALL_POOL}/remove`)
    await page.waitForTimeout(3000)
    await go(`/en/liquidity/${MAINNET}/GD/USD/3109603139/add?lpFee=1000000&shape=wall&low=1&high=1`)
    await page.waitForTimeout(4000)
    await go(
      `/en/liquidity/${MAINNET}/GD/USD/${GD_USD_WALL_POOL}/add?lpFee=1000000&shape=wall&low=${WALL_PRICE}&high=${WALL_PRICE}`
    )
    await page.waitForTimeout(5000)
    const responsive = await Promise.race([
      page.evaluate(() => true).catch(() => false),
      new Promise<false>((resolve) => setTimeout(() => resolve(false), 15_000))
    ])
    expect(responsive, 'main thread hung').toBe(true)
    await page.waitForFunction(
      (price) => {
        const s = window.__ADD_LIQUIDITY_DEBUG?.state
        return !!s && s.shape === 'wall' && Math.abs(s.minPriceTrade - price) < 1e-9
      },
      WALL_PRICE,
      { timeout: 30_000 }
    )
    const first = await snapshot(page)
    await page.waitForTimeout(3000)
    expect(await snapshot(page)).toEqual(first)
  })
})
