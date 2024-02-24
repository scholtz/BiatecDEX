import { reactive, watch } from 'vue'
import { defineStore } from 'pinia'
import { usePrimeVue } from 'primevue/config'
import type { IAsset } from '@/interface/IAsset'
import { AuthenticationStore } from 'algorand-authentication-component-vue'

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

  // auth
  authState: AuthenticationStore
  authComponent: any
  forceAuth: boolean

  algodHost: string
  algodPort: number
  algodToken: string

  theme: string
  currentTheme: string

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

  pair: {
    invert: false,
    currency: {
      assetId: 31566704,
      name: 'USD',
      code: 'USD',
      symbol: '$',
      decimals: 6,
      isCurrency: true,
      isAsa: true,
      isArc200: false
    },
    asset: {
      assetId: 227855942,
      name: 'EUR',
      code: 'EUR',
      symbol: '€',
      decimals: 6,
      isCurrency: true,
      isAsa: true,
      isArc200: false
    }
  },

  authState: new AuthenticationStore(),
  authComponent: null,
  forceAuth: false,

  algodHost: 'https://mainnet-api.algonode.cloud',
  algodPort: 443,
  algodToken: '',

  env: 'mainnet-v1.0',
  envName: 'Algorand Mainnet',
  theme: 'lara-dark-teal',
  currentTheme: '_empty',
  reloadAccount: reloadAccount
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
  return { state }
})

export const resetConfiguration = () => {
  localStorage.clear()
  const app = useAppStore()
  app.state = defaultState
}
