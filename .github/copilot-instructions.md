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
├── locales/       # Translation files (en.json, sk.json, etc.)
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

### Internationalization
- All user-facing text must be internationalized
- Add translations to all locale files: `en.json` (English), `sk.json` (Slovak), `pl.json` (Polish)
- Use `$t('key.path')` in templates
- Use `t('key.path')` in script setup with `useI18n()`

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
- Use Cypress for end-to-end testing
- Test critical user flows
- Mock blockchain interactions when possible

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

### Working with Algorand Assets
1. Use `algosdk` for all blockchain interactions
2. Check user opt-in status before operations
3. Handle asset decimals properly (typically 6 decimals)
4. Validate asset IDs and amounts
5. Provide clear error messages

### Updating Translations
1. Add keys to `src/locales/en.json` (primary/English)
2. Add corresponding translations to `src/locales/sk.json` (Slovak) and `src/locales/pl.json` (Polish)
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
- Keep this copilot-instructions.md updated
- Add JSDoc comments for exported functions

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
