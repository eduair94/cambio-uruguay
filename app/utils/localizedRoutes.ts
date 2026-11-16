import { LOCALE_PREFIX_RE } from './locales'
import { NAV_SECTIONS } from './siteNav'

/**
 * Which routes exist as their own page in English and Portuguese.
 *
 * Every route answers under /en and /pt (`prefix_except_default`), but most of the site is
 * Spanish prose about Uruguay: those pages put the SPANISH URL in the canonical of all three
 * variants. Measured 2026-10-20 on the en-US sitemap: 836 of 1.522 URLs canonicalised to Spanish,
 * so the sitemap was submitting non-canonical URLs with hreflang alternates that each page denied.
 * A route is localized when its /en and /pt pages are canonical of themselves:
 *
 * - navigation pages flagged `localized` in `siteNav.ts`;
 * - the dynamic families below, whose pages build the canonical with `localePath`.
 *
 * The sitemap reads this (server/plugins/sitemap-locales.ts). Keep it in step with the page: a
 * page that starts emitting its own /en canonical gets `localized: true` in the same commit —
 * tests/unit/localizedRoutes.test.ts fails when a nav page's canonical uses `localePath` and the
 * flag is missing.
 */
export const LOCALIZED_FAMILIES: readonly string[] = Object.freeze([
  '/casas-de-cambio/',
  // 2026-11-30: out of I18N_CANONICAL_PENDING, once their pages built the canonical per locale.
  '/cotizacion/',
  '/dolar/',
  '/historico/',
  '/inmobiliarias-uruguay/',
  '/sillas-escritorio-uruguay/',
  '/sucursales/',
])

/**
 * Pages written WHOLE in vue-i18n for English and Portuguese whose canonical still points at the
 * Spanish URL, so they are not `isLocalizedRoute` (that list means "canonical of themselves").
 *
 * Measured 2026-11-15 on the live site, H2 by H2: `/en/cotizacion/real`, `/en/dolar/maldonado`,
 * `/en/avanzado` and the English home are English from top to bottom (six H2 of six), and the
 * Portuguese ones are what Brazilians at the border click (`/pt/dolar/rivera`,
 * `/pt/cotizacion/dolar`). They keep their hreflang alternates while the rest of the
 * Spanish-bodied /en and /pt pages lose them (utils/autoTranslate.ts, `hreflangLocales`).
 *
 * The real fix is in each page —build the canonical with `localePath` and move the route to
 * `LOCALIZED_FAMILIES` or flag its nav entry `localized`— and it waits for the change log: on
 * 2026-11-16 every one of them sits inside an open window (`cotizaciones-con-la-cifra-en-el-titulo`
 * on /cotizacion/* and /dolar/* until 2026-11-28, `home-descripcion-por-idioma` on / until
 * 2026-11-29, `descripciones-de-i18n-que-el-serp-cortaba` on /avanzado until 2026-12-10).
 */
//
// 2026-11-30: `/`, `/cotizacion/` and `/dolar/` left for their own canonical (`localized` nav flag
// and LOCALIZED_FAMILIES). `/avanzado` stays until its window closes.
export const I18N_CANONICAL_PENDING: readonly string[] = Object.freeze(['/avanzado'])

const LOCALIZED_NAV = new Set(
  NAV_SECTIONS.flatMap(section =>
    section.entries.filter(entry => entry.localized && entry.to).map(entry => entry.to as string)
  )
)

/**
 * `/en/guias/x` → `{ locale: 'en', path: '/guias/x' }` (any prefixed locale, utils/locales.ts);
 * Spanish paths come back as they are.
 */
export function splitLocalePath(path: string): { locale: string; path: string } {
  const match = LOCALE_PREFIX_RE.exec(path)
  if (!match) return { locale: 'es', path: path || '/' }
  return { locale: match[1]!, path: path.slice(match[0].length) || '/' }
}

const cleanPath = (path: string) => path.split(/[?#]/)[0]!.replace(/(.)\/+$/, '$1')

/** Whether `path` (Spanish, no prefix) has whole vue-i18n copy whose canonical is still Spanish. */
export function hasPendingI18nCanonical(path: string): boolean {
  const clean = cleanPath(path) || '/'
  return I18N_CANONICAL_PENDING.some(route =>
    route.endsWith('/') && route !== '/' ? clean.startsWith(route) : clean === route
  )
}

/** Whether `path` (Spanish, without locale prefix) has its own /en and /pt pages. */
export function isLocalizedRoute(path: string): boolean {
  const clean = cleanPath(path)
  if (LOCALIZED_NAV.has(clean)) return true
  return LOCALIZED_FAMILIES.some(prefix => clean.startsWith(prefix))
}

/**
 * Routes that exist ONLY in Spanish: the page calls `defineI18nRoute({ locales: ['es'] })`, so its
 * /en, /pt and machine-translated URLs answer 404.
 *
 * The translation memory translates their TEXT all the same (it works from the Spanish page), and
 * the sitemap lists every locale a page is translated into: the five
 * `/autos-usados-uruguay/hasta-*` pages went out in the sitemap of every other language, URLs that
 * answer 404 (measured 2026-11-09). `/alquiler/` and the scooter and e-bike pages sit in the same
 * translation queue. tests/unit/localizedRoutes.test.ts keeps this list in step with the pages.
 */
export const SPANISH_ONLY_ROUTES: readonly RegExp[] = Object.freeze([
  /^\/alquiler\/[^/]+\/[^/]+$/,
  /^\/alquileres\/[^/]+$/,
  /^\/autos-usados-uruguay\/hasta-[^/]+-dolares$/,
  /^\/(?:bicicletas-electricas|monopatines-electricos)-uruguay\/[^/]+$/,
  /^\/opinion(?:es)?-alquileres$/,
])

/** Whether `path` (Spanish, without locale prefix) has a page in Spanish only. */
export function isSpanishOnlyRoute(path: string): boolean {
  const clean = cleanPath(path)
  return SPANISH_ONLY_ROUTES.some(route => route.test(clean))
}
