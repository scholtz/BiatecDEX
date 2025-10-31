import { defineConfig } from 'cypress'
// import installLogsPrinter from 'cypress-terminal-report/src/installLogsPrinter'

export default defineConfig({
  video: true, // ensure videos are recorded
  //videoCompression: 15, // high quality video compression (lower CRF = better quality)
  screenshotOnRunFailure: true,
  retries: {
    runMode: 0,
    openMode: 0
  },
  e2e: {
    specPattern: 'cypress/e2e/**/*.{cy,spec}.{js,jsx,ts,tsx}',
    baseUrl: 'http://localhost:4173',
    video: true,
    // Match Electron/Chromium headless recording resolution to avoid scaling "zoom".
    // Recorder typically outputs 1280x720, so set viewport accordingly.
    viewportWidth: 1920,
    viewportHeight: 1080,
    env: {
      DISABLE_COMMAND_LOG: false, // toggle to hide runner command log/sidebar in headless videos
      LIQUIDITY_TEST_EMAIL: process.env.LIQUIDITY_TEST_EMAIL || 'test@biatec.io',
      // Do NOT hardcode password; read from environment. Provide empty default so test can assert presence.
      LIQUIDITY_TEST_PASSWORD: process.env.LIQUIDITY_TEST_PASSWORD || ''
    },
    setupNodeEvents(on: Cypress.PluginEvents, config: Cypress.PluginConfigOptions) {
      // Install cypress-terminal-report plugin
      // installLogsPrinter(on, {
      //   printLogsToConsole: 'always'
      // })

      // Log start/end of each spec for easier debugging
      on('before:spec', (spec) => {
        console.log(`[cypress] starting spec: ${spec.relative}`)
      })
      // Ensure Chromium browsers launch with matching window size & scale factor
      on('before:browser:launch', (browser, launchOptions) => {
        if (browser.family === 'chromium') {
          // Force window size; device scale factor 1 prevents DPI scaling zoom
          launchOptions.args.push('--window-size=1920,1080')
          launchOptions.args.push('--force-device-scale-factor=1')
        }
        return launchOptions
      })
      return config
    }
  }
})
