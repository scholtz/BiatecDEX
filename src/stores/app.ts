import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { reactive, watch } from 'vue'
import { defineStore } from 'pinia'
import { usePrimeVue } from 'primevue/config'
import type { IAsset } from '@/interface/IAsset'
import { AuthenticationStore } from 'algorand-authentication-component-vue'
import { AssetsService } from '@/service/AssetsService'
import type { ISide } from '@/interface/ISide'
import {
  BiatecConfigProviderClient,
  BiatecPoolProviderClient,
  type BiatecClammPoolClient
} from 'biatec-concentrated-liquidity-amm'

BigInt.prototype.toJSON = function () {
  return this.toString()
}

export interface IState {
  currencySymbol: string
  currencyName: string
  currencyCode: string
  assetName: string
  assetCode: string

  pair: {
    invert: boolean
    currency: IAsset
    asset: IAsset
  }

  env: string
  envName: string

  // order
  price: number
  quantity: number
  side: number // 0 - buy, 1 - sell

  refreshAccountBalance: boolean
  // auth
  authState: AuthenticationStore
  authComponent: any
  forceAuth: boolean

  algodHost: string
  algodPort: number
  algodToken: string

  indexerHost: string
  indexerPort: number
  indexerToken: string

  slippage: number

  theme: string
  currentTheme: string

  bids: ISide
  offers: ISide

  clientPP: BiatecPoolProviderClient | undefined
  clientAMMPool: BiatecClammPoolClient | undefined
  clientConfig: BiatecConfigProviderClient | undefined
  algorand: AlgorandClient
  reloadAccount(): Promise<void>
}
const reloadAccount = async (): Promise<void> => {
  console.log('reload account base')
}
const defaultState: IState = {
  currencySymbol: 'EUR',
  currencyName: 'EUR',
  currencyCode: 'EUR',
  assetCode: 'USD',
  assetName: 'USD',

  price: 0,
  quantity: 0,
  side: 0,
  refreshAccountBalance: false,

  pair: {
    invert: false,
    currency: AssetsService.getAsset('USD') as IAsset,
    asset: AssetsService.getAsset('EUR') as IAsset
  },

  authState: new AuthenticationStore(),
  authComponent: null,
  forceAuth: false,

  algodHost: 'https://mainnet-api.4160.nodely.dev',
  algodPort: 443,
  algodToken: '',

  indexerHost: 'https://mainnet-idx.4160.nodely.dev',
  indexerPort: 443,
  indexerToken: '',

  slippage: 1,

  env: 'mainnet-v1.0',
  envName: 'Algorand Mainnet',
  theme: 'lara-dark-teal',
  currentTheme: '_empty',
  bids: [],
  offers: [],

  reloadAccount: reloadAccount,

  clientPP: undefined,
  clientAMMPool: undefined,
  clientConfig: undefined,
  algorand: AlgorandClient.fromConfig({
    algodConfig: {
      server: 'https://mainnet-api.4160.nodely.dev',
      port: 443,
      token: ''
    },
    indexerConfig: {
      server: 'https://mainnet-idx.4160.nodely.dev',
      port: 443,
      token: ''
    }
  })
}
export const useAppStore = defineStore('app', () => {
  const PrimeVue = usePrimeVue()
  let lastTheme = localStorage.getItem('lastTheme')
  if (!lastTheme) lastTheme = 'lara-dark-teal'
  const initState = { ...defaultState }
  initState.theme = lastTheme
  console.log('initState.currentTheme:', initState.currentTheme, initState.theme)
  if (initState.currentTheme != initState.theme) {
    console.log('setting theme:', initState.theme)
    console.log(`setting theme from ${initState.currentTheme} to ${initState.theme}`)
    PrimeVue.changeTheme(initState.currentTheme, initState.theme, 'theme-link')
    PrimeVue.changeTheme(initState.currentTheme, initState.theme, 'theme-link-custom')
    initState.currentTheme = initState.theme
  }

  const state = reactive(initState)
  watch(
    state,
    async (newState, oldState) => {
      console.log('state update', oldState, newState)
      localStorage.setItem('state', JSON.stringify(newState))

      if (state.currentTheme != state.theme) {
        console.log(`setting theme from ${state.currentTheme} to ${state.theme}`)
        PrimeVue.changeTheme(state.currentTheme, state.theme, 'theme-link')
        PrimeVue.changeTheme(state.currentTheme, state.theme, 'theme-link-custom')
        state.currentTheme = state.theme
      }
    },
    { deep: true }
  )

  const setChain = (chain: 'mainnet-v1.0' | 'voimain-v1.0' | 'dockernet-v1') => {
    state.env = chain
    switch (chain) {
      case 'mainnet-v1.0':
        state.envName = 'Algorand'
        state.algodHost = 'https://mainnet-api.4160.nodely.dev'
        state.algodPort = 443
        state.algodToken = ''
        state.indexerHost = 'https://mainnet-idx.4160.nodely.dev'
        state.indexerPort = 443
        state.indexerToken = ''
        break
      case 'voimain-v1.0':
        state.envName = 'VOI'
        state.algodHost = 'https://mainnet-api.voi.nodely.dev'
        state.algodPort = 443
        state.algodToken = ''
        state.indexerHost = 'https://mainnet-idx.voi.nodely.dev'
        state.indexerPort = 443
        state.indexerToken = ''
        break
      case 'dockernet-v1':
        state.envName = 'Sandbox'
        state.algodHost = 'http://localhost'
        state.algodPort = 4001
        state.algodToken = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
        state.indexerHost = 'http://localhost'
        state.indexerPort = 8980
        state.indexerToken = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
        break
    }
    state.algorand = AlgorandClient.fromConfig({
      algodConfig: {
        server: state.algodHost,
        port: state.algodPort,
        token: state.algodToken
      },
      indexerConfig: {
        server: state.indexerHost,
        port: state.indexerPort,
        token: state.indexerToken
      }
    })
    switch (chain) {
      case 'mainnet-v1.0':
        state.envName = 'Algorand'
        state.clientPP = undefined
        state.clientAMMPool = undefined
        state.clientConfig = undefined
        break
      case 'voimain-v1.0':
        state.envName = 'VOI'
        state.clientPP = undefined
        state.clientAMMPool = undefined
        state.clientConfig = undefined
        break
      case 'dockernet-v1':
        state.clientPP = new BiatecPoolProviderClient({
          algorand: state.algorand,
          appId: 27598n,
          defaultSender: state.authState.account
        })
        state.clientConfig = new BiatecConfigProviderClient({
          algorand: state.algorand,
          appId: 27599n,
          defaultSender: state.authState.account
        })
        state.clientConfig = undefined
        break
    }
    const chainAssets = AssetsService.getAssets().filter((n) => n.network == chain)
    if (chainAssets.length > 0) {
      state.assetCode = chainAssets[0].code
      state.assetName = chainAssets[0].name
    }
    const chainCurrencies = AssetsService.getCurrencies().filter((n) => n.network == chain)
    if (chainCurrencies.length > 0) {
      state.currencyCode = chainCurrencies[0].code
      state.currencyName = chainCurrencies[0].name
      state.currencySymbol = chainCurrencies[0].symbol
    }
    console.log('state', state)
  }

  return { state, setChain }
})

export const resetConfiguration = () => {
  localStorage.clear()
  const app = useAppStore()
  app.state = { ...defaultState }

  app.state.authState = new AuthenticationStore()
  app.state.authState.isAuthenticated = false
  console.log('state is at default')
}
