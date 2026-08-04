// Framework-agnostic helpers for the border-department landing pages
// (`pages/frontera/[ruta].vue`).
//
// These pages answer a demand no single-rate publisher can: "el real en Rivera
// hoy" / "peso argentino en Salto hoy" — the live buy/sell of a *specific
// non-USD currency* at the casas de cambio that actually operate in a border
// department. The data comes from the rates already scraped for the comparator
// (`GET /` rows) joined with the branch geodata (`GET /localData`), so there is
// no new scraper: it is a curated view over existing data.
//
// The route set is a hand-curated ALLOWLIST — never a currency × department
// cross-product. Exotic non-frontier BRL/ARS quotes mirror BROU/BCU and would
// mint near-duplicate pages Google discovers but never indexes; only the border
// departments where the currency is genuinely traded at ≥3 casas earn a page.
//
// Pure functions (no Vue/Nuxt runtime, no global state) so they can be
// unit-tested in plain Node via vitest and reused by the page, the server
// sitemap route and the internal-link blocks without duplicating the logic.
import type { ExchangeRate } from '../types/api'
import type { CurrencyCode, CurrencyQuote, CurrencySlug } from './currencyPages'
import { quotesForCurrency } from './currencyPages'
import { housesInDepartment, slugifyDepartment, type LocalDataMap } from './departments'

/** The non-USD currencies that get border-department landing pages. */
export type FronteraCode = Extract<CurrencyCode, 'BRL' | 'ARS'>

/** The neighbouring country a border department trades with. */
export type FronteraBorder = 'Brasil' | 'Argentina'

/**
 * A curated border-department landing page: one currency in one department where
 * that currency is genuinely traded at the frontier.
 */
export interface FronteraRoute {
  /** URL slug under `/frontera/` (e.g. `'real-en-rivera'`). Unique. */
  slug: string
  /** ISO code the rates are filtered to (`'BRL'` | `'ARS'`). */
  code: FronteraCode
  /** Canonical currency slug used elsewhere (`'real'` | `'peso-argentino'`). */
  currencySlug: Extract<CurrencySlug, 'real' | 'peso-argentino'>
  /** Slug of the department, matched (accent-insensitively) against `localData`. */
  departmentSlug: string
  /** Display name of the department, title-cased (e.g. `'Río Negro'`). */
  departmentName: string
  /** Neighbouring country, for the copy ("frontera con {border}"). */
  border: FronteraBorder
  /** The border town(s) that drive the demand (e.g. `'Chuy'`), for the copy. */
  town: string
  /**
   * Unique Spanish SEO paragraph, rendered verbatim regardless of the UI locale
   * (the audience is Uruguay). Distinct wording per route so the pages are
   * substantive and never read as scaled content.
   */
  context: string
}

/**
 * The curated allowlist. Casa counts in the comments are the live figures the
 * pages were scoped against (2026-07); the page itself always renders whatever
 * casas currently quote, so a temporary scraper gap degrades gracefully rather
 * than publishing a stale count.
 */
export const FRONTERA_ROUTES: readonly FronteraRoute[] = Object.freeze([
  {
    slug: 'real-en-rivera',
    code: 'BRL',
    currencySlug: 'real',
    departmentSlug: 'rivera',
    departmentName: 'Rivera',
    border: 'Brasil',
    town: 'Rivera',
    context:
      'Rivera es la frontera seca más transitada entre Uruguay y Brasil: la ciudad se une con Santana do Livramento sin control migratorio, así que el real circula a diario en comercios, free shops y casas de cambio. Por eso su cotización suele ser de las más competitivas del país, y comparar entre casas antes de cambiar reales evita perder varios pesos por unidad en montos altos.',
  },
  {
    slug: 'real-en-rocha',
    code: 'BRL',
    currencySlug: 'real',
    departmentSlug: 'rocha',
    departmentName: 'Rocha',
    border: 'Brasil',
    town: 'Chuy',
    context:
      'En Rocha, el real se opera sobre todo en el Chuy, la ciudad partida por la avenida internacional que la une con Chuí (Brasil). El movimiento de turismo y compras en los free shops mantiene una demanda constante de reales, por lo que conviene revisar la cotización de compra y venta en las casas de cambio de la zona antes de cruzar.',
  },
  {
    slug: 'real-en-cerro-largo',
    code: 'BRL',
    currencySlug: 'real',
    departmentSlug: 'cerro-largo',
    departmentName: 'Cerro Largo',
    border: 'Brasil',
    town: 'Río Branco',
    context:
      'Cerro Largo limita con Brasil a la altura de Río Branco, unida a Yaguarón por el puente Mauá sobre el río Yaguarón. El comercio de frontera y el paso frecuente hacia Brasil sostienen la demanda de reales, así que comparar dónde pagan mejor el real ayuda a cambiar en mejores condiciones.',
  },
  {
    slug: 'real-en-artigas',
    code: 'BRL',
    currencySlug: 'real',
    departmentSlug: 'artigas',
    departmentName: 'Artigas',
    border: 'Brasil',
    town: 'Artigas',
    context:
      'Artigas comparte frontera con Quaraí (Brasil), unidas por el puente internacional sobre el río Cuareim. El real se usa con naturalidad en el comercio local, de modo que su cotización en las casas de cambio del departamento es un dato clave para quienes cruzan seguido o reciben pagos en reales.',
  },
  {
    slug: 'peso-argentino-en-salto',
    code: 'ARS',
    currencySlug: 'peso-argentino',
    departmentSlug: 'salto',
    departmentName: 'Salto',
    border: 'Argentina',
    town: 'Salto',
    context:
      'Salto se conecta con Concordia (Argentina) por la represa de Salto Grande, y el ir y venir de turistas argentinos por las termas mantiene viva la demanda del peso argentino. Al ser una moneda volátil, su cotización en las casas de cambio salteñas puede variar bastante en pocos días, por lo que revisar el precio actualizado evita sorpresas al cambiar.',
  },
  {
    slug: 'peso-argentino-en-paysandu',
    code: 'ARS',
    currencySlug: 'peso-argentino',
    departmentSlug: 'paysandu',
    departmentName: 'Paysandú',
    border: 'Argentina',
    town: 'Paysandú',
    context:
      'Paysandú se une con Colón (Argentina) por el puente internacional General Artigas, un cruce muy usado para turismo y compras. El peso argentino se opera con frecuencia en la ciudad; como su valor cambia rápido, conviene comparar la cotización de compra y venta entre las casas de cambio antes de operar.',
  },
  {
    slug: 'peso-argentino-en-rio-negro',
    code: 'ARS',
    currencySlug: 'peso-argentino',
    departmentSlug: 'rio-negro',
    departmentName: 'Río Negro',
    border: 'Argentina',
    town: 'Fray Bentos',
    context:
      'En Río Negro, el peso argentino se cambia sobre todo en Fray Bentos, conectada con Gualeguaychú (Argentina) por el puente Libertador General San Martín. El flujo de argentinos hacia la ciudad sostiene la demanda; por la volatilidad del peso, mirar la cotización del día en las casas de cambio locales es imprescindible.',
  },
])

/** Every frontera slug, for the sitemap allowlist and internal linking. */
export function listFronteraSlugs(): string[] {
  return FRONTERA_ROUTES.map(r => r.slug)
}

/**
 * Resolve a `/frontera/:ruta` slug to its curated route.
 *
 * Matching is exact on the slug (case-insensitive): the route set is an
 * allowlist, so an unknown slug returns `null` and the page 404s rather than
 * rendering an uncurated currency × department combination.
 */
export function fronteraFromSlug(slug: string): FronteraRoute | null {
  const target = slug.trim().toLowerCase()
  if (!target) return null
  return FRONTERA_ROUTES.find(r => r.slug === target) ?? null
}

/** The curated frontera routes for a given currency code, in catalogue order. */
export function fronteraRoutesForCode(code: FronteraCode): FronteraRoute[] {
  return FRONTERA_ROUTES.filter(r => r.code === code)
}

/**
 * Build the per-casa quote table for a frontera page: the casas with a branch in
 * the department, restricted to the plain/cash rows of the route's currency,
 * with best-buy / best-sell flagged *within the department* (not the whole
 * market — the headline house must be one the visitor can actually reach).
 *
 * @returns a strictly-typed list of {@link CurrencyQuote}; empty when no casa in
 * the department currently quotes the currency.
 */
export function housesForFrontera(
  localData: LocalDataMap,
  rows: readonly ExchangeRate[],
  route: FronteraRoute
): CurrencyQuote[] {
  const inDept = new Set(housesInDepartment(localData, route.departmentSlug).map(h => h.origin))
  if (!inDept.size) return []
  // Scope the rows to this department first, then reuse the shared currency
  // reducer so the best-buy/best-sell flags are computed over the local subset.
  const scoped = rows.filter(row => inDept.has(row.origin))
  return quotesForCurrency(scoped, route.code)
}

/** The house paying the most for the currency (best place to SELL it), or null. */
export function fronteraBestBuy(quotes: readonly CurrencyQuote[]): CurrencyQuote | null {
  return quotes.find(q => q.bestBuy) ?? null
}

/** The house charging the least for the currency (best place to BUY it), or null. */
export function fronteraBestSell(quotes: readonly CurrencyQuote[]): CurrencyQuote | null {
  return quotes.find(q => q.bestSell) ?? null
}

/** Ensure the curated department slug is what {@link slugifyDepartment} produces. */
export function fronteraDepartmentSlug(route: FronteraRoute): string {
  return slugifyDepartment(route.departmentName)
}
