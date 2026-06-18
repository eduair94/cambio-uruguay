// Framework-agnostic helpers for the per-currency (`pages/cotizacion/[moneda].vue`)
// and per-casa (`pages/casa/[origin].vue`) programmatic-SEO pages.
//
// These are PURE functions (no Vue/Nuxt runtime, no global state) so they can be
// unit-tested in plain Node via vitest, and reused by the pages, the server
// sitemap route, and anywhere else without duplicating the slug/filter logic.
//
// Types come from the shared API contract; imported relatively so this module
// stays runtime-agnostic.
import type { ExchangeRate, ExchangeType } from '../types/api'

/** Supported display locales for currency names. */
export type CurrencyLang = 'es' | 'en' | 'pt'

/**
 * The four currencies that get a dedicated landing page, mapping the URL slug to
 * the canonical ISO code used by the API (`ExchangeRate.code`).
 */
export const CURRENCY_SLUG_TO_CODE = {
  dolar: 'USD',
  euro: 'EUR',
  real: 'BRL',
  'peso-argentino': 'ARS',
} as const

/** A pretty slug accepted in the URL (e.g. `'dolar'`). */
export type CurrencySlug = keyof typeof CURRENCY_SLUG_TO_CODE
/** An ISO currency code handled by these pages (e.g. `'USD'`). */
export type CurrencyCode = (typeof CURRENCY_SLUG_TO_CODE)[CurrencySlug]

/** Reverse map: ISO code -> canonical pretty slug. */
const CODE_TO_SLUG: Readonly<Record<CurrencyCode, CurrencySlug>> = Object.freeze(
  (Object.entries(CURRENCY_SLUG_TO_CODE) as Array<[CurrencySlug, CurrencyCode]>).reduce(
    (acc, [slug, code]) => {
      acc[code] = slug
      return acc
    },
    {} as Record<CurrencyCode, CurrencySlug>
  )
)

/** Localised display names per currency code, keyed by language. */
const CURRENCY_NAMES: Readonly<Record<CurrencyCode, Record<CurrencyLang, string>>> = Object.freeze({
  USD: { es: 'Dólar', en: 'US Dollar', pt: 'Dólar' },
  EUR: { es: 'Euro', en: 'Euro', pt: 'Euro' },
  BRL: { es: 'Real', en: 'Brazilian Real', pt: 'Real' },
  ARS: { es: 'Peso Argentino', en: 'Argentine Peso', pt: 'Peso Argentino' },
})

/** Exchange `type` values that represent a plain/cash quote shown on these pages. */
const PLAIN_OR_CASH_TYPES: ReadonlySet<ExchangeType> = new Set<ExchangeType>(['', 'BILLETE'])

/**
 * Resolve a URL slug to its ISO currency code.
 *
 * Accepts both the pretty slug (`'dolar'`, `'peso-argentino'`) and the raw
 * lowercase ISO code (`'usd'`, `'ars'`). Matching is case-insensitive.
 *
 * @returns the {@link CurrencyCode}, or `null` when the slug is unknown.
 */
export function currencyFromSlug(slug: string): CurrencyCode | null {
  const normalized = slug.trim().toLowerCase()
  if (!normalized) return null

  if (normalized in CURRENCY_SLUG_TO_CODE) {
    return CURRENCY_SLUG_TO_CODE[normalized as CurrencySlug]
  }

  // Accept the raw lowercase ISO code as an alternate slug (e.g. /cotizacion/usd).
  const upper = normalized.toUpperCase()
  if (upper in CODE_TO_SLUG) {
    return upper as CurrencyCode
  }

  return null
}

/** Map an ISO currency code to its canonical pretty slug (e.g. `'USD'` -> `'dolar'`). */
export function currencySlug(code: CurrencyCode): CurrencySlug {
  return CODE_TO_SLUG[code]
}

/** Every pretty slug, for sitemap generation and internal linking. */
export function listCurrencySlugs(): CurrencySlug[] {
  return Object.keys(CURRENCY_SLUG_TO_CODE) as CurrencySlug[]
}

/**
 * Localised display name for a currency code (e.g. `('USD', 'es')` -> `'Dólar'`).
 * Falls back to Spanish when the language is unknown.
 */
export function currencyDisplayName(code: CurrencyCode, lang: CurrencyLang = 'es'): string {
  const byLang = CURRENCY_NAMES[code]
  return byLang[lang] ?? byLang.es
}

/** One casa's plain/cash quote for a single currency, used by the currency page. */
export interface CurrencyQuote {
  /** Exchange house id / `origin` (e.g. `'itau'`). */
  origin: string
  /** Display name of the house, falling back to `origin` when missing. */
  name: string
  /** Buy price (UYU the house pays for 1 unit), or `null` when not quoted. */
  buy: number | null
  /** Sell price (UYU the house charges for 1 unit), or `null` when not quoted. */
  sell: number | null
  /** True for the row with the highest buy price (best place to SELL the currency). */
  bestBuy: boolean
  /** True for the row with the lowest sell price (best place to BUY the currency). */
  bestSell: boolean
}

/**
 * Build the per-casa quote table for a currency, filtered to plain/cash quotes,
 * de-duplicated by `origin` (first plain/cash row wins), sorted by display name,
 * and with the best buy / best sell rows flagged.
 *
 * "Best buy" = highest `buy` (most UYU received when selling the currency).
 * "Best sell" = lowest positive `sell` (least UYU paid when buying the currency).
 * Both flags can land on the same or different rows; ties take the first row in
 * the sorted order.
 *
 * @returns a strictly-typed list of {@link CurrencyQuote}; empty when no house
 * quotes the currency with a plain/cash row.
 */
export function quotesForCurrency(
  rows: readonly ExchangeRate[],
  code: CurrencyCode
): CurrencyQuote[] {
  const byOrigin = new Map<string, CurrencyQuote>()

  for (const row of rows) {
    if (row.code !== code) continue
    if (!PLAIN_OR_CASH_TYPES.has(row.type)) continue
    if (byOrigin.has(row.origin)) continue // first plain/cash row per house wins

    byOrigin.set(row.origin, {
      origin: row.origin,
      name: row.name && row.name.trim() ? row.name : row.origin,
      buy: typeof row.buy === 'number' ? row.buy : null,
      sell: typeof row.sell === 'number' ? row.sell : null,
      bestBuy: false,
      bestSell: false,
    })
  }

  const quotes = Array.from(byOrigin.values()).sort((a, b) => a.name.localeCompare(b.name, 'es'))

  // Best buy: highest positive buy. Best sell: lowest positive sell.
  let bestBuy: CurrencyQuote | null = null
  let bestSell: CurrencyQuote | null = null
  for (const quote of quotes) {
    if (quote.buy !== null && quote.buy > 0 && (bestBuy === null || quote.buy > bestBuy.buy!)) {
      bestBuy = quote
    }
    if (
      quote.sell !== null &&
      quote.sell > 0 &&
      (bestSell === null || quote.sell < bestSell.sell!)
    ) {
      bestSell = quote
    }
  }
  if (bestBuy) bestBuy.bestBuy = true
  if (bestSell) bestSell.bestSell = true

  return quotes
}

/** One currency's plain/cash quote for a single casa, used by the casa page. */
export interface CasaRate {
  /** ISO currency code (e.g. `'USD'`). */
  code: string
  /** Currency name as quoted by the house (falls back to the code). */
  name: string
  /** Buy price, or `null` when not quoted. */
  buy: number | null
  /** Sell price, or `null` when not quoted. */
  sell: number | null
}

/**
 * Collect the plain/cash quotes for a single casa (`origin`), one row per
 * currency code (first plain/cash row per code wins), sorted with the major
 * currencies (USD, EUR, BRL, ARS) first and the rest alphabetically.
 *
 * @returns a strictly-typed list of {@link CasaRate}; empty when the casa has no
 * plain/cash quotes.
 */
export function ratesForOrigin(rows: readonly ExchangeRate[], origin: string): CasaRate[] {
  const target = origin.trim()
  if (!target) return []

  const byCode = new Map<string, CasaRate>()
  for (const row of rows) {
    if (row.origin !== target) continue
    if (!PLAIN_OR_CASH_TYPES.has(row.type)) continue
    if (byCode.has(row.code)) continue // first plain/cash row per currency wins

    byCode.set(row.code, {
      code: row.code,
      name: row.name && row.name.trim() ? row.name : row.code,
      buy: typeof row.buy === 'number' ? row.buy : null,
      sell: typeof row.sell === 'number' ? row.sell : null,
    })
  }

  // Major currencies first (in slug order), then the rest alphabetically by code.
  const majorOrder = (Object.values(CURRENCY_SLUG_TO_CODE) as string[]).reduce(
    (acc, codeValue, idx) => {
      acc[codeValue] = idx
      return acc
    },
    {} as Record<string, number>
  )

  return Array.from(byCode.values()).sort((a, b) => {
    const ai = majorOrder[a.code]
    const bi = majorOrder[b.code]
    if (ai !== undefined && bi !== undefined) return ai - bi
    if (ai !== undefined) return -1
    if (bi !== undefined) return 1
    return a.code.localeCompare(b.code)
  })
}

/** Mean of positive sell quotes for a currency, or null when none. */
export function averageSell(rows: readonly ExchangeRate[], code: CurrencyCode): number | null {
  const quotes = quotesForCurrency(rows, code).filter(q => q.sell !== null && q.sell > 0)
  if (!quotes.length) return null
  const sum = quotes.reduce((acc, q) => acc + (q.sell as number), 0)
  return sum / quotes.length
}
