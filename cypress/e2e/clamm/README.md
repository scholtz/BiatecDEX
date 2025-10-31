# CLAMM Comprehensive E2E Test Suite

This directory contains comprehensive end-to-end tests for all major Concentrated Liquidity AMM (CLAMM) use cases in BiatecDEX.

## Test Coverage

### Test Files

1. **01-view-explore-pools.cy.ts** - Pool Exploration
   - Display home page with asset list
   - Navigate to liquidity pages
   - View pool details for specific asset pairs
   - Display pool information (TVL, fees)
   - Navigate to pools from All Assets view

2. **02-add-liquidity-single.cy.ts** - Single-sided Liquidity
   - Navigate with route parameters
   - Display correct price ranges
   - Enable deposit slider when ready
   - Adjust deposit amounts
   - Display asset information
   - Show expected output amounts

3. **03-add-liquidity-balanced.cy.ts** - Balanced Liquidity
   - Load balanced liquidity form
   - Display both asset and currency inputs
   - Calculate balanced amounts
   - Adjust amounts proportionally
   - Respect user balance limits
   - Display liquidity distribution chart

4. **04-add-liquidity-wall.cy.ts** - Wall Position (Concentrated)
   - Load wall shape form
   - Display same min/max price
   - Recognize wall shape parameter
   - Display concentrated liquidity distribution
   - Handle balanced deposits for wall

5. **05-remove-liquidity.cy.ts** - Remove Liquidity
   - Navigate to remove page
   - Display withdrawal slider
   - Show LP token balance
   - Calculate expected assets to receive
   - Adjust withdrawal percentage
   - Display remove button

6. **06-swap-assets.cy.ts** - Asset Swaps
   - Navigate to swap page
   - Display swap input fields
   - Show swap direction selector
   - Calculate expected output
   - Display pool information
   - Show asset balances
   - Display swap button
   - Handle amount slider

7. **07-lp-dashboard.cy.ts** - Liquidity Provider Dashboard
   - Load LP dashboard
   - Display list of positions
   - Show position values in USD
   - Display asset filter
   - Show fees earned
   - Display total portfolio value
   - Navigate to add liquidity
   - Show position details
   - Filter by asset

8. **08-trader-dashboard.cy.ts** - Trader Dashboard
   - Load trader dashboard
   - Display asset holdings table
   - Show total portfolio value
   - Display asset count and largest holding
   - Show daily change percentage
   - Display asset prices in USD
   - Show asset balances
   - Filter assets
   - Navigate to trade/swap
   - Link to asset opt-in

9. **09-asset-opt-in.cy.ts** - Asset Opt-in
   - Load opt-in page
   - Display available assets
   - Show asset details
   - Display opt-in buttons
   - Show opted-in status
   - Filter/search assets
   - Display network information
   - Show confirmation

10. **10-route-parameters.cy.ts** - Route Parameter Handling
    - Handle asset pair parameters
    - Handle pool ID parameter
    - Handle lpFee query parameter
    - Handle shape query parameter
    - Handle price query parameters
    - Handle multiple parameters together
    - Handle network parameter
    - Handle swap route
    - Handle remove route
    - Handle wall shape parameters

## Setup

### Prerequisites

1. Node.js and npm installed
2. Cypress installed (`npm install`)
3. Test account with balances on Algorand mainnet

### Configuration

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Edit `.env` and add your test credentials:
   ```
   LIQUIDITY_TEST_EMAIL=your-test-account@example.com
   LIQUIDITY_TEST_PASSWORD=your-secure-password
   ```

3. **Important**: Never commit the `.env` file with actual credentials

## Running Tests

### Build First
Tests run against the production build, so build first:
```bash
npm run build
```

### Run All CLAMM Tests
```bash
npm run test:e2e -- --spec "cypress/e2e/clamm/**/*.cy.ts"
```

### Run Single Test File
```bash
npm run cy:run -- cypress/e2e/clamm/01-view-explore-pools.cy.ts
```

### Run with Cypress UI
```bash
npm run cypress:open
```
Then select the test file from the UI.

### Run with Video Recording
```bash
npm run cy:run:video -- cypress/e2e/clamm/01-view-explore-pools.cy.ts
```

## Test Patterns

### Shared Utilities
All tests use shared utilities from `test-utils.ts`:
- `visitWithLocale(url)` - Visit URL with English locale
- `authenticateIfNeeded()` - Authenticate if sign-in required
- `clearTestState()` - Clear localStorage and debug variables
- `parseNumeric(value)` - Parse numeric values from strings
- `selectors` - Common selector patterns

### Authentication
Tests automatically detect if authentication is required and log in using credentials from environment variables.

### Real Data
All tests use real API data and blockchain state. No mocked data is used to ensure tests reflect actual user experience.

### Debug Helpers
Many tests use `window.__ADD_LIQUIDITY_DEBUG` to access component state for detailed validation.

### Console Logs
Tests automatically dump console logs to files in `cypress/logs/` for debugging.

## Best Practices

1. **Always build before testing**: Tests run against preview build
2. **Use real test account**: Account should have balances in test assets
3. **No production data**: Use dedicated test account
4. **Review logs**: Check `cypress/logs/` for detailed execution logs
5. **Check videos**: Review `cypress/videos/` for visual debugging
6. **Check screenshots**: Failed tests save screenshots in `cypress/screenshots/`

## Troubleshooting

### Authentication Fails
- Check `.env` file has correct credentials
- Verify test account is valid and active
- Check password is set: `echo $LIQUIDITY_TEST_PASSWORD`

### Tests Timeout
- Increase timeout in test: `cy.get(selector, { timeout: 30000 })`
- Check network connectivity
- Verify Algorand network is accessible

### Slider Not Enabled
- Ensure pools are loaded: Check `__ADD_LIQUIDITY_DEBUG.state.pools`
- Ensure balances loaded: Check `__ADD_LIQUIDITY_DEBUG.state.balanceAsset`
- Wait longer: Add `cy.wait(3000)` before assertions

### Wrong Asset Prices
- Tests use real blockchain data
- Prices fluctuate naturally
- Use tolerance in assertions: `.to.be.closeTo(expected, tolerance)`

## Maintenance

### Adding New Tests
1. Create new test file: `cypress/e2e/clamm/XX-feature-name.cy.ts`
2. Import shared utilities: `import { ... } from './test-utils'`
3. Follow existing patterns for describe/it blocks
4. Use `clearTestState()` in `beforeEach`
5. Use `cy.dumpLogs()` in `afterEach`

### Updating Shared Utilities
Edit `test-utils.ts` and all tests will automatically use updated utilities.

### Updating Test Data
Tests use actual pool IDs and asset codes. Update URLs in tests if pools change.

## Contributing

When adding new tests:
1. Follow existing naming conventions
2. Add descriptive test names
3. Use proper assertions with messages
4. Add comments for complex logic
5. Ensure tests are independent
6. Clean up state in beforeEach/afterEach
