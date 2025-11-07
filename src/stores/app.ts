import { AlgorandClient } from '@algorandfoundation/algokit-utils'
import { reactive, shallowReactive, watch } from 'vue'
import { defineStore } from 'pinia'
import { usePrimeVue } from 'primevue/config'
import type { IAsset } from '@/interface/IAsset'
import {
  useAVMAuthentication,
  type IAuthenticationStore
} from 'algorand-authentication-component-vue'
import { AssetsService } from '@/service/AssetsService'
import type { ISide } from '@/interface/ISide'
import {
  BiatecClammPoolClient,
  BiatecConfigProviderClient,
  BiatecIdentityProviderClient,
  BiatecPoolProviderClient,
  type FullConfig
} from 'biatec-concentrated-liquidity-amm'
import { useRoute } from 'vue-router'

const { authStore } = useAVMAuthentication()
const route = useRoute()
interface Network2Pool {
  [key: string]: FullConfig[]
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

  env: 'mainnet-v1.0' | 'voimain-v1.0' | 'testnet-v1.0' | 'dockernet-v1'
  envName: string

  // order
  price: number
  quantity: number
  side: number // 0 - buy, 1 - sell

  refreshAccountBalance: boolean
  // auth
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
  clientIdentity: BiatecIdentityProviderClient | undefined
  clientAMMPool: BiatecClammPoolClient | undefined
  clientConfig: BiatecConfigProviderClient | undefined

  pools: Network2Pool

  refreshMyLiquidity: boolean

  algorand: AlgorandClient
  reloadAccount(): Promise<void>
  lastRoundOffset: number
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
  forceAuth: false,

  algodHost: 'https://algorand-algod-public.de-4.biatec.io',
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
  clientIdentity: undefined,
  clientAMMPool: undefined,
  clientConfig: undefined,

  refreshMyLiquidity: false,

  pools: {},

  algorand: AlgorandClient.fromConfig({
    algodConfig: {
      server: 'https://algorand-algod-public.de-4.biatec.io',
      port: 443,
      token: ''
    },
    indexerConfig: {
      server: 'https://mainnet-idx.4160.nodely.dev',
      port: 443,
      token: ''
    }
  }),
  lastRoundOffset: 100
}
export const useAppStore = defineStore('app', () => {
  const PrimeVue = usePrimeVue()
  let lastTheme = localStorage.getItem('lastTheme')
  if (!lastTheme) lastTheme = 'lara-dark-teal'
  const initState = { ...defaultState } as IState
  initState.theme = lastTheme
  console.log('initState.currentTheme:', initState.currentTheme, initState.theme)
  if (initState.currentTheme != initState.theme) {
    console.log('setting theme:', initState.theme)
    console.log(`setting theme from ${initState.currentTheme} to ${initState.theme}`)
    // PrimeVue.changeTheme(initState.currentTheme, initState.theme, 'theme-link')
    // PrimeVue.changeTheme(initState.currentTheme, initState.theme, 'theme-link-custom')
    initState.currentTheme = initState.theme
  }

  const state = shallowReactive(initState as IState)

  watch(
    state,
    async (newState, oldState) => {
      console.log('state update', oldState, newState)
      // localStorage.setItem(
      //   'state',
      //   JSON.stringify(newState, (_, value) =>
      //     typeof value === 'bigint' ? `${value.toString()}n` : value
      //   )
      // )

      if (state.currentTheme != state.theme) {
        console.log(`setting theme from ${state.currentTheme} to ${state.theme}`)
        // PrimeVue.changeTheme(state.currentTheme, state.theme, 'theme-link')
        // PrimeVue.changeTheme(state.currentTheme, state.theme, 'theme-link-custom')
        state.currentTheme = state.theme
      }
    },
    { deep: true }
  )

  const setChain = (chain: 'mainnet-v1.0' | 'voimain-v1.0' | 'testnet-v1.0' | 'dockernet-v1') => {
    console.log('setChain', chain)
    state.env = chain
    switch (chain) {
      case 'mainnet-v1.0':
        state.envName = 'Algorand'
        state.algodHost = 'https://algorand-algod-public.de-4.biatec.io'
        state.algodPort = 443
        state.algodToken = ''
        state.indexerHost = 'https://mainnet-idx.4160.nodely.dev'
        state.indexerPort = 443
        state.indexerToken = ''
        break
      // case 'voimain-v1.0':
      //   state.envName = 'VOI'
      //   state.algodHost = 'https://mainnet-api.voi.nodely.dev'
      //   state.algodPort = 443
      //   state.algodToken = ''
      //   state.indexerHost = 'https://mainnet-idx.voi.nodely.dev'
      //   state.indexerPort = 443
      //   state.indexerToken = ''
      //   break
      // case 'testnet-v1.0':
      //   state.envName = 'VOI'
      //   state.algodHost = 'https://testnet-api.4160.nodely.dev'
      //   state.algodPort = 443
      //   state.algodToken = ''
      //   state.indexerHost = 'https://testnet-idx.4160.nodely.dev'
      //   state.indexerPort = 443
      //   state.indexerToken = ''
      //   break
      // case 'dockernet-v1':
      //   state.envName = 'Sandbox'
      //   state.algodHost = 'http://localhost'
      //   state.algodPort = 4001
      //   state.algodToken = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      //   state.indexerHost = 'http://localhost'
      //   state.indexerPort = 8980
      //   state.indexerToken = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'
      //   break
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
    // testnet Config/Identity/PP  741107917n 741107914n 741107916n
    //Config/Identity/PP 21180n 21178n 21179n
    let account = authStore.account
    if (!account) account = 'TESTNTTTJDHIF5PJZUBTTDYYSKLCLM6KXCTWIOOTZJX5HO7263DPPMM2SU' // dummy address with balance on every network
    if (account) {
      switch (chain) {
        case 'mainnet-v1.0':
          //Config/Identity/PP 3074197827n 3074197744n 3074197785n
          state.envName = 'Algorand'
          state.clientConfig = new BiatecConfigProviderClient({
            algorand: state.algorand,
            appId: 3074197827n,
            defaultSender: account
          })
          state.clientIdentity = new BiatecIdentityProviderClient({
            algorand: state.algorand,
            appId: 3074197744n,
            defaultSender: account
          })
          state.clientPP = new BiatecPoolProviderClient({
            algorand: state.algorand,
            appId: 3074197785n,
            defaultSender: account
          })
          break
        // case 'voimain-v1.0':
        //   //Config/Identity/PP 40133596n 40133594n 40133595n
        //   state.envName = 'VOI'
        //   state.clientConfig = new BiatecConfigProviderClient({
        //     algorand: state.algorand,
        //     appId: 40133596n,
        //     defaultSender: authStore.account
        //   })
        //   state.clientIdentity = new BiatecIdentityProviderClient({
        //     algorand: state.algorand,
        //     appId: 40133594n,
        //     defaultSender: authStore.account
        //   })
        //   state.clientPP = new BiatecPoolProviderClient({
        //     algorand: state.algorand,
        //     appId: 40133595n,
        //     defaultSender: authStore.account
        //   })
        //   break
        // case 'testnet-v1.0':
        //   state.clientConfig = new BiatecConfigProviderClient({
        //     algorand: state.algorand,
        //     appId: 741107917n,
        //     defaultSender: authStore.account
        //   })
        //   state.clientIdentity = new BiatecIdentityProviderClient({
        //     algorand: state.algorand,
        //     appId: 741107914n,
        //     defaultSender: authStore.account
        //   })
        //   state.clientPP = new BiatecPoolProviderClient({
        //     algorand: state.algorand,
        //     appId: 741107916n,
        //     defaultSender: authStore.account
        //   })
        //   break
        // case 'dockernet-v1':
        //   state.clientConfig = new BiatecConfigProviderClient({
        //     algorand: state.algorand,
        //     appId: 21180n,
        //     defaultSender: authStore.account
        //   })
        //   state.clientIdentity = new BiatecIdentityProviderClient({
        //     algorand: state.algorand,
        //     appId: 21178n,
        //     defaultSender: authStore.account
        //   })
        //   state.clientPP = new BiatecPoolProviderClient({
        //     algorand: state.algorand,
        //     appId: 21179n,
        //     defaultSender: authStore.account
        //   })
        //   console.log('dockernet-v1 clientPP', state.clientPP, state.clientConfig)
        //   break
      }
    } else {
      console.log('authStore.account not found')
    }
    let assetFound = false
    let currencyFound = false
    if (route?.params?.assetCode && route?.params?.assetCode != '') {
      const assetCode = route.params.assetCode as string
      const asset = AssetsService.getAssets().filter(
        (n) => n.network == chain && n.code == assetCode
      )[0]
      if (asset) {
        state.pair.asset = asset
        state.assetCode = asset.code
        state.assetName = asset.name
        assetFound = true
        console.warn(`Asset has been found: ${assetCode}`)
      } else {
        console.warn(`Asset with code ${assetCode} not found`)
      }
    }
    if (route?.params?.currencyCode && route?.params?.currencyCode != '') {
      const currencyCode = route.params.currencyCode as string
      const currency = AssetsService.getAssets().filter(
        (n) => n.network == chain && n.code == currencyCode
      )[0]
      if (currency) {
        state.pair.currency = currency
        state.currencyCode = currency.code
        state.currencyName = currency.name
        state.currencySymbol = currency.symbol
        currencyFound = true
        console.warn(`Currency has been found: ${currencyCode}`)
      } else {
        console.warn(`Currency with code ${currencyCode} not found`)
      }
    }
    if (!assetFound) {
      console.log('asset not found, setting default asset')
      const chainAssets = AssetsService.getAssets().filter((n) => n.network == chain)
      if (chainAssets.length > 0) {
        state.assetCode = chainAssets[0].code
        state.assetName = chainAssets[0].name
      }
    }
    if (!currencyFound) {
      console.log('currency not found, setting default currency')
      const chainCurrencies = AssetsService.getCurrencies().filter(
        (n) => n.network == chain && n.code != state.assetCode
      )
      if (chainCurrencies.length > 0) {
        state.currencyCode = chainCurrencies[0].code
        state.currencyName = chainCurrencies[0].name
        state.currencySymbol = chainCurrencies[0].symbol
      }
    }
    console.log('state', state)
  }

  setChain('mainnet-v1.0')

  return { state, setChain }
})

export const resetConfiguration = () => {
  localStorage.clear()
  const app = useAppStore()
  app.state = { ...defaultState }

  console.log('state is at default')
}
