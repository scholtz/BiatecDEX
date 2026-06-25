import { computed, ref } from 'vue'

export type ThemeMode = 'light' | 'dark' | 'system'

const STORAGE_KEY = 'biatec-theme'
const DARK_CLASS = 'p-dark'

// Module-level singleton state so every consumer (header toggle, views) stays in sync.
const mode = ref<ThemeMode>(readStoredMode())
const systemPrefersDark = ref(matchSystemDark())

function readStoredMode(): ThemeMode {
  if (typeof window === 'undefined') return 'dark'
  const stored = window.localStorage.getItem(STORAGE_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  // Default to dark — the trading terminal experience.
  return 'dark'
}

function matchSystemDark(): boolean {
  if (typeof window === 'undefined' || !window.matchMedia) return true
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

const isDark = computed(() =>
  mode.value === 'system' ? systemPrefersDark.value : mode.value === 'dark'
)

function applyTheme() {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.classList.toggle(DARK_CLASS, isDark.value)
  root.style.colorScheme = isDark.value ? 'dark' : 'light'
}

let initialized = false

function init() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  applyTheme()
  if (window.matchMedia) {
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
      systemPrefersDark.value = e.matches
      if (mode.value === 'system') applyTheme()
    })
  }
}

function setMode(next: ThemeMode) {
  mode.value = next
  if (typeof window !== 'undefined') window.localStorage.setItem(STORAGE_KEY, next)
  applyTheme()
}

function toggleTheme() {
  setMode(isDark.value ? 'light' : 'dark')
}

export function useTheme() {
  init()
  return {
    mode,
    isDark,
    setMode,
    toggleTheme
  }
}
