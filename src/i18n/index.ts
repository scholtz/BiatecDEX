import { createI18n } from 'vue-i18n'

import en from '@/locales/en.json'
import sk from '@/locales/sk.json'
import pl from '@/locales/pl.json'

export type SupportedLocale = 'en' | 'sk' | 'pl'

const STORAGE_KEY = 'biatec.locale'

const messages = {
  en,
  sk,
  pl
} as const

const supportedLocales = Object.keys(messages) as SupportedLocale[]

const FALLBACK_LOCALE: SupportedLocale = 'en'

const detectLocale = (): SupportedLocale => {
  if (typeof window === 'undefined') {
    return FALLBACK_LOCALE
  }

  const savedLocale = window.localStorage.getItem(STORAGE_KEY) as SupportedLocale | null
  if (savedLocale && supportedLocales.includes(savedLocale)) {
    return savedLocale
  }

  const browserLocale = window.navigator.language?.split('-')[0]?.toLowerCase()
  if (browserLocale && supportedLocales.includes(browserLocale as SupportedLocale)) {
    return browserLocale as SupportedLocale
  }

  return FALLBACK_LOCALE
}

export const i18n = createI18n({
  legacy: false,
  globalInjection: true,
  locale: detectLocale(),
  fallbackLocale: FALLBACK_LOCALE,
  messages
})

export const getSupportedLocales = () => supportedLocales

export const getCurrentLocale = (): SupportedLocale => {
  const { locale } = i18n.global
  if (typeof locale === 'string') {
    return (locale ?? FALLBACK_LOCALE) as SupportedLocale
  }

  return (locale as { value: SupportedLocale }).value
}

export const setLocale = async (locale: SupportedLocale) => {
  if (!supportedLocales.includes(locale)) {
    return
  }

  const globalLocale = i18n.global.locale as unknown

  if (typeof globalLocale === 'string') {
    ;(i18n.global as unknown as { locale: SupportedLocale }).locale = locale
  } else {
    ;(globalLocale as { value: SupportedLocale }).value = locale
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(STORAGE_KEY, locale)
  }
}
