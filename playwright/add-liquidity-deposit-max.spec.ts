import { test, expect, type Page } from '@playwright/test'
import { MAINNET, login, prepare } from './helpers/app'
import { proxyTradeApi } from './helpers/tradeApiProxy'

/**
 * After the account's balance changes (liquidity added/removed, a swap...) the Add Liquidity
 * panel must follow: the max values move with the balance and a deposit amount that is now higher
 * than what the account holds comes down to the new maximum. The account balance is mocked at
 * the algod response (the same data the app reads) so "before" and "after an addition" can be
 * simulated without signing anything.
 */
const EMAIL = process.env.AUTH_TEST_EMAIL ?? 'testtesttest@biatec.io'
const PASSWORD = process.env.AUTH_TEST_PASSWORD ?? 'testtesttest@biatec.io'
const VOTE = 452399768
const VOTE_DECIMALS = 1_000_000

interface DebugState {
  balanceAsset: number
  depositAssetAmount: number
  balanceCurrency: number
  depositCurrencyAmount: number
}

const debug = <T>(page: Page, fn: (s: DebugState) => T) =>
  page.evaluate((src) => {
    const s = (window as unknown as { __ADD_LIQUIDITY_DEBUG: { state: DebugState } })
      .__ADD_LIQUIDITY_DEBUG.state
    return new Function('s', `return (${src})(s)`)(s)
  }, fn.toString()) as Promise<T>

async function setup(page: Page, initialVote: number) {
  await prepare(page)
  await page.addInitScript(() => {
    ;(window as unknown as { Cypress: object }).Cypress = {}
  })
  await proxyTradeApi(page)
  let vote = initialVote
  await page.route(/\/v2\/accounts\/[A-Z2-7]{58}(\?.*)?$/, async (route) => {
    const response = await route.fetch()
    const json = await response.json()
    const holdings = (json.assets ?? []).filter(
      (a: Record<string, unknown>) => (a['asset-id'] ?? a.assetId) !== VOTE
    )
    holdings.push({
      'asset-id': VOTE,
      amount: Math.round(vote * VOTE_DECIMALS),
      'is-frozen': false
    })
    await route.fulfill({ response, json: { ...json, assets: holdings } })
  })
  await page.goto('/en/explore-assets', { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => !!(window as unknown as { __authStore?: unknown }).__authStore,
    undefined,
    { timeout: 60_000 }
  )
  await login(page, EMAIL, PASSWORD)
  await page.goto(`/en/liquidity/${MAINNET}/vote/usd`, { waitUntil: 'domcontentloaded' })
  await page.waitForFunction(
    () => !!(window as unknown as { __ADD_LIQUIDITY_DEBUG?: unknown }).__ADD_LIQUIDITY_DEBUG,
    undefined,
    { timeout: 60_000 }
  )
  await expect.poll(() => debug(page, (s) => s.balanceAsset), { timeout: 60_000 }).toBe(initialVote)
  return {
    setBalance: (v: number) => {
      vote = v
    },
    // What the app does after a transaction: reload the balances in the background.
    refresh: () =>
      page.evaluate(() =>
        (
          window as unknown as { __ADD_LIQUIDITY_DEBUG: { loadBalances: (b: boolean) => unknown } }
        ).__ADD_LIQUIDITY_DEBUG.loadBalances(true)
      )
  }
}

const setDeposit = (page: Page, amount: number) =>
  page.evaluate((v) => {
    ;(
      window as unknown as { __ADD_LIQUIDITY_DEBUG: { state: DebugState } }
    ).__ADD_LIQUIDITY_DEBUG.state.depositAssetAmount = v
  }, amount)

test('depositing the max leaves nothing: the deposit follows the new balance down', async ({
  page
}) => {
  test.setTimeout(240_000)
  const account = await setup(page, 500)
  await setDeposit(page, 500) // the user deposits everything ...
  account.setBalance(0) // ... and the account no longer holds any
  await account.refresh()
  await expect.poll(() => debug(page, (s) => s.balanceAsset)).toBe(0)
  await expect.poll(() => debug(page, (s) => s.depositAssetAmount)).toBe(0)
})

test('a deposit above the remaining balance is reduced to the new maximum', async ({ page }) => {
  test.setTimeout(240_000)
  const account = await setup(page, 500)
  await setDeposit(page, 400)
  account.setBalance(120) // e.g. part of it went into a pool / was swapped
  await account.refresh()
  await expect.poll(() => debug(page, (s) => s.balanceAsset)).toBe(120)
  await expect.poll(() => debug(page, (s) => s.depositAssetAmount)).toBe(120)
  // The slider / input maximum follows the balance.
  await expect(page.locator('#depositAssetAmount').first()).toHaveAttribute('aria-valuemax', '120')
})

test('a deposit within the remaining balance is left alone; a bigger balance raises the max only', async ({
  page
}) => {
  test.setTimeout(240_000)
  const account = await setup(page, 500)
  await setDeposit(page, 100)
  account.setBalance(300)
  await account.refresh()
  await expect.poll(() => debug(page, (s) => s.balanceAsset)).toBe(300)
  expect(await debug(page, (s) => s.depositAssetAmount)).toBe(100)

  account.setBalance(900) // liquidity removed: more available, the typed amount stays
  await account.refresh()
  await expect.poll(() => debug(page, (s) => s.balanceAsset)).toBe(900)
  expect(await debug(page, (s) => s.depositAssetAmount)).toBe(100)
  await expect(page.locator('#depositAssetAmount').first()).toHaveAttribute('aria-valuemax', '900')
})
