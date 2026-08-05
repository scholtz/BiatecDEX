import { fileURLToPath } from 'node:url'
import { mergeConfig, defineConfig, configDefaults } from 'vitest/config'
import viteConfig from './vite.config'

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      // playwright/** are @playwright/test specs — collecting them under vitest
      // fails at import time ("Playwright Test did not expect test.describe()").
      exclude: [...configDefaults.exclude, 'e2e/*', 'playwright/**'],
      root: fileURLToPath(new URL('./', import.meta.url))
    }
  })
)
