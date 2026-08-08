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
import { WalletManagerPlugin, WalletId, NetworkConfigBuilder } from '@txnlab/use-wallet-vue'
import { i18n } from '@/i18n'
import { useTheme } from '@/composables/useTheme'
import { installStaleChunkReload } from '@/router/staleChunkReload'
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

const networks = new NetworkConfigBuilder()
  .addNetwork('mainnet-v1.0', {
    algod: {
      token: '',
      baseServer: 'https://algorand-algod-public.de-4.biatec.io',
      port: ''
    },
    isTestnet: false,
    genesisHash: 'wGHE2Pwdvd7S12BL5FaOP20EGYesN73ktiC1qzkkit8=',
    genesisId: 'mainnet-v1.0',
    caipChainId: 'algorand:wGHE2Pwdvd7S12BL5FaOP20EGYesN73k'
  })
  .addNetwork('testnet-v1.0', {
    algod: {
      token: '',
      baseServer: 'https://testnet-api.4160.nodely.dev',
      port: ''
    },
    isTestnet: true,
    genesisHash: 'SGO1GKSzyE7IEPItTxCByw9x8FmnrCDexi9/cOUJOiI=',
    genesisId: 'testnet-v1.0',
    caipChainId: 'algorand:SGO1GKSzyE7IEPItTxCByw9x8FmnrCDe'
  })
  .addNetwork('voimain-v1.0', {
    algod: {
      token: '',
      baseServer: 'https://voimain-algod-public.de.nodes.biatec.io',
      port: ''
    },
    isTestnet: false,
    genesisHash: 'r20fSQI8gWe/kFZziNonSPCXLwcQmH/nxROvnnueWOk=',
    genesisId: 'voimain-v1.0',
    caipChainId: 'algorand:r20fSQI8gWe_kFZziNonSPCXLwcQmH_n'
  })
  .addNetwork('aramidmain-v1.0', {
    algod: {
      token: '',
      baseServer: 'https://algod.aramidmain.a-wallet.net',
      port: ''
    },
    isTestnet: false,
    genesisHash: 'PgeQVJJgx/LYKJfIEz7dbfNPuXmDyJ+O7FwQ4XL9tE8=',
    genesisId: 'aramidmain-v1.0',
    caipChainId: 'algorand:PgeQVJJgx_LYKJfIEz7dbfNPuXmDyJ-O'
  })
  .addNetwork('dockernet-v1', {
    algod: {
      token: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
      baseServer: 'http://localhost',
      port: '4001'
    },
    isTestnet: true,
    genesisHash: 'NbFPTiXlg5yw4FcZLqpoxnEPZjrfxb471aNSHp/e1Yw=',
    genesisId: 'dockernet-v1',
    caipChainId: 'algorand:NbFPTiXlg5yw4FcZLqpoxnEPZjrfxb47'
  })
  .build()

const app = createApp(App)
// Expose app and pinia for E2E tests to tweak store state before components mount
// @ts-expect-error untyped E2E hook on window
if (typeof window !== 'undefined') window.__app = app

app.use(WalletManagerPlugin, {
  wallets: [
    {
      id: WalletId.BIATEC,
      options: { projectId: 'fcfde0713d43baa0d23be0773c80a72b' }
    },
    WalletId.PERA,
    WalletId.DEFLY,
    //WalletId.DEFLY_WEB,
    WalletId.EXODUS,
    // WalletId.PERA,
    // {
    //   id: WalletId.WALLETCONNECT,
    //   options: { projectId: 'fcfde0713d43baa0d23be0773c80a72b' },
    // },
    // WalletId.KMD,
    WalletId.KIBISIS,
    WalletId.LUTE,
    // {
    //   id: WalletId.MAGIC,
    //   options: { apiKey: 'pk_live_D17FD8D89621B5F3' },
    // },
    WalletId.MNEMONIC
  ],
  networks: networks,
  // Must be one of the ids registered above (they equal the genesis ids used in
  // store.state.env) and match the store's default chain — NetworkId.TESTNET
  // pointed at use-wallet's built-in testnet config, so the App.vue env watcher
  // (which compares genesis ids) could never distinguish it from the registered
  // 'testnet-v1.0' network and the app booted on a mismatched wallet network.
  defaultNetwork: 'mainnet-v1.0'
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
