/**
 * Catalog of Biatec DEX help use cases.
 *
 * Each entry describes one feature/flow of the DEX. The page chrome and the
 * per-use-case copy (title, summary, intro, steps, tip) live in the locale
 * files under `views.help`; this file only holds the structural metadata that
 * the help index, the help detail page and the screenshot generator share.
 *
 * Translatable strings for a use case are keyed by its `slug`:
 *   views.help.useCases.<slug>.title
 *   views.help.useCases.<slug>.summary
 *   views.help.useCases.<slug>.intro
 *   views.help.useCases.<slug>.steps   (one string, lines separated by "\n")
 *   views.help.useCases.<slug>.tip
 *
 * `screenshotRoute` is the in-app route the Playwright screenshot generator
 * (scripts/generate-help-screenshots.mjs) captures for every supported locale.
 * The generated image is shown on the detail page from
 *   {BASE_URL}help-screenshots/<locale>/<slug>.png
 */

export type HelpCategory =
  | 'gettingStarted'
  | 'trading'
  | 'liquidity'
  | 'account'
  | 'networks'
  | 'info'

export interface HelpUseCase {
  /** Stable URL slug — also the i18n sub-key and the screenshot file name. */
  slug: string
  /** PrimeIcons class, e.g. `pi pi-compass`. */
  icon: string
  /** Grouping used on the help index page. */
  category: HelpCategory
  /** In-app route captured by the localized screenshot generator. */
  screenshotRoute: string
  /**
   * Set when `screenshotRoute` is an auth-gated page so the generator injects
   * the `window.__BIATEC_E2E` bypass before navigating.
   */
  requiresAuthBypass?: boolean
}

/** Ordered list of help categories (drives section order on the index page). */
export const helpCategories: HelpCategory[] = [
  'gettingStarted',
  'trading',
  'liquidity',
  'account',
  'networks',
  'info'
]

export const helpUseCases: HelpUseCase[] = [
  // ── Getting started ────────────────────────────────────────────────────
  {
    slug: 'explore-assets',
    icon: 'pi pi-compass',
    category: 'gettingStarted',
    screenshotRoute: '/explore-assets'
  },
  {
    slug: 'find-asset-by-id',
    icon: 'pi pi-search-plus',
    category: 'gettingStarted',
    screenshotRoute: '/explore-assets'
  },
  {
    slug: 'connect-wallet',
    icon: 'pi pi-wallet',
    category: 'gettingStarted',
    screenshotRoute: '/'
  },
  {
    slug: 'switch-language',
    icon: 'pi pi-globe',
    category: 'gettingStarted',
    screenshotRoute: '/'
  },
  {
    slug: 'switch-theme',
    icon: 'pi pi-moon',
    category: 'gettingStarted',
    screenshotRoute: '/'
  },

  // ── Trading ────────────────────────────────────────────────────────────
  {
    slug: 'trade-screen',
    icon: 'pi pi-chart-line',
    category: 'trading',
    screenshotRoute: '/trade/mainnet-v1.0/GD/USD'
  },
  {
    slug: 'buy-order',
    icon: 'pi pi-arrow-up',
    category: 'trading',
    screenshotRoute: '/trade/mainnet-v1.0/GD/USD'
  },
  {
    slug: 'sell-order',
    icon: 'pi pi-arrow-down',
    category: 'trading',
    screenshotRoute: '/trade/mainnet-v1.0/GD/USD'
  },
  {
    slug: 'market-depth',
    icon: 'pi pi-align-justify',
    category: 'trading',
    screenshotRoute: '/trade/mainnet-v1.0/GD/USD'
  },
  {
    slug: 'recent-trades',
    icon: 'pi pi-history',
    category: 'trading',
    screenshotRoute: '/trade/mainnet-v1.0/GD/USD'
  },
  {
    slug: 'pool-swap',
    icon: 'pi pi-sync',
    category: 'trading',
    screenshotRoute: '/liquidity/mainnet-v1.0/GD/USD',
    requiresAuthBypass: true
  },
  {
    slug: 'select-pair',
    icon: 'pi pi-sort-alt',
    category: 'trading',
    screenshotRoute: '/trade/mainnet-v1.0/GD/USD'
  },
  {
    slug: 'price-chart',
    icon: 'pi pi-chart-line',
    category: 'trading',
    screenshotRoute: '/trade/mainnet-v1.0/GD/USD'
  },
  {
    slug: 'asset-info',
    icon: 'pi pi-info-circle',
    category: 'trading',
    screenshotRoute: '/trade/mainnet-v1.0/GD/USD'
  },
  {
    slug: 'share-pair',
    icon: 'pi pi-share-alt',
    category: 'trading',
    screenshotRoute: '/trade/mainnet-v1.0/GD/USD'
  },

  // ── Liquidity ──────────────────────────────────────────────────────────
  {
    slug: 'liquidity-dashboard',
    icon: 'pi pi-chart-bar',
    category: 'liquidity',
    screenshotRoute: '/liquidity-provider',
    requiresAuthBypass: true
  },
  {
    slug: 'create-pool',
    icon: 'pi pi-plus-circle',
    category: 'liquidity',
    screenshotRoute: '/explore-assets'
  },
  {
    slug: 'add-liquidity-focused',
    icon: 'pi pi-bullseye',
    category: 'liquidity',
    screenshotRoute: '/liquidity/mainnet-v1.0/GD/USD',
    requiresAuthBypass: true
  },
  {
    slug: 'add-liquidity-spread',
    icon: 'pi pi-arrows-h',
    category: 'liquidity',
    screenshotRoute: '/liquidity/mainnet-v1.0/GD/USD',
    requiresAuthBypass: true
  },
  {
    slug: 'add-liquidity-equal',
    icon: 'pi pi-equals',
    category: 'liquidity',
    screenshotRoute: '/liquidity/mainnet-v1.0/GD/USD',
    requiresAuthBypass: true
  },
  {
    slug: 'add-liquidity-single',
    icon: 'pi pi-circle',
    category: 'liquidity',
    screenshotRoute: '/liquidity/mainnet-v1.0/GD/USD',
    requiresAuthBypass: true
  },
  {
    slug: 'add-liquidity-wall',
    icon: 'pi pi-stop',
    category: 'liquidity',
    screenshotRoute: '/liquidity/mainnet-v1.0/GD/USD',
    requiresAuthBypass: true
  },
  {
    slug: 'remove-liquidity',
    icon: 'pi pi-minus-circle',
    category: 'liquidity',
    screenshotRoute: '/liquidity/mainnet-v1.0/GD/USD',
    requiresAuthBypass: true
  },
  {
    slug: 'manage-liquidity',
    icon: 'pi pi-sliders-h',
    category: 'liquidity',
    screenshotRoute: '/liquidity/mainnet-v1.0/GD/USD',
    requiresAuthBypass: true
  },
  {
    slug: 'review-before-sign',
    icon: 'pi pi-verified',
    category: 'liquidity',
    screenshotRoute: '/liquidity/mainnet-v1.0/GD/USD',
    requiresAuthBypass: true
  },
  {
    slug: 'liquidity-shapes',
    icon: 'pi pi-chart-scatter',
    category: 'liquidity',
    screenshotRoute: '/liquidity/mainnet-v1.0/GD/USD',
    requiresAuthBypass: true
  },
  {
    slug: 'lp-fee-tiers',
    icon: 'pi pi-percentage',
    category: 'liquidity',
    screenshotRoute: '/liquidity/mainnet-v1.0/GD/USD',
    requiresAuthBypass: true
  },
  {
    slug: 'price-range',
    icon: 'pi pi-arrows-h',
    category: 'liquidity',
    screenshotRoute: '/liquidity/mainnet-v1.0/GD/USD',
    requiresAuthBypass: true
  },
  {
    slug: 'precision-bins',
    icon: 'pi pi-th-large',
    category: 'liquidity',
    screenshotRoute: '/liquidity/mainnet-v1.0/GD/USD',
    requiresAuthBypass: true
  },
  {
    slug: 'pool-costs-mbr',
    icon: 'pi pi-money-bill',
    category: 'liquidity',
    screenshotRoute: '/liquidity/mainnet-v1.0/GD/USD',
    requiresAuthBypass: true
  },

  // ── Account ────────────────────────────────────────────────────────────
  {
    slug: 'trader-dashboard',
    icon: 'pi pi-th-large',
    category: 'account',
    screenshotRoute: '/trader',
    requiresAuthBypass: true
  },
  {
    slug: 'asset-opt-in',
    icon: 'pi pi-check-square',
    category: 'account',
    screenshotRoute: '/trader/asset-opt-in',
    requiresAuthBypass: true
  },
  {
    slug: 'copy-address',
    icon: 'pi pi-copy',
    category: 'account',
    screenshotRoute: '/trader',
    requiresAuthBypass: true
  },
  {
    slug: 'disconnect-wallet',
    icon: 'pi pi-sign-out',
    category: 'account',
    screenshotRoute: '/trader',
    requiresAuthBypass: true
  },

  // ── Networks & settings ────────────────────────────────────────────────
  {
    slug: 'switch-network',
    icon: 'pi pi-server',
    category: 'networks',
    screenshotRoute: '/settings'
  },
  {
    slug: 'settings-blockchain',
    icon: 'pi pi-database',
    category: 'networks',
    screenshotRoute: '/settings'
  },
  {
    slug: 'settings-swap',
    icon: 'pi pi-percentage',
    category: 'networks',
    screenshotRoute: '/settings'
  },
  {
    slug: 'reset-settings',
    icon: 'pi pi-refresh',
    category: 'networks',
    screenshotRoute: '/settings'
  },
  {
    slug: 'tx-validity',
    icon: 'pi pi-clock',
    category: 'networks',
    screenshotRoute: '/settings'
  },
  {
    slug: 'localnet-dev',
    icon: 'pi pi-desktop',
    category: 'networks',
    screenshotRoute: '/settings'
  },

  // ── Information ────────────────────────────────────────────────────────
  {
    slug: 'about',
    icon: 'pi pi-info-circle',
    category: 'info',
    screenshotRoute: '/about'
  },
  {
    slug: 'documentation',
    icon: 'pi pi-book',
    category: 'info',
    screenshotRoute: '/about'
  },
  {
    slug: 'security-best-practices',
    icon: 'pi pi-shield',
    category: 'info',
    screenshotRoute: '/about'
  },
  {
    slug: 'help-center',
    icon: 'pi pi-question-circle',
    category: 'info',
    screenshotRoute: '/help'
  }
]

/** Look up a single use case by its slug. */
export const getHelpUseCase = (slug: string): HelpUseCase | undefined =>
  helpUseCases.find((useCase) => useCase.slug === slug)

/** Use cases belonging to a category, in catalog order. */
export const getHelpUseCasesByCategory = (category: HelpCategory): HelpUseCase[] =>
  helpUseCases.filter((useCase) => useCase.category === category)
