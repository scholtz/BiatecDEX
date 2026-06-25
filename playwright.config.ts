import { defineConfig, devices } from '@playwright/test'

/**
 * Playwright configuration for Biatec DEX end-to-end tests.
 *
 * Two suites live under ./playwright:
 *  - mainnet-walkthrough.spec.ts : read-only navigation through every page
 *    (never submits a transaction, so no pools are affected).
 *  - testnet-lifecycle.spec.ts   : full ALGO / testnet-USDC pool lifecycle
 *    (create, add liquidity, swap, remove). Requires a funded test account –
 *    see the env vars at the top of that spec. Skipped when not configured.
 *
 * Base URL:
 *  - Defaults to the Vite preview server on :4173 (same as the Cypress setup).
 *  - Set PLAYWRIGHT_BASE_URL to point at an already-running server (e.g. the
 *    dev server on http://localhost:5173); in that case Playwright will NOT
 *    start/stop a server for you.
 */
const externalBaseUrl = process.env.PLAYWRIGHT_BASE_URL
const baseURL = externalBaseUrl || 'http://localhost:4173'

export default defineConfig({
  testDir: './playwright',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [['list'], ['html', { open: 'never' }]],
  timeout: 120_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    viewport: { width: 1920, height: 1080 },
    trace: 'on-first-retry',
    video: 'retain-on-failure',
    screenshot: 'only-on-failure',
    actionTimeout: 20_000,
    navigationTimeout: 60_000
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] }
    }
  ],
  // Only manage a server when no external base URL was provided.
  webServer: externalBaseUrl
    ? undefined
    : {
        command: 'npm run start',
        url: baseURL,
        reuseExistingServer: !process.env.CI,
        timeout: 300_000
      }
})
