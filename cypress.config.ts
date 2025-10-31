import { defineConfig } from 'cypress'
import * as fs from 'fs'
import * as path from 'path'
import * as dotenv from 'dotenv'
// import installLogsPrinter from 'cypress-terminal-report/src/installLogsPrinter'

// Load environment variables from .env file
// Explicitly specify path for Windows compatibility
const envPath = path.resolve(process.cwd(), '.env')
const result = dotenv.config({ path: envPath })

if (result.error) {
  console.warn('Failed to load .env file:', result.error)
} else {
  console.log('Successfully loaded .env file from:', envPath)
  console.log('LIQUIDITY_TEST_EMAIL:', process.env.LIQUIDITY_TEST_EMAIL)
  console.log('LIQUIDITY_TEST_PASSWORD:', process.env.LIQUIDITY_TEST_PASSWORD ? '***' : 'NOT SET')
}

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

      const logsDir = path.join(config.projectRoot, 'cypress', 'logs')
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true })
      }

      let currentLogFile: string | null = null
      let logStream: fs.WriteStream | null = null

      // Create log file for each spec
      on('before:spec', (spec) => {
        console.log(`[cypress] starting spec: ${spec.relative}`)

        const specName = spec.relative.replace(/[/\\]/g, '-').replace(/\.(cy|spec)\.(ts|js)$/, '')
        currentLogFile = path.join(logsDir, `${specName}-${Date.now()}.log`)
        logStream = fs.createWriteStream(currentLogFile, { flags: 'a' })
        logStream.write(
          `\n=== Test started: ${spec.relative} at ${new Date().toISOString()} ===\n\n`
        )
      })

      // Collect browser console logs
      on('task', {
        log(message: string) {
          console.log(message)
          if (logStream && !logStream.closed) {
            logStream.write(`${message}\n`)
          }
          return null
        }
      })

      // Close log stream after spec
      on('after:spec', (spec, results) => {
        if (logStream && !logStream.closed) {
          logStream.write(`\n=== Test ended: ${spec.relative} at ${new Date().toISOString()} ===\n`)
          logStream.write(
            `Tests: ${results.stats.tests}, Passed: ${results.stats.passes}, Failed: ${results.stats.failures}\n`
          )
          logStream.end()
        }
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
