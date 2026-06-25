/* eslint-disable */
/**
 * Generate localized screenshots for every Biatec DEX help use case.
 *
 * For each supported language and each use case it:
 *   1. sets the interface language (localStorage `biatec.locale`),
 *   2. authenticates via ARC-76 email/password (when credentials are provided)
 *      or injects the E2E auth bypass for auth-gated pages (fallback),
 *   3. navigates to the use case's feature route,
 *   4. optionally scrolls to a specific element (scrollTo selector),
 *   5. saves a single localized image under public/help-screenshots/<locale>/<slug>/:
 *        overview.png   - shown at the top of the guide
 *
 * Why one image per use case (no per-step images):
 *   Every step of a use case lives on the same screen — there is no distinct
 *   page state per step. Generating identical step-N.png copies of overview.png
 *   caused every help guide to show the same screenshot (N+1) times. The
 *   HelpDetailView now shows the overview once alongside all step text.
 *
 * Why same-route use cases previously looked identical:
 *   Many use cases point to the same app route (e.g. 9 trading guides all use
 *   /trade/mainnet-v1.0/GD/USD). Without any scroll/focus action, each
 *   captured the exact same viewport. The `scrollTo` field on each use case
 *   scrolls a CSS-selected element into view before the shot, producing a
 *   viewport that highlights the relevant part of the UI.
 *
 * Authentication:
 *   Set HELP_SCREENSHOT_EMAIL and HELP_SCREENSHOT_PASSWORD in the environment
 *   to use real ARC-76 wallet authentication for auth-gated pages (recommended
 *   for production screenshots). Without credentials the script falls back to
 *   the window.__BIATEC_E2E bypass which renders pages without a wallet.
 *
 * Prerequisites: a running app. Start one first, e.g.
 *   npm run dev        (http://localhost:5173)
 *   npm run preview    (http://localhost:4173, after npm run build)
 * then point the script at it:
 *   PLAYWRIGHT_BASE_URL=http://localhost:5173 npm run generate:help-screenshots
 *
 * Useful flags / env:
 *   --lang en,sk                    only these locales (default: all)
 *   --slug create-pool              only these use cases (default: all)
 *   --full                          capture the full scrollable page (default: viewport)
 *   SETTLE_MS=4000                  wait after load before the shot (charts/tables to fill)
 *   HELP_SCREENSHOT_EMAIL=...       ARC-76 account email for auth-gated pages
 *   HELP_SCREENSHOT_PASSWORD=...    ARC-76 account password for auth-gated pages
 *
 * The use case list mirrors src/data/helpUseCases.ts — keep them in sync.
 */
import { chromium } from '@playwright/test'
import { mkdirSync, writeFileSync } from 'node:fs'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const outRoot = resolve(__dirname, '..', 'public', 'help-screenshots')

// Step count is only used for logging; step images are no longer written.
const enLocale = JSON.parse(
  readFileSync(resolve(__dirname, '..', 'src', 'locales', 'en.json'), 'utf8')
)
const helpI18n = enLocale?.views?.help?.useCases ?? {}
function stepCountFor(slug) {
  const raw = helpI18n[slug]?.steps
  if (!raw) return 0
  return String(raw)
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean).length
}

const ALL_LOCALES = ['en', 'sk', 'pl', 'hu', 'it', 'ru', 'zh', 'ko', 'de', 'es']

/**
 * Use cases — mirrors src/data/helpUseCases.ts.
 *
 * Fields:
 *   slug     — unique key (also the output directory name)
 *   route    — in-app route to navigate to
 *   bypass   — page requires wallet auth; use real credentials or E2E bypass
 *   scrollTo — CSS selector: scroll this element into view before the shot.
 *              Use it to differentiate use cases that share the same route so
 *              each capture highlights the relevant UI region.
 */
const useCases = [
  // ── Getting started ──────────────────────────────────────────────────────
  { slug: 'explore-assets', route: '/explore-assets' },
  { slug: 'find-asset-by-id', route: '/explore-assets' },
  { slug: 'connect-wallet', route: '/' },
  { slug: 'switch-language', route: '/' },
  { slug: 'switch-theme', route: '/' },

  // ── Trading (all on the same route — scrollTo differentiates the capture) ─
  { slug: 'trade-screen', route: '/trade/mainnet-v1.0/GD/USD' },
  { slug: 'buy-order', route: '/trade/mainnet-v1.0/GD/USD', scrollTo: '#price-bid' },
  { slug: 'sell-order', route: '/trade/mainnet-v1.0/GD/USD', scrollTo: '#price-offer' },
  { slug: 'market-depth', route: '/trade/mainnet-v1.0/GD/USD', scrollTo: '.depth-bids' },
  { slug: 'recent-trades', route: '/trade/mainnet-v1.0/GD/USD' },
  { slug: 'pool-swap', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'select-pair', route: '/trade/mainnet-v1.0/GD/USD' },
  { slug: 'price-chart', route: '/trade/mainnet-v1.0/GD/USD', scrollTo: '#chart' },
  { slug: 'asset-info', route: '/trade/mainnet-v1.0/GD/USD' },
  { slug: 'share-pair', route: '/trade/mainnet-v1.0/GD/USD' },

  // ── Liquidity ─────────────────────────────────────────────────────────────
  { slug: 'liquidity-dashboard', route: '/liquidity-provider', bypass: true },
  { slug: 'create-pool', route: '/explore-assets' },
  { slug: 'add-liquidity-focused', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'add-liquidity-spread', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'add-liquidity-equal', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'add-liquidity-single', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'add-liquidity-wall', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'remove-liquidity', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true, scrollTo: '[data-cy="remove-percent"]' },
  { slug: 'manage-liquidity', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'review-before-sign', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'liquidity-shapes', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'lp-fee-tiers', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'price-range', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true, scrollTo: '[data-cy="low-price-group"]' },
  { slug: 'precision-bins', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },
  { slug: 'pool-costs-mbr', route: '/liquidity/mainnet-v1.0/GD/USD', bypass: true },

  // ── Account ───────────────────────────────────────────────────────────────
  { slug: 'trader-dashboard', route: '/trader', bypass: true },
  { slug: 'asset-opt-in', route: '/trader/asset-opt-in', bypass: true },
  { slug: 'copy-address', route: '/trader', bypass: true },
  { slug: 'disconnect-wallet', route: '/trader', bypass: true },

  // ── Networks & settings (scrollTo differentiates within the same page) ────
  { slug: 'switch-network', route: '/settings' },
  { slug: 'settings-blockchain', route: '/settings' },
  { slug: 'settings-swap', route: '/settings', scrollTo: '#slippage' },
  { slug: 'reset-settings', route: '/settings', scrollTo: '.border-red-200' },
  { slug: 'tx-validity', route: '/settings', scrollTo: '#lastRoundOffset' },
  { slug: 'localnet-dev', route: '/settings', scrollTo: '.pi-desktop' },

  // ── Information ───────────────────────────────────────────────────────────
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

const authEmail = process.env.HELP_SCREENSHOT_EMAIL ?? ''
const authPassword = process.env.HELP_SCREENSHOT_PASSWORD ?? ''
const hasCredentials = !!(authEmail && authPassword)

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

/**
 * Perform ARC-76 email/password login via the algorand-authentication form.
 * The form renders inside the auth gate when authorizedOnlyAccess=true.
 * Waits until window.__authStore.isAuthenticated === true.
 */
async function login(page, email, password) {
  // The auth gate may show a "Login" button to open the form.
  const loginBtn = page.getByRole('button', { name: /^login$/i })
  if (await loginBtn.isVisible({ timeout: 5_000 }).catch(() => false)) {
    await loginBtn.click()
  }

  const emailInput = page.locator('#e')
  await emailInput.waitFor({ state: 'visible', timeout: 30_000 })
  await emailInput.fill(email)
  await page.locator('#p').fill(password)
  await page.getByRole('button', { name: /continue/i }).click()

  await page.waitForFunction(
    () =>
      (window).__authStore?.isAuthenticated === true,
    undefined,
    { timeout: 45_000 }
  )
}

async function run() {
  console.log(`Base URL  : ${baseURL}`)
  console.log(`Locales   : ${locales.join(', ')}`)
  console.log(`Use cases : ${selectedUseCases.length}`)
  console.log(`Mode      : ${fullPage ? 'full page' : 'viewport'}, settle ${settleMs}ms`)
  console.log(`Auth      : ${hasCredentials ? 'real ARC-76 credentials (env HELP_SCREENSHOT_EMAIL/PASSWORD)' : 'E2E bypass (window.__BIATEC_E2E) — set credentials for richer screenshots'}\n`)

  const browser = await chromium.launch()
  let ok = 0
  let failed = 0

  try {
    for (const locale of locales) {
      mkdirSync(resolve(outRoot, locale), { recursive: true })

      // When using real credentials we share one authenticated context per
      // locale so that subsequent auth-gated pages don't need to log in again.
      // The context is created fresh per locale so the locale localStorage key
      // is set before any navigation.
      let sharedAuthContext = null

      for (const useCase of selectedUseCases) {
        const dir = resolve(outRoot, locale, useCase.slug)
        mkdirSync(dir, { recursive: true })

        // Decide authentication strategy for this use case.
        // bypass=true  + credentials → real ARC-76 login (shared context after first login)
        // bypass=true  + no creds    → window.__BIATEC_E2E bypass (separate context each time)
        // bypass=false               → no auth needed (separate context each time)
        const needsAuth = !!useCase.bypass
        const useRealAuth = needsAuth && hasCredentials
        const useBypass = needsAuth && !hasCredentials

        let context
        let ownContext = false

        if (useRealAuth) {
          if (!sharedAuthContext) {
            // Create the shared authenticated context for this locale.
            sharedAuthContext = await browser.newContext({
              viewport: { width: 1920, height: 1080 },
              deviceScaleFactor: 1
            })
            const setupPage = await sharedAuthContext.newPage()
            await setupPage.addInitScript(({ loc }) => {
              try {
                window.localStorage.setItem('biatec.locale', loc)
                window.localStorage.setItem('biatec-theme', 'light')
              } catch { /* ignore */ }
            }, { loc: locale })
            // Navigate to root to trigger the auth gate.
            await setupPage.goto(`${baseURL}/trader`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
            await setupPage.locator('.p-menubar').first().waitFor({ state: 'attached', timeout: 60_000 })
            await login(setupPage, authEmail, authPassword)
            await setupPage.close()
            console.log(`  ✓ authenticated (${locale})`)
          }
          context = sharedAuthContext
        } else {
          context = await browser.newContext({
            viewport: { width: 1920, height: 1080 },
            deviceScaleFactor: 1
          })
          ownContext = true
        }

        const page = await context.newPage()

        if (!useRealAuth) {
          // Set locale/theme and optionally the E2E bypass before load.
          await page.addInitScript(
            ({ loc, bypass }) => {
              try {
                window.localStorage.setItem('biatec.locale', loc)
                window.localStorage.setItem('biatec-theme', 'light')
              } catch { /* ignore */ }
              if (bypass) {
                window.__BIATEC_E2E = {}
              }
            },
            { loc: locale, bypass: useBypass }
          )
        }

        const target = `${baseURL}${useCase.route}`
        try {
          await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 60_000 })
          await page.locator('.p-menubar').first().waitFor({ state: 'attached', timeout: 60_000 })
          await page.waitForTimeout(settleMs)

          // Scroll the relevant element into view (if specified) so the
          // viewport highlights the feature rather than the page top.
          if (useCase.scrollTo) {
            try {
              const el = page.locator(useCase.scrollTo).first()
              await el.waitFor({ state: 'attached', timeout: 10_000 })
              await el.scrollIntoViewIfNeeded()
              // Short pause after scroll so the viewport stabilises.
              await page.waitForTimeout(300)
            } catch {
              // Selector not found — fall back to default viewport (not fatal).
              console.warn(`    ↳ scrollTo "${useCase.scrollTo}" not found for ${useCase.slug}, using default viewport`)
            }
          }

          const buf = await page.screenshot({ fullPage })
          writeFileSync(resolve(dir, 'overview.png'), buf)
          ok++
          const steps = stepCountFor(useCase.slug)
          console.log(`  ✓ ${locale}/${useCase.slug}/ (overview.png, ${steps} step(s) in guide${useCase.scrollTo ? `, scrollTo ${useCase.scrollTo}` : ''})`)
        } catch (err) {
          failed++
          console.warn(`  ✗ ${locale}/${useCase.slug} (${useCase.route}): ${err.message}`)
        } finally {
          await page.close()
          if (ownContext) await context.close()
        }
      }

      if (sharedAuthContext) {
        await sharedAuthContext.close()
        sharedAuthContext = null
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
