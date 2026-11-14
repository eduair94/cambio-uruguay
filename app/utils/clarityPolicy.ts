// When Microsoft Clarity (heatmaps and session recordings) may record, and what it is told.
//
// PURE (no Vue, no Nuxt, no window): the on-demand runtime (services/clarityRuntime.ts), the
// consent-region route and the tests all read the same rules. Every value that leaves for Clarity
// from here is a closed vocabulary — route families, locale codes, event names written in code —
// never something a visitor typed. The few rules the service needs on every page live in
// ./clarityValues, so the entry chunk does not carry these lists.

import { isBareRoute } from './bareRoutes'
import { normalizeAdPath } from './ads'
import { CONSENT_STRICT_REGIONS, type ConsentDecision } from './consent'
import { LOCALE_PREFIX_RE } from './locales'
import { CLARITY_PRIVATE_QUERY_PARAMS } from './clarityValues'

export {
  CLARITY_COOKIES,
  CLARITY_PRIVATE_QUERY_PARAMS,
  clarityEventName,
  clarityForgetCookies,
  clarityTagValue,
} from './clarityValues'

/**
 * Pages Clarity never records, under any locale prefix.
 *
 * Balanced masking hides inputs, numbers and e-mail addresses, but it records every other text
 * on screen and the page URL as is. These pages show what a person wrote or who they are: the
 * account and its API keys, the sign-in hand-off, the AI assistant's conversation, the rental
 * survey and its private panel, the owner's dashboards, the scraper status, the recording-consent
 * guide (a sensitive subject, and its letter carries name, cédula and the video's address) and
 * the card-discount finder that centres on the visitor's position.
 */
export const CLARITY_EXCLUDED_ROUTES: readonly string[] = Object.freeze([
  '/cuenta',
  '/conectar',
  '/asistente-ia',
  '/opinion-alquileres',
  '/opiniones-alquileres',
  '/contactos-comerciales',
  '/oportunidades-reddit',
  '/offline',
  '/estado',
  '/grabacion-sin-consentimiento-uruguay',
  '/descuentos-con-tarjeta-uruguay/cerca-de-mi',
])

/** Every `/estadisticas-*` page: the private dashboards and their public siblings alike. */
const EXCLUDED_ROUTE_PREFIXES: readonly string[] = ['/estadisticas-']

/**
 * A page whose URL carries one of CLARITY_PRIVATE_QUERY_PARAMS (./clarityValues) is not recorded.
 * Compared case-insensitively: a false positive costs one recording, a miss leaks a token.
 */
const PRIVATE_PARAMS = new Set(CLARITY_PRIVATE_QUERY_PARAMS.map(name => name.toLowerCase()))

export type ClarityQuery = Record<string, unknown> | URLSearchParams | string | null | undefined

/** Exact match or a real path segment below it — `/cuenta` must not match `/cuenta-remunerada…`. */
function matchesRoute(path: string, list: readonly string[]): boolean {
  return list.some(entry => path === entry || path.startsWith(`${entry}/`))
}

function queryNames(query: ClarityQuery): string[] {
  if (!query) return []
  if (typeof query === 'string')
    return [...new URLSearchParams(query.replace(/^[^?]*\?/, '').split('#')[0]).keys()]
  if (query instanceof URLSearchParams) return [...query.keys()]
  return Object.keys(query)
}

/**
 * True when Clarity may record `path`. `path` may carry its own query string (a `fullPath`);
 * `query` is the router's parsed query, a `URLSearchParams` or a search string.
 */
export function clarityRouteAllowed(path: string, query?: ClarityQuery): boolean {
  if (typeof path !== 'string') return false
  const [base = '', search = ''] = path.split('#')[0]!.split('?')
  if (isBareRoute(base)) return false
  const clean = normalizeAdPath(base)
  if (matchesRoute(clean, CLARITY_EXCLUDED_ROUTES)) return false
  if (EXCLUDED_ROUTE_PREFIXES.some(prefix => clean.startsWith(prefix))) return false
  const names = [...queryNames(search), ...queryNames(query)]
  return !names.some(name => PRIVATE_PARAMS.has(name.toLowerCase()))
}

/**
 * Whether a tab whose `document.referrer` is `referrer` may be recorded. Clarity sends the
 * referrer as is (its drop list does not reach it) at the start of every page, and the site's
 * policy (strict-origin-when-cross-origin) gives a page of the same site the full URL: a listing
 * opened in a new tab from a search with the reference address would carry that address. Such a
 * tab is not recorded at all, since the referrer stays the same for every page of it.
 */
export function clarityReferrerAllowed(referrer: unknown): boolean {
  if (typeof referrer !== 'string' || !referrer.includes('?')) return true
  return !queryNames(referrer).some(name => PRIVATE_PARAMS.has(name.toLowerCase()))
}

export type ClarityStartDecision = 'skip' | 'wait' | 'load'

export interface ClarityStartInput {
  /** The visitor's stored choice (`cu_consent`), or null while they have not chosen. */
  cookie: ConsentDecision | null | undefined
  /** EEA, UK or Switzerland. `null` when the region could not be told. */
  strictRegion: boolean | null | undefined
  /** `navigator.globalPrivacyControl`: the browser asks for no tracking. */
  gpc?: boolean
  /** A crawler or an automated browser (utils/sentryPrivacy.ts `isAutomatedBrowser`). */
  automated?: boolean
  /** `navigator.connection.saveData`: the visitor asked to spend less data. */
  saveData?: boolean
}

/**
 * Whether Clarity may load for this visitor.
 *
 * - `skip`: never this visit. "Rechazar", GPC, a robot, or a data-saving browser — ~25 KB of
 *   script and its uploads are exactly what saveData asks the page not to spend.
 * - `load`: the visitor accepted, or has not chosen in a region where analytics run by default
 *   (Uruguay and the rest outside the EEA/UK/CH, the same regime GA4 and AdSense already follow).
 * - `wait`: has not chosen, in a strict region or one that could not be told: nothing reaches
 *   Microsoft until "Aceptar".
 */
export function clarityStartDecision(input: ClarityStartInput): ClarityStartDecision {
  if (input.cookie === 'denied' || input.gpc || input.automated || input.saveData) return 'skip'
  if (input.cookie === 'granted') return 'load'
  return input.strictRegion === false ? 'load' : 'wait'
}

/**
 * The strict consent regime for a Cloudflare `cf-ipcountry` value. Unknown (`XX`), Tor (`T1`),
 * missing or malformed count as strict: when the country cannot be told, the safe answer is the
 * one that waits for "Aceptar".
 */
export function strictConsentCountry(country: unknown): boolean {
  const code = typeof country === 'string' ? country.trim().toUpperCase() : ''
  if (!/^[A-Z]{2}$/.test(code) || code === 'XX' || code === 'T1') return true
  return CONSENT_STRICT_REGIONS.includes(code)
}

/** EEA time zones outside `Europe/*` (Iceland, the Canaries, Madeira, the Azores, Ceuta, Cyprus, Svalbard). */
const STRICT_TIME_ZONES = new Set([
  'Atlantic/Reykjavik',
  'Atlantic/Canary',
  'Atlantic/Madeira',
  'Atlantic/Azores',
  'Africa/Ceuta',
  'Asia/Nicosia',
  'Asia/Famagusta',
  'Arctic/Longyearbyen',
])

/**
 * The fallback when the region route cannot be reached: the browser's time zone. `Europe/*`
 * overshoots (Istanbul, Moscow), which only means waiting for "Aceptar" there too. `null` when the
 * browser reports no zone.
 */
export function strictRegionFromTimeZone(timeZone: unknown): boolean | null {
  if (typeof timeZone !== 'string' || !timeZone) return null
  return timeZone.startsWith('Europe/') || STRICT_TIME_ZONES.has(timeZone)
}

/**
 * Directories whose filters live in the query string. Clarity treats every change of the URL as a
 * new page: it stops, waits 250 ms and serialises the whole DOM again — measured on
 * /alquileres-uruguay at CPU×4, about 0.5 s of JavaScript per filter change. The fourth
 * query-only navigation stops the recording until the visitor leaves the page.
 */
export const CLARITY_RESTART_CAPPED_ROUTES: readonly string[] = Object.freeze([
  '/alquileres-uruguay',
  '/autos-usados-uruguay',
  '/motos-usadas-uruguay',
  '/equipar-casa-uruguay/productos',
  '/celulares-uruguay',
  '/venta-viviendas-uruguay',
])
/** Query-only navigations recorded on a capped directory before the recording stops. */
export const CLARITY_MAX_QUERY_RESTARTS = 3

const withoutHash = (fullPath: string) => fullPath.split('#')[0] ?? ''

interface NavigationEnd {
  path: string
  fullPath: string
}

/**
 * The count of query-only navigations on the current path, after going from `from` to `to`:
 * a new path (a locale switch included) starts again at 0, a hash-only change (which Clarity
 * ignores) keeps the count.
 */
export function clarityQueryRestarts(
  previous: number,
  from: NavigationEnd,
  to: NavigationEnd
): number {
  if (to.path !== from.path) return 0
  if (withoutHash(to.fullPath) === withoutHash(from.fullPath)) return previous
  return previous + 1
}

/** False from the fourth query-only navigation on a capped directory, until the path changes. */
export function clarityKeepRecording(input: { path: string; queryChanges: number }): boolean {
  if (!matchesRoute(normalizeAdPath(input.path), CLARITY_RESTART_CAPPED_ROUTES)) return true
  return input.queryChanges <= CLARITY_MAX_QUERY_RESTARTS
}

export type ClarityFamily =
  | 'inicio'
  | 'alquileres'
  | 'viviendas'
  | 'autos'
  | 'motos'
  | 'productos'
  | 'cotizaciones'
  | 'herramientas'
  | 'blog'
  | 'guias'
  | 'otra'

const FAMILY_RULES: ReadonlyArray<[ClarityFamily, RegExp]> = [
  ['alquileres', /alquil/],
  [
    'viviendas',
    /^(?:venta-viviendas-uruguay|oportunidades-inmobiliarias-uruguay|evolucion-precio-viviendas-uruguay)$/,
  ],
  ['autos', /(?:^|-)autos?(?:-|$)/],
  ['motos', /(?:^|-)motos?(?:-|$)/],
  [
    'productos',
    /^(?:equipar-casa-uruguay|celulares-uruguay|sillas-escritorio-uruguay|monopatines-electricos-uruguay|bicicletas-electricas-uruguay|tiendas-online-uruguay|precios-de-supermercado-uruguay|precio|cambios-de-precio-uruguay|ciberlunes-y-black-friday-uruguay)$/,
  ],
  [
    'cotizaciones',
    /^(?:dolar|dolar-hoy|dolar-blue-hoy|cotizacion|cotizacion-del-bcu|cotizaciones-de-la-region|casa|casas-de-cambio|casas-de-cambio-abiertas-fin-de-semana|sucursal|sucursales|historico|mapa|casa-de-cambio-cerca-de-mi|mejor-casa-de-cambio|convertir|comparar|avanzado|mi-lista|indicadores|frontera)$/,
  ],
  ['herramientas', /^herramientas$/],
  ['blog', /^(?:blog|noticias|newsletter)$/],
  ['guias', /^guias$/],
]

/** The page's family, from its first path segment: a heatmap filter and the sampling unit. */
export function clarityFamily(path: string): ClarityFamily {
  const clean = normalizeAdPath(typeof path === 'string' ? path : '')
  if (clean === '/') return 'inicio'
  const first = clean.split('/')[1] ?? ''
  return FAMILY_RULES.find(([, rule]) => rule.test(first))?.[0] ?? 'otra'
}

/**
 * The share of browsers recorded on a family. Every rental visit, because that is where the
 * questions are (the directory, the property pages, the survey); half of the rest, which still
 * fills every heatmap of a page with real traffic and halves the cost for everybody else.
 */
export function claritySampleRate(family: ClarityFamily): number {
  return family === 'alquileres' ? 1 : 0.5
}

/** Whether a browser with this `seed` (a stable random number in [0, 1)) is recorded on `family`. */
export function claritySampled(family: ClarityFamily, seed: number): boolean {
  const value = Number.isFinite(seed) ? seed : 0
  return value < claritySampleRate(family)
}

/** A stored sampling seed, or null when it is missing or malformed. */
export function parseClaritySeed(raw: unknown): number | null {
  if (typeof raw !== 'string' || !/^0(?:\.\d{1,17})?$/.test(raw)) return null
  const value = Number(raw)
  return value >= 0 && value < 1 ? value : null
}

/** The locale prefix of `path` (`/en/…` → `en`), `es` without one. */
export function clarityLocale(path: string): string {
  return (typeof path === 'string' && path.match(LOCALE_PREFIX_RE)?.[1]) || 'es'
}
