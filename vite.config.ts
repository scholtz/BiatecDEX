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
    chunkSizeWarningLimit: 4000,
    cssCodeSplit: false,
    rollupOptions: {
      external: [],
      output: {
        // Let Vite handle chunking automatically to avoid circular dependencies
      },
      // Try to resolve circular dependency issues
      makeAbsoluteExternalsRelative: false,
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
