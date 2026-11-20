// Framework-agnostic catalogue + helpers for the amount-conversion landing
// pages (`pages/convertir/index.vue` and `pages/convertir/[slug].vue`).
//
// PURE module (no Vue/Nuxt runtime, relative imports only) so it can be
// unit-tested in plain Node via vitest and shared by the pages, the sitemap
// route and the route guard. The catalogue targets high-intent searches like
// "cuánto es 100 dólares en pesos uruguayos"; each page pairs a live rate with
// amount-aware copy so it is substantive, not thin.

/** A currency handled by the conversion pages. */
export type ConvertCode = 'USD' | 'EUR' | 'BRL' | 'ARS' | 'UYU'

/** Display + URL metadata for a currency used in conversion slugs and copy. */
export interface ConvertCurrency {
  code: ConvertCode
  /** Plural noun used in slugs/headings (e.g. `'dólares'`, `'pesos uruguayos'`). */
  plural: string
  /** Singular noun (e.g. `'dólar'`). */
  singular: string
  /** ISO code for the API (`UYU` has no foreign quote; it is the base). */
  iso: string
}

/** Currency metadata keyed by code. */
export const CONVERT_CURRENCIES: Readonly<Record<ConvertCode, ConvertCurrency>> = Object.freeze({
  USD: { code: 'USD', plural: 'dólares', singular: 'dólar', iso: 'USD' },
  EUR: { code: 'EUR', plural: 'euros', singular: 'euro', iso: 'EUR' },
  BRL: { code: 'BRL', plural: 'reales', singular: 'real', iso: 'BRL' },
  ARS: { code: 'ARS', plural: 'pesos argentinos', singular: 'peso argentino', iso: 'ARS' },
  UYU: { code: 'UYU', plural: 'pesos uruguayos', singular: 'peso uruguayo', iso: 'UYU' },
})

/** A single conversion page: a fixed `amount` of `from` expressed in `to`. */
export interface ConvertEntry {
  /** URL-safe slug, e.g. `'100-dolares-a-pesos-uruguayos'`. */
  slug: string
  /** Amount of the source currency. */
  amount: number
  /** Source currency code. */
  from: ConvertCode
  /** Target currency code. */
  to: ConvertCode
}

/** The amount sets per directed pair, in display order. */
const AMOUNTS: ReadonlyArray<{ from: ConvertCode; to: ConvertCode; amounts: number[] }> = [
  {
    from: 'USD',
    to: 'UYU',
    amounts: [
      1, 5, 10, 20, 50, 100, 150, 200, 250, 300, 500, 750, 1000, 1500, 2000, 3000, 5000, 10000,
      20000,
    ],
  },
  { from: 'EUR', to: 'UYU', amounts: [10, 50, 100, 200, 300, 500, 1000, 2000, 5000] },
  { from: 'BRL', to: 'UYU', amounts: [50, 100, 200, 500, 1000, 2000] },
  { from: 'ARS', to: 'UYU', amounts: [1000, 5000, 10000, 50000, 100000] },
  { from: 'UYU', to: 'USD', amounts: [500, 1000, 2000, 5000, 10000, 50000, 100000, 200000] },
  { from: 'UYU', to: 'EUR', amounts: [1000, 5000, 10000, 50000] },
  { from: 'UYU', to: 'BRL', amounts: [1000, 5000, 10000] },
]

/** Slugify a currency noun: strip accents, lowercase, spaces -> hyphens. */
function slugifyNoun(noun: string): string {
  return noun
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
}

/** Build the `{amount} {from} a {to}` slug, e.g. `100-dolares-a-pesos-uruguayos`. */
export function convertSlug(amount: number, from: ConvertCode, to: ConvertCode): string {
  const fromName = slugifyNoun(CONVERT_CURRENCIES[from].plural)
  const toName = slugifyNoun(CONVERT_CURRENCIES[to].plural)
  return `${amount}-${fromName}-a-${toName}`
}

/**
 * The full, deterministic catalogue of conversion pages, derived from
 * {@link AMOUNTS}. Frozen so slugs are stable and testable.
 */
export const convertEntries: readonly ConvertEntry[] = Object.freeze(
  AMOUNTS.flatMap(({ from, to, amounts }) =>
    amounts.map(amount => ({ slug: convertSlug(amount, from, to), amount, from, to }))
  )
)

/** Look up a conversion entry by slug. */
export function getConvertEntry(slug: string): ConvertEntry | undefined {
  return convertEntries.find(entry => entry.slug === slug)
}

/** Every conversion slug, in catalogue order. Used by the sitemap and route guard. */
export function convertSlugs(): string[] {
  return convertEntries.map(entry => entry.slug)
}

/** Other amounts for the same directed pair (for internal linking). */
export function relatedAmounts(entry: ConvertEntry): ConvertEntry[] {
  return convertEntries.filter(
    other => other.from === entry.from && other.to === entry.to && other.slug !== entry.slug
  )
}

/** Format an amount with the currency noun, e.g. `(1, 'USD')` -> `'1 dólar'`. */
export function amountLabel(amount: number, code: ConvertCode): string {
  const cur = CONVERT_CURRENCIES[code]
  const noun = amount === 1 ? cur.singular : cur.plural
  return `${amount.toLocaleString('es-UY')} ${noun}`
}

/** The human-readable H1/title for a conversion page. */
export function convertTitle(entry: ConvertEntry): string {
  return `¿Cuánto es ${amountLabel(entry.amount, entry.from)} en ${
    CONVERT_CURRENCIES[entry.to].plural
  }?`
}

/**
 * El monto convertido como va en el resultado del buscador: sin centavos desde 100, porque ahí
 * importa ver la cifra y "$ 1.000,00" gasta tres caracteres que el título no tiene.
 */
export function convertSnippetAmount(entry: ConvertEntry, value: number): string {
  const decimals = value >= 100 ? 0 : 2
  return value.toLocaleString('es-UY', {
    style: 'currency',
    currency: entry.to,
    // es-UY escribe "BRL 100" y "EUR 100"; en el buscador se lee "R$ 100" y "€ 100". El dólar y el
    // peso quedan con su símbolo largo ("US$", "$"): el corto del dólar sería otro "$".
    currencyDisplay: entry.to === 'BRL' || entry.to === 'EUR' ? 'narrowSymbol' : 'symbol',
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/**
 * Título del resultado del buscador: la consulta y la cifra, en ese orden y cortito.
 *
 * Hasta el 31/10/2026 era la pregunta del H1 con la cifra al final ("¿Cuánto es 50.000 pesos
 * argentinos en pesos uruguayos? ≈ $ 1.000,00", 68 caracteres más la marca): Google corta cerca de
 * los 60 y lo que se perdía era justo la cifra. Las conversiones de pesos argentinos juntaban miles
 * de impresiones en posición 6–8 con cero clics. Ahora la cifra entra siempre antes del corte.
 * El H1 de la página sigue siendo la pregunta ({@link convertTitle}).
 */
export function convertSeoTitle(entry: ConvertEntry, value: number | null): string {
  const pair = `${amountLabel(entry.amount, entry.from)} a ${CONVERT_CURRENCIES[entry.to].plural}`
  return value === null ? `${pair} hoy` : `${pair}: ${convertSnippetAmount(entry, value)} hoy`
}

/**
 * Descripción del resultado del buscador. El buscador ya muestra su propio conversor con la
 * cotización de referencia; lo que esta página tiene y el conversor no, es lo que PAGA o COBRA hoy
 * la mejor de más de 40 casas de cambio de Uruguay. Eso va primero.
 */
export function convertSeoDescription(entry: ConvertEntry, value: number | null): string {
  const amt = amountLabel(entry.amount, entry.from)
  if (value === null) {
    return `Cuánto es ${amt} en ${CONVERT_CURRENCIES[entry.to].plural} hoy, con la cotización en vivo de más de 40 casas de cambio de Uruguay.`
  }
  const shown = convertSnippetAmount(entry, value)
  return entry.to === 'UYU'
    ? `${amt} te dan ${shown} hoy: el mejor precio de compra de más de 40 casas de cambio de Uruguay, no la cotización de referencia.`
    : `Con ${amt} comprás ${shown} hoy: el mejor precio de venta de más de 40 casas de cambio de Uruguay, no la cotización de referencia.`
}

/**
 * Convert `entry.amount` of `from` into `to` given the relevant UYU rate.
 *
 * `rate` is the price of ONE unit of the foreign currency in UYU (e.g. the sell
 * price of the dollar). For foreign->UYU we multiply; for UYU->foreign we divide.
 * Returns `null` when the rate is missing or non-positive.
 */
export function convertAmount(entry: ConvertEntry, rate: number | null | undefined): number | null {
  if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) return null
  if (entry.to === 'UYU') return entry.amount * rate
  // UYU -> foreign: amount of pesos divided by the price of one foreign unit.
  return entry.amount / rate
}

/** The foreign code involved in the pair (the non-UYU side), used to fetch the rate. */
export function foreignCode(entry: ConvertEntry): ConvertCode {
  return entry.from === 'UYU' ? entry.to : entry.from
}
