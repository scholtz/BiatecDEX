# CLAUDE.md

Concise guidance for AI assistants. This file loads into context every session, so it stays small — **for full detail, read [.github/copilot-instructions.md](.github/copilot-instructions.md)** (the maintained source of truth for conventions, testing, and task recipes). Read it only when the task needs that depth; don't re-explore the codebase otherwise.

## Project

Biatec DEX — Vue 3 + TypeScript SPA for a Concentrated Liquidity AMM (CLAMM) on Algorand. Trader dashboard, liquidity-provider dashboard, asset opt-in, market depth, i18n. Funded by Algorand Foundation xGov#80.

## Stack

- **Vue 3** Composition API (`<script setup lang="ts">`) + **Vite 8** + **TypeScript** (strict). **Total type safety**: never use `any` or `unknown` unless truly unavoidable, and when unavoidable add a comment on the line above explaining why the proper type couldn't be used. Exception: generated code in `src/api/` (Orval output) is exempt.
- **PrimeVue 5** (Aura theme via `@primeuix/themes`, `p` prefix, `.p-dark`) — auto-imported via `unplugin-vue-components`. Do NOT manually import PrimeVue components. v4's `Dropdown`/`TabView` are gone — use `Select` and `Tabs`/`TabList`/`Tab`/`TabPanels`/`TabPanel`.
- **Pinia** (`src/stores/app.ts` → `useAppStore`), **Vue Router 5** (lazy routes), **vue-i18n 11**.
- **Tailwind CSS 4** + `tailwindcss-primeui`. Prefer utility classes; avoid inline styles.
- **Algorand**: `algosdk`, `@algorandfoundation/algokit-utils`, `@txnlab/use-wallet-vue`, `algorand-authentication-component-vue`, `biatec-concentrated-liquidity-amm` (contract clients), `@microsoft/signalr` (live trades).
- **Wallets (use-wallet 5 + auth component 3)**: adapters are registered only via `scripts/algo/walletRegistry.ts` (network ids are the app's genesis ids, so it translates each adapter's capabilities), networks live in `scripts/algo/networks.ts`, signing goes through `composables/useTransactionSigner.ts`. Details: copilot-instructions.md "Wallet stack".
- **Orval** generates the typed Axios client into `src/api/` — do not hand-edit. Input is the **testnet** swagger (`api.testnet.scan.biatec.io`) because testnet runs the newest AVMTradeReporter build, so new backend fields appear there first (runtime base URL is still per-network via `service/tradeApi.ts`). After `npm run generate:api`, run Prettier on `src/api/**` — raw Orval output uses semicolons and would otherwise produce a huge formatting-only diff. Generated model fields are **all optional**: guard ids (`if (x.assetId === undefined)`) and default numerics (`?? 0`/`?? null`) at mapping boundaries.

## Commands

Package manager is **pnpm** (`packageManager` pinned in package.json; `pnpm install`). Postinstall scripts are gated by `allowBuilds` in `pnpm-workspace.yaml` — new deps needing build scripts must be added there.

- `pnpm run dev` — dev server. `pnpm run build` — type-check + build.
- `pnpm run type-check` — `vue-tsc --noEmit`; **run after changes to validate**. `pnpm run lint` — ESLint flat config (`eslint.config.js`); must stay at 0 errors (`no-explicit-any` warnings are legacy — don't add new ones).
- `pnpm run format` — Prettier. `pnpm run test:unit` — Vitest. `pnpm run test:e2e` — Cypress (Edge, runs against preview on :4173).
- `pnpm run generate:api` — regenerate Orval client.

## Layout (`src/`)

`main.ts` bootstrap (networks, plugins) · `stores/app.ts` central state + `setChain()` · `router/` (pair/pool in URL params) · `views/` pages (TraderDashboard, LiquidityProviderDashboard, ManageLiquidity, AssetOptIn, AllAssetsView, Info/, Settings/) · `components/` (TradingComponents/, LiquidityComponents/, icons/) · `composables/` (`useTraderDashboard`, `useLiquidityProviderDashboard`, `useRouteParams`) · `scripts/` pure logic (algo/, asset/, clamm/, common/, folks/) · `service/` (AssetsService, authService, signalrService) · `interface/` (`I`-prefixed) · `types/` · `api/` (generated) · `locales/`.

## Conventions

- **Formatting (Prettier, enforced)**: no semicolons, single quotes, 2-space indent, `printWidth` 100, no trailing commas. Match exactly.
- **Components**: typed `defineProps`/`defineEmits` (use `withDefaults` for optional props); reusable logic → composables.
- **i18n**: every user-facing string via `t()` / `$t()`; English (`en.json`) is primary. Add each new key to **all 10 locale files**: `en, sk, pl, hu, it, ru, zh, ko, de, es`.
- **Number display (Biatec Scan style)**: prices, USD values and amounts go through `scripts/common/formatSmartNumber.ts` (`formatSmartNumber`/`formatSmartUsd` for strings, `components/FormattedNumber.vue` where a real `<sub>` can render) — never a fixed 2-decimal `toFixed(2)`/`Intl` currency format. Rules: ≥4 significant digits (`0.1234`, `12.34`); below 0.01 leading zeros collapse to a subscript count (`0.0000001234` → `0.0<sub>6</sub>1234`, plain text `0.0₆1234`); ≥5 integer digits drop decimals (`82396.73` → `82396`); huge values abbreviate (`12345678` → `12345k`, `1234567890` → `1234M`, `1234567890123` → `1234B`); digits are truncated, not rounded up. Exceptions: tick/pool-bound prices that must show the exact grid boundary (`PoolsLiquidityChart`, AddLiquidity inputs) and token amounts needing the asset's full decimals keep exact formatting.
- **Tables (PrimeVue DataTable)**: right-align numeric/last columns with `class="text-right"`; format numbers with the rule above (`formatSmartNumber`/`FormattedNumber`). For header tooltips, omit `:header` and use `<template #header>` with a `v-tooltip.top` span (avoids duplicate text) — add tooltip keys under `tooltips.tables` in all locales.
- **Algorand**: app IDs/amounts are `bigint` (e.g. `3074197827n`) — use `scripts/common/safeBigInt.ts`; `bignumber.js` for decimals; assets typically 6 decimals; check opt-in before transactions; never commit keys/mnemonics.
- **Path alias**: `@/` → `src/`. **Toasts**: PrimeVue `useToast()`.
- **Tests**: Vitest `*.spec.ts`/`*.test.ts` in `__tests__/`. Cypress E2E use real APIs/data (no mocking) and a `.env` test account (`LIQUIDITY_TEST_EMAIL/PASSWORD`); rebuild before running. See the Copilot file for E2E debug helpers and patterns.

## Tick / price-range system (Add Liquidity)

The CLAMM uses a **canonical logarithmic tick grid**: an absolute set of price boundaries
per tick width that never depends on the current price, on the visible window, or on any
previously computed boundary. It is decade-periodic (one mantissa table per width,
repeated in every decade) and follows the **log10 tick rule** — the tick at a price is
`10^-precision` of the price rounded to one significant digit — so a bin is always
roughly the same fraction of the price: **wide (0)**: the 1/2/5 anchors (`[1000, 2000]`,
`[2000, 5000]`, ≈100 %); **normal (1)**: ≈10 % — 1, 1.1, 1.2, 1.3, 1.4, 1.6, 1.8, 2, 2.2,
2.4, 2.7, 3, 3.3, 3.6, 4, 4.4, 5, 6, 7, 8, 9, 10 (×10^k, 21 bins/decade, so `0.9 → 1` is
exactly one normal tick and 1500 sits in `[1400, 1600]`); **narrow (2)**: ≈1 % — 1, 1.01,
…, 1.49, 1.5, 1.52, …, 2.48, 2.52, 2.55, …. **`precision` controls how wide the tick is**
— lower = wider. Because the grid is absolute, the bin around a price is always the same
one (GOLD/ALGO at ~1500, wide → `[1000, 2000]` on every visit). The previous grid chained
each boundary from the previous one (`next = fitPrice + tick`) starting at a
mid-price-derived window edge, so the same pair got pools at 536–2140, 1080–2160 and
1090–2180 on three visits — **never reintroduce anchor-dependent tick math** (no walks
that start from `midPrice * factor`; the per-decade table is derived from the decade
start only, inside the package).

**The tick math is owned by the shared npm package `biatec-concentrated-liquidity-amm`**
(repo `../BiatecCLAMM/projects/BiatecCLAMM`, `src/ticks/` — `tickGrid.ts` is the grid,
`__test__/Ticks.test.ts` its spec) so the frontend and every integrator land on the same
bins; do NOT fork the math into the frontend. Key exports: `TICK_TYPES`/`TickType`
(`'wide'|'normal'|'narrow'`), `precisionForTickType`/`tickTypeForPrecision` (**wide=0,
normal=1, narrow=2**), `tickGridBoundaries(from, to, precision, maxCount?)` (every
boundary covering a window: first ≤ `from`, last ≥ `to`, capped, `[]` for a degenerate
window), `tickGridDecadeMantissas` (the per-decade table), `tickGridBoundaryBelow`/`tickGridBoundaryAbove` (the bin containing a price),
`nextTickGridBoundary`/`prevTickGridBoundary`, `tickGridWidthAt` (= `cleanLogTick` /
`getTickSize`: the exact width of the bin at a price — the InputNumber `:step`),
`tickDecimals`, `snapPriceToTick` (`nearest`/`down`/`up`; on-grid input is returned as
is), `suggestTickTypeForRange` (widest width on which `[low, high]` spans 1–40 bins), and
the fixed-point `initPriceDecimals` (`fitPrice` = bin start, `tick` = bin width, same
grid; `toFixedBigInt`/`fromFixedBigInt` are decimal-exact). To change the grid, edit
`src/ticks/`, run `npm run test:ticks` there, `npm run build-package`, bump + publish,
then bump the dep here.

Frontend consumers — all must take their bins from the package, never walk their own:

- **`scripts/asset/calculateDistribution.ts`** — `tickGridBoundaries` over
  `visibleFrom..visibleTo` (capped by `MAX_DISTRIBUTION_BOUNDARIES`) gives the
  `min[]/max[]` bins of AddLiquidity's slider/chart and therefore the exact pool bounds
  it creates; the deposit split across bins (below the mid price only the currency,
  above it only the asset) is unchanged. Tests: `__tests__/calculateDistribution.test.ts`
  (bin values + allocation), `calculateDistribution.canonicalGrid.test.ts` (the
  anchor-independence regression: the same bin for every mid price, form and chart
  boundaries identical, exactly the package grid), `calculateDistribution.termination.test.ts`.
- **`scripts/clamm/poolTvlDistribution.ts`** — the pool liquidity depth chart's buckets:
  `buildTickBoundaries` (explicit window) / `buildTickBoundariesAroundPrice` (window from
  `store.state.liquidityGridWindow` or `midPrice * / visibleRangeFactor`, then centered on
  the mid price by tick count via `prev/nextTickGridBoundary`). Same grid as the form by
  construction — the shared window only decides how much of it is shown. Wall pools
  (`pMin === pMax`) exactly on a boundary become zero-width `isWall` buckets (see the
  Cross-panel sync section of copilot-instructions.md; never feed `low === high` into
  the range pin machinery).
- **`components/LiquidityComponents/AddLiquidity.vue`** — price range usable via **both**
  number inputs and slider. Keep: InputNumber `:step` = `cleanLogTick(price, precision)`
  (`stepperTickFor`, window independent, correct at any magnitude); input decimals =
  `tickDecimals(step)`; typed values snap to the nearest grid boundary via
  `snapMin/MaxPriceToGrid` and **clamp at the first/last bin**; tick width is chosen as a
  localized **tick type** (`selectTickType`/`currentTickType`, labels under
  `components.addLiquidity.tickTypes.*` in all 10 locales) that maps to `state.precision`;
  pool bounds from the route query pin exactly through `activeRouteRange`.
  - **Reactive-loop hazard:** `setChartData` writes `state.distribution` and calls
    `setSliderAndTick` → `initPriceDecimalsState` → `setChartData`, guarded only by the
    `lastDistributionParams` equality check. Do NOT add a `watch(() => state.distribution)`
    (circular), and do NOT mutate the window (`minPrice/maxPrice`) or the range inside that
    chain in a way that can't reach a fixed point, or Vue throws "Maximum recursive updates
    exceeded" and the slider/inputs freeze. `setSliderAndTick` must latch
    `ticksCalculated = true` after the first distribution pass.
- **`scripts/asset/initPriceDecimals.ts`** — legacy BigNumber helper used only by the
  market order form (`MarketOrder.vue`) for its price step/decimals. It derives a tick
  from the price itself (price-dependent by design) and must never be used for pool
  bounds or anything that has to match the grid.

When editing, re-verify with the package's `__test__/Ticks.test.ts` and, here,
`src/scripts/asset/__tests__/calculateDistribution*.test.ts` plus
`src/scripts/clamm/__tests__/poolTvlDistribution*.test.ts`; spot-check extremes (price
~1000 and ~0.001) and that a window opened at a different mid price yields the same bins.

**Before touching price-range wiring in `AddLiquidity.vue`** (route query, the pool liquidity depth chart, or any new inbound sync), read copilot-instructions.md's "AddLiquidity.vue's route-pin state machine" and "Cross-panel sync" sections first — `pendingRouteRange`/`activeRouteRange`/`isApplyingRouteRange`/`applyRouteBoundsIfReady` are a specific, non-obvious mechanism, separate from the reactive-loop hazard above, and re-deriving it by reading the ~3400-line file is expensive. The pool liquidity depth chart (`components/LiquidityComponents/PoolsLiquidityChart.vue`, math in `scripts/clamm/poolTvlDistribution.ts`) and its store-based sync with this panel (`store.state.liquidityTickPrecision`/`liquidityPriceRange`) are documented there too.

## Add Liquidity mid price + deposit-plan validation

The mid price splits deposits between the two sides of the range (below it only the
currency is accepted, above it only the asset). `AddLiquidity.vue` resolves it in order
**aggregated** (`fetchAggregatedPairPrice()` in `service/tradeApi.ts`, cross-DEX
`api/aggregated-pool` price) → **onchain** pool provider → **orderbook** → **reference**
(depth chart) → **manual**, tracked in `state.midPriceSource`; the user can always
override it via "Change price". Before anything is signed the plan goes through
`scripts/asset/depositAllocationCheck.ts` (live warning, pre-review toast, and a throw in
`executeAddLiquidity`), and the success toast is only reachable after at least one
add-liquidity call returned a tx id. Never reintroduce an unconditional success toast.
Details: copilot-instructions.md → "Add Liquidity mid price and deposit-plan validation".

## Liquidity page settings live in the route

Tick width and base LP fee are the URL params `?tick=wide|normal|narrow&lpFee=<1e9-scaled>`,
synced with the store by `composables/useLiquiditySettingsRoute.ts` (used in `ManageLiquidity.vue`)
so every panel (depth chart, Add Liquidity, pools table) changes together and a copied link
restores them. Write route query only via `scripts/state/routeQueryWriter.ts`. AddLiquidity
publishes every `state.precision` change to the store (never set precision without that
watcher seeing it). Details: copilot-instructions.md "Cross-panel sync". Also: `GET /api/trade`
returns a bare array for plain in/out queries but a paged object for advanced filters
(`assetIdA/B`, sort) - use `scripts/trades/tradePage.ts`; the Liquidity pools panel loads
without a wallet.

## Sign-in survives full page loads

The ARC-76 sign-in lives in memory (`authStore` of algorand-authentication-component-vue), and the
app does full page loads on purpose - notably the stale-chunk recovery (`router/staleChunkReload.ts`)
when a lazy route chunk 404s after a deploy (e.g. main page -> Add Liquidity). `main.ts` therefore
calls `installAuthSessionPersistence()` (`scripts/state/authSession.ts`): only the account address
and email are kept in `sessionStorage` (tab-scoped, 12 h max), restored before the app mounts and
removed on logout. Never persist the password, mnemonic or ARC-14 header. Any new hard navigation
(`window.location`, plain `<a href>` to an app route) is otherwise a sign-out - use the router.
A reload triggered by `vite:preloadError` / the error handler has no route info, so the router tracks the
navigation in flight (`setPendingNavigationTarget`) and the reload lands on it instead of the
current page (main page -> Create pool -> Add Liquidity used to come back as the main page).
To avoid the reload in the first place, `main.ts` calls `prefetchRouteChunks()` (`router/prefetchRoutes.ts`):
the lazy pages users reach from the main page are loaded in the background, so a tab that outlives a
deploy keeps working (a failed background preload never reloads - `runBackgroundPrefetch`). Add new
main-flow lazy routes to `ROUTE_CHUNK_LOADERS`. The "Create pool" form is shared via
`composables/useCreatePool.ts` (Explore Assets + Liquidity provider dashboard) - navigate only with the router.
Specs: `playwright/auth-survives-reload.spec.ts`, `playwright/auth-create-pair.spec.ts`.

## Rule: trade reporter API first, on-chain box iteration as fallback

Views needing pool/asset lists or per-pool state must load them from the AVMTradeReporter
trade API first (`service/tradeApi.ts` — `fetchBiatecPools()` for `GET api/pool?protocol=Biatec`,
`mapBiatecPoolToFullConfig()` for the `Pool` → `FullConfig` conversion, `fetchAssetStats()` for
asset stats) and fall back to on-chain `getPools()` box iteration + per-pool
`BiatecClammPoolClient.status()` only when `isTradeApiConfigured(env)` is false, the call throws,
or the result is empty. The on-chain path must keep working standalone (DEX basic features work
without the reporter). Applied in `AllAssetsView.vue`, `MyLiquidity.vue`
(`loadPoolsFromTradeApi()`), and `LiquidityProviderDashboard.vue`. Never use reporter-derived
configs for transaction construction/exact pool matching (float round-tripping of `pMin`/`pMax`)
— see `.github/copilot-instructions.md` for the full rule.

## Pair-driven asset selection

Asset selectors only offer assets that already have an existing Biatec pool with the
other side of the pair; they never let the user pick an arbitrary, unpooled asset. The
only place a brand-new asset pair can be chosen is the "Create pool" flow
(`CreatePoolDialog.vue`), which is free-form (any base, any quote) and navigates to
`liquidity-with-assets` for the new pair once created — unless that pair already has a
pool, in which case it routes straight to that pool's Add Liquidity screen instead of
creating a duplicate (see `mostLiquidPoolForPair` below). The dialog also tells the user
up front that the next screen (Add Liquidity) is where the exact price range, fee tier
and deposit amounts are configured in detail.

- **`src/scripts/clamm/pairGraph.ts`** — pure module: builds a `PairGraph` from a flat
  `PairPool[]` list (both orientations inserted per pool) and exposes `assetsWithPools`,
  `getAllPairs` (every distinct pair once, for a single "asset pair" combobox — see
  AssetInfo.vue below), `getPairedAssets`, `hasPair`, `getMostLiquidPool` (the most liquid
  pool for one asset, ranked by the pair's **aggregated** USD TVL — the sum of every pool
  of that pair, not any single pool's TVL — then pool count, then lower asset id / pool
  app id, deterministic regardless of fetch order), and `getMostLiquidPoolForPair` (the
  most liquid pool of a pair whose both sides are already known, e.g. the LP dashboard's
  manual selection). `PairPool.appId` is `bigint` (Algorand app id convention, see
  Conventions above) — never narrow it to `number`.
- **`src/composables/usePoolPairs.ts`** — the reactive wrapper every selector calls:
  fetches the full pool list for the active network (trade reporter first, on-chain
  `getPools({ assetId: 0n, poolProviderAppId })` fallback — same rule as above) and
  builds the graph. Cached per network at module scope so every mounted selector shares
  one fetch; `invalidate()` forces a fresh fetch — wired into `AddLiquidity.vue`'s three
  pool-creation success paths so a newly created pair appears in every selector without a
  page reload. `loading`/`loaded` let callers fall back to "show everything" until the
  first load completes, so a slow or failed pool fetch never hides an option that should
  be there.
- **`src/scripts/asset/mergeHeldAndPooledOptions.ts`** — pure helper: merges a wallet's
  held-asset selector options with every other pooled-but-unheld asset, so a user can
  start a position in an asset they don't hold yet. Held assets list first (alphabetical),
  pooled-but-unheld after (also alphabetical) — two separately-sorted groups, not one flat
  sort, so the grouping survives. Used by both dashboards below.
- **`TraderDashboard.vue`** — the from-asset selector lists held-and-pooled assets first,
  then other pooled assets (`mergeHeldAndPooledOptions`); the table shows assets paired
  with the selection. The row swap action and the Explore Assets swap/add-liquidity
  actions route to the counterparty via `mostLiquidPool()` rather than a static default
  quote.
- **`LiquidityProviderDashboard.vue`** — same held-then-pooled selector; the asset table
  filters to assets paired with the selection (the selected asset's own row stays
  visible). Its "add liquidity" row action (`onAddLiquidityForAsset`) resolves
  `mostLiquidPoolForPair()` for the two already-chosen assets and routes straight to that
  pool's `add-liquidity` URL.
- **`AssetInfo.vue`** (shared by the trade and liquidity screens) — **one** combobox
  listing every existing pair (`usePoolPairs().allPairs`, most liquid first), not two
  independent asset/currency dropdowns — picking a pair navigates both sides at once via
  the existing `navigateToAssetPair`. Canonical base/quote ordering within each pair
  option reuses `AssetsService.selectPrimaryAsset` so it always agrees with the router's
  own pair-ordering guard.
- **`AllAssetsView.vue`**'s "add liquidity" row action routes to the most liquid existing
  pool via `mostLiquidPool()`, falling back to the create-pool dialog (pre-filled with
  that asset as the base, via `CreatePoolDialog`'s `initialBaseAssetId` prop) when it has
  none.

## Asset stats (Explore Assets page)

`views/AllAssetsView.vue` prefers server-computed per-asset stats (TVL, volume, fees, APR)
over the page's original on-chain aggregation:

- **Primary path**: `service/tradeApi.ts`'s `fetchAssetStats()` calls the trade API's
  `GET api/asset-stat` (same base URL/auth as `fetchTradeAssets`), then the view registers a
  `signalrService` filter (`RecentAssetStats: true` on `SubscriptionFilter`) and upserts rows by
  `assetId` from the `AssetStat` hub event (`onAssetStatReceived`/`unsubscribeFromAssetStatUpdates`
  in `service/signalrService.ts`) — no more 20s polling `setInterval` for this view.
- **Fallback**: if the REST call throws or returns empty (network/auth error, or the trade API
  isn't configured for the active network), the view falls back to the original on-chain
  aggregation (`loadAllAssets()`/`loadAllPriceData()`/`computeWeightedPeriods`, unchanged) and
  shows a non-blocking warning `Message` banner (`state.liveDataDegraded`,
  `views.allAssets.liveDataDegraded` i18n key).
- **Type**: `AssetStat` comes from the Orval-generated `@/api/models` (the former hand-maintained
  `types/AssetStat.ts` was deleted once the deployed swagger exposed the endpoint). Verified live
  casing: `tvlusd` (whole trailing acronym lowercased), `tvlOtherUSD`, `priceUSD`, `apr24h`.
- **TVL split**: backend `AssetStat.TVLUSD` is the asset's **own** side of its pools' TVL;
  `TVLOtherUSD` is the **paired** side (drives the "Other Asset TVL" column; Total = sum of both).
  Sourced from per-pool `TotalTVLAssetAInUSD`/`TotalTVLAssetBInUSD` in AVMTradeReporter's
  `AssetStatsService`; recomputed by `AssetStatsBackgroundService` every ~120 s
  (`AssetStats.IntervalSeconds`). Mapping falls back to 0 when a backend predates the field.
- **Debugging deployed backends**: `/swagger/v1/swagger.json` is public — use it to check which
  fields a deployment actually serves (mainnet lags testnet). The `/api/*` endpoints themselves
  need ARC-0014 auth (plain curl gets 401), so schema inspection via swagger is the practical way.
- **Configurable columns pattern** (reusable for future tables): a `ColumnDef[]` array
  (`id`, `labelKey`, `defaultBreakpoints: Breakpoint[]`) drives which `<Column>` elements render
  (`v-if="isColumnVisible(id)"`), picked via a PrimeVue `MultiSelect` next to the refresh button.
  `composables/useBreakpoint.ts` exposes the current Tailwind breakpoint bucket (default
  `sm/md/lg/xl/2xl`, debounced resize listener). Visible columns auto-follow the breakpoint's
  defaults **until** the user explicitly touches the column picker or changes sort — from then on
  a single `localStorage` key (`biatecdex.assetsTable.prefs`, `{columns, sortField, sortOrder}`)
  is persisted and wins over breakpoint changes. This lets the same table show fewer columns on a
  laptop and more on a 4K monitor without stomping a user's explicit choice.

## Anti-freeze rules (browser RESULT_CODE_HUNG) — MANDATORY

The app froze users' tabs three times (infinite router redirect loop; reactive watcher
cascade; a `<Chart>` unmount/remount race — see rule 6). These rules apply to EVERY
change; violating any of them can hang the main thread in production, where Vue's
recursive-update detection does not exist:

1. **Router guards that redirect must be provably convergent.** Any comparison that
   decides a redirect (e.g. `AssetsService.selectPrimaryAsset`) must be antisymmetric —
   it may never answer "redirect" for both orderings of the same input — and every
   redirect must pass `routerRedirectBreaker.allowRedirect(label)` from
   `src/router/redirectCircuitBreaker.ts` (last line of defense; when tripped, let the
   navigation through unmodified).
2. **Never assign `store.state.pair` (or similar shared watched objects) directly.**
   Always go through `setPairIfChanged` (`src/scripts/state/setPairIfChanged.ts`): a
   fresh-but-identical object is a reactive change and re-fires every watcher, feeding
   cross-component cascades. Same principle for any new shared state: compare before
   writing; no-op syncs must not touch the store.
3. **Watchers must not unconditionally write state they (transitively) watch.** Guard
   with equality checks or `isApplying*`-style flags, and prove the write converges
   (each pass must produce the same value the next pass reads).
4. **Every `while` loop and price/tick stepping walk needs an explicit iteration cap**
   (see `calculateDistribution.ts`'s 1000-bucket cap, `poolTvlDistribution.ts`'s
   `maxCount`) plus a progress check when stepping by a computed increment (a derived
   tick of 0/NaN must break, not spin). New loops get a termination unit test with
   degenerate inputs (0, NaN, inverted ranges, extreme magnitudes) — see
   `src/scripts/asset/__tests__/calculateDistribution.termination.test.ts`.
5. **Playwright hang regression must stay green:** `playwright/liquidity-pair-redirect.spec.ts`
   asserts navigations settle (bounded history-update count). When touching routing,
   pair ordering, or network switching, extend that spec with the new scenario.
6. **Never gate a PrimeVue `<Chart>` (or any component owning an expensive, async-
   initializing third-party instance) with `v-if` on state that can flip multiple times
   in a short window** (a shape/tab selector, a settling route pin, a watcher cascade).
   PrimeVue's Chart builds chart.js via an async `import().then()` with no unmount guard;
   a fast unmount+remount lets that stale callback fire on a torn-down instance, and
   chart.js throws an uncaught `"Cannot read properties of null (reading 'id')"` — this
   froze a tab after repeated clicks (orphaned chart.js instances compounding). Use
   `v-show` instead, with a stable non-null placeholder value if the component can't
   render before real data exists — see `AddLiquidity.vue`'s `chartDataStable` /
   `chartOptionsStable` and its `ROOT CAUSE` comment. Regression:
   `playwright/liquidity-chart-click.spec.ts`.

7. **No `watch(..., { immediate: true })` (or eager call) in a big `<script setup>` may reach a
   `const`/`let` declared further down the script.** The callback runs synchronously inside `setup()`,
   so it hits the temporal dead zone: `ReferenceError: Cannot access 'x' before initialization`.
   `app.config.errorHandler` (router/staleChunkReload.ts) mistakes that message for a stale chunk and
   **reloads the page** - users saw a flicker after "Create pool" and lost the page content (AddLiquidity's
   immediate `isAuthenticated` watcher ran `fetchData()` in setup). Do initial work in `onMounted`.
   Regression: `playwright/add-liquidity-no-reload.spec.ts` (fails on any setup error, signed in).
8. **`store.state` is shallow reactive: never watch `store.state.pair.asset.*` / `.currency.*`.**
   Several places swap `pair.asset` / `pair.currency` in place (AddLiquidity, AssetInfo, PageHeader,
   store), which such a watcher never sees - the Liquidity pools table kept the previous pair's
   pools after a pair switch. Watch the top-level `assetCode` / `currencyCode` / `pair` (see
   MyLiquidity.vue) and clear pair-scoped data as soon as the pair differs from what is loaded.
   Regression: `playwright/liquidity-pools-pair-switch.spec.ts`.

## Mobile layout

Every number field must stay readable at every width (the Add Liquidity digits were squeezed to ~2 px on phones AND on tablets /
small laptops, where the 3-column page left the form a ~175 px column). Rules:
- `ManageLiquidity.vue`: stacked on phones; from `md` a 2-column grid (pools | form) with the trades list below, so the depth chart
  and the form stay side by side; from `xl` three columns. The form column is the Tailwind named container `@container/form` (the trade page's order form is `@container/order`; app.css queries them by name).
- Field grids inside the forms use container widths (`grid-cols-1 @xl/form:grid-cols-2`), never viewport breakpoints or an unnamed `@2xl:`.
- `InputGroup` sizing lives in `app.css`: the `InputNumber` may shrink (`min-width: 0`; selectors with a third class because PrimeVue
  injects its theme CSS after `app.css`); stacked groups in a phone viewport, a form column < 44rem (the 2-column grid starts at 36rem and its cells are ~280-340 px: keep the two
  thresholds in step) or an order-form card < 28rem narrow PrimeVue's tokens from ONE
  definition (`--biatec-narrow-*`), so spinner and padding stay in step.
- Symbol labels next to a number use `SymbolAddon` (`src/components/SymbolAddon.vue`; caps itself at 45 %, ellipsis, full text as native title) - never a raw
  `InputGroupAddon` with text that can be long.
- Asset tables (Explore Assets, Trader, Liquidity provider) render the logo with `AssetLogo` (`src/components/AssetLogo.vue`) as the FIRST element of the name cell: a fixed 40 px slot (initial when there is no logo / it failed, failed urls cached for 5 min), so logos and names line up in one column.
- Touch phones get a 40 px menu toggle and >= 36 px buttons (dense tables / paginators / toasts excepted).
Regression: `playwright/mobile-layout.spec.ts` (every main route at 360/390 px, the add-liquidity fields from 360 to 1920 px, the
remove / swap / trade forms with a very long symbol, touch sizes). Details: copilot-instructions.md "Mobile layout".

## Notes

- Codebase has substantial commented-out code (alternate networks, legacy app IDs) — leave unless asked.
- Keep [.github/copilot-instructions.md](.github/copilot-instructions.md) in sync when conventions change (it asks to be updated each prompt); update this file too if the condensed facts shift.
- Deploy: Vercel, Docker (`docker/`), k8s (`k8s/`), GitHub Actions (`.github/workflows/`).
