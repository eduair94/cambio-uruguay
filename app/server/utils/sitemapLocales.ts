import { CORE_LOCALES, EXTRA_LOCALES, hasExtraLocales } from '../../utils/locales'
import { isLocalizedRoute, splitLocalePath } from '../../utils/localizedRoutes'

type Alternative = { hreflang: string; href: string }
type SitemapInput = string | { loc?: string; alternatives?: Alternative[]; [key: string]: unknown }

/** What the machine translation adds (utils/autoTranslate.ts, server/utils/autoTranslateStore). */
export interface SitemapTranslations {
  /** Spanish path → locales the page is translated into. */
  pages: ReadonlyMap<string, readonly string[]>
  /** Pages reserved by the change log: they keep exactly the languages they had. */
  isEmbargoed: (path: string) => boolean
}

const HREFLANG: Record<string, string> = {
  es: 'es-ES',
  en: 'en-US',
  pt: 'pt-PT',
  ...Object.fromEntries(EXTRA_LOCALES.map(({ code, language }) => [code, language])),
}
const ALL_LOCALES = [...CORE_LOCALES, ...EXTRA_LOCALES.map(({ code }) => code)]

const pathOf = (loc: string) => {
  try {
    return /^https?:\/\//.test(loc) ? new URL(loc).pathname : loc
  } catch {
    return loc
  }
}

const localeLoc = (locale: string, path: string) =>
  locale === 'es' ? path : `/${locale}${path === '/' ? '' : path}`

/**
 * Keep only the URLs that are canonical of themselves, and the hreflang alternates that point to
 * one. Every route answers in every locale, but the canonical of a Spanish-only page is the
 * Spanish URL: listing its /en or /fr URL told crawlers that 836 non-canonical URLs per language
 * were pages of their own (Bing: "important pages" and "not canonical" at the same time, measured
 * 2026-10-20). A locale stays when the page:
 *
 * - is localized for English and Portuguese (`isLocalizedRoute`), or carries vue-i18n copy in an
 *   extra locale (`EXTRA_LOCALE_ROUTES`) — as before;
 * - or is machine-translated into it (`translations`), outside an embargo. Those URLs are ADDED
 *   when no source listed them, next to their Spanish entry.
 */
export function keepCanonicalLocales<T extends SitemapInput>(
  urls: T[],
  translations?: SitemapTranslations
): T[] {
  const translatedInto = (path: string): readonly string[] =>
    translations && !translations.isEmbargoed(path) ? (translations.pages.get(path) ?? []) : []
  const listed = (locale: string, path: string) => {
    if (locale === 'es') return true
    if (translatedInto(path).includes(locale)) return true
    return (CORE_LOCALES as readonly string[]).includes(locale)
      ? isLocalizedRoute(path)
      : isLocalizedRoute(path) && hasExtraLocales(path)
  }
  const alternativesFor = (path: string): Alternative[] => [
    ...ALL_LOCALES.filter(locale => listed(locale, path)).map(locale => ({
      hreflang: HREFLANG[locale]!,
      href: localeLoc(locale, path),
    })),
    { hreflang: 'x-default', href: path },
  ]

  const kept: T[] = []
  const present = new Set<string>()
  const spanish = new Map<string, T>()
  for (const entry of urls) {
    const loc = typeof entry === 'string' ? entry : entry.loc
    if (typeof loc !== 'string') {
      kept.push(entry)
      continue
    }
    const { locale, path } = splitLocalePath(pathOf(loc))
    if (!listed(locale, path)) continue
    present.add(localeLoc(locale, path))
    if (locale === 'es' && typeof entry !== 'string') spanish.set(path, entry)
    if (typeof entry === 'string' || !entry.alternatives) {
      kept.push(entry)
      continue
    }
    const alternatives = entry.alternatives.filter(alternative => {
      if (alternative.hreflang === 'x-default') return true
      const target = splitLocalePath(pathOf(alternative.href))
      return listed(target.locale, target.path)
    })
    const translated = translatedInto(path)
    for (const extra of translated) {
      const href = localeLoc(extra, path)
      if (!alternatives.some(alternative => pathOf(alternative.href) === href)) {
        alternatives.splice(alternatives.length - 1, 0, { hreflang: HREFLANG[extra]!, href })
      }
    }
    kept.push({ ...entry, alternatives } as T)
  }

  if (translations) {
    for (const [path, entry] of spanish) {
      for (const locale of translatedInto(path)) {
        const loc = localeLoc(locale, path)
        if (present.has(loc)) continue
        present.add(loc)
        kept.push({ ...entry, loc, alternatives: alternativesFor(path) } as T)
      }
    }
  }
  return kept
}
