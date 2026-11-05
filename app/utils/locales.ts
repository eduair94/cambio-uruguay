/**
 * The site's languages. PURE (no Nuxt, no Vue): nuxt.config, the sitemap, the route module and
 * the translation scripts all read this one list.
 *
 * Every page answers in all 35 locales (`experimental.compactRoutes`: one route record per page
 * for every non-default locale, so the entry chunk does not grow with them). What differs is how
 * much of a page is in that language, and therefore what the page may claim:
 *
 * - The CHROME (menus, buttons, everything `t()` prints) comes from the vue-i18n messages:
 *   human-written for es/en/pt, machine-translated for the EXTRA locales (`npm run
 *   i18n:translate`, scripts/i18n/translate.mjs; re-run it after editing en.json).
 * - The BODY of most pages is Spanish written into templates and TypeScript content. Pages whose
 *   body is entirely `t()` are listed in `EXTRA_LOCALE_ROUTES` and announced in every extra
 *   locale. Everything else is translated at render time from a translation memory the job
 *   `currency-autotranslate` fills (utils/autoTranslate.ts, for `AUTO_TRANSLATE_LOCALES`), and is
 *   announced in a locale only once the page is translated into it.
 *
 * A page announced in a locale gets hreflang, a self canonical and a sitemap entry there; one
 * that is not keeps its Spanish canonical (utils/autoTranslate.ts, `canonicalTarget`).
 */

export const DEFAULT_LOCALE = 'es'

export const CORE_LOCALES = ['es', 'en', 'pt'] as const
export type CoreLocale = (typeof CORE_LOCALES)[number]

export interface ExtraLocale {
  /** URL prefix and vue-i18n code. Lowercase: it is a path segment. */
  code: string
  /** BCP 47 tag for `<html lang>` and hreflang. */
  language: string
  /** The language's own name, as the language menu shows it. */
  name: string
  /** Google Translate target code. */
  google: string
}

/**
 * Left to right only. Arabic, Hebrew and Persian need `dir="rtl"` through Vuetify and a
 * layout audit of every physical left/right in the CSS; they are not here until that is done.
 */
export const EXTRA_LOCALES: readonly ExtraLocale[] = Object.freeze([
  { code: 'fr', language: 'fr', name: 'Français', google: 'fr' },
  { code: 'de', language: 'de', name: 'Deutsch', google: 'de' },
  { code: 'it', language: 'it', name: 'Italiano', google: 'it' },
  { code: 'nl', language: 'nl', name: 'Nederlands', google: 'nl' },
  { code: 'ca', language: 'ca', name: 'Català', google: 'ca' },
  { code: 'ro', language: 'ro', name: 'Română', google: 'ro' },
  { code: 'pl', language: 'pl', name: 'Polski', google: 'pl' },
  { code: 'cs', language: 'cs', name: 'Čeština', google: 'cs' },
  { code: 'sk', language: 'sk', name: 'Slovenčina', google: 'sk' },
  { code: 'hu', language: 'hu', name: 'Magyar', google: 'hu' },
  { code: 'sv', language: 'sv', name: 'Svenska', google: 'sv' },
  { code: 'da', language: 'da', name: 'Dansk', google: 'da' },
  { code: 'no', language: 'no', name: 'Norsk', google: 'no' },
  { code: 'fi', language: 'fi', name: 'Suomi', google: 'fi' },
  { code: 'el', language: 'el', name: 'Ελληνικά', google: 'el' },
  { code: 'bg', language: 'bg', name: 'Български', google: 'bg' },
  { code: 'hr', language: 'hr', name: 'Hrvatski', google: 'hr' },
  { code: 'sl', language: 'sl', name: 'Slovenščina', google: 'sl' },
  { code: 'lt', language: 'lt', name: 'Lietuvių', google: 'lt' },
  { code: 'lv', language: 'lv', name: 'Latviešu', google: 'lv' },
  { code: 'et', language: 'et', name: 'Eesti', google: 'et' },
  { code: 'ru', language: 'ru', name: 'Русский', google: 'ru' },
  { code: 'uk', language: 'uk', name: 'Українська', google: 'uk' },
  { code: 'tr', language: 'tr', name: 'Türkçe', google: 'tr' },
  { code: 'zh', language: 'zh-CN', name: '中文（简体）', google: 'zh-CN' },
  { code: 'ja', language: 'ja', name: '日本語', google: 'ja' },
  { code: 'ko', language: 'ko', name: '한국어', google: 'ko' },
  { code: 'hi', language: 'hi', name: 'हिन्दी', google: 'hi' },
  { code: 'id', language: 'id', name: 'Bahasa Indonesia', google: 'id' },
  { code: 'ms', language: 'ms', name: 'Bahasa Melayu', google: 'ms' },
  { code: 'vi', language: 'vi', name: 'Tiếng Việt', google: 'vi' },
  { code: 'th', language: 'th', name: 'ไทย', google: 'th' },
])

export const EXTRA_LOCALE_CODES: readonly string[] = Object.freeze(
  EXTRA_LOCALES.map(locale => locale.code)
)

/** Every locale code, core first. */
export const LOCALE_CODES: readonly string[] = Object.freeze([
  ...CORE_LOCALES,
  ...EXTRA_LOCALE_CODES,
])

/** Locales that carry a URL prefix (`prefix_except_default`). */
export const PREFIXED_LOCALE_CODES: readonly string[] = Object.freeze(
  LOCALE_CODES.filter(code => code !== DEFAULT_LOCALE)
)

export function isExtraLocale(code: string | undefined | null): boolean {
  return !!code && EXTRA_LOCALE_CODES.includes(code)
}

/** `^/(en|pt|fr|…)(?=/|$)` — the first path segment, never a `startsWith` on the word. */
export const LOCALE_PREFIX_RE = new RegExp(`^/(${PREFIXED_LOCALE_CODES.join('|')})(?=/|$)`)

/**
 * The routes that exist in the extra locales. Exact paths, Spanish (unprefixed).
 *
 * A route belongs here only when its page renders with no Spanish left in an extra locale:
 * every visible string from `t()`, or from a content tree with a translation overlay. Adding
 * a page without checking leaves French chrome around a Spanish body under a French URL
 * that is canonical of itself — worse than not offering the language.
 *
 * Checked 2026-11-02 by rendering each candidate in French and Japanese. Left out of THIS list
 * (they still get translated by the memory, and announced once translated), and why:
 * - `/`, `/retirar-efectivo-uruguay`, `/donde-conseguir-monedas-uruguay` and
 *   `/comparar-plataformas-dolar-uruguay`: ready (the first three have their content trees
 *   translated) but reserved by rows of docs/seo/experiments.json until 15–29/11; 32 new
 *   hreflang alternates on them would contaminate those measurements.
 * - `/preguntas-frecuentes`: its answers are built by per-language functions (faqAnswers.ts).
 * - `/desarrolladores`: its SEO title is a Spanish literal.
 * - `/casas-de-cambio`: the body is a Spanish TypeScript tree (casasDirectory.ts).
 * - `/tickets-mutualistas-uruguay` and the rental family: their copy lives in component-local
 *   dictionaries (es/en/pt), which fall back to English.
 * - `/economia-uruguay`, `/noticias`: the body is Spanish headlines.
 * - `/sillas-escritorio-uruguay`: shipped in the first batch and pulled the same day. Rendered
 *   locally (no database) it looked clean; in production the tier list carries the Reddit
 *   summaries and quotes, 164 Spanish lines on the French page.
 */
export const EXTRA_LOCALE_ROUTES: readonly string[] = Object.freeze([
  '/pizarra',
  '/historico',
  '/comparar',
  '/sucursales',
  '/mapa',
  '/casa-de-cambio-cerca-de-mi',
  '/conectar',
  '/newsletter',
])

export function hasExtraLocales(path: string): boolean {
  const clean = path.split(/[?#]/)[0]!.replace(/(.)\/+$/, '$1') || '/'
  return EXTRA_LOCALE_ROUTES.includes(clean)
}
