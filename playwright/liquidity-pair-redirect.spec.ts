import { test, expect } from '@playwright/test'
import { prepare, TESTNET } from './helpers/app'

/**
 * Regression test for the CODE_HANG freeze on the liquidity pages.
 *
 * Both tAlgo (testnet native) and testnet USDC are flagged isCurrency in the
 * asset catalog. AssetsService.selectPrimaryAsset() used to answer
 * `invert: true` for BOTH orderings of such a pair (and for pairs where
 * neither side matched any priority rule). The asset-pair ordering guard in
 * src/router/index.ts redirects whenever `invert` is true, so opening
 * /liquidity/testnet-v1.0/USDC/tAlgo swapped the pair back and forth forever —
 * an infinite redirect loop that froze the tab (browser CODE_HANG).
 *
 * These tests only need the router guard, not a wallet or on-chain data, so
 * they run without credentials.
 */

const PAIRS: Array<{ name: string; asset: string; currency: string }> = [
  // The exact pair from the bug report (LP dashboard "+" on USDC with tAlgo selected).
  { name: 'USDC/tAlgo (both isCurrency)', asset: 'USDC', currency: 'tAlgo' },
  { name: 'tAlgo/USDC (opposite order)', asset: 'tAlgo', currency: 'USDC' },
  // Two codes unknown to the catalog used to hit the invert:true fallback both ways.
  { name: 'unknown/unknown fallback', asset: 'zzz1', currency: 'zzz2' }
]

test.describe('liquidity pair ordering guard does not redirect forever', () => {
  for (const pair of PAIRS) {
    test(`settles on /liquidity/${pair.asset}/${pair.currency} — ${pair.name}`, async ({
      page
    }) => {
      await prepare(page, { bypassAuth: true, skipPriceFetch: true })

      // Count SPA navigations: vue-router drives history.pushState/replaceState,
      // so a redirect loop shows up as an unbounded call count.
      await page.addInitScript(() => {
        const w = window as unknown as { __navCount: number }
        w.__navCount = 0
        for (const fn of ['pushState', 'replaceState'] as const) {
          const original = history[fn].bind(history)
          history[fn] = ((...args: Parameters<History['pushState']>) => {
            w.__navCount++
            return original(...args)
          }) as History['pushState']
        }
      })

      await page.goto(`/en/liquidity/${TESTNET}/${pair.asset}/${pair.currency}`, {
        waitUntil: 'domcontentloaded'
      })

      // Give the router time to run its guards (and to loop, if it is broken).
      // With the bug present the tab busy-loops here and the evaluate below
      // never resolves — the test then fails by timeout, which is the hang.
      await page.waitForTimeout(4000)

      const navCount = await page.evaluate(
        () => (window as unknown as { __navCount: number }).__navCount
      )
      expect(navCount, `router performed ${navCount} history updates — redirect loop`).toBeLessThan(
        10
      )

      // The navigation must have settled on a liquidity URL for the same pair
      // (possibly with asset/currency swapped once by the ordering guard).
      const url = page.url()
      expect(url).toMatch(/\/en\/liquidity\/testnet-v1\.0\//)
      const tail = url.split(`/liquidity/${TESTNET}/`)[1] ?? ''
      const [first, second] = tail.split('/')
      expect(
        [pair.asset.toLowerCase(), pair.currency.toLowerCase()].sort(),
        'pair codes must survive the redirect'
      ).toEqual([first, second].map((s) => decodeURIComponent(s ?? '').toLowerCase()).sort())
    })
  }
})
