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
import {
  WalletManagerPlugin,
  NetworkId,
  WalletId,
  NetworkConfigBuilder
} from '@txnlab/use-wallet-vue'

// @ts-ignore
window.Buffer = Buffer

// fix old wallet connect library
// @ts-ignore
window.global ||= window
// fix new wallet connect library
// @ts-ignore
window.process = {
  env: {},
  version: ''
}

const networks = new NetworkConfigBuilder()
  .addNetwork('voi-mainnet', {
    algod: {
      token: '',
      baseServer: 'https://mainnet-api.voi.nodely.dev',
      port: ''
    },
    isTestnet: false,
    genesisHash: 'r20fSQI8gWe/kFZziNonSPCXLwcQmH/nxROvnnueWOk=',
    genesisId: 'voimain-v1.0',
    caipChainId: 'algorand:r20fSQI8gWe_kFZziNonSPCXLwcQmH_n'
  })
  .addNetwork('aramidmain', {
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
  // .addNetwork('dockernet', {
  //   algod: {
  //     token: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  //     baseServer: 'http://localhost',
  //     port: '4001',
  //   },
  //   isTestnet: true,
  //   genesisHash: 'NbFPTiXlg5yw4FcZLqpoxnEPZjrfxb471aNSHp/e1Yw=',
  //   genesisId: 'dockernet-v1',
  //   caipChainId: 'algorand:NbFPTiXlg5yw4FcZLqpoxnEPZjrfxb47',
  // })
  .build()

const app = createApp(App)

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
    WalletId.LUTE
    // {
    //   id: WalletId.MAGIC,
    //   options: { apiKey: 'pk_live_D17FD8D89621B5F3' },
    // },
    //WalletId.MNEMONIC,
  ],
  networks: networks,
  defaultNetwork: NetworkId.TESTNET
})
app.use(PrimeVue, {
  theme: {
    preset: Aura,
    options: {
      prefix: 'p',
      darkModeSelector: '.p-dark'
    }
  }
})

app.use(ToastService)
app.use(createPinia())
app.use(router)

import 'primeicons/primeicons.css'

app.directive('ripple', Ripple)
app.mount('#app')
