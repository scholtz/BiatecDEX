# Playwright E2E tests

Two suites live here:

| Spec | What it does | Needs funds? |
| --- | --- | --- |
| `mainnet-walkthrough.spec.ts` | Read-only navigation through **every page** on mainnet. Never submits a transaction, so **no pools are affected**. Auth-gated pages are reached via the `window.__BIATEC_E2E` bypass. | No |
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
