# Playwright E2E tests

| Spec | What it does | Needs funds? |
| --- | --- | --- |
| `mainnet-walkthrough.spec.ts` | Read-only navigation through **every page** on mainnet. Never submits a transaction, so **no pools are affected**. Auth-gated pages are reached via the `window.__BIATEC_E2E` bypass. | No |
| `add-liquidity-mid-price.spec.ts` | Regression for issue #12 on mainnet **VOTE/GD**: stale mid price + asset-only deposit below the price must be refused with an explanation, never a silent "success". Read-only; the submit/review assertions only run when `LIQUIDITY_TEST_EMAIL/PASSWORD` are set (the review dialog is cancelled, nothing is signed). | No |
| `add-liquidity-wall-deeplink.spec.ts` | Regression for a wall-pool deep link (`?shape=wall&low=1&high=1`) that used to busy-loop the price-range pin machinery and freeze the tab (`RESULT_CODE_HUNG`). Read-only. | No |
| `liquidity-chart-click.spec.ts` | Regression for clicking ticks on the pool liquidity depth chart, which used to crash and eventually freeze the tab: a route-pinned price range flipping `state.shape` during a click's watcher cascade unmounted/remounted AddLiquidity's own price-distribution `<Chart>`, racing PrimeVue's async chart.js construction. Clicks through every bucket on a route-pinned deep link and asserts no uncaught error and a responsive tab. Read-only. | No |
| `clamm-explore-assets.spec.ts` | Explore Assets lists assets; the add-liquidity row action routes to `/en/liquidity/...`. Read-only. | No |
| `clamm-add-liquidity-route.spec.ts` | Add Liquidity deep link (`lpFee`, `shape`, `low`/`high`, pair) shows up in the price inputs, the LP-fee button and `window.__ADD_LIQUIDITY_DEBUG`; anonymous visitors get the authenticate button, sign-in swaps it for submit. Nothing is signed. | No |
| `clamm-liquidity-pair-page.spec.ts` | The vote/ALGO pair page renders the pools depth chart and the my-liquidity panel without a wallet. | No |
| `clamm-remove-liquidity.spec.ts` | The remove page shows the percent input; sign-in swaps the authenticate button for submit. | No |
| `clamm-swap.spec.ts` | The swap page shows the amount input once a direction is chosen; after sign-in execute stays disabled while the amount is 0. | No |
| `clamm-dashboards-and-opt-in.spec.ts` | Trader dashboard and Asset opt-in show a sign-in prompt that disappears after sign-in; the Liquidity provider dashboard renders anonymously and signs in from the header. | No |
| `liquidity-pair-redirect.spec.ts` | Regression for an infinite router-redirect loop between pair orderings; asserts navigations settle within a bounded number of history updates. | No |
| `testnet-lifecycle.spec.ts` | Full **ALGO / testnet-USDC** lifecycle on Algorand testnet: create pool → add liquidity → swap → remove liquidity. Real on-chain transactions, signed in-browser via the ARC-76 account. | Yes |

## Install browsers (first time)

```bash
pnpm run pw:install   # playwright install
```

## Run

By default Playwright builds the app and serves the preview on `:4173` itself.

```bash
pnpm run pw            # all suites
pnpm run pw:mainnet    # mainnet walkthrough only
pnpm run pw:testnet    # testnet lifecycle only (needs credentials, see below)
pnpm run pw:headed     # headed mode
pnpm run pw:report     # open the last HTML report
```

To run against an already-running server (e.g. the dev server) set
`PLAYWRIGHT_BASE_URL`; Playwright then will not start/stop a server:

```bash
PLAYWRIGHT_BASE_URL=http://localhost:5173 pnpm run pw:mainnet
```

## Testnet credentials

The testnet lifecycle test is **skipped** unless `TESTNET_TEST_PASSWORD` is set.
The ARC-76 account it derives must hold testnet **ALGO** (fees + the ~5 ALGO
pool-creation seed) and some testnet **USDC** (asset `10458941`).

```bash
# PowerShell
$env:TESTNET_TEST_EMAIL = "you@example.com"
$env:TESTNET_TEST_PASSWORD = "your-password"
pnpm run pw:testnet

# bash
export TESTNET_TEST_EMAIL="you@example.com"
export TESTNET_TEST_PASSWORD="your-password"
pnpm run pw:testnet
```

Deposit amounts and the initial pool price in the spec are conservative
defaults — tune them in `testnet-lifecycle.spec.ts` to match your balances.

## Sign-in for the `clamm-*` specs

They sign in through the real ARC-76 form with a throwaway account (default
`testtesttest@biatec.io`; override with `AUTH_TEST_EMAIL` / `AUTH_TEST_PASSWORD`, see
`.env.example`). Playwright does not read `.env`, so export the variables in your shell. Run just
these specs with `pnpm exec playwright test clamm-` (add `PLAYWRIGHT_BASE_URL` to reuse a dev
server). They hit live mainnet data (vote/ALGO pool `3136517663`).
