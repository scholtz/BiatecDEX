# Playwright E2E tests

| Spec | What it does | Needs funds? |
| --- | --- | --- |
| `mainnet-walkthrough.spec.ts` | Read-only navigation through **every page** on mainnet. Never submits a transaction, so **no pools are affected**. Auth-gated pages are reached via the `window.__BIATEC_E2E` bypass. | No |
| `add-liquidity-mid-price.spec.ts` | Regression for issue #12 on mainnet **VOTE/GD**: stale mid price + asset-only deposit below the price must be refused with an explanation, never a silent "success". Read-only; the submit/review assertions only run when `LIQUIDITY_TEST_EMAIL/PASSWORD` are set (the review dialog is cancelled, nothing is signed). | No |
| `add-liquidity-wall-deeplink.spec.ts` | Regression for a wall-pool deep link (`?shape=wall&low=1&high=1`) that used to busy-loop the price-range pin machinery and freeze the tab (`RESULT_CODE_HUNG`). Read-only. | No |
| `liquidity-chart-click.spec.ts` | Regression for clicking ticks on the pool liquidity depth chart, which used to crash and eventually freeze the tab: a route-pinned price range flipping `state.shape` during a click's watcher cascade unmounted/remounted AddLiquidity's own price-distribution `<Chart>`, racing PrimeVue's async chart.js construction. Clicks through every bucket on a route-pinned deep link and asserts no uncaught error and a responsive tab. Read-only. | No |
| `liquidity-pair-redirect.spec.ts` | Regression for an infinite router-redirect loop between pair orderings; asserts navigations settle within a bounded number of history updates. | No |
| `testnet-lifecycle.spec.ts` | Full **ALGO / testnet-USDC** lifecycle on Algorand testnet: create pool → add liquidity → swap → remove liquidity. Real on-chain transactions, signed in-browser via the ARC-76 account. | Yes |

## Install browsers (first time)

```bash
npm run pw:install   # playwright install
```

## Run

By default Playwright builds the app and serves the preview on `:4173` itself.

```bash
npm run pw            # all suites
npm run pw:mainnet    # mainnet walkthrough only
npm run pw:testnet    # testnet lifecycle only (needs credentials, see below)
npm run pw:headed     # headed mode
npm run pw:report     # open the last HTML report
```

To run against an already-running server (e.g. the dev server) set
`PLAYWRIGHT_BASE_URL`; Playwright then will not start/stop a server:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:5173 npm run pw:mainnet
```

## Testnet credentials

The testnet lifecycle test is **skipped** unless `TESTNET_TEST_PASSWORD` is set.
The ARC-76 account it derives must hold testnet **ALGO** (fees + the ~5 ALGO
pool-creation seed) and some testnet **USDC** (asset `10458941`).

```bash
# PowerShell
$env:TESTNET_TEST_EMAIL = "you@example.com"
$env:TESTNET_TEST_PASSWORD = "your-password"
npm run pw:testnet

# bash
export TESTNET_TEST_EMAIL="you@example.com"
export TESTNET_TEST_PASSWORD="your-password"
npm run pw:testnet
```

Deposit amounts and the initial pool price in the spec are conservative
defaults — tune them in `testnet-lifecycle.spec.ts` to match your balances.
