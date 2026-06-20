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
import { BCU_ORIGIN } from './rateSource'

/** Supported display locales for currency names. */
export type CurrencyLang = 'es' | 'en' | 'pt'

/**
 * The currencies that get a dedicated landing page, mapping the URL slug to the
 * canonical ISO code used by the API (`ExchangeRate.code`).
 *
 * The four majors (USD, EUR, BRL, ARS) come first; the slug order also drives the
 * "major currencies first" sort in {@link ratesForOrigin}. The rest are the extra
 * codes the API actually quotes at casas de cambio (gold plus a set of travel /
 * regional currencies), all grammatically masculine in Spanish so the shared
 * "Cotización del {currency}" copy reads correctly.
 */
export const CURRENCY_SLUG_TO_CODE = {
  dolar: 'USD',
  euro: 'EUR',
  real: 'BRL',
  'peso-argentino': 'ARS',
  oro: 'XAU',
  yen: 'JPY',
  'franco-suizo': 'CHF',
  guarani: 'PYG',
  'peso-chileno': 'CLP',
  'sol-peruano': 'PEN',
  'peso-colombiano': 'COP',
  'peso-mexicano': 'MXN',
  'dolar-canadiense': 'CAD',
  'dolar-australiano': 'AUD',
  'libra-esterlina': 'GBP',
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
  XAU: { es: 'Oro', en: 'Gold', pt: 'Ouro' },
  JPY: { es: 'Yen', en: 'Japanese Yen', pt: 'Iene' },
  CHF: { es: 'Franco Suizo', en: 'Swiss Franc', pt: 'Franco Suíço' },
  PYG: { es: 'Guaraní', en: 'Paraguayan Guaraní', pt: 'Guarani' },
  CLP: { es: 'Peso Chileno', en: 'Chilean Peso', pt: 'Peso Chileno' },
  PEN: { es: 'Sol Peruano', en: 'Peruvian Sol', pt: 'Sol Peruano' },
  COP: { es: 'Peso Colombiano', en: 'Colombian Peso', pt: 'Peso Colombiano' },
  MXN: { es: 'Peso Mexicano', en: 'Mexican Peso', pt: 'Peso Mexicano' },
  CAD: { es: 'Dólar Canadiense', en: 'Canadian Dollar', pt: 'Dólar Canadense' },
  AUD: { es: 'Dólar Australiano', en: 'Australian Dollar', pt: 'Dólar Australiano' },
  GBP: { es: 'Libra Esterlina', en: 'British Pound', pt: 'Libra Esterlina' },
})

/**
 * Currencies that are grammatically feminine in Spanish/Portuguese, so the shared
 * copy must say "de la libra" / "da libra" instead of "del" / "do". Everything
 * else defaults to masculine.
 */
const FEMININE_CURRENCIES: ReadonlySet<CurrencyCode> = new Set<CurrencyCode>(['GBP'])

/**
 * The "de + article" preposition for a currency in the given language, used by the
 * shared cotización copy (`Cotización {prep} {currency}`). Spanish: `del` / `de la`;
 * Portuguese: `do` / `da`; English needs no article, so it returns an empty string.
 */
export function currencyPrep(code: CurrencyCode, lang: CurrencyLang = 'es'): string {
  const feminine = FEMININE_CURRENCIES.has(code)
  if (lang === 'pt') return feminine ? 'da' : 'do'
  if (lang === 'en') return ''
  return feminine ? 'de la' : 'del'
}

/**
 * Per-currency context paragraph (Spanish-only, like the editorial guides). Gives
 * each programmatic `/cotizacion/{slug}` page a unique, locally-relevant blurb so
 * even single-casa pages are substantive rather than thin. Rendered verbatim
 * regardless of the active UI locale; the audience is Uruguay.
 */
const CURRENCY_CONTEXT: Readonly<Record<CurrencyCode, string>> = Object.freeze({
  USD: 'El dólar estadounidense es la moneda de referencia para el ahorro y los grandes pagos en Uruguay, por eso casi todas las casas de cambio del país publican su precio de compra y venta. Las diferencias entre una casa y otra pueden representar varios pesos por dólar, así que comparar antes de operar marca una diferencia real en montos altos.',
  EUR: 'El euro es la segunda divisa más operada en Uruguay, sobre todo para viajes a Europa, remesas y ahorro. No todas las casas de cambio ofrecen el mismo precio ni el mismo spread, de modo que conviene comparar la cotización de compra y venta antes de decidir.',
  BRL: 'El real brasileño tiene fuerte demanda en Uruguay por el turismo y el comercio de frontera con Brasil. Su cotización suele moverse con el mercado regional, y comparar entre casas de cambio ayuda a no perder en el cambio, especialmente cerca de la frontera.',
  ARS: 'El peso argentino se opera mucho en el litoral y por el turismo desde Argentina. Es una moneda volátil, por lo que su cotización en las casas de cambio uruguayas puede variar bastante en pocos días; revisar el precio actualizado evita sorpresas.',
  XAU: 'El oro se cotiza por onza troy y funciona como activo de refugio frente a la inflación y la incertidumbre. En Uruguay, el Banco República y algunas casas de cambio publican su precio de compra y venta en pesos; al tratarse de un valor alto, una pequeña diferencia por onza puede significar bastante dinero.',
  JPY: 'El yen japonés es una de las monedas más negociadas del mundo y en Uruguay se busca sobre todo para viajes a Japón o pagos puntuales. Pocas casas de cambio lo cotizan, así que comparar el precio disponible evita pagar de más.',
  CHF: 'El franco suizo es considerado una moneda refugio por su estabilidad histórica. En Uruguay se opera para viajes a Suiza, ahorro o pagos específicos; no todas las casas lo ofrecen, por lo que conviene revisar dónde está disponible y a qué precio.',
  PYG: 'El guaraní paraguayo interesa sobre todo a quienes viajan o comercian con Paraguay y a la zona de frontera. Por su bajo valor unitario, su cotización se expresa con varios decimales, así que conviene mirarla con atención al cambiar montos grandes.',
  CLP: 'El peso chileno se busca para viajes y compras en Chile. Tiene un valor unitario bajo frente al peso uruguayo, por lo que su cotización se muestra con decimales; verificar qué casa de cambio lo ofrece ayuda a cambiar en mejores condiciones.',
  PEN: 'El sol peruano se opera principalmente por turismo y negocios con Perú. Es una moneda de circulación más acotada en Uruguay, así que conviene confirmar qué casa de cambio la cotiza antes de operar.',
  COP: 'El peso colombiano interesa a viajeros y a quienes reciben o envían dinero desde Colombia. Por su bajo valor unitario, su cotización en Uruguay se expresa con varios decimales y conviene revisarla con cuidado.',
  MXN: 'El peso mexicano se busca para viajes a México y pagos puntuales. No es de las monedas más ofrecidas en Uruguay, por lo que comparar dónde está disponible es clave para conseguir un buen precio.',
  CAD: 'El dólar canadiense se opera por viajes, estudios o inmigración a Canadá. Su cotización en Uruguay puede variar según la casa de cambio, así que conviene comparar antes de comprar o vender.',
  AUD: 'El dólar australiano interesa a quienes viajan, estudian o emigran a Australia. Es una divisa menos común en las casas de cambio uruguayas, de modo que verificar disponibilidad y precio ayuda a operar mejor.',
  GBP: 'La libra esterlina es la moneda del Reino Unido y una de las divisas más fuertes del mundo. En Uruguay se opera sobre todo por viajes, estudios o negocios con Gran Bretaña; no todas las casas de cambio la cotizan, así que conviene comparar dónde está disponible y a qué precio.',
})

/**
 * Currency groupings for the `/cotizacion` hub, in display order. Each slug
 * appears in exactly one group (asserted by the unit tests) so the hub lists
 * every supported currency once. `titleKey` resolves against the `cotizacionIndex`
 * i18n namespace.
 */
export const CURRENCY_GROUPS: ReadonlyArray<{ titleKey: string; slugs: CurrencySlug[] }> =
  Object.freeze([
    { titleKey: 'groupMajors', slugs: ['dolar', 'euro', 'real', 'peso-argentino'] },
    {
      titleKey: 'groupRegion',
      slugs: ['peso-chileno', 'guarani', 'sol-peruano', 'peso-colombiano', 'peso-mexicano'],
    },
    {
      titleKey: 'groupIntl',
      slugs: ['libra-esterlina', 'yen', 'franco-suizo', 'dolar-canadiense', 'dolar-australiano'],
    },
    { titleKey: 'groupCommodities', slugs: ['oro'] },
  ])

/** Grams in one troy ounce — gold (XAU) is quoted per troy ounce of pure (24k) gold. */
export const TROY_OUNCE_GRAMS = 31.1035

/** Common gold finenesses and their purity factor relative to 24k (pure) gold. */
export const GOLD_KARATS: ReadonlyArray<{ karat: number; purity: number }> = Object.freeze([
  { karat: 24, purity: 1 },
  { karat: 18, purity: 0.75 },
  { karat: 14, purity: 0.5833 },
])

/** A per-gram gold price for a given karat. */
export interface GoldGramPrice {
  karat: number
  pricePerGram: number
}

/**
 * Per-gram gold prices by karat, derived from a per-troy-ounce 24k price (the XAU
 * quote). Lets the `/cotizacion/oro` page answer "precio del gramo de oro" queries
 * from the same live data, instead of only the per-ounce figure.
 *
 * @returns one entry per {@link GOLD_KARATS} fineness, or `[]` for a non-positive
 * input.
 */
export function goldGramPrices(pricePerTroyOunce: number): GoldGramPrice[] {
  if (!(pricePerTroyOunce > 0)) return []
  const perGram24 = pricePerTroyOunce / TROY_OUNCE_GRAMS
  return GOLD_KARATS.map(k => ({ karat: k.karat, pricePerGram: perGram24 * k.purity }))
}

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

/**
 * Spanish context paragraph for a currency, used as the unique SEO copy on its
 * `/cotizacion/{slug}` page. Always Spanish (audience is Uruguay), mirroring the
 * editorial guides convention.
 */
export function currencyContext(code: CurrencyCode): string {
  return CURRENCY_CONTEXT[code]
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
    if (row.origin === BCU_ORIGIN) continue // BCU is a reference, not a casa de cambio
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
