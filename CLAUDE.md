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
- **Orval** generates the typed Axios client into `src/api/` — do not hand-edit.

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

The CLAMM uses **logarithmic ticks**: a tick is a fixed *fraction* of the price, so the tick width scales with magnitude and stays reasonable everywhere (≈100 near price 1000, ≈1e-6 near price 0.001). **`precision` controls how wide the tick is** — lower precision = wider ticks (`precision: 1` widest usable, `0` = the extra-wide level added for Add Liquidity), higher precision = finer ticks. Any change to the tick math MUST preserve these invariants and stay consistent across these pieces:

- **`scripts/asset/priceTickDecimals.ts`** — canonical "how many decimals is reasonable at this price/precision" (`tick = 10^-priceTickDecimals`). Treat it as the reference for the logarithmic scheme; `formatNumber` and Add Liquidity's input decimals derive from it.
- **`scripts/asset/initPriceDecimals.ts`** — returns `{ tick, priceDecimals, fitPrice }` per price; used to build the grid. Its raw sub-1 tick can be non-round (e.g. 0.9 → 0.09), so **never bind that raw tick straight to the UI**.
- **`scripts/asset/calculateDistribution.ts`** — walks `initPriceDecimals` and **dedups overlaps**, yielding the clean, log-spaced `min[]/max[]` grid (e.g. `0.90→1.00` in one cell). This grid is the source of truth for the slider and for snapping.
- **`components/LiquidityComponents/AddLiquidity.vue`** — the price range must be usable via **both** the number inputs and the slider. Rules already in place, keep them: InputNumber `:step` = the distribution **cell width** (`distributionCellWidth`), not the raw tick; input decimals = `tickDecimals(step)` (log-scaled); typed values snap to the nearest grid boundary via `snapMin/MaxPriceToGrid` and **clamp at the first/last tick** so edges don't break; pool bounds arriving via route query pin exactly through `activeRouteRange`.

When editing any of the above, re-verify with `src/scripts/asset/__tests__/calculateDistribution.test.ts` and spot-check extremes (price ~1000 and ~0.001) still produce reasonable, non-overlapping ticks.

## Notes

- Codebase has substantial commented-out code (alternate networks, legacy app IDs) — leave unless asked.
- Keep [.github/copilot-instructions.md](.github/copilot-instructions.md) in sync when conventions change (it asks to be updated each prompt); update this file too if the condensed facts shift.
- Deploy: Vercel, Docker (`docker/`), k8s (`k8s/`), GitHub Actions (`.github/workflows/`).
