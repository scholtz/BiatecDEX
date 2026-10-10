# CLAMM Cypress specs

Read-only checks of the main CLAMM screens against the real trade API (no mocking), using the
`mainnet-v1.0` vote/ALGO pool `3136517663` like `cypress/e2e/liquidity/`. Nothing is signed or
submitted. They have not been run in CI; they depend on live mainnet data and a test account.

| Spec                             | What it checks                                                                                                                                                                                              |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `01-explore-assets.cy.ts`        | The Explore Assets table lists GoldDAO and its add-liquidity action navigates to a `/en/liquidity/...` route                                                                                                |
| `02-add-liquidity-route.cy.ts`   | `low`/`high`, `lpFee`, `shape` and the pair from the Add Liquidity link show up in the price inputs, the LP fee button and `window.__ADD_LIQUIDITY_DEBUG`; sign-in swaps the authenticate button for submit |
| `03-liquidity-pair-page.cy.ts`   | The pair page renders the pools depth chart and the my-liquidity panel                                                                                                                                      |
| `04-remove-liquidity.cy.ts`      | The remove page shows the percent input; sign-in swaps the authenticate button for submit                                                                                                                   |
| `05-swap.cy.ts`                  | The swap page shows the amount input; after sign-in the execute button is disabled while the amount is 0                                                                                                    |
| `06-dashboards-and-opt-in.cy.ts` | Trader dashboard, Liquidity provider dashboard and Asset opt-in show a sign-in prompt that disappears after sign-in                                                                                         |

Shared helpers (`signInVia`, `parseNumeric`, `visitWithLocale`) live in `cypress/support/auth.ts`.

## Setup

1. Copy `.env.example` to `.env` and set `LIQUIDITY_TEST_EMAIL` / `LIQUIDITY_TEST_PASSWORD`
   (`cypress.config.ts` loads `.env`; the password is required by the sign-in specs).
2. `pnpm install` and `pnpm run build` (the tests run against the preview server on port 4173).

## Run

```bash
# build, start the preview server and run all Cypress specs in Edge
pnpm run test:e2e

# only these specs (the script ends in `cypress run ... --`, so extra args are forwarded)
pnpm run test:e2e --spec "cypress/e2e/clamm/**/*.cy.ts"

# interactive
pnpm run cypress:open
```
