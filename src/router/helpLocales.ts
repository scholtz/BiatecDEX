/**
 * Localization data for help-center routes.
 *
 * Derives URL-safe slugs for each of the 10 supported locales from the
 * existing locale JSON titles so that help URLs are fully translated:
 *   /en/help/explore-assets
 *   /sk/pomoc/preskumat-aktiva
 *   /de/hilfe/assets-erkunden
 *   …
 *
 * Non-Latin scripts (Cyrillic, CJK, Hangul) cannot be reliably slugified;
 * those locales (ru, zh, ko) fall back to the canonical English slug.
 */

import type { SupportedLocale } from '@/i18n'

import en from '@/locales/en.json'
import sk from '@/locales/sk.json'
import pl from '@/locales/pl.json'
import hu from '@/locales/hu.json'
import it from '@/locales/it.json'
import ru from '@/locales/ru.json'
import zh from '@/locales/zh.json'
import ko from '@/locales/ko.json'
import de from '@/locales/de.json'
import es from '@/locales/es.json'

// ── "help" path-segment translation ────────────────────────────────────────
// The first localized segment in URLs like /<lang>/<helpSegment>/<slugSegment>

export const HELP_SEGMENT: Record<SupportedLocale, string> = {
  en: 'help',
  sk: 'pomoc',
  pl: 'pomoc',
  hu: 'segitseg',
  it: 'aiuto',
  ru: 'pomoshch',
  zh: 'bangzhu',
  ko: 'help',
  de: 'hilfe',
  es: 'ayuda'
}

// All unique localized segment values (de-duplicated).
// Used by the router to register one route-pair per segment.
export const ALL_HELP_SEGMENTS: string[] = [...new Set(Object.values(HELP_SEGMENT))]

// ── Slug generation ─────────────────────────────────────────────────────────

/** Returns null for non-Latin scripts (Cyrillic/CJK/Hangul) — use canonical. */
function slugify(text: string): string | null {
  if (/[Ѐ-ӿ一-鿿가-힯]/.test(text)) return null
  const slug = text
    // Explicit substitutions for chars that don't decompose via NFD
    .replace(/ł/gi, 'l')
    .replace(/ø/gi, 'o')
    .replace(/đ/gi, 'd')
    .replace(/ð/gi, 'd')
    .replace(/þ/gi, 'th')
    .replace(/ß/gi, 'ss')
    .replace(/æ/gi, 'ae')
    .replace(/œ/gi, 'oe')
    .normalize('NFD')
    .replace(/\p{M}/gu, '') // strip all combining marks (diacritics, ogoneks, etc.)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // non-alnum → dash
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
  return slug || null
}

// ── Build slug maps ─────────────────────────────────────────────────────────

const allMessages: Record<SupportedLocale, Record<string, unknown>> = {
  en: en as Record<string, unknown>,
  sk: sk as Record<string, unknown>,
  pl: pl as Record<string, unknown>,
  hu: hu as Record<string, unknown>,
  it: it as Record<string, unknown>,
  ru: ru as Record<string, unknown>,
  zh: zh as Record<string, unknown>,
  ko: ko as Record<string, unknown>,
  de: de as Record<string, unknown>,
  es: es as Record<string, unknown>
}

function getUseCases(messages: Record<string, unknown>): Record<string, { title?: string }> {
  return (
    ((messages as Record<string, unknown>)?.views as Record<string, unknown>)
      ?.help as Record<string, unknown>
  )?.useCases as Record<string, { title?: string }> ?? {}
}

const enUseCases = getUseCases(en as Record<string, unknown>)

/** canonical → localized URL slug, per locale */
export const canonicalToLocalized: Record<SupportedLocale, Record<string, string>> =
  {} as Record<SupportedLocale, Record<string, string>>

/** localized URL slug → canonical slug, per locale */
export const localizedToCanonical: Record<SupportedLocale, Record<string, string>> =
  {} as Record<SupportedLocale, Record<string, string>>

for (const locale of Object.keys(allMessages) as SupportedLocale[]) {
  canonicalToLocalized[locale] = {}
  localizedToCanonical[locale] = {}

  const useCases = getUseCases(allMessages[locale])

  for (const canonicalSlug of Object.keys(enUseCases)) {
    const title = useCases[canonicalSlug]?.title ?? enUseCases[canonicalSlug]?.title ?? ''
    const localSlug = slugify(title) ?? canonicalSlug

    canonicalToLocalized[locale][canonicalSlug] = localSlug
    // Register both the localized slug and the canonical slug as valid inputs.
    localizedToCanonical[locale][localSlug] = canonicalSlug
    localizedToCanonical[locale][canonicalSlug] = canonicalSlug
  }
}

/** Resolve a (potentially localized) slug to its canonical English slug. */
export function resolveCanonicalSlug(localizedSlug: string, locale: SupportedLocale): string {
  return localizedToCanonical[locale]?.[localizedSlug] ?? localizedSlug
}
