# Biatec

First gold and silver coins in usage at 500 BC to 100 BC around Bratislava area were minted with label BIATEC. Slovak National Bank used the Biatec coin image on the official slovak fiat currency before EUR was adopted.

We believe that Algorand and whole AVM ecosystem provides new form of digital identity and payments solutions. The brand name Biatec creates for us historic narrative as we live now the historic moments of early crypto adoption.

Algorand is novel distributed ledger technology (DLT) which does not fork because of efficiency of PPoS. It provides instant transaction finality, sub 3 second economic finality and has highest AMM swap throughput. Users do not pay for failed transactions and each transfer of value even in milions costs less then a penny.

[www.biatec.io](https://www.biatec.io)

## Biatec DEX

We are building DEX like solution which will utilize the Automated Market Maker smart contracts, mainly the Concentrated liquidity AMM algorithm.

This work has been performed with support from the Algorand Foundation xGov Grants Program - [xGov#80](https://github.com/algorandfoundation/xGov/blob/main/Proposals/xgov-80.md).

## Testing

### Comprehensive CLAMM Test Suite

The project includes a comprehensive end-to-end test suite covering all major Concentrated Liquidity AMM use cases. Tests are located in `cypress/e2e/clamm/`.

**Covered Use Cases:**
- View and explore liquidity pools
- Add liquidity (single-sided, balanced, wall position)
- Remove liquidity
- Swap assets
- Liquidity Provider Dashboard
- Trader Dashboard
- Asset opt-in
- Route parameter handling

**Setup:**
1. Copy `.env.example` to `.env` and add test credentials
2. Build the project: `npm run build`
3. Run tests: `npm run test:e2e -- --spec "cypress/e2e/clamm/**/*.cy.ts"`

See [cypress/e2e/clamm/README.md](cypress/e2e/clamm/README.md) for detailed documentation.
