import { reactive, watch } from 'vue'
import { defineStore } from 'pinia'
import { usePrimeVue } from 'primevue/config'

export interface IState {
  currency: string
  currencyName: string
  currencyAsset: number
  asset: number
  assetName: string

  theme: string
  currentTheme: string

  reloadAccount(): Promise<void>
}
const reloadAccount = async (): Promise<void> => {
  console.log('reload account base')
}
const defaultState: IState = {
  currency: 'EUR',
  currencyName: 'EUR',
  currencyAsset: 227855942,
  asset: 31566704,
  assetName: 'USD',
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
