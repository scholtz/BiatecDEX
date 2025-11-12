# BiatecDEX Repository Instructions for GitHub Copilot

## Project Overview

BiatecDEX is a decentralized exchange (DEX) built on the Algorand blockchain, utilizing Automated Market Maker (AMM) smart contracts with a focus on Concentrated Liquidity AMM algorithms. This project is supported by the Algorand Foundation xGov Grants Program.

**Key Features:**

- Trader Dashboard for asset management and trading
- Liquidity Provider Dashboard for managing liquidity positions
- Asset opt-in functionality for Algorand Standard Assets (ASAs)
- Market depth visualization
- Multi-language support (i18n)

## Tech Stack

### Core Technologies

- **Frontend Framework:** Vue.js 3 with Composition API
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** TailwindCSS with PrimeVue components
- **State Management:** Pinia
- **Routing:** Vue Router
- **Blockchain SDK:** Algorand SDK (algosdk)
- **Testing:** Vitest for unit tests, Cypress for E2E tests

### Key Dependencies

- `algosdk`: ^3.5.2 - Algorand JavaScript SDK
- `biatec-concentrated-liquidity-amm`: ^0.9.34 - Custom AMM contracts
- `@txnlab/use-wallet-vue`: ^4.3.1 - Wallet integration
- `primevue`: ^4.4.1 - UI component library
- `vue-i18n`: ^11.1.12 - Internationalization

## Project Structure

```
src/
├── api/           # API integration code
├── assets/        # Static assets
├── components/    # Reusable Vue components
├── composables/   # Vue composition functions
├── i18n/          # Internationalization setup
├── interface/     # TypeScript interfaces
├── layouts/       # Layout components
├── locales/       # Translation files (en.json, sk.json, pl.json, hu.json)
├── router/        # Vue Router configuration
├── scripts/       # Utility scripts
├── service/       # Business logic services
├── stores/        # Pinia stores
├── types/         # TypeScript type definitions
└── views/         # Page components
    ├── AssetOptIn.vue
    ├── HomeView.vue
    ├── LiquidityProviderDashboard.vue
    ├── ManageLiquidity.vue
    ├── TraderDashboard.vue
    └── Settings/

cypress/
├── e2e/
│   ├── basic/
│   │   └── basic-load.cy.ts     # General app loading tests
│   ├── liquidity/
│   │   ├── liquidity-add.cy.ts      # Liquidity addition tests
│   │   ├── liquidity-golddao-add.cy.ts  # GoldDAO specific tests
│   │   └── route-overrides.cy.ts     # Route parameter validation
│   └── tsconfig.json
```

## Development Commands

### Setup

```bash
# Install dependencies (skip Cypress if network blocked)
CYPRESS_INSTALL_BINARY=0 npm install
```

### Development Workflow

```bash
# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview

# Type checking (recommended for code quality checks)
npm run type-check

# Format code
npm run format

# Run unit tests
npm run test:unit

# Run E2E tests (requires Cypress)
npm run test:e2e
```

**Note:** The lint command currently has configuration issues due to ESLint v9 migration. Use type-check and format for code quality.

## Coding Conventions

### Vue Components

- Use Vue 3 Composition API with `<script setup>` syntax
- Use TypeScript for type safety
- Follow single-file component (SFC) structure
- Use PrimeVue components for UI elements
- Implement proper prop types and emits

**Example:**

```vue
<script setup lang="ts">
import { ref, computed } from 'vue'

interface Props {
  title: string
  count?: number
}

const props = withDefaults(defineProps<Props>(), {
  count: 0
})

const emit = defineEmits<{
  update: [value: number]
}>()
</script>

<template>
  <div>
    <h2>{{ title }}</h2>
    <p>Count: {{ count }}</p>
  </div>
</template>
```

### TypeScript Guidelines

- Always define interfaces for component props
- Use type inference where possible
- Avoid `any` type; use `unknown` if type is truly unknown
- Define proper return types for functions
- Use enums for fixed value sets

### State Management

- Use Pinia stores for global state
- Keep component state local when possible
- Use composables for reusable logic
- Follow the Composition API patterns

### Styling

- Use TailwindCSS utility classes
- Leverage PrimeVue themes
- Avoid inline styles
- Use scoped styles when custom CSS is needed

### Table Formatting

- Numeric columns (prices, amounts, percentages, counts) should be right-aligned using `class="text-right"`
- The last column in tables should be right-aligned using `class="text-right"`
- Use consistent number formatting with `formatNumber()` helper for currencies and large numbers
- For USD values, use the `formatUsd()` helper or similar formatting utilities

### Internationalization

- All user-facing text must be internationalized
- Add translations to all locale files: `en.json` (English), `sk.json` (Slovak), `pl.json` (Polish), `hu.json` (Hungarian), `it.json` (Italian), `ru.json` (Russian)
- Use `$t('key.path')` in templates
- Use `t('key.path')` in script setup with `useI18n()`
- Update the copilot instructions to respect new language
- Base language is English; ensure all new keys are added there first

**Example:**

```vue
<script setup lang="ts">
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

const message = computed(() => t('common.welcome'))
</script>

<template>
  <h1>{{ $t('common.welcome') }}</h1>
</template>
```

## Algorand-Specific Guidelines

### Asset Management

- Always check if user has opted-in to assets before transactions
- Handle asset IDs as numbers (not strings)
- Use proper asset decimals for display formatting
- Implement proper error handling for blockchain transactions

### Wallet Integration

- Support multiple wallet providers (Pera, Defly, MyAlgo, WalletConnect)
- Handle wallet connection state properly
- Check network (mainnet/testnet) consistency
- Validate account balance before transactions

### Transaction Handling

- Use algosdk for transaction creation
- Sign transactions with user wallet
- Wait for transaction confirmation
- Handle transaction failures gracefully
- Display transaction IDs for user reference

## Testing Guidelines

### Unit Tests

- Place test files in `__tests__` directories
- Use Vitest with jsdom environment
- Test component behavior, not implementation
- Mock external dependencies (algosdk, API calls)
- Use `describe`, `it`, `expect` from Vitest

**Example:**

```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import MyComponent from '../MyComponent.vue'

describe('MyComponent', () => {
  it('renders correctly', () => {
    const wrapper = mount(MyComponent, {
      props: { title: 'Test' }
    })
    expect(wrapper.text()).toContain('Test')
  })
})
```

### E2E Tests

- **Framework:** Cypress with TypeScript
- **Test Organization:** Tests are organized by feature area in `cypress/e2e/` subfolders:
  - `basic/` - General/basic functionality tests
  - `liquidity/` - Liquidity provider and trading tests
- **Running Tests:**
  - Run all tests: `npm run cy:run`
  - Run single test file: `npm run cy:run -- cypress/e2e/{folder}/{filename}.cy.ts`
  - Run with UI: `npm run cypress:open`
- **Test Structure:**
  - Use `describe` blocks to group related tests
  - Use `beforeEach` hooks to clear state between tests (localStorage, debug variables)
  - Keep cookies for authentication persistence
  - Use meaningful test descriptions that explain the business value

**Environment Variables for Testing:**

Tests require actual user accounts with balances. Environment variables are automatically loaded from the `.env` file in the project root via `dotenv` package.

**Setup:**

1. Create a `.env` file in the project root (if it doesn't exist):

   ```bash
   LIQUIDITY_TEST_EMAIL=your-test-account@example.com
   LIQUIDITY_TEST_PASSWORD=your-secure-password
   ```

2. The `.env` file is gitignored - never commit it
3. Share credentials securely with team members (use secure channels like password managers)
4. `cypress.config.ts` automatically loads these variables using `dotenv.config()`

**Manual Override (optional):**

You can still override environment variables manually before running tests:

```powershell
# PowerShell
$env:LIQUIDITY_TEST_EMAIL="your-test-account@example.com"
$env:LIQUIDITY_TEST_PASSWORD="your-secure-password"

# Or in bash/zsh
export LIQUIDITY_TEST_EMAIL="your-test-account@example.com"
export LIQUIDITY_TEST_PASSWORD="your-secure-password"
```

This will take precedence over the `.env` file values.

**Test Account Requirements:**

- Must be a valid registered account in the system
- Should have balances in the assets being tested (ALGO, VOTE, etc.)
- Use a dedicated test account, not a production account
- Never commit credentials to the repository

**Key Testing Patterns:**

1. **Authentication Flow:**

   ```typescript
   const email = Cypress.env('LIQUIDITY_TEST_EMAIL') || 'test@biatec.io'
   const password: string = Cypress.env('LIQUIDITY_TEST_PASSWORD')

   if (!password) {
     throw new Error('LIQUIDITY_TEST_PASSWORD environment variable must be set')
   }

   // Wait for auth modal and fill credentials
   cy.get(selectors.emailInput).clear().type(email, { log: false })
   cy.get(selectors.passwordInput).clear().type(password, { log: false })
   cy.get(selectors.submitButton).click({ force: true })
   ```

2. **State Clearing Between Tests:**

   ```typescript
   beforeEach(() => {
     // Clear localStorage and debug variables between tests
     cy.clearLocalStorage()
     cy.window().then((win: any) => {
       // Clear any global debug variables
       if (win.__ADD_LIQUIDITY_DEBUG) delete win.__ADD_LIQUIDITY_DEBUG
       // ... other debug variables
     })
   })
   ```

3. **No Mocked Data:**
   - Tests use real API endpoints and real pool data
   - No `window.__BIATEC_E2E` mocking or fixture injection
   - SignalR connections work normally (no mocking)
   - All blockchain data comes from actual Algorand network

4. **Debug Helpers Usage:**
   - Tests can access `__ADD_LIQUIDITY_DEBUG` for component state inspection
   - Use `cy.window().its('__ADD_LIQUIDITY_DEBUG', { timeout: 20000 })` to wait for debug helpers
   - Debug helpers provide access to internal component state for validation

5. **Numeric Input Handling:**

   ```typescript
   const parseNumeric = (value: string | number | string[]) => {
     let s = String(Array.isArray(value) ? value.join('') : value)
       .replace(/\u00a0/g, '') // Remove non-breaking spaces
       .trim()
     // Handle European number formatting
     if (s.indexOf(',') >= 0 && s.indexOf('.') === -1) {
       s = s.replace(',', '.')
     }
     s = s.replace(/,(?=\d{3}(?:\D|$))/g, '') // Remove thousand separators
     return Number(s)
   }
   ```

6. **Route Parameter Testing:**
   - Test URL parameters are correctly applied to form state
   - Use `visitWithLocale()` helper for consistent locale setting
   - Validate that query parameters override default values

7. **Asset and Pool Validation:**
   - Use `AssetsService.getAsset()` for asset resolution
   - Validate pool data from `__ADD_LIQUIDITY_DEBUG.state.pools`
   - Test both asset order permutations (assetA/assetB vs assetB/assetA)

8. **Form Input Validation:**
   - Use `data-cy` attributes for reliable element selection
   - Test numeric inputs with tolerance for floating-point precision
   - Validate both UI display and internal component state

**Test Categories:**

- **Basic Tests:** Core application loading and navigation
- **Liquidity Tests:** Add/remove liquidity, pool management, route parameter handling
- **Authentication Tests:** Login flows, wallet integration

**Best Practices:**

- Use descriptive test names that explain business requirements
- Include timeout configurations for async operations
- Never mock external dependencies in E2E tests - use real APIs and data
- Use `cy.log()` for debugging complex test flows
- Keep tests focused on user-facing behavior, not implementation details
- Use shared helper functions for common operations (parsing, authentication, etc.)
- Always check environment variables are set before running tests that require authentication

### Debugging Cypress Tests

When troubleshooting Cypress test failures, especially those involving Vue component state and behavior:

**Console Logging Approaches:**

1. **Vue Component Debug Helpers:**
   - Use global debug objects like `__ADD_LIQUIDITY_DEBUG` to expose component state
   - Access via `cy.window().its('__ADD_LIQUIDITY_DEBUG')` in tests
   - Example: Check slider enablement with `debug.state?.singleSliderEnabled`

2. **Cypress Command Logging:**
   - Use `cy.log()` in test code for debugging (appears in Cypress runner)
   - Console logs from Vue components are automatically captured to files via `cypress/support/e2e.ts`
   - Log files are written to `cypress/logs/` directory with format: `cypress-{spec-path}-{timestamp}.log`
   - Use `afterEach(() => { cy.dumpLogs() })` to export logs at the end of each test

3. **Log File Capture System:**
   - Console interception is set up in `cypress/support/e2e.ts` using `Cypress.on('window:before:load')`
   - Logs are buffered in `window.__cypressLogs` array
   - Custom `cy.dumpLogs()` command exports logs via `cy.task('log')` in `cypress.config.ts`
   - Log files include timestamps, log types (LOG/ERROR/WARN), and messages
   - To view logs: `Get-Content "cypress\logs\cypress-e2e-{spec-name}-*.log" | Select-String "pattern"`

4. **Alternative Debugging Methods:**
   - **Screenshot on failure:** Cypress automatically captures screenshots in `cypress/screenshots/`
   - **Video recording:** Videos saved in `cypress/videos/` for step-by-step replay
   - **Interactive debugging:** Use `cy.pause()` or `cy.debug()` in test code
   - **Browser dev tools:** Run tests with `--headed` flag for browser inspection

5. **Common Debug Patterns:**

   ```typescript
   // Check component state
   cy.window().then((win) => {
     console.log('Component state:', win.__ADD_LIQUIDITY_DEBUG?.state)
   })

   // Log test progress
   cy.log('Starting pool validation...')

   // Dump logs at end of test
   afterEach(() => {
     cy.dumpLogs()
   })
   ```

**Troubleshooting Test Failures:**

- **Pool Loading Issues:** Check if `loadPools()` is called in component initialization; verify E2E fixtures with `window.__BIATEC_E2E`
- **Balance Loading:** Verify `loadBalances()` completes before slider recalculation
- **Slider State:** Ensure `recalculateSingleDepositBounds()` runs after async operations
- **Authentication:** Set `LIQUIDITY_TEST_PASSWORD` environment variable
- **Timing Issues:** Add appropriate `cy.wait()` calls for async operations
- **Route Parameters:** When using E2E fixtures (`e2eLocked = true`), ensure `applyRouteOverrides()` applies non-price parameters (lpFee, shape) before returning early
- **Build Updates:** After changing Vue components, run `npm run build` before Cypress tests (tests run against preview build on port 4173)

## Common Tasks

### Adding a New Page

1. Create Vue component in `src/views/`
2. Add route in `src/router/index.ts`
3. Add translations in `src/locales/*.json`
4. Update navigation if needed

### Adding a New Component

1. Create component in appropriate `src/components/` subdirectory
2. Use TypeScript interfaces for props
3. Add unit tests in `__tests__` directory
4. Document component usage if complex

### Updating Table Headers with Tooltips

Use tooltips for better UX so that even non crypto savvy users understand the meaning of the data in the application.

When adding tooltips to PrimeVue DataTable columns, follow this pattern to avoid duplicate header text:

**❌ Incorrect (causes duplicate text):**

```vue
<Column :header="t('table.header')" sortable>
  <template #header>
    <span v-tooltip.top="t('tooltips.table.header')">{{ t('table.header') }}</span>
  </template>
</Column>
```

**✅ Correct (single header text with tooltip):**

```vue
<Column sortable>
  <template #header>
    <span v-tooltip.top="t('tooltips.table.header')">{{ t('table.header') }}</span>
  </template>
</Column>
```

**Steps to add tooltips to table headers:**

1. **Remove the `:header` prop** from the `Column` component
2. **Add `<template #header>`** with a `<span>` containing:
   - `v-tooltip.top` directive with the tooltip translation key
   - The header text translation
3. **Add tooltip translations** to all locale files (`en.json`, `sk.json`, `pl.json`, `hu.json`) under the `tooltips.tables` section
4. **Test the implementation** by running `npm run type-check` and checking the UI

**Example:**

```vue
<!-- Before -->
<Column :header="t('views.traderDashboard.table.asset')" sortable>
  <template #body="{ data }">
    {{ data.displayName }}
  </template>
</Column>

<!-- After -->
<Column sortable>
  <template #header>
    <span v-tooltip.top="t('tooltips.tables.assetId')">{{ t('views.traderDashboard.table.asset') }}</span>
  </template>
  <template #body="{ data }">
    {{ data.displayName }}
  </template>
</Column>
```

**Tooltip Translation Structure:**

```json
{
  "tooltips": {
    "tables": {
      "assetId": "Unique identifier for this asset on the Algorand blockchain",
      "balance": "Amount of this asset you currently own",
      "usdValue": "Current USD value of your holdings",
      "actions": "Available actions for this item"
    }
  }
}
```

### Working with Algorand Assets

1. Use `algosdk` for all blockchain interactions
2. Check user opt-in status before operations
3. Handle asset decimals properly (typically 6 decimals)
4. Validate asset IDs and amounts
5. Provide clear error messages

### Updating Translations

1. Add keys to `src/locales/en.json` (primary/English)
2. Add corresponding translations to `src/locales/sk.json` (Slovak), `src/locales/pl.json` (Polish), `src/locales/hu.json` (Hungarian), `src/locales/it.json` (Italian), and `src/locales/ru.json` (Russian)
3. Use nested keys for organization (e.g., `trader.dashboard.title`)
4. Keep keys descriptive and semantic

## Performance Considerations

- Use lazy loading for routes (already configured)
- Avoid unnecessary re-renders with proper reactive patterns
- Debounce user inputs that trigger API calls
- Use computed properties for derived state
- Optimize large lists with virtual scrolling if needed

## Known Issues and Workarounds

- **ESLint Configuration:** The project uses ESLint v9 which requires flat config format (`eslint.config.js`), but currently has `.eslintrc.cjs`. The lint command may fail. To work around this:
  - The project can continue to use type-check and build for code quality
  - Manual linting can be done with IDE extensions
  - Consider migrating to `eslint.config.js` following the [migration guide](https://eslint.org/docs/latest/use/configure/migration-guide)
- **Cypress installation:** May fail in restricted networks. Use `CYPRESS_INSTALL_BINARY=0 npm install` to skip.
- **Timer-based refreshes:** Implement timers carefully to avoid page blinking; use reactive state updates instead of full re-renders.

## Security Best Practices

- Never commit private keys or mnemonics
- Validate all user inputs
- Sanitize data before displaying
- Use HTTPS for all API calls
- Follow Algorand security best practices
- Audit smart contract interactions

## Documentation

- Update README.md for major features
- Document complex algorithms inline
- With every prompt make sure the copilot instructions are compliant with it and update it if needed
- Add JSDoc comments for exported functions
- Update debugging and testing sections based on lessons learned from test failures

## Domain-Specific Knowledge

### Liquidity Provider Operations

- Users can add/remove liquidity to/from pools
- Positions have min/max tick ranges for concentrated liquidity
- Fee collection happens automatically
- Track impermanent loss for user awareness

### Trading Operations

- Support for asset swaps through AMM pools
- Calculate price impact before trades
- Display slippage tolerance
- Show estimated output amounts

### Market Depth

- Visualize liquidity distribution across price ranges
- Update in real-time or with configurable refresh intervals
- Handle empty/sparse liquidity gracefully

## Build and Deployment

- **Build target:** esnext (modern browsers)
- **Output:** Static files in `dist/` directory
- **Compression:** Gzip compression enabled
- **Base URL:** Configured via `import.meta.env.BASE_URL`

## Getting Help

- Check existing code for patterns and examples
- Refer to Vue.js, Algorand SDK, and PrimeVue documentation
- Review test files for component usage examples
- Check locale files for existing translation patterns
