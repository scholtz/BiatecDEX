/* eslint-disable */
/**
 * Generate localized screenshots for every Biatec DEX help use case.
 *
 * For each supported language and each use case it:
 *   1. sets the interface language (localStorage `biatec.locale`),
 *   2. optionally injects the auth bypass for auth-gated pages,
 *   3. navigates to the use case's feature route,
 *   4. saves a screenshot to public/help-screenshots/<locale>/<slug>.png.
 *
 * The help detail page (src/views/Help/HelpDetailView.vue) shows the image at
 *   {BASE_URL}help-screenshots/<locale>/<slug>.png
 * and hides it gracefully until it has been generated.
 *
 * Prerequisites: a running app. Start one first, e.g.
 *   npm run dev        (http://localhost:5173)
 *   npm run preview    (http://localhost:4173, after npm run build)
 * then point the script at it:
 *   PLAYWRIGHT_BASE_URL=http://localhost:5173 npm run generate:help-screenshots
 *
 * Useful flags / env:
 *   --lang en,sk        only these locales (default: all)
 *   --slug create-pool  only these use cases (default: all)
 *   --full              capture the full scrollable page (default: viewport)
 *   SETTLE_MS=4000      wait after load before the shot (charts/tables to fill)
 *
 * The use case list mirrors src/data/helpUseCases.ts — keep them in sync.
 */
import { chromium } from '@playwright/test'
import { mkdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outRoot = resolve(__dirname, '..', 'public', 'help-screenshots')

const ALL_LOCALES = ['en', 'sk', 'pl', 'hu', 'it', 'ru', 'zh', 'ko', 'de', 'es']

// slug + feature route (+ auth bypass) — mirrors src/data/helpUseCases.ts.
const useCases = [
  { slug: 'explore-assets', route: '/explore-assets' },
  { slug: 'find-asset-by-id', route: '/explore-assets' },
  { slug: 'connect-wallet', route: '/' },
  { slug: 'switch-language', route: '/' },
  { slug: 'switch-theme', route: '/' },
  { slug: 'trade-screen', route: '/trade/mainnet-v1.0/GD/USD' },
  { slug: 'buy-order', route: '/trade/mainnet-v1.0/GD/USD' },
  { slug: 'sell-order', route: '/trade/mainnet-v1.0/GD/USD' },
  { slug: 'market-depth', route: '/trade/mainnet-v1.0/GD/USD' },
  { slug: 'recent-trades', route: '/trade/mainnet-v1.0/GD/USD' },
  { slug: 'pool-swap', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'select-pair', route: '/trade/mainnet-v1.0/GD/USD' },
  { slug: 'price-chart', route: '/trade/mainnet-v1.0/GD/USD' },
  { slug: 'asset-info', route: '/trade/mainnet-v1.0/GD/USD' },
  { slug: 'share-pair', route: '/trade/mainnet-v1.0/GD/USD' },
  { slug: 'liquidity-dashboard', route: '/liquidity-provider', bypass: true },
  { slug: 'create-pool', route: '/explore-assets' },
  { slug: 'add-liquidity-focused', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'add-liquidity-spread', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'add-liquidity-equal', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'add-liquidity-single', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'add-liquidity-wall', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'remove-liquidity', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'manage-liquidity', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'review-before-sign', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'liquidity-shapes', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'lp-fee-tiers', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'price-range', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'precision-bins', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'pool-costs-mbr', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'trader-dashboard', route: '/trader', bypass: true },
  { slug: 'asset-opt-in', route: '/trader/asset-opt-in', bypass: true },
  { slug: 'copy-address', route: '/trader', bypass: true },
  { slug: 'disconnect-wallet', route: '/trader', bypass: true },
  { slug: 'switch-network', route: '/settings' },
  { slug: 'settings-blockchain', route: '/settings' },
  { slug: 'settings-swap', route: '/settings' },
  { slug: 'reset-settings', route: '/settings' },
  { slug: 'tx-validity', route: '/settings' },
  { slug: 'localnet-dev', route: '/settings' },
  { slug: 'about', route: '/about' },
  { slug: 'documentation', route: '/about' },
  { slug: 'security-best-practices', route: '/about' },
  { slug: 'help-center', route: '/help' }
]

// ── CLI args / env ──────────────────────────────────────────────────────────
function argValue(name) {
  const i = process.argv.indexOf(name)
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : null
}
const fullPage = process.argv.includes('--full')
const settleMs = Number(process.env.SETTLE_MS ?? 4000)
const baseURL = (process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:4173').replace(/\/$/, '')

const langFilter = argValue('--lang')
const locales = langFilter ? langFilter.split(',').map((s) => s.trim()) : ALL_LOCALES
const slugFilter = argValue('--slug')
const selectedUseCases = slugFilter
  ? useCases.filter((u) =>
      slugFilter
        .split(',')
        .map((s) => s.trim())
        .includes(u.slug)
    )
  : useCases

async function run() {
  console.log(`Base URL: ${baseURL}`)
  console.log(`Locales: ${locales.join(', ')}`)
  console.log(`Use cases: ${selectedUseCases.length}`)
  console.log(`Mode: ${fullPage ? 'full page' : 'viewport'}, settle ${settleMs}ms\n`)

  const browser = await chromium.launch()
  let ok = 0
  let failed = 0

  try {
    for (const locale of locales) {
      mkdirSync(resolve(outRoot, locale), { recursive: true })

      for (const useCase of selectedUseCases) {
        const context = await browser.newContext({
          viewport: { width: 1440, height: 900 },
          deviceScaleFactor: 1
        })
        const page = await context.newPage()

        // Apply locale, light theme and (optionally) the auth bypass before any load.
        await page.addInitScript(
          ({ loc, bypass }) => {
            try {
              window.localStorage.setItem('biatec.locale', loc)
              window.localStorage.setItem('biatec-theme', 'light')
            } catch {
              /* ignore */
            }
            if (bypass) {
              window.__BIATEC_E2E = {}
            }
          },
          { loc: locale, bypass: !!useCase.bypass }
        )

        const target = `${baseURL}${useCase.route}`
        const outFile = resolve(outRoot, locale, `${useCase.slug}.png`)
        try {
          await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60_000 })
          // App shell mounted (header logo) = page is alive.
          await page.locator('.svg-image').first().waitFor({ state: 'visible', timeout: 30_000 })
          // Let charts, tables and live data settle.
          await page.waitForTimeout(settleMs)
          await page.screenshot({ path: outFile, fullPage })
          ok++
          console.log(`  ✓ ${locale}/${useCase.slug}.png`)
        } catch (err) {
          failed++
          console.warn(`  ✗ ${locale}/${useCase.slug} (${useCase.route}): ${err.message}`)
        } finally {
          await context.close()
        }
      }
    }
  } finally {
    await browser.close()
  }

  console.log(`\nDone. ${ok} screenshot(s) written, ${failed} failed.`)
  console.log(`Output: ${outRoot}`)
  if (failed > 0) process.exitCode = 1
}

run().catch((err) => {
  console.error(err)
  process.exit(1)
})
