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
- `@txnlab/use-wallet-vue`: ^5 - Wallet integration (adapters are separate packages, registered in `src/scripts/algo/walletRegistry.ts`; auth via `algorand-authentication-component-vue` ^3, Biatec Wallet via `biatec-wallet-use-wallet-client`)
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
# Install dependencies (package manager is pnpm — see "packageManager" in package.json;
# skip Cypress if network blocked)
CYPRESS_INSTALL_BINARY=0 pnpm install
```

### Development Workflow

```bash
# Start development server
pnpm run dev

# Build for production
pnpm run build

# Preview production build
pnpm run preview

# Type checking (recommended for code quality checks)
pnpm run type-check

# Format code
pnpm run format

# Run unit tests
pnpm run test:unit

# Run E2E tests (requires Cypress)
pnpm run test:e2e
```

**Note:** Linting uses ESLint flat config (`eslint.config.js`). `pnpm run lint` must pass with 0 errors; `@typescript-eslint/no-explicit-any` is an error (see "Total type safety" above) — `src/api/` (generated) is exempt via the ESLint ignores list.

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
- **Total type safety**: never use `any` or `unknown` unless it is genuinely unavoidable (e.g. a third-party callback signature with no typed alternative). When it truly can't be avoided, add a one-line comment directly above the usage explaining why the proper type couldn't be used. The generated client in `src/api/` (Orval output) is exempt from this rule.
- Define proper return types for functions
- Use enums for fixed value sets

### State Management

- Use Pinia stores for global state
- Keep component state local when possible
- Use composables for reusable logic
- Follow the Composition API patterns

### Anti-freeze rules (browser RESULT_CODE_HUNG) — MANDATORY

The app has frozen users' tabs twice: once through an infinite router redirect loop
(the asset-pair ordering guard redirected for BOTH orderings of a pair), and once
through a reactive watcher cascade (multiple sync functions each assigning a fresh
`store.state.pair` object on every run). In production builds Vue has NO recursive
update detection — such loops silently hang the main thread until the browser kills
the tab. Every change must respect these rules:

1. **Router guards that redirect must be provably convergent.** Any comparison that
   decides a redirect (e.g. `AssetsService.selectPrimaryAsset`) must be antisymmetric:
   it may never answer "redirect" for both orderings of the same input, and equal
   inputs must never redirect. EVERY redirect issued from a guard must pass
   `routerRedirectBreaker.allowRedirect(label)` from
   `src/router/redirectCircuitBreaker.ts`; when the breaker refuses, let the
   navigation through unmodified (a non-canonical URL beats a dead tab).
2. **Never assign `store.state.pair` (or any shared watched object) directly.** Go
   through `setPairIfChanged` (`src/scripts/state/setPairIfChanged.ts`), which only
   writes when the pair differs semantically. A fresh-but-identical object is a
   reactive change: it re-fires every watcher of that object across all mounted
   components. Apply the same compare-before-write pattern to any new shared state.
3. **Watchers must not unconditionally write state they (transitively) watch.**
   Guard writes with equality checks or `isApplying*`-style re-entrancy flags (see
   AddLiquidity's `isApplyingRouteRange` / `isSyncingSingleSlider`), and make sure
   each pass converges — the value a watcher writes must be a fixed point of the
   next pass, not an alternating correction.
4. **Every `while` loop and computed-step walk needs an explicit iteration cap and a
   progress check.** Price/tick grids step by derived increments that can compute to
   0 or NaN (unpriced pools, extreme magnitudes) — the loop must break, not spin.
   Reference implementations: the 1000-bucket cap in
   `src/scripts/asset/calculateDistribution.ts`, `maxCount` + `snapped < boundary`
   progress checks in `src/scripts/clamm/poolTvlDistribution.ts`. Add a termination
   unit test with degenerate inputs (0, NaN, from === to, from > to, 1e±15) for any
   new loop — see `calculateDistribution.termination.test.ts`.
5. **Keep the hang regression suite green and growing.**
   `playwright/liquidity-pair-redirect.spec.ts` instruments `history.pushState` /
   `replaceState` and fails when a navigation performs unbounded history updates.
   When you touch routing, pair ordering, network switching, or watcher-based pair
   sync, add the new scenario to that spec.

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
- Add translations to all locale files: `en.json` (English), `sk.json` (Slovak), `pl.json` (Polish), `hu.json` (Hungarian), `it.json` (Italian), `ru.json` (Russian), `zh.json` (Chinese), `ko.json` (Korean), `de.json` (German), `es.json` (Spanish)
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
  - Run all tests: `pnpm run cy:run`
  - Run single test file: `pnpm run cy:run cypress/e2e/{folder}/{filename}.cy.ts`
  - Run with UI: `pnpm run cypress:open`
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
- **Build Updates:** After changing Vue components, run `pnpm run build` before Cypress tests (tests run against preview build on port 4173)

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

### On-site Help system

The in-app help center lives at `/help` (index) and `/help/:useCaseSlug` (detail),
opened via the question-mark icon in `PageHeader.vue` (next to the settings cog).

- **Use-case catalog**: `src/data/helpUseCases.ts` — one entry per feature with
  `slug`, `icon`, `category`, `screenshotRoute` and optional `requiresAuthBypass`.
  This is the single source of truth; the slug also keys the i18n strings and the
  screenshot file name.
- **i18n content** lives under `views.help` in every locale (chrome, `categories`,
  and `useCases.<slug>.{title,summary,intro,steps,tip}`; `steps` is one
  newline-separated string). Do **not** hand-edit the 10 locale files for help —
  edit `scripts/generate-help-locales.mjs` and run `pnpm run generate:help-locales`.
  It writes identical key structure to all locales; titles/summaries/chrome are
  translated per language, the longer bodies are shared from English (replace with
  real translations over time). Adding a use case = add it to `helpUseCases.ts`,
  the `slugs` list + `en.useCases` (and ideally each language) in the generator,
  and the screenshot generator's `useCases` list.
- **Localized screenshots**: `pnpm run generate:help-screenshots` (Playwright) walks
  every locale × use case, captures `screenshotRoute` and writes
  `public/help-screenshots/<locale>/<slug>.png`, shown on the detail page. Needs a
  running app — pass `PLAYWRIGHT_BASE_URL`; supports `--lang`, `--slug`, `--full`,
  `SETTLE_MS`. The detail page hides the image until the file exists.

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
4. **Test the implementation** by running `pnpm run type-check` and checking the UI

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
2. Add corresponding translations to `src/locales/sk.json` (Slovak), `src/locales/pl.json` (Polish), `src/locales/hu.json` (Hungarian), `src/locales/it.json` (Italian), `src/locales/ru.json` (Russian), and `src/locales/zh.json` (Chinese)
3. Use nested keys for organization (e.g., `trader.dashboard.title`)
4. Keep keys descriptive and semantic

## Performance Considerations

- Use lazy loading for routes (already configured)
- Avoid unnecessary re-renders with proper reactive patterns
- Debounce user inputs that trigger API calls
- Use computed properties for derived state
- Optimize large lists with virtual scrolling if needed

## Known Issues and Workarounds

- **ESLint Configuration:** Flat config in `eslint.config.js` (ESLint 10). `pnpm run lint` runs with `--fix` and must end with 0 errors. `no-explicit-any` is an error (`src/api/` exempt); Cypress timing rules are disabled for `cypress/**` on purpose.
- **Cypress installation:** May fail in restricted networks. Use `CYPRESS_INSTALL_BINARY=0 pnpm install` to skip.
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

### Rule: prefer the trade reporter API over on-chain box iteration (with fallback)

Any view that needs the list of pools/assets or per-pool state (reserves, price range,
fee, LP token id) must load it from the AVMTradeReporter trade API first, and only fall
back to the slow on-chain pattern (`getPools()` box iteration + per-pool
`BiatecClammPoolClient.status()` calls) when the trade API is unavailable. The DEX must
keep working with basic features when the trade reporter is down.

- **Fast path helpers** live in `service/tradeApi.ts`: `fetchBiatecPools(env, { assetIdA?,
assetIdB?, size? })` calls `GET api/pool?protocol=Biatec` (pair filters match either
  orientation server-side) and `mapBiatecPoolToFullConfig()` converts a reporter `Pool`
  into the on-chain `FullConfig` shape (`pMin`/`pMax`/`lpFee` are real decimals rescaled
  to the contract's 1e9 fixed point; `a`/`b` are already 1e9-scaled balances).
- **Fallback triggers**: `isTradeApiConfigured(env)` false for the active network, the
  REST call throwing, or an empty result (indexer lag — a just-created pool may only be
  visible on-chain). The on-chain code path must remain intact and working standalone.
- **Where applied**: `AllAssetsView.vue` (asset stats, see next section),
  `components/LiquidityComponents/MyLiquidity.vue` (`loadPoolsFromTradeApi()` builds the
  pair's pool rows from one request instead of a `status()` call per pool), and
  `views/LiquidityProviderDashboard.vue` (one `fetchBiatecPools()` call replaces box
  iteration per wallet asset; per-pool `status()` remains only for pools whose LP token
  the wallet actually holds, since the reporter does not expose LP supply).
- **Do not** use reporter-derived pool configs for transaction construction or exact
  pool matching (e.g. AddLiquidity's pool lookup before creating/adding to a pool) —
  those must read on-chain state, as float round-tripping of `pMin`/`pMax` cannot be
  trusted for identity matching. For the same reason the MyLiquidity fast path does not
  populate the `store.state.pools` cache.

### Rule: pair-driven asset selection

Asset selectors across the app only offer assets that already have an existing Biatec
pool with the other side of the pair; picking an arbitrary unpooled asset is only
possible through the "Create pool" flow — and even there, continuing with a pair that
already has a pool redirects to that pool's Add Liquidity screen instead of creating a
duplicate.

- **`src/scripts/clamm/pairGraph.ts`** — pure, unit-tested module: `buildPairGraph(pools)`
  builds a `Map<assetId, Map<otherAssetId, PairEdge>>` (both orientations inserted per
  pool), and `getAssetsWithPools`, `getAllPairs`, `getPairedAssets`, `hasPair`,
  `getMostLiquidPool`, `getMostLiquidPoolForPair` read it.
  - `getAllPairs` returns every distinct pair exactly once (collapsing the two stored
    orientations back to one entry), sorted by descending aggregated TVL — feeds
    AssetInfo's single pair combobox.
  - `getMostLiquidPool(graph, assetId)` ranks every pair `assetId` takes part in by that
    pair's **aggregated** USD TVL (the sum of every pool of the pair — `PairEdge.tvlUsd`
    — not any single pool's TVL, so a pair split across several shallow pools can outrank
    one deep-but-lower-total pair), then pool count, then lower other-asset id / pool app
    id, so the result is deterministic regardless of fetch order. Once the most liquid
    pair is chosen, the single most liquid pool within it is returned (callers need one
    concrete `ammAppId`).
  - `getMostLiquidPoolForPair(graph, a, b)` is the equivalent for a pair whose BOTH sides
    are already known (e.g. the LP dashboard's selector + row asset) — ties break by the
    lower pool app id.
  - `PairPool.appId` is `bigint`, matching the app-id convention above — never narrow it
    to `number` (loses precision above `Number.MAX_SAFE_INTEGER` and can route to the
    wrong pool).
- **`src/composables/usePoolPairs()`** — the reactive wrapper every selector calls.
  Fetches the full pool list for the active network following the trade-reporter-first
  rule above (`fetchBiatecPools(env)` with no asset filter, on-chain
  `getPools({ assetId: 0n, poolProviderAppId })` fallback) and builds the graph. State is
  cached per network at module scope (`cache`/`inFlight` maps) so concurrently-mounted
  selectors share one fetch instead of each re-fetching the full pool list; the cache
  entry is mutated in place and never deleted, so a concurrent reader's reference is
  never orphaned mid-load. `invalidate()` forces a fresh fetch (bypassing the in-flight
  dedup) — wired into all three "pool created" success paths in `AddLiquidity.vue` so a
  newly created pair appears in every selector without a page reload. `loading`/`loaded`
  let callers fall back to "show everything" until the first load for the network
  completes, so a slow or failed pool fetch never hides an option that should be there.
- **`src/scripts/asset/mergeHeldAndPooledOptions.ts`** — pure helper used by both
  dashboards' selectors: merges the wallet's held-asset options with every OTHER
  pooled-but-unheld asset (so a user can start a position in something they don't hold
  yet), held first then pooled-only, each group separately sorted alphabetically (a flat
  sort would destroy the held-first grouping).
- **`AssetInfo.vue`** (shared by the trade and liquidity screens) — **one** combobox over
  `usePoolPairs().allPairs` (most liquid pair first) instead of two independent
  asset/currency `<Select>`s; picking a pair option calls the existing
  `navigateToAssetPair(assetCode, currencyCode)` with both sides at once. Each pair
  option's base/quote ordering reuses `AssetsService.selectPrimaryAsset` so it always
  matches the router's own pair-ordering guard; the currently active pair is shown via
  the Select's `#value` slot even on the rare tick where it isn't yet in `allPairs` (e.g.
  immediately after creating a brand-new pool, before `invalidate()`'s refetch lands).
- **Applied in**: `TraderDashboard.vue` (from-asset selector options via
  `mergeHeldAndPooledOptions` + table rows filtered to `pairedAssets(selected)`, both the
  row swap action and the Explore Assets swap/add-liquidity actions route via
  `mostLiquidPool()` instead of a static default quote), `LiquidityProviderDashboard.vue`
  (same selector merge; asset table filtered, selected asset's own row kept visible; its
  "add liquidity" row action routes via `mostLiquidPoolForPair()` for the two
  already-chosen assets), `AssetInfo.vue` (above), and `AllAssetsView.vue`'s "add
  liquidity" row action (`onAddLiquidity` resolves `mostLiquidPool(assetId)` and routes
  straight to that pool's `add-liquidity` URL; falls back to opening
  `CreatePoolDialog.vue` pre-filled with that asset as the base when it has no pool yet,
  via the dialog's `initialBaseAssetId` prop) and its `onCreatePool` handler (redirects to
  the existing pool via `mostLiquidPoolForPair` instead of creating a duplicate when the
  chosen pair already has one).
- **Not covered**: the Liquidity Provider dashboard's manual withdraw action is
  unaffected by the most-liquid-pool routing (it looks up the specific existing position).

### Explore Assets page — server-computed asset stats + fallback

`views/AllAssetsView.vue` has two data paths for its main table:

1. **Primary (live) path**: `service/tradeApi.ts`'s `fetchAssetStats(env, { protocol: 'Biatec',
sortBy: 'TVLUSD', direction: 'Desc' })` calls the AVMTradeReporter REST endpoint
   `GET api/asset-stat` (same base URL and ARC-14 auth interceptor as `fetchTradeAssets` —
   `api/axios-instance.ts` attaches the `Authorization` header automatically, nothing extra to
   do). Rows are mapped via `mapAssetStatToRow()`. On mount the view also registers a SignalR
   filter (`signalrService.registerFilter(key, filter)`, `filter.RecentAssetStats = true` on
   `types/SubscriptionFilter.ts`) and listens for the `AssetStat` hub event
   (`signalrService.onAssetStatReceived`), upserting the matching row by `assetId` — this
   **replaces** the old 20-second `setInterval` polling for this view; only the manual refresh
   button re-triggers the initial REST fetch now.
2. **Fallback (on-chain) path**: if the REST call throws or returns an empty array (network/auth
   error, or `isTradeApiConfigured(env)` is false for the active network), the view falls back to
   the original on-chain aggregation — `loadAllAssets()` walking every pool via
   `BiatecClammPoolClient.status()`, `loadAllPriceData()`/`loadPriceDataForAsset()` computing
   VWAP/volume/fees via `computeWeightedPeriods`. This code path is **unchanged** and must keep
   working standalone. When active, a warning `Message` (`state.liveDataDegraded`, i18n key
   `views.allAssets.liveDataDegraded`) tells the user data may be slower to update.

`AssetStat` is the **Orval-generated** type from `@/api/models` (the former hand-maintained
`types/AssetStat.ts` was deleted once the deployed testnet swagger exposed `api/asset-stat`;
all its importers — `AllAssetsView.vue`, `service/tradeApi.ts`, `service/signalrService.ts`,
`composables/useLiveAssetCatalog.ts` — now use the generated model). Casing verified against the
live spec: a trailing all-caps acronym is fully lowercased (`TVLUSD` → `tvlusd`), while a broken
run keeps its last capital (`TVLOtherUSD` → `tvlOtherUSD`, `PriceUSD` → `priceUSD`). Because
Orval emits every field as optional, `mapAssetStatToRow()` returns `null` when `assetId` is
missing (callers filter) and defaults numerics with `?? 0`/`?? null`.

**TVL split (Other Asset TVL column)**: backend `AssetStat.TVLUSD` is the asset's _own_ side of
its pools' TVL and `TVLOtherUSD` is the _paired_ side — both summed in AVMTradeReporter's
`AssetStatsService` from per-pool `TotalTVLAssetAInUSD`/`TotalTVLAssetBInUSD`, recomputed every
~120 s by `AssetStatsBackgroundService`. The row's Total TVL is the sum of both; `otherAssetTvl`
falls back to 0 against backends that predate the field (mainnet deployments lag testnet — check
a deployment's public `/swagger/v1/swagger.json` to see which fields it actually serves; the
`/api/*` endpoints need ARC-0014 auth, so plain curl returns 401).

**Orval input is the testnet spec** (`orval.config.ts` → `api.testnet.scan.biatec.io`), precisely
because testnet runs the newest backend build; the runtime base URL stays per-network via
`service/tradeApi.ts`. After `pnpm run generate:api`, run Prettier over `src/api/**` — raw Orval
output is semicolon-styled and otherwise swamps the diff with formatting churn.

**Configurable columns / breakpoint-default pattern** (intended to be reused by other tables):
a `ColumnDef[]` array in `AllAssetsView.vue` (`id`, `labelKey`, `defaultBreakpoints:
Breakpoint[]`) declares, per column, which of this project's Tailwind breakpoints
(`composables/useBreakpoint.ts` — `sm/md/lg/xl/2xl`, default Tailwind CSS 4 `screens`, debounced
`window.innerWidth` resize listener) show it by default. A PrimeVue `MultiSelect` next to the
refresh button lets the user override visibility; `<Column v-if="isColumnVisible(id)">` gates
each column's rendering (the table stayed static `<Column>` tags rather than a fully dynamic
columns array, to keep the diff minimal). Until the user makes an explicit choice (touches the
column picker or changes the `sortMode="multiple"` DataTable's sort), visible columns
**auto-adjust** to the current breakpoint on resize — e.g. fewer columns on a laptop screen, more
on a 4K monitor — without persisting anything. The moment the user makes an explicit choice, a
single `localStorage` key (`biatecdex.assetsTable.prefs`, JSON
`{columns: string[], sortField, sortOrder}`) is written and from then on wins over breakpoint
auto-switching.

### Pool liquidity depth chart (TVL per tick)

`components/LiquidityComponents/PoolsLiquidityChart.vue` renders one bar per price tick
(height = total TVL, normalized), colored green if a Biatec CLAMM pool covers that tick
and orange if only constant-product liquidity (or nothing) does, sitting above
`MyLiquidity` in `ManageLiquidity.vue`. Chart.js's built-in legend can't express a
single dataset with per-bar categorical color, so there's a small custom HTML swatch
key instead (`legend: { display: false }` in `chartOptions`). The math lives in
`scripts/clamm/poolTvlDistribution.ts` (unit-tested in `__tests__/poolTvlDistribution.test.ts`):

- Every pool — constant product (`x*y=k`), concentrated liquidity, or stable swap — is
  reduced to one model: liquidity `L = sqrt(virtualAmountA * virtualAmountB)` active over
  an effective price range, derived from real reserves so it collapses to `(0, Infinity)`
  for constant product and recovers `[pMin, pMax]` for concentrated pools. Standard
  Uniswap-v3 segment formulas (`amountsInPriceRange`) then telescope exactly onto the
  real reserves regardless of how finely the range is bucketed. A bucket's `concentrated`
  total (nonzero ⇒ green) still tracks CLAMM-only TVL internally even though the bar
  itself now shows the combined `total`.
- Bar heights are **normalized to "TVL per nominal tick"** (`bucketNormalizationScale`),
  not raw per-bucket TVL — the canonical grid quantizes bin widths (the log10 rule
  rounds the tick to one significant digit, so the relative width steps between ≈7 %
  and ≈14 % at `normal`, and `wide` bins are 1/2/5 steps), so raw bucket TVL of a smooth
  pool saw-tooths. Don't remove this normalization; tooltips show the exact (non-normalized)
  TVL for the hovered range.
- **Boundaries come from the npm package's canonical grid** (`tickGridBoundaries`,
  `prevTickGridBoundary`/`nextTickGridBoundary` in `poolTvlDistribution.ts`) — the same
  absolute grid `scripts/asset/calculateDistribution.ts` builds Add Liquidity's bins on, so
  the chart's ticks and the pool bounds the form creates are identical by construction
  (see the tick section of the frontend CLAUDE.md). The grid does not depend on where a
  walk starts; never rebuild it with a local "fit then add the local tick" chain.
- **The tick grid covers Add Liquidity's window and is centered on the mid price by tick
  count** (`buildTickBoundariesAroundPrice` with the `visibleFrom`/`visibleTo` options =
  the form's `state.minPrice`/`state.maxPrice`, shared via `store.state.liquidityGridWindow`;
  the derived `midPrice * / visibleRangeFactor(precision)` from
  `scripts/clamm/visibleRangeFactor.ts` — wide=0.05, normal=0.2, narrow=0.8 — is only the
  fallback when the form isn't mounted). The window decides only how much of the grid is
  shown; the bucket containing the mid price is then centered by **count**: the shorter
  side is extended past the window edge by stepping to the previous/next canonical
  boundary, and only if the downward extension runs out of positive boundaries is the
  longer side trimmed instead. Equal counts are guaranteed; nominal spans per side differ
  (log ticks widen with price).
- Fetches pools via `GET /api/pool?assetIdA=&assetIdB=` (matches both orientations in one
  call) and subscribes to live `Pool` updates over SignalR.
- Drag-to-select maps pointer position to bucket index via linear interpolation over
  `chart.chartArea` directly (`bucketIndexFromEvent`), not `chart.scales.x.getValueForPixel`
  — with ~100+ narrow-tick buckets the scale-based lookup was unreliable. If touching
  this again, keep it chartArea-based rather than reintroducing a Chart.js scale API
  dependency.
- **Wall ticks**: wall pools (`pMin === pMax`, single-price orders) whose price sits
  exactly on a grid boundary become standalone zero-width buckets (`TvlBucket.isWall`,
  `from === to`) inserted between the regular ticks; walls strictly inside a bucket stay
  aggregated into that bucket as before. Rendered as a **second stacked dataset** (both
  axes `stacked: true` so each bucket still draws one centered bar) with a thinner bar
  (`barPercentage: 0.3`) and its own blue (`tickColors.wall`); wall bars show raw TVL
  (zero-width ⇒ `bucketNormalizationScale` doesn't apply). The tooltip `filter` hides
  the other dataset's zero entry. Clicking a single wall tick publishes
  `liquidityPriceRange` with `min === max` (the wall-selection encoding, see below).

### Cross-panel sync between the depth chart and Add Liquidity

`ManageLiquidity.vue` mounts the depth chart and `AddLiquidity.vue` as same-page
siblings. Three store fields on `useAppStore()` (`liquidityTickPrecision`,
`liquidityPriceRange`, `liquidityGridWindow`) are the sync channel — **not** the
`low`/`high` route query (that remains a separate, one-way deep-link pin used by "Add
liquidity" buttons elsewhere that navigate to a _new_ page load, e.g. `MyLiquidity.vue`'s
`buildAddLiquidityLink`). Pattern for every field: always assign a **new** object/value
to the store field (never mutate a nested property) — `state` is `shallowReactive`, so
only top-level reassignment is tracked.

- **Tick width + LP fee live in the route** (`?tick=wide|normal|narrow&lpFee=1000000`) so a
  copied URL restores both for every panel at once. `composables/useLiquiditySettingsRoute.ts`
  (called once in `ManageLiquidity.vue`, gated on `routesReady`) syncs route <-> store in both
  directions with compare-before-write: a valid param wins over the store (the tick is stamped
  with the current pair so `resolvePrecisionChoice` keeps it), and the effective settings are
  written back with `router.replace` (no history entries). The tick is only written once it was
  resolved/chosen for the pair on screen, and is dropped from the URL when the pair changes.
  All query writes go through `scripts/state/routeQueryWriter.ts` (merges same-tick writes -
  two `router.replace` calls from a stale `route.query` used to drop each other's param).
  Panels: both read/write `store.state.liquidityTickPrecision` (numeric precision, see the tick
  section above) via a `computed` getter/setter (chart) and a `watch` calling
  `applyTickPrecision` (AddLiquidity); the LP fee is `store.state.liquidityLpFee` (bigint,
  scaled 1e9), edited in AddLiquidity and highlighted in the Liquidity pools table.
  **AddLiquidity publishes every `state.precision` change to the store** (`watch` on
  `state.precision`) - `applyPoolRangeShape` (opening `.../<ammAppId>/add`) used to set it
  directly, leaving the depth chart on a different width. An explicit `?tick=` wins over the
  pool-range suggestion there. Specs: `playwright/liquidity-page-sync.spec.ts`,
  `src/scripts/state/__tests__/{liquiditySettingsRoute,routeQueryWriter}.test.ts`.
- **Price range**: AddLiquidity publishes its settled `[minPriceTrade, maxPriceTrade]`
  outward via a `watch` guarded by `isApplyingRouteRange` (skips echoing back a chart
  selection) and a value-equality check against the current store value (skips
  no-op writes). The chart reads it to highlight overlapping bars when not actively
  dragging, and writes it on drag-select; AddLiquidity's inbound `watch` on the store
  field routes through the **existing** `pendingRouteRange` / `applyRouteBoundsIfReady`
  machinery (see below) so it gets the same tick-snapping as a route-query pin, deduped
  by value equality to break the outward/inward ping-pong.
  **`min === max` encodes a wall selection** (a wall-tick click on the chart, or the
  wall shape publishing outward): AddLiquidity's inbound watch handles it via
  `applyWallSelection` — switches to the `wall` shape, clears any pin, and drives the
  wall shape's own controls (slider index + `minPriceTrade`) directly. Do NOT feed
  `low === high` into `applyRouteBoundsIfReady`: the pin machinery is range-only, and a
  degenerate range leaves `state.prices`/`minPriceTrade`/`maxPriceTrade` mutually
  inconsistent so the snap + enforce watchers oscillate indefinitely. An inbound real
  range while the wall shape is active switches the shape back to `focused`; the wall
  shape's outward publish is `{ min: minPriceTrade, max: minPriceTrade }`.
  The **route query** is the other way `low === high` can arrive (a wall pool opened
  from the pools table: `?shape=wall&low=1&high=1`) - that exact deep link froze the tab
  in production once (RESULT_CODE_HUNG). `applyRouteBoundsIfReady` therefore detects
  `low === high` up front and hands off to `applyWallSelection` instead of pinning
  (staying pending until the distribution exists, and latching `ticksCalculated` so
  `setSliderAndTick` does not re-center over the wall price). Regression spec:
  `playwright/add-liquidity-wall-deeplink.spec.ts` (drops `window.__BIATEC_E2E` after
  the panel mounts so the price watchers take the real, snapping code path).
- **Grid window**: AddLiquidity publishes `{ visibleFrom: state.minPrice, visibleTo:
state.maxPrice, midPrice: state.midPrice }` (one-way, outward only, one atomic
  object) to `store.state.liquidityGridWindow`. The chart uses `visibleFrom`/`visibleTo`
  as its window and `midPrice` as the center to balance tick counts around, so both
  panels show the same extent. The grid itself is canonical (absolute boundaries from the
  shared package), so a window mismatch can only change _how much_ of the grid is shown,
  never _where_ its boundaries fall. Falls back to the chart's own reference price only
  when Add Liquidity hasn't published yet (transient load state / remove-swap routes
  where the form isn't mounted).

### Default tick width

Add Liquidity defaults to the width holding the most liquidity for the pair
(`mostLiquidTickType` over `state.tickTypeStats`). **Wall pools count too**
(`classifyWallPrice`, `scripts/clamm/wallTickType.ts`: widest width whose grid has a boundary at
the wall price) - GoldDAO/USD's liquidity is one wall at price 1.0, which used to be ignored.
If the stats arrive after the ~800 ms derivation window the fallback width is *provisional*
(`precisionIsProvisional`) and is replaced when they land - unless a `?tick=`, a pool-range link
(`applyPoolRangeShape`) or a user/chart pick already claimed it. Spec:
`playwright/add-liquidity-default-tick.spec.ts` (landing page -> GD add liquidity, slow reporter).

### LP fee: default and depth-chart marking

- **Default fee** = the pair's most used fee (`mostUsedLpFee`, `scripts/clamm/feeTierStats.ts`):
  highest summed TVL, then pool count, preferring pools at the default (most liquid) tick width.
  It replaces the 0.1 % starting value once the pool stats land, unless the link (`?lpFee=`), a
  click or another panel already chose it (`lpFeeIsProvisional`, re-armed when the pair changes).
  The effective fee is always written back to the URL (`useLiquiditySettingsRoute`).
- **Depth chart**: each bucket carries `exactPoolFees` (declared fees of the Biatec pools that
  exist for exactly that tick). `bucketFeeMatch(bucket, store.state.liquidityLpFee)` gives
  `match` (green - deposits join the pool), `otherFee` (**violet** - the tick already exists but
  at another fee: change the fee to join it instead of creating a duplicate) or `none`
  (orange). Tooltips list the fees at the tick; the card exposes `data-exact-pool-ticks` /
  `data-other-fee-ticks` for tests. Spec: `playwright/liquidity-fee-default.spec.ts`.

### Recent trades list and Liquidity pools panel (liquidity page)

- `TradesList.vue` shows **exactly as many trades as fit the panel completely** - one line per trade
  (price, time, asset amount, currency amount), no vertical scrolling: the scroller is measured
  (`tradeRowCapacity` counts only fully visible rows, at least 10 on mobile), that many rows are
  rendered and `tradePageSize(capacity)` rows are requested (headroom for live SignalR trades); more
  pages are fetched only while fewer than `capacity` trades are loaded (bounded by
  `MAX_AUTO_FILL_PAGES`). The column is `md:w-[24rem] lg:w-[28rem] 2xl:w-[32rem]` in `ManageLiquidity.vue`
  so nothing is cut off on large screens (horizontal scroll only appears when it must, never on 4K).
  One query covers both directions: `assetIdA`/`assetIdB` are "advanced"
  filters, which is what makes the reporter answer with the paged `{ items, hasMore }` shape
  and honour `offset`/`sortBy`. **`GET /api/trade` returns a BARE ARRAY for plain
  `assetIdIn`/`assetIdOut` queries** (AVMTradeReporter `TradeController`) - the list once read
  only `.items` and showed "No trades" for a pair that had trades; `tradesFromResponse`
  (`scripts/trades/tradePage.ts`) accepts both shapes. Spec: `playwright/trades-panel-layout.spec.ts`.
- `MyLiquidity.vue` (Liquidity pools) is public data: it loads on mount and on pair/network
  change for anonymous visitors too (it used to wait for `authStore.isAuthenticated`, so the
  table stayed empty until Refresh was clicked). Loads are token-guarded against stale writes.

### Deposit amounts follow the account balance

Every balance reload in `AddLiquidity.vue` (`doLoadBalances`: after adding liquidity via
`loadBalances(true)`, the 30 s refresh, and `store.state.refreshAccountBalance` - raised by
RemoveLiquidity/PoolSwap too) ends with `clampDepositsToBalances()`
(`scripts/asset/clampDeposit.ts`): a deposit amount higher than what the account now holds is
lowered to the new maximum (0 after depositing everything), amounts within the balance are left
alone, and the deposit inputs' `max` (plus the sliders) follow the balance for a signed-in account.
Spec: `playwright/add-liquidity-deposit-max.spec.ts` (mocks the account's algod response).

### Add Liquidity mid price and deposit-plan validation

The **mid price** (`state.midPrice`) is the price that decides which side of the selected
range each deposit lands on: buckets **below** it accept only the currency, buckets
**above** it accept only the asset (`scripts/asset/calculateDistribution.ts`). A wrong mid
price therefore silently moves deposits to the wrong asset. `fetchData()` in
`AddLiquidity.vue` resolves it in this priority order and records the origin in
`state.midPriceSource` (shown next to the price with a "Change price" button):

1. `aggregated` — `service/tradeApi.ts`'s `fetchAggregatedPairPrice(env, assetIdA, assetIdB)`
   calls `GET api/aggregated-pool?assetIdA&assetIdB` and returns
   `virtualSumBLevel1ForPrice / virtualSumALevel1ForPrice` (pure helper
   `aggregatedPoolPairPrice()` handles the orientation: the API returns both A-B and B-A
   rows). This is the cross-DEX market valuation (empty/depleted/out-of-range pools
   excluded server-side). Resolves `null` instead of throwing, so the fallbacks below run.
2. `onchain` — the Biatec pool provider's `getPrice()` (`latestPrice / 1e9`). Only knows
   Biatec's own last trades; for thinly traded pairs it can sit far off market (the
   VOTE/GD report: 0.024 on-chain vs 0.0143 aggregated).
3. `orderbook` — `calculateMidAndRange()` from the bids/offers.
4. `reference` — the depth chart's TVL-weighted `store.state.liquidityReferencePrice`
   (or the route's pool-bounds midpoint under `__BIATEC_SKIP_PRICE_FETCH`).
5. `manual` — the price form. It is always reachable via "Change price"; the form edits
   `state.midPriceDraft` and copies it into `midPrice` only on Apply (typing/cancel
   never moves the grid), then hides itself.

**Deposit-plan validation** (`scripts/asset/depositAllocationCheck.ts`,
`checkDepositAllocation()`): the range submit path runs one add-liquidity group per
non-empty bucket, so a plan where every bucket is `0/0` used to run zero transactions and
still toast "Liquidity added successfully!". The check classifies the plan as
`no-deposit`, `nothing-to-deposit` (whole range on the side that takes the other asset),
`asset-unused` / `currency-unused` (a typed amount would be silently dropped), with the
range's `side` (`below`/`above`/`spanning`) relative to the mid price for the message.
It is applied three times in `AddLiquidity.vue`, all through the shared
`buildSubmitDistribution()` so they agree on what will be signed:

- `depositAllocationWarning` (computed, read-only, derived from `state.distribution`) —
  live `Message` under the deposit inputs. It never writes state (anti-freeze rule 3).
- `precheckDepositAllocation()` in `addLiquidityClick` — blocks the review dialog with an
  error toast (wall/single shapes only check for a non-zero deposit).
- `executeAddLiquidity()` — throws before creating pools, counts `submitted` add-liquidity
  calls and throws `errors.noLiquiditySubmitted` when the count is 0 or the sender returned
  no tx id. The wall/single paths also require a tx id. **The success toast is only
  reachable after a confirmed submission.**

Regression coverage: `playwright/add-liquidity-mid-price.spec.ts` (mainnet VOTE/GD, read
only; the sign-flow assertions run only with `LIQUIDITY_TEST_EMAIL/PASSWORD`),
`src/scripts/asset/__tests__/depositAllocationCheck.test.ts`,
`src/service/__tests__/tradeApi.aggregatedPrice.test.ts`.

### PrimeVue `<Chart>` components must never be gated by `v-if` on fast-changing state — MANDATORY

A depth-chart click froze the tab (`RESULT_CODE_HUNG`) a second way, distinct from the
`low === high` route-pin oscillation above. AddLiquidity.vue's own price-distribution
`<Chart>` used to live inside the `state.shape === 'wall'` / `v-else` template split.
Clicking almost anywhere on the pool liquidity depth chart drives AddLiquidity's route-pin
state machine (see below), which can flip `state.shape` to/from `'wall'` several times
within under 100ms while it settles — and **every flip fully unmounted and remounted that
whole template branch, including the `<Chart>`.**

PrimeVue's `<Chart>` component (`node_modules/primevue/chart`) builds its underlying
chart.js instance via an async `import('chart.js/auto').then(...)` inside `mounted()`/its
`data`/`options`/`type` watchers, with **no guard against the component having been
unmounted by the time that promise resolves.** When it resolves after unmount,
`this.$refs.canvas` is `null`, so it calls `new Chart(null, config)`; chart.js's own
constructor throws `"Cannot read properties of null (reading 'id')"` trying to build its
"canvas already in use" error message off a stale, already-nulled registry entry (its own
error path assumes `existingChart.canvas` is never null — see
`node_modules/.vite/deps/auto-*.js`'s `Chart` constructor). This is an **uncaught
exception on nearly every affected click** (measured 31–32 of 35 bucket clicks in one
sweep on a route-pinned deep link) and, since the failed construction never completes,
**orphans a chart.js registry entry each time — compounding over a session instead of
self-healing**, which is consistent with a report of the tab freezing only "after a
while."

**Rule**: never gate a `<Chart>` (or anything else that owns an expensive, stateful,
async-initializing third-party instance) with `v-if` keyed on state that can flip
multiple times within a short window (a shape/tab selector, a route pin settling, a
cascading watcher chain). Use `v-show` instead — it never unmounts the component, so a
still-in-flight async initialization from a previous toggle can never resolve against a
torn-down instance. If the component cannot render with the data available at first
mount (e.g. `null` before real data exists), seed a stable non-null placeholder value
instead of conditionally mounting the component itself. See `chartDataStable` /
`chartOptionsStable` and the `ROOT CAUSE` comment above them in `AddLiquidity.vue` for
the full trace and the exact fix (the chart was also hoisted out of the shape-driven
`v-if`/`v-else` split entirely, not just switched to `v-show` in place, since one of its
two gating conditions was the outer split itself, not the inner null-check).

Regression: `playwright/liquidity-chart-click.spec.ts` — clicks through every bucket on
a route-pinned add-liquidity deep link via the real pointer handlers and asserts no
uncaught error and a responsive tab throughout. Confirmed both directions: fails on the
pre-fix code (throws on the first non-trivial click) and passes on the fix.

### AddLiquidity.vue's route-pin state machine

`components/LiquidityComponents/AddLiquidity.vue` (~3400 lines) has a non-obvious
three-variable state machine for pinning the price range from outside the component
(route query, or now the store — see above). Re-derive this before touching price-range
wiring instead of re-reading the whole file:

- `pendingRouteRange: { low?, high? } | null` — an inbound request not yet applied.
- `activeRouteRange: { low?, high? } | null` — the currently-pinned bounds, re-asserted
  against distribution rebuilds.
- `isApplyingRouteRange: boolean` — true only while `applyRouteBoundsIfReady()` is
  writing `state.minPriceTrade`/`maxPriceTrade`/`state.prices`; watchers on those fields
  check it to avoid treating a pin-driven write as a user edit.
- `applyRouteBoundsIfReady(source)` is the single entry point: it sets
  `state.minPriceTrade`/`maxPriceTrade` directly to the requested values, then separately
  snaps `state.prices` (the slider's bucket-index pair) to the closest existing
  `state.distribution.min[]`/`max[]` entries.
- `releaseRoutePriceRange()` (wired to slider/InputNumber `@change`/`@input`) is the
  user-edit escape hatch: clears the pin and the `low`/`high` route query the moment the
  user takes over, so the pin can't fight their drag. Don't add a new inbound sync
  channel without also deciding whether it should release existing pins the same way,
  or whether it should route through `applyRouteBoundsIfReady` like the store channel
  above (which reuses the pin machinery instead of bypassing it).
- Separate from this is `setChartData`'s own recursive-update hazard documented in
  the frontend CLAUDE.md's tick section — the two mechanisms interact (both mutate
  `state.prices`/`minPriceTrade`/`maxPriceTrade`) but are guarded independently.

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

## Mobile layout (keep in sync with CLAUDE.md)

Number fields must stay readable at every width (phones AND tablets / small laptops). `ManageLiquidity.vue` is stacked on phones, a
2-column grid (pools | form, trades below) from `md` and three columns from `xl`; the form column is the Tailwind named container `@container/form` (the order form: `@container/order`; app.css queries them by name) and the
field grids inside the forms are `grid-cols-1 @xl/form:grid-cols-2` (container width, never plain `grid-cols-2`, never viewport breakpoints
for something that lives in a side column). `InputGroup` sizing lives in `src/assets/app.css`: the `InputNumber` is `flex: 1 1 0%;
min-width: 0` (selectors carry a third class because PrimeVue injects its theme CSS after `app.css` with `.p-inputgroup
.p-inputwrapper { flex: 1 1 auto; width: 1% }`); stacked groups in a phone viewport, a form column < 44rem (the 2-column grid starts at 36rem - keep the thresholds in step) or an order-form card < 28rem narrow PrimeVue's tokens
(`--p-inputnumber-button-width`, `--p-form-field-padding-x`, `--p-inputtext-padding-x`) from one definition (`--biatec-narrow-*`).
Symbol labels use the `SymbolAddon` component (truncates, full text as title, caps itself at 45 %). Touch devices (`pointer: coarse`,
up to 932 px - phones in portrait and landscape) get a 40 px menu toggle and >= 36 px buttons except in tables / paginators / toasts. Regression:
`playwright/mobile-layout.spec.ts`.

- Asset tables (Explore Assets, Trader, Liquidity provider) render the logo with `AssetLogo` (`src/components/AssetLogo.vue`) as the FIRST element of the name cell: a fixed 40 px slot (the asset's initial when there is no logo or it failed to load; failed urls are cached 5 min across rows), so logos and names line up in one column. Do not hand-roll `<img>` + `@error` in a view.

## Wallet stack (use-wallet 5, algorand-authentication-component-vue 3)

- Wallets are factories from separate packages (`biatec-wallet-use-wallet-client`, `@txnlab/use-wallet-{pera,defly,exodus,kibisis,lute,mnemonic}`), built only by `buildWalletConfigs()` in `src/scripts/algo/walletRegistry.ts`. The networks registered with use-wallet (`src/scripts/algo/networks.ts`) use the app's genesis ids (`mainnet-v1.0`, ...), NOT use-wallet's canonical `mainnet`/`testnet`; the adapters declare capabilities with canonical ids, so `translateCapabilities()` re-expresses them (`supportedNetworks: ['mainnet']` -> Algorand mainnet only; `excludedNetworks: ['mainnet']` -> every non-test network, which keeps the plaintext mnemonic wallet off Algorand/Voi/Aramid mainnets). Without it Pera/Defly/Exodus vanish and the mnemonic wallet shows on mainnet. Unit-tested against the real `WalletManager` (`walletRegistry.test.ts`).
- Sign with `useTransactionSigner()` (`src/composables/useTransactionSigner.ts`), not `useAVMAuthentication().sign` directly: the library's ARC-76 branch signs the whole group and ignores `indexesToSign`, breaking algosdk's signer contract. `logout()` is async.
- `walletResumeNoiseFilter.ts` is still required: the mnemonic adapter's `resumeSession()` calls `checkMainnet()` on every network regardless of capabilities (verified by booting without the filter).
- The auth component (>= 3.1) is self-contained (`aa-` classes, `algorand-authentication-component-vue/style.css` imported in `main.ts` before `assets/auth.css`) and has its own light and dark palettes. `PublicLayout.vue` passes the app theme explicitly (`:theme="isDark ? 'dark' : 'light'"` from `useTheme()`, never its OS-following `auto`) and the app's i18n locale; `assets/auth.css` only sets the cover image. Needs CSS `light-dark()` (Chrome/Edge 123, Firefox 120, Safari 17.5). Spec: `playwright/wallet-stack.spec.ts`, `playwright/auth-theme.spec.ts` (dark/light + header toggle).
- Every ARC-76 signature opens a password dialog (`aa-sign-dialog`); e2e specs that sign call `autoApproveArc76Signing(page, password)` (`playwright/helpers/app.ts`). `playwright/wallet-stack.spec.ts` covers the wallet list on mainnet.
- Wallet (non ARC-76) sign-ins are not restored after a full page load: the ARC-14 header needs a fresh wallet signature. Only ARC-76 sessions persist (`installAuthSessionPersistence`).
