import { defineConfigWithVueTs, vueTsConfigs } from '@vue/eslint-config-typescript'
import pluginVue from 'eslint-plugin-vue'
import pluginCypress from 'eslint-plugin-cypress'
import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'

export default defineConfigWithVueTs(
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,cjs,jsx,ts,mts,cts,tsx,vue}']
  },
  {
    name: 'app/files-to-ignore',
    ignores: [
      '**/dist/**',
      '**/dist-ssr/**',
      '**/coverage/**',
      '**/node_modules/**',
      'test-results/**',
      'playwright-report/**',
      'blob-report/**',
      'public/**',
      'cypress/videos/**',
      'cypress/screenshots/**',
      // generated files
      'auto-imports.d.ts',
      'components.d.ts',
      'src/api/**'
    ]
  },
  pluginVue.configs['flat/essential'],
  vueTsConfigs.recommended,
  {
    name: 'app/rule-overrides',
    rules: {
      // Legacy code has ~100 `any`s; new code should use `unknown` (see CLAUDE.md).
      // Kept visible as warnings so the count only ever goes down.
      '@typescript-eslint/no-explicit-any': 'warn',
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
          ignoreRestSiblings: true
        }
      ]
    }
  },
  {
    name: 'app/plain-js-scripts',
    files: ['**/*.{js,cjs}'],
    ignores: ['**/*.config.js'],
    rules: {
      '@typescript-eslint/no-require-imports': 'off'
    }
  },
  {
    ...pluginCypress.configs.recommended,
    files: [
      'cypress/e2e/**/*.{cy,spec}.{js,ts,jsx,tsx}',
      'cypress/support/**/*.{js,ts,jsx,tsx}',
      'cypress/**/__tests__/*.{js,ts,jsx,tsx}'
    ]
  },
  {
    name: 'app/cypress-overrides',
    files: ['cypress/**/*.{js,ts,jsx,tsx}'],
    rules: {
      // E2E tests intentionally use cy.wait for async chain settling (see
      // .github/copilot-instructions.md) and chai-style expression assertions.
      'cypress/no-unnecessary-waiting': 'off',
      'cypress/unsafe-to-chain-command': 'off',
      '@typescript-eslint/no-unused-expressions': 'off'
    }
  },
  skipFormatting
)
