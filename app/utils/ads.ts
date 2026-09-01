// Where an ad may appear, and how many of them.
//
// Auto ads hand placement to Google on every page the loader script reaches.
// That is what reads as invasive: a vignette between two page loads, a unit
// wedged into a calculator's result, an ad inside the embeddable /widget that
// renders on somebody else's site. This module is the opposite contract — the
// site decides per route whether an ad is allowed at all and how dense it may
// get, and the only ads it renders are reserved, lazy, in-flow slots.
//
// The revenue side of the trade: a page that keeps its tool usable keeps its
// sessions, and a slot that is actually seen earns more than three that are
// scrolled past. Density is therefore lowest exactly where the visit has a job
// to finish, and normal on the long articles people read to the end.
//
// PURE (no Vue/Nuxt imports) so the layout, plugins and tests all share it.

import { isBareRoute } from './bareRoutes'

/** Locale prefixes the router can put in front of a path. */
const LOCALE_PREFIXES = ['/en', '/pt'] as const

/**
 * Routes that carry no ads at all.
 *
 * Two reasons, both of which cost more than an impression is worth:
 *   - the page is the conversion (contacto, newsletter, the account flow) and
 *     an ad there sells the visit to somebody else for a few cents;
 *   - the page is plumbing (offline shell, scraper status) with no reader.
 *
 * The chrome-free routes (/widget, /pizarra) are excluded separately via
 * `isBareRoute`, which is also what keeps the loader script off them.
 */
const NO_ADS = [
  '/cuenta',
  '/conectar',
  '/contacto',
  '/offline',
  '/estado',
  // The owner's Search Console dashboard. One reader, logged in, and an ad next to the keyword
  // table would be an impression sold to nobody.
  '/estadisticas-de-busqueda',
] as const

/**
 * Routes that carry no ads **themselves**, but whose children may.
 *
 * `/newsletter` is the signup form — the conversion, so no ads. Everything
 * below it is the opposite kind of page: `/newsletter/archivo` and each
 * `/newsletter/<fecha>` issue are long reads a visitor arrives at from search,
 * with no form to protect. Prefix-matching them into NO_ADS would silently
 * de-monetise the fastest-growing content surface on the site — one new page a
 * day, every day — which is why the distinction is exact-vs-prefix rather than
 * one more entry in the list above.
 */
const NO_ADS_EXACT = ['/newsletter'] as const

/**
 * The calculators, and why they are ad-free rather than merely light.
 *
 * `/herramientas` itself is a directory — a list of links, and a fine place
 * for one unit. Everything below it is an instrument: you type a number in,
 * read a number out, change the number, read again. Auto ads place by reading
 * the DOM, so on a page whose DOM *is* a form the placement lands between the
 * inputs and the result — which is both the worst thing to interrupt and the
 * easiest thing to mis-tap. `light` would not help: density only changes how
 * many MANUAL units render, and while the loader is on the page the automatic
 * ones are Google's call. Only `none` keeps the loader off.
 */
function isCalculator(path: string): boolean {
  return path.startsWith('/herramientas/')
}

/**
 * Tool and rate surfaces: one slot, after the content, never inside it.
 *
 * These are the pages someone opens to answer a question in ten seconds — a
 * quote, a conversion, a branch on a map, a calculator result. Interrupting
 * that is how a comparison site trains people to use a different one.
 */
const LIGHT = [
  '/',
  '/dolar-hoy',
  '/dolar',
  '/cotizacion',
  '/convertir',
  '/comparar',
  '/comparar-plataformas-dolar-uruguay',
  '/mejor-casa-de-cambio',
  '/casa',
  '/casas-de-cambio',
  '/casa-de-cambio-cerca-de-mi',
  '/sucursales',
  '/frontera',
  '/mapa',
  '/historico',
  '/indicadores',
  '/herramientas',
  '/avanzado',
  '/buscar',
  '/mi-lista',
  '/mapa-del-sitio',
  '/desarrolladores',
  '/estadisticas-del-sitio',
  '/analiticas',
  '/ultimos-cambios',
] as const

export type AdDensity = 'none' | 'light' | 'normal'

/** Strips the query, a trailing slash and the locale prefix. `/en/mapa` → `/mapa`. */
export function normalizeAdPath(path: string): string {
  const clean = (path.split('?')[0] ?? '').replace(/\/+$/, '') || '/'
  for (const prefix of LOCALE_PREFIXES) {
    if (clean === prefix) return '/'
    if (clean.startsWith(`${prefix}/`)) return clean.slice(prefix.length)
  }
  return clean
}

/** Exact match or a real path segment below it — `/casa` must not match `/casas-de-cambio`. */
function matches(path: string, list: readonly string[]): boolean {
  return list.some(entry => path === entry || path.startsWith(`${entry}/`))
}

/**
 * How heavily `path` may be monetised. Content pages default to `normal`: they
 * are the long reads where an in-flow unit is ordinary and expected.
 */
export function adDensityForPath(path: string): AdDensity {
  if (isBareRoute(path)) return 'none'
  const clean = normalizeAdPath(path)
  if (NO_ADS_EXACT.includes(clean as (typeof NO_ADS_EXACT)[number])) return 'none'
  if (matches(clean, NO_ADS)) return 'none'
  if (isCalculator(clean)) return 'none'
  if (clean === '/' || matches(clean, LIGHT)) return 'light'
  return 'normal'
}

/** True when the route may load the AdSense loader script at all. */
export function adsAllowed(path: string): boolean {
  return adDensityForPath(path) !== 'none'
}

/**
 * Slot ceiling per route. Deliberately small: two units on a 3.000-word guide,
 * one everywhere else. Auto ads have no such ceiling, which is the point.
 */
export function maxAdSlots(density: AdDensity): number {
  if (density === 'normal') return 2
  if (density === 'light') return 1
  return 0
}
