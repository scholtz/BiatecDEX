import viteCompression from 'vite-plugin-compression'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import Components from 'unplugin-vue-components/vite'
import AutoImport from 'unplugin-auto-import/vite'
import { PrimeVueResolver } from '@primevue/auto-import-resolver'

import svgLoader from 'vite-svg-loader'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    viteCompression(),
    tailwindcss(),
    AutoImport({
      imports: ['vue', 'vue-router']
    }),
    Components({
      resolvers: [PrimeVueResolver()]
    })
  ],
  build: {
    target: 'esnext',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      external: ['crypto'],
      output: {
        manualChunks(id) {
          // Algorand ecosystem libraries
          if (
            id.includes('algosdk') ||
            id.includes('biatec-concentrated-liquidity-amm') ||
            id.includes('@algorandfoundation')
          ) {
            return 'algorand-core'
          }

          // Wallet connectors
          if (
            id.includes('@txnlab/use-wallet-vue') ||
            id.includes('@blockshake/defly-connect') ||
            id.includes('@perawallet/connect') ||
            id.includes('@randlabs/myalgo-connect')
          ) {
            return 'algorand-wallets'
          }

          // UI libraries
          if (id.includes('primevue') || id.includes('@primevue/themes')) {
            return 'primevue'
          }

          // Utilities and APIs
          if (
            id.includes('axios') ||
            id.includes('@microsoft/signalr') ||
            id.includes('pinia') ||
            id.includes('vue-i18n') ||
            id.includes('vue-router')
          ) {
            return 'api-utils'
          }

          // Formatting and utilities
          if (id.includes('bignumber.js') || id.includes('uuidv7') || id.includes('buffer')) {
            return 'formatting'
          }

          // Animation libraries
          if (id.includes('aos') || id.includes('vue-carousel')) {
            return 'animations'
          }

          // Large components by directory
          if (id.includes('/src/components/TradingComponents/')) {
            return 'trading-components'
          }

          if (id.includes('/src/components/LiquidityComponents/')) {
            return 'liquidity-components'
          }

          // Views by feature
          if (
            id.includes('/src/views/TraderDashboard.vue') ||
            id.includes('/src/views/LiquidityProviderDashboard.vue')
          ) {
            return 'views-dashboard'
          }

          if (id.includes('/src/views/Settings/')) {
            return 'views-settings'
          }

          if (
            id.includes('/src/views/AllAssetsView.vue') ||
            id.includes('/src/views/AssetOptIn.vue')
          ) {
            return 'views-assets'
          }

          // Combine small utility files and components into a shared chunk
          if (
            id.includes('use-wallet') ||
            id.includes('/src/views/ManageLiquidity.vue') ||
            id.includes('/src/views/AboutBiatecDEX.vue') ||
            id.includes('/src/views/HomeView.vue') ||
            id.includes('chart.js') ||
            id.includes('@walletconnect') ||
            id.includes('@microsoft/signalr/dist/esm/Utils.js') ||
            id.includes('arc76') ||
            id.includes('whatamesh') ||
            id.includes('cross-fetch') ||
            id.includes('algorand-authentication-component-vue')
          ) {
            return 'shared-utils'
          }
        }
      },
      onwarn(warning, warn) {
        // Suppress specific warnings from third-party libraries
        if (
          warning.code === 'INVALID_ANNOTATION' &&
          (warning.id?.includes('node_modules/ox/') ||
            warning.id?.includes('node_modules/@microsoft/signalr/'))
        ) {
          return
        }
        // dependency from @blockshake/defly-connect@1.2.1
        if (warning.code === 'EVAL' && warning.id?.includes('node_modules/lottie-web/')) {
          return
        }
        warn(warning)
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
