# CLAUDE.md

Concise guidance for AI assistants. This file loads into context every session, so it stays small — **for full detail, read [.github/copilot-instructions.md](.github/copilot-instructions.md)** (the maintained source of truth for conventions, testing, and task recipes). Read it only when the task needs that depth; don't re-explore the codebase otherwise.

## Project

Biatec DEX — Vue 3 + TypeScript SPA for a Concentrated Liquidity AMM (CLAMM) on Algorand. Trader dashboard, liquidity-provider dashboard, asset opt-in, market depth, i18n. Funded by Algorand Foundation xGov#80.

## Stack

- **Vue 3** Composition API (`<script setup lang="ts">`) + **Vite 6** + **TypeScript** (strict, no `any` → use `unknown`).
- **PrimeVue 4** (Aura theme, `p` prefix, `.p-dark`) — auto-imported via `unplugin-vue-components`. Do NOT manually import PrimeVue components.
- **Pinia** (`src/stores/app.ts` → `useAppStore`), **Vue Router 4** (lazy routes), **vue-i18n 11**.
- **Tailwind CSS 4** + `tailwindcss-primeui`. Prefer utility classes; avoid inline styles.
- **Algorand**: `algosdk`, `@algorandfoundation/algokit-utils`, `@txnlab/use-wallet-vue`, `algorand-authentication-component-vue`, `biatec-concentrated-liquidity-amm` (contract clients), `@microsoft/signalr` (live trades).
- **Orval** generates the typed Axios client into `src/api/` — do not hand-edit. Input is the **testnet** swagger (`api.testnet.scan.biatec.io`) because testnet runs the newest AVMTradeReporter build, so new backend fields appear there first (runtime base URL is still per-network via `service/tradeApi.ts`). After `npm run generate:api`, run Prettier on `src/api/**` — raw Orval output uses semicolons and would otherwise produce a huge formatting-only diff. Generated model fields are **all optional**: guard ids (`if (x.assetId === undefined)`) and default numerics (`?? 0`/`?? null`) at mapping boundaries.

## Commands

- `npm run dev` — dev server. `npm run build` — type-check + build.
- `npm run type-check` — `vue-tsc --noEmit`; **run after changes to validate** (lint config is mid ESLint-v9 migration and may fail).
- `npm run format` — Prettier. `npm run test:unit` — Vitest. `npm run test:e2e` — Cypress (Edge, runs against preview on :4173).
- `npm run generate:api` — regenerate Orval client.

## Layout (`src/`)

`main.ts` bootstrap (networks, plugins) · `stores/app.ts` central state + `setChain()` · `router/` (pair/pool in URL params) · `views/` pages (TraderDashboard, LiquidityProviderDashboard, ManageLiquidity, AssetOptIn, AllAssetsView, Info/, Settings/) · `components/` (TradingComponents/, LiquidityComponents/, icons/) · `composables/` (`useTraderDashboard`, `useLiquidityProviderDashboard`, `useRouteParams`) · `scripts/` pure logic (algo/, asset/, clamm/, common/, folks/) · `service/` (AssetsService, authService, signalrService) · `interface/` (`I`-prefixed) · `types/` · `api/` (generated) · `locales/`.

## Conventions

- **Formatting (Prettier, enforced)**: no semicolons, single quotes, 2-space indent, `printWidth` 100, no trailing commas. Match exactly.
- **Components**: typed `defineProps`/`defineEmits` (use `withDefaults` for optional props); reusable logic → composables.
- **i18n**: every user-facing string via `t()` / `$t()`; English (`en.json`) is primary. Add each new key to **all 10 locale files**: `en, sk, pl, hu, it, ru, zh, ko, de, es`.
- **Tables (PrimeVue DataTable)**: right-align numeric/last columns with `class="text-right"`; use `formatNumber()`/`formatUsd()` helpers. For header tooltips, omit `:header` and use `<template #header>` with a `v-tooltip.top` span (avoids duplicate text) — add tooltip keys under `tooltips.tables` in all locales.
- **Algorand**: app IDs/amounts are `bigint` (e.g. `3074197827n`) — use `scripts/common/safeBigInt.ts`; `bignumber.js` for decimals; assets typically 6 decimals; check opt-in before transactions; never commit keys/mnemonics.
- **Path alias**: `@/` → `src/`. **Toasts**: PrimeVue `useToast()`.
- **Tests**: Vitest `*.spec.ts`/`*.test.ts` in `__tests__/`. Cypress E2E use real APIs/data (no mocking) and a `.env` test account (`LIQUIDITY_TEST_EMAIL/PASSWORD`); rebuild before running. See the Copilot file for E2E debug helpers and patterns.

## Tick / price-range system (Add Liquidity)

The CLAMM uses **logarithmic ticks**: a tick is a fixed _fraction_ of the price, so the tick width scales with magnitude and stays reasonable everywhere (≈100 near price 1000, ≈1e-6 near price 0.001). **`precision` controls how wide the tick is** — lower precision = wider ticks, higher precision = finer ticks.

**The tick math is owned by the shared npm package `biatec-concentrated-liquidity-amm`** (repo `../BiatecCLAMM`, `src/ticks/`) so the frontend and every integrator snap to the same ticks. Prefer the package's number-based exports; do NOT fork the math into the frontend. Key exports: `TICK_TYPES`/`TickType` (`'wide'|'normal'|'narrow'`), `precisionForTickType`/`tickTypeForPrecision` (code↔number map: **wide=0, normal=1, narrow=2**), `getTickSize`/`cleanLogTick` (clean 1/2/5×10^k tick for a price), `tickDecimals`, `snapPriceToTick`, plus primitives `initPriceDecimals`/`priceTickDecimals`. `initPriceDecimals(price: bigint, precision?: bigint)` returns fixed-point `bigint` (scaled by `TICK_FIXED_SCALE`, convert via `toFixedBigInt`/`fromFixedBigInt`) — a native primitive, **not** a foreign BigNumber instance, so it's safe to consume directly (not just its number-returning exports). To change the ticks, edit `../BiatecCLAMM/src/ticks/`, run its `test:ticks`, `npm run build-package`, publish, then bump the dep here.

**Two distinct tick concepts — do not conflate them:**

- **Raw tick** (`initPriceDecimals`) — the actual bins pools are created on. Non-round for sub-1 prices (price 0.9 → tick 0.09). This is what `scripts/asset/calculateDistribution.ts` walks (dedupping overlaps) to build the `min[]/max[]` grid for AddLiquidity's slider/chart, and what the pool liquidity depth chart (`scripts/clamm/poolTvlDistribution.ts`) walks directly from the package for its bucket boundaries — **any code that needs to match the ticks pools are actually bounded by must use the raw primitive, not the clean wrapper below.**
- **Clean tick** (`cleanLogTick`/`getTickSize`/`snapPriceToTick`) — a UI-only convenience wrapper that rounds the raw tick to a nice 1/2/5×10^k value (0.09 → 0.1). Used for the AddLiquidity `InputNumber` step/decimals (a stepper doesn't need to be the exact bin width) and for cosmetic axis-label decimal counts. **Do not use this for anything that must align with real pool bounds** — that was the cause of a chart/form tick-size mismatch bug once already.

Frontend pieces that stay local and MUST remain consistent with the package:

- **`scripts/asset/priceTickDecimals.ts`** — thin re-export of the package's `priceTickDecimals`.
- **`scripts/asset/initPriceDecimals.ts`** — local BigNumber copy (mirrors the package's raw tick algorithm; kept local to avoid a _different_ cross-instance BigNumber hazard elsewhere in this file's call chain) used by `calculateDistribution`.
- **`scripts/asset/calculateDistribution.ts`** — walks `initPriceDecimals` and **dedups overlaps** into the non-overlapping, log-spaced `min[]/max[]` grid (e.g. `0.90→1.00` in one cell) for the slider/chart. This grid is the **raw** tick grid, not the clean one.
- **`scripts/clamm/poolTvlDistribution.ts`** — the pool liquidity depth chart's TVL-per-tick math (see the Domain-Specific Knowledge → Market Depth section of copilot-instructions.md). Builds its bucket boundaries by walking the package's `initPriceDecimals` directly (forward from a window edge, and backward from the current price — `initPriceDecimals` only steps forward, so the backward walk re-derives each local tick from the primitive rather than computing it independently), mirroring `calculateDistribution.ts`'s algorithm so its buckets use the same raw tick sizes as pools are actually created on. Wall pools (`pMin === pMax`) sitting exactly on a grid boundary become standalone zero-width `isWall` buckets (thin blue bars); clicking one publishes `liquidityPriceRange` with `min === max`, which AddLiquidity maps to the `wall` shape — **never feed `low === high` into the pin machinery** (range-only; oscillates). See copilot-instructions.md's Cross-panel sync section.
- **`components/LiquidityComponents/AddLiquidity.vue`** — price range usable via **both** number inputs and slider. Keep: InputNumber `:step` = `cleanLogTick(price, precision)` (from the package, window-independent, correct at any magnitude); input decimals = `tickDecimals(step)`; typed values snap to the nearest grid boundary via `snapMin/MaxPriceToGrid` and **clamp at the first/last tick**; tick width is chosen as a localized **tick type** (`selectTickType`/`currentTickType`, labels under `components.addLiquidity.tickTypes.*` in all 10 locales) that maps to `state.precision`; pool bounds from the route query pin exactly through `activeRouteRange`.
  - **Reactive-loop hazard:** `setChartData` writes `state.distribution` and calls `setSliderAndTick` → `initPriceDecimalsState` → `setChartData`, guarded only by the `lastDistributionParams` equality check. Do NOT add a `watch(() => state.distribution)` (circular), and do NOT mutate the window (`minPrice/maxPrice`) or the range inside that chain in a way that can't reach a fixed point, or Vue throws "Maximum recursive updates exceeded" and the slider/inputs freeze. `setSliderAndTick` must latch `ticksCalculated = true` after the first distribution pass.

When editing, re-verify with `src/scripts/asset/__tests__/calculateDistribution.test.ts` here and `__test__/Ticks.test.ts` in BiatecCLAMM, and spot-check extremes (price ~1000 and ~0.001).

**Before touching price-range wiring in `AddLiquidity.vue`** (route query, the pool liquidity depth chart, or any new inbound sync), read copilot-instructions.md's "AddLiquidity.vue's route-pin state machine" and "Cross-panel sync" sections first — `pendingRouteRange`/`activeRouteRange`/`isApplyingRouteRange`/`applyRouteBoundsIfReady` are a specific, non-obvious mechanism, separate from the reactive-loop hazard above, and re-deriving it by reading the ~3400-line file is expensive. The pool liquidity depth chart (`components/LiquidityComponents/PoolsLiquidityChart.vue`, math in `scripts/clamm/poolTvlDistribution.ts`) and its store-based sync with this panel (`store.state.liquidityTickPrecision`/`liquidityPriceRange`) are documented there too.

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

The app froze users' tabs twice (infinite router redirect loop; reactive watcher cascade).
These rules apply to EVERY change; violating any of them can hang the main thread in
production, where Vue's recursive-update detection does not exist:

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

## Notes

- Codebase has substantial commented-out code (alternate networks, legacy app IDs) — leave unless asked.
- Keep [.github/copilot-instructions.md](.github/copilot-instructions.md) in sync when conventions change (it asks to be updated each prompt); update this file too if the condensed facts shift.
- Deploy: Vercel, Docker (`docker/`), k8s (`k8s/`), GitHub Actions (`.github/workflows/`).
