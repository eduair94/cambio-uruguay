/**
 * The include/exclude rules of the sitemaps (nuxt.config `sitemap`), as regular expressions.
 *
 * Why RegExp and never path strings: @nuxtjs/sitemap 7.4 multiplies every string rule by the
 * locales (`splitPathForI18nLocales`: `/offline` becomes `/offline`, `/en/offline`, `/fr/offline`…)
 * and its `createFilter` builds a radix router out of ALL the string rules again FOR EVERY URL it
 * tests. With 35 locales that was ~1.100 rules rebuilt ~10.000 times per sitemap: 20–40 s of CPU
 * on a site worker for each of the 35 sitemaps, enough to take the site down when crawlers asked
 * for them at once after the deploy of 2026-11-06. A RegExp rule is left alone by the locale
 * split and is checked with `.test()`, without a router.
 */
import { PREFIXED_LOCALE_CODES } from './locales'

/**
 * Pages that answer but are always noindex: they stay out of every sitemap, in Spanish and under
 * any locale prefix. The module discovers static pages by itself, so each one must be named here
 * (tests/unit/robotsMetaContract.test.ts checks every `robots: 'noindex'` page is).
 */
export const SITEMAP_NOINDEX_PATHS: readonly string[] = Object.freeze([
  '/offline',
  '/widget',
  '/cuenta',
  '/estado',
  '/api-reference',
  '/estadisticas-de-busqueda',
  '/estadisticas-por-pagina',
  '/opinion-alquileres',
  '/opiniones-alquileres',
  '/oportunidades-reddit',
  '/descuentos-con-tarjeta-uruguay/cerca-de-mi',
  '/ranking-usuarios-charruadevs',
  '/equipar-casa-uruguay/mi-lista',
  // El comparador de monopatines: cada combinación la elige el lector (noindex).
  '/monopatines-electricos-uruguay/comparar',
  '/bicicletas-electricas-uruguay/comparar',
])

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

/** Any of SITEMAP_NOINDEX_PATHS, bare or under one prefix segment (`/en/offline`). */
export const SITEMAP_NOINDEX_PATTERN = new RegExp(
  `^(?:/[^/]+)?(?:${SITEMAP_NOINDEX_PATHS.map(escapeRegExp).join('|')})/?$`
)

/** A path in one of these locales: `/fr` or `/fr/…`. */
export function localePrefixPattern(codes: readonly string[]): RegExp {
  return new RegExp(`^/(?:${codes.map(escapeRegExp).join('|')})(?:/|$)`)
}

/** Every prefixed locale: what the Spanish sitemap leaves out. */
export const ANY_LOCALE_PREFIX_PATTERN = localePrefixPattern(PREFIXED_LOCALE_CODES)
