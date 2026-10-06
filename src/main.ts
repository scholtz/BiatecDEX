import 'algorand-authentication-component-vue/style.css'
import './assets/auth.css'
import './assets/app.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

import PrimeVue from 'primevue/config'
import ToastService from 'primevue/toastservice'
import Ripple from 'primevue/ripple'
import { Buffer } from 'buffer'
import Aura from '@primeuix/themes/aura'
import { WalletManagerPlugin } from '@txnlab/use-wallet-vue'
import { networks, ALGORAND_MAINNET } from '@/scripts/algo/networks'
import { buildWalletConfigs } from '@/scripts/algo/walletRegistry'
import { i18n } from '@/i18n'
import { useTheme } from '@/composables/useTheme'
import { installStaleChunkReload, installGlobalErrorRecovery } from '@/router/staleChunkReload'
import { prefetchRouteChunks } from '@/router/prefetchRoutes'
import { installAuthSessionPersistence } from '@/scripts/state/installAuthSessionPersistence'
import { installWalletResumeNoiseFilter } from '@/service/walletResumeNoiseFilter'
import 'primeicons/primeicons.css'

// Recover from post-deploy 404s on hashed lazy chunks by reloading the page.
installStaleChunkReload()

// Apply the persisted light/dark preference to <html> before the app mounts.
useTheme()

window.Buffer = Buffer

// fix old wallet connect library
window.global ||= window
// fix new wallet connect library
// @ts-expect-error process polyfill for browser
window.process = {
  env: {},
  version: ''
}

// A full page load (stale-chunk recovery reload, refresh) must not sign the user out: restore
// the saved ARC-76 session before anything renders.
installAuthSessionPersistence()

const app = createApp(App)
// Expose app and pinia for E2E tests to tweak store state before components mount
// @ts-expect-error untyped E2E hook on window
if (typeof window !== 'undefined') window.__app = app

// A component setup/render error caused by a stale lazy chunk (see
// staleChunkReload.ts's isStaleChunkError) doesn't reach router.onError — it throws
// from inside a mounted component's watcher/render, not route resolution — so it
// needs this separate hook to trigger the same reload-and-recover behavior instead
// of leaving the user on a hard-crashed page.
installGlobalErrorRecovery(app)

// Must run before app.use(WalletManagerPlugin, ...) below — see
// walletResumeNoiseFilter.ts's doc comment: the plugin's own resumeSessions()
// failure handler logs asynchronously, after app.use() itself has returned, so the
// filter needs to already be installed by the time that later microtask runs.
installWalletResumeNoiseFilter()

app.use(WalletManagerPlugin, {
  wallets: buildWalletConfigs('fcfde0713d43baa0d23be0773c80a72b'),
  networks: networks,
  // Must be one of the ids registered above (they equal the genesis ids used in
  // store.state.env) and match the store's default chain — NetworkId.TESTNET
  // pointed at use-wallet's built-in testnet config, so the App.vue env watcher
  // (which compares genesis ids) could never distinguish it from the registered
  // 'testnet-v1.0' network and the app booted on a mismatched wallet network.
  defaultNetwork: ALGORAND_MAINNET
})
app.use(PrimeVue, {
  // Without a valid license PrimeVue 5 renders an "Invalid PrimeUI License"
  // banner. Locally: put PRIMEVUE_LICENSE=... in .env; CI injects it from the
  // PRIMEVUE_LICENSE GitHub secret (see .github/workflows + docker/Dockerfile).
  license: import.meta.env.PRIMEVUE_LICENSE,
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',
      darkModeSelector: '.p-dark'
    }
  }
})

app.use(ToastService)
const pinia = createPinia()
// @ts-expect-error untyped E2E hook on window
if (typeof window !== 'undefined') window.__pinia = pinia
app.use(pinia)
app.use(router)
app.use(i18n)

app.directive('ripple', Ripple)
app.mount('#app')

// Keep a tab that outlives a deploy working: load the lazy pages' chunks now, while they still
// exist on the server, instead of reloading the page (and risking the session) later.
void prefetchRouteChunks()
