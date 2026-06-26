/**
 * URL helpers for language-aware routing.
 *
 * All app routes are prefixed with /:lang (e.g. /en/, /sk/).
 * Help routes additionally translate the "help" path segment and the use-case
 * slug into the active language:
 *   /en/help/explore-assets
 *   /sk/pomoc/preskumat-aktiva
 *   /de/hilfe/assets-erkunden
 *
 * Use `switchLangPath(targetLang)` in language-switcher code to generate
 * the correctly-translated URL for the current page in a different locale.
 */

import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { getCurrentLocale, getSupportedLocales, type SupportedLocale } from '@/i18n'
import {
  HELP_SEGMENT,
  canonicalToLocalized,
  localizedToCanonical,
  resolveCanonicalSlug
} from '@/router/helpLocales'

export function useLocalizedRoute() {
  const route = useRoute()

  /** The language code from the current URL (falls back to app locale). */
  const activeLang = computed<SupportedLocale>(() => {
    const l = route.params.lang as string
    return (getSupportedLocales().includes(l as SupportedLocale) ? l : getCurrentLocale()) as SupportedLocale
  })

  /** Whether the current route is any help-index variant. */
  function isHelpIndex(name: string | null | symbol | undefined): boolean {
    if (!name || typeof name !== 'string') return false
    return name === 'help' || (name.startsWith('help-') && !name.includes('detail'))
  }

  /** Whether the current route is any help-detail variant. */
  function isHelpDetail(name: string | null | symbol | undefined): boolean {
    if (!name || typeof name !== 'string') return false
    return name === 'help-detail' || name.startsWith('help-detail-')
  }

  /** Return the localized help index URL for a given language. */
  function helpIndexPath(lang?: SupportedLocale): string {
    const l = lang ?? activeLang.value
    return `/${l}/${HELP_SEGMENT[l]}`
  }

  /**
   * Return the localized help detail URL for a canonical slug + language.
   * e.g. helpDetailPath('explore-assets', 'sk') → '/sk/pomoc/preskumat-aktiva'
   */
  function helpDetailPath(canonicalSlug: string, lang?: SupportedLocale): string {
    const l = lang ?? activeLang.value
    const localSlug = canonicalToLocalized[l]?.[canonicalSlug] ?? canonicalSlug
    return `/${l}/${HELP_SEGMENT[l]}/${localSlug}`
  }

  /**
   * Compute the equivalent URL in `targetLang` for the current page.
   *
   * - Help detail → translate slug and help segment.
   * - Help index  → translate help segment.
   * - Any other route → replace only the /:lang prefix.
   */
  function switchLangPath(targetLang: SupportedLocale): string {
    const name = route.name

    if (isHelpDetail(name)) {
      const rawSlug = route.params.slugSegment as string
      const canonical = resolveCanonicalSlug(rawSlug, activeLang.value)
      return helpDetailPath(canonical, targetLang)
    }

    if (isHelpIndex(name)) {
      return helpIndexPath(targetLang)
    }

    // For all other routes: swap the /:lang prefix only.
    const fullPath = route.fullPath
    const prefixRe = /^\/[a-z]{2}(\/|$)/
    if (prefixRe.test(fullPath)) {
      return `/${targetLang}${fullPath.slice(3)}`
    }
    return `/${targetLang}${fullPath === '/' ? '' : fullPath}`
  }

  return {
    activeLang,
    helpIndexPath,
    helpDetailPath,
    switchLangPath
  }
}
