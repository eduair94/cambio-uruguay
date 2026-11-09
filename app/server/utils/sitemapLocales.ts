import { CORE_LOCALES, EXTRA_LOCALES, hasExtraLocales } from '../../utils/locales'
import { isLocalizedRoute, isSpanishOnlyRoute, splitLocalePath } from '../../utils/localizedRoutes'

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
 *   when no source listed them, next to their Spanish entry. Never for a route whose page exists
 *   only in Spanish (`isSpanishOnlyRoute`): its text gets translated, but its /en or /fr URL is a
 *   404, and listing it sent the five `/autos-usados-uruguay/hasta-*` pages to every other
 *   language's sitemap (measured 2026-11-09).
 *
 * The hreflang of a machine-translated EXTRA locale lives in the page's <head> only, never here:
 * with 32 of them a page carries ~36 alternates, and repeated on every URL of every sitemap that
 * is ~15 MB a file, generated on demand by workers with a 512 MB heap. Google reads hreflang from
 * either place; the sitemap still lists the URL so it is found.
 */
export function keepCanonicalLocales<T extends SitemapInput>(
  urls: T[],
  translations?: SitemapTranslations
): T[] {
  // Asked once per URL and per alternate (~10.000 URLs × up to 36): once per path is enough.
  const translatedMemo = new Map<string, readonly string[]>()
  const translatedInto = (path: string): readonly string[] => {
    let locales = translatedMemo.get(path)
    if (!locales) {
      locales =
        translations && !translations.isEmbargoed(path) && !isSpanishOnlyRoute(path)
          ? (translations.pages.get(path) ?? [])
          : []
      translatedMemo.set(path, locales)
    }
    return locales
  }
  const isCore = (locale: string) => (CORE_LOCALES as readonly string[]).includes(locale)
  /** Listed by the site itself, before any machine translation. */
  const authored = (locale: string, path: string) => {
    if (locale === 'es') return true
    return isCore(locale) ? isLocalizedRoute(path) : isLocalizedRoute(path) && hasExtraLocales(path)
  }
  const listed = (locale: string, path: string) =>
    authored(locale, path) || translatedInto(path).includes(locale)
  /** What a sitemap may name as an alternate: the core locales, and the authored extras. */
  const alternate = (locale: string, path: string) =>
    isCore(locale) ? listed(locale, path) : authored(locale, path)
  const alternativesFor = (path: string): Alternative[] => [
    ...ALL_LOCALES.filter(locale => alternate(locale, path)).map(locale => ({
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
    if (!isCore(locale) && !authored(locale, path)) {
      const { alternatives: _dropped, ...plain } = entry
      kept.push(plain as T)
      continue
    }
    const alternatives = entry.alternatives.filter(alternative => {
      if (alternative.hreflang === 'x-default') return true
      const target = splitLocalePath(pathOf(alternative.href))
      return alternate(target.locale, target.path)
    })
    for (const core of translatedInto(path).filter(isCore)) {
      const href = localeLoc(core, path)
      if (!alternatives.some(alternative => pathOf(alternative.href) === href)) {
        alternatives.splice(alternatives.length - 1, 0, { hreflang: HREFLANG[core]!, href })
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
        const { alternatives: _spanish, ...rest } = entry as T & { alternatives?: Alternative[] }
        kept.push(
          (isCore(locale)
            ? { ...rest, loc, alternatives: alternativesFor(path) }
            : { ...rest, loc }) as T
        )
      }
    }
  }
  return kept
}
