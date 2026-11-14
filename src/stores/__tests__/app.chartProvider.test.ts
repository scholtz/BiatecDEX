import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('primevue/config', () => ({ usePrimeVue: vi.fn() }))
vi.mock('vue-router', () => ({ useRoute: vi.fn() }))
vi.mock('algorand-authentication-component-vue', () => ({
  useAVMAuthentication: () => ({ authStore: {} })
}))
vi.mock('@/service/signalrService', () => ({
  signalrService: { setNetwork: vi.fn() }
}))

const STORAGE_KEY = 'biatecdex.chartProvider'

const loadStore = async () => {
  const mod = await import('@/stores/app')
  setActivePinia(createPinia())
  return mod
}

describe('app store chartProvider', () => {
  beforeEach(() => {
    const data = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
      clear: () => data.clear()
    })
    vi.spyOn(console, 'log').mockImplementation(() => undefined)
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  it('defaults to biatec on a fresh browser', async () => {
    const { useAppStore } = await loadStore()
    expect(useAppStore().state.chartProvider).toBe('biatec')
  })

  it('restores a stored vestige choice', async () => {
    localStorage.setItem(STORAGE_KEY, 'vestige')
    const { useAppStore } = await loadStore()
    expect(useAppStore().state.chartProvider).toBe('vestige')
  })

  it('falls back to biatec when storage holds garbage', async () => {
    localStorage.setItem(STORAGE_KEY, '{"not":"a provider"}')
    const { useAppStore } = await loadStore()
    expect(useAppStore().state.chartProvider).toBe('biatec')
  })

  it('falls back to biatec when storage throws', async () => {
    vi.spyOn(localStorage, 'getItem').mockImplementation((key: string) => {
      if (key === STORAGE_KEY) throw new Error('blocked')
      return null
    })
    const { useAppStore } = await loadStore()
    expect(useAppStore().state.chartProvider).toBe('biatec')
  })

  it('persists a change and resetConfiguration returns to biatec', async () => {
    const { useAppStore, setChartProvider, resetConfiguration } = await loadStore()
    setChartProvider('vestige')
    expect(useAppStore().state.chartProvider).toBe('vestige')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('vestige')

    resetConfiguration()
    expect(useAppStore().state.chartProvider).toBe('biatec')
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull()

    // reset replaced the state object; the setter writes the current one and storage.
    setChartProvider('vestige')
    expect(useAppStore().state.chartProvider).toBe('vestige')
    expect(localStorage.getItem(STORAGE_KEY)).toBe('vestige')
  })
})
