// Display logic for the regional board (`/cotizaciones-de-la-region`,
// `/llevar-dolares-o-reales-a-brasil`, `/api-cotizaciones-regionales`).
//
// PURE module (no Vue/Nuxt runtime, relative imports only) so it can be unit
// tested in plain Node and reused by the pages and the server routes without
// duplicating a single number. Every figure here is derived from what the API
// already computed; nothing is estimated, and a missing leg yields null rather
// than a plausible-looking guess.
//
// Names are prefixed `REGIONAL_`/`regional` on purpose: `utils/` is a flat
// auto-import namespace in this app and short names like `money` or `COUNTRIES`
// have collided before.

/** Countries the board covers. */
export type RegionalCountry = 'AR' | 'BR' | 'CL' | 'PY' | 'BO' | 'UY'

/** What kind of price a quote is. Drives the chip and the grouping. */
export type RegionalKind =
  | 'official'
  | 'wholesale'
  | 'parallel'
  | 'financial'
  | 'card'
  | 'retail'
  | 'reference'

export interface RegionalQuote {
  id: string
  country: RegionalCountry
  market: string
  label: string
  kind: RegionalKind
  base: string
  quote: string
  buy: number | null
  sell: number | null
  avg: number
  spreadPct: number | null
  high?: number | null
  low?: number | null
  variationPct?: number | null
  sample?: number
  updatedAt: string
  source: string
  sourceUrl: string
  corroboratedBy?: string[]
  disagreementPct?: number | null
}

export interface RegionalGap {
  country: RegionalCountry
  market: string
  label: string
  official: number
  parallel: number
  gapPct: number
}

export interface RegionalBoardRow {
  country: RegionalCountry
  name: string
  currency: string
  official: RegionalQuote | null
  parallel: RegionalQuote | null
  retail: RegionalQuote | null
  quotes: RegionalQuote[]
  gap: RegionalGap | null
  usdPerUnit: number | null
}

export interface RegionalCross {
  base: string
  quote: string
  rate: number
  via: [string, string]
}

export interface RegionalRoute {
  kind: 'local' | 'dollars'
  label: string
  costPerUnit: number
  legs: string[]
  note: string
}

export interface RegionalRouteComparison {
  country: RegionalCountry
  countryName: string
  currency: string
  routes: RegionalRoute[]
  best: 'local' | 'dollars' | null
  differencePct: number | null
  missing: string[]
}

/**
 * Una fuente, tal como la sirve `GET /regional/sources`: el catálogo más el
 * estado de la última corrida.
 *
 * `country` viene en `null` para los feeds mundiales — ponerles un país era la
 * menos mala de seis respuestas equivocadas.
 */
export interface RegionalSourceMeta {
  id: string
  name: string
  country: RegionalCountry | null
  scope?: 'national' | 'global'
  /** `internal` = dato propio; `history` = sólo alimenta el backfill. */
  role?: 'live' | 'history' | 'internal'
  url: string
  access: 'api' | 'scrape'
  publisher: 'central-bank' | 'market-data' | 'media' | 'exchange-house'
  covers: string
  status?: { ok: boolean; note: string; ms: number; quotes: number } | null
  /** Mercados donde su lectura es la publicada. */
  published?: string[]
  /** Mercados donde otra fuente ganó y ésta quedó corroborando. */
  corroborates?: string[]
  rejected?: Array<{ id: string; reason: string; value: number | null }>
  maxDisagreementPct?: number | null
  oldestQuoteAt?: string | null
  /** Compatibilidad con la forma vieja del catálogo. */
  global?: boolean
}

/** El resumen que acompaña al catálogo. */
export interface RegionalSourcesSummary {
  total: number
  live: number
  responding: number
  failing: number
  centralBanks: number
  scrapes: number
  global: number
  /** Mercados con dos o más lecturas independientes. */
  corroboratedMarkets: number
  /** Mercados con una sola fuente: los puntos ciegos que quedan. */
  singleSourceMarkets: number
}

/** Un movimiento de precio, tal como lo sirve `GET /regional/changes`. */
export interface RegionalChange {
  key: string
  country: RegionalCountry
  market: string
  base: string
  quote: string
  source: string
  previousBuy: number | null
  previousSell: number | null
  previousAvg: number
  buy: number | null
  sell: number | null
  avg: number
  buyChanged: boolean
  sellChanged: boolean
  changePct: number
  observedAt: string
  sourceUpdatedAt: string | null
  sinceMinutes: number | null
}

/** True cuando la fuente no pertenece a un país (feed mundial). */
export function regionalIsGlobalSource(source: RegionalSourceMeta): boolean {
  return source.scope === 'global' || source.global === true || source.country === null
}

export interface RegionalSnapshot {
  generatedAt: string | null
  oldestQuoteAt: string | null
  quotes: RegionalQuote[]
  board: RegionalBoardRow[]
  gaps: RegionalGap[]
  cross: RegionalCross[]
  routes: RegionalRouteComparison[]
  sources: Array<{ id: string; ok: boolean; note: string; ms: number; quotes: number }>
  rejected: Array<{ id: string; source: string; reason: string; value: number | null }>
  /** Joined in by `server/api/regional.get.ts`: who publishes each `source` id. */
  catalogue?: RegionalSourceMeta[]
  /** El resumen que acompaña al catálogo (cuántas responden, cuántos mercados quedan con una sola lectura). */
  catalogueSummary?: RegionalSourcesSummary | null
}

export interface RegionalHistoryPoint {
  key: string
  country: RegionalCountry
  market: string
  base: string
  quote: string
  day: string
  buy: number | null
  sell: number | null
  avg: number
  source: string
}

/** Country code -> what to call it in Spanish, and its currency. */
export const REGIONAL_COUNTRIES: Record<
  RegionalCountry,
  { name: string; currency: string; flag: string }
> = {
  UY: { name: 'Uruguay', currency: 'UYU', flag: '🇺🇾' },
  AR: { name: 'Argentina', currency: 'ARS', flag: '🇦🇷' },
  BR: { name: 'Brasil', currency: 'BRL', flag: '🇧🇷' },
  PY: { name: 'Paraguay', currency: 'PYG', flag: '🇵🇾' },
  CL: { name: 'Chile', currency: 'CLP', flag: '🇨🇱' },
  BO: { name: 'Bolivia', currency: 'BOB', flag: '🇧🇴' },
}

/**
 * What each kind of price actually is, in one line.
 *
 * The board stacks a central-bank fixing next to a street price next to what a
 * counter charges. They are not comparable and the page has to say so, so every
 * row carries its kind and every kind carries this sentence.
 */
export const REGIONAL_KIND_LABELS: Record<RegionalKind, { short: string; explain: string }> = {
  official: {
    short: 'Oficial',
    explain: 'La cotización que fija o publica el banco central del país.',
  },
  wholesale: {
    short: 'Mayorista',
    explain: 'El precio al que operan los bancos entre sí. No se consigue en mostrador.',
  },
  parallel: {
    short: 'Paralelo',
    explain: 'El precio de la calle, fuera del mercado oficial.',
  },
  financial: {
    short: 'Financiero',
    explain: 'Dólar comprado con títulos o cripto: legal, a precio de mercado.',
  },
  card: {
    short: 'Tarjeta',
    explain: 'Lo que termina costando un consumo con tarjeta en el exterior, con impuestos.',
  },
  retail: {
    short: 'Mostrador',
    explain: 'Lo que cobra una casa de cambio a una persona que entra a cambiar.',
  },
  reference: {
    short: 'Referencia',
    explain: 'Cruce publicado por un tercero. No es un precio al que se opere.',
  },
}

const isNum = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value)

/**
 * Format a rate with a sensible number of decimals for its magnitude.
 *
 * A guaraní per peso uruguayo is 149; a peso uruguayo per guaraní is 0,0067.
 * Fixed decimals would print either "149,67" and "0,01" (useless) or
 * "149,670000" and "0,006700" (noise), so the scale decides.
 */
export function regionalRate(value: number | null | undefined, currency?: string): string {
  if (!isNum(value)) return '—'
  const abs = Math.abs(value)
  let decimals: number
  if (currency === 'PYG' || abs >= 1000) decimals = 2
  else if (abs >= 100) decimals = 2
  else if (abs >= 1) decimals = value % 1 === 0 ? 0 : 2
  else if (abs >= 0.01) decimals = 4
  else decimals = 6
  return value.toLocaleString('es-UY', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })
}

/** A percentage with one decimal and an explicit sign. */
export function regionalPct(value: number | null | undefined, withSign = true): string {
  if (!isNum(value)) return '—'
  const formatted = Math.abs(value).toLocaleString('es-UY', {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  if (!withSign) return `${formatted} %`
  if (value > 0) return `+${formatted} %`
  if (value < 0) return `−${formatted} %`
  return `${formatted} %`
}

/** Colour for a gap: a wide one is not automatically bad, only notable. */
export function regionalGapTone(
  gapPct: number | null | undefined
): 'success' | 'warning' | 'error' | 'default' {
  if (!isNum(gapPct)) return 'default'
  const abs = Math.abs(gapPct)
  if (abs < 3) return 'success'
  if (abs < 15) return 'warning'
  return 'error'
}

/** How old the board is, in words, for the freshness line. */
export function regionalAge(iso: string | null | undefined, now: Date = new Date()): string {
  if (!iso) return 'sin datos'
  const stamp = Date.parse(iso)
  if (Number.isNaN(stamp)) return 'sin datos'
  const minutes = Math.round((now.getTime() - stamp) / 60_000)
  if (minutes < 1) return 'hace instantes'
  if (minutes < 60) return `hace ${minutes} min`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `hace ${hours} h`
  const days = Math.round(hours / 24)
  return days === 1 ? 'hace 1 día' : `hace ${days} días`
}

/**
 * True when the board is old enough that the page must say so rather than let a
 * reader assume it is live. Four hours is twelve refresh cycles: by then
 * something is wrong, not merely quiet.
 */
export function regionalIsStale(
  generatedAt: string | null | undefined,
  now: Date = new Date()
): boolean {
  if (!generatedAt) return true
  const stamp = Date.parse(generatedAt)
  if (Number.isNaN(stamp)) return true
  return now.getTime() - stamp > 4 * 60 * 60 * 1000
}

/** Publisher name for a source id, from the catalogue the API ships. */
export function regionalSourceName(
  id: string,
  catalogue: RegionalSourceMeta[] | undefined
): string {
  return catalogue?.find(source => source.id === id)?.name ?? id
}

/** Every dollar quote of one country, most authoritative first. */
export function regionalDollarQuotes(
  snapshot: RegionalSnapshot,
  country: RegionalCountry
): RegionalQuote[] {
  const currency = REGIONAL_COUNTRIES[country].currency
  const order: RegionalKind[] = [
    'official',
    'wholesale',
    'parallel',
    'financial',
    'retail',
    'card',
    'reference',
  ]
  return snapshot.quotes
    .filter(quote => quote.country === country && quote.base === 'USD' && quote.quote === currency)
    .sort(
      (a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.market.localeCompare(b.market)
    )
}

/** One cell of the cross matrix, or null when that pair was not derivable. */
export function regionalCrossRate(
  snapshot: RegionalSnapshot,
  base: string,
  quote: string
): RegionalCross | null {
  return snapshot.cross.find(entry => entry.base === base && entry.quote === quote) ?? null
}

/**
 * The verdict sentence for a route comparison.
 *
 * Deliberately says how much and against what, never just "conviene": a reader
 * who cannot see the size of the difference cannot tell a 15% gap from a 0,6%
 * one, and the second is inside the noise of which casa you walk into.
 */
export function regionalRouteVerdict(
  comparison: RegionalRouteComparison | null | undefined
): string {
  if (!comparison || !comparison.best || !isNum(comparison.differencePct)) {
    return 'Faltan datos de una de las dos puntas, así que no se puede comparar sin inventar la otra.'
  }
  const difference = regionalPct(comparison.differencePct, false)
  if (comparison.differencePct < 1) {
    return `Las dos rutas dan casi lo mismo (${difference} de diferencia): a esa distancia decide la comodidad, no el precio.`
  }
  return comparison.best === 'dollars'
    ? `Comprar dólares acá y cambiarlos en ${comparison.countryName} sale ${difference} menos que comprar ${comparison.currency} en Uruguay.`
    : `Comprar ${comparison.currency} en una casa uruguaya sale ${difference} menos que llevar dólares y cambiarlos allá.`
}

/** How many units of the foreign currency `amount` pesos uruguayos buy on a route. */
export function regionalUnitsFor(
  route: RegionalRoute | null | undefined,
  amountUyu: number
): number | null {
  if (!route || !isNum(route.costPerUnit) || route.costPerUnit <= 0 || !isNum(amountUyu))
    return null
  return amountUyu / route.costPerUnit
}

/** The daily series of one key, as plain numbers for a sparkline. */
export function regionalSeriesValues(points: RegionalHistoryPoint[], key: string): number[] {
  return points.filter(point => point.key === key).map(point => point.avg)
}

/** Percentage change between the first and last point of a series. */
export function regionalSeriesChangePct(values: number[]): number | null {
  const clean = values.filter(isNum)
  if (clean.length < 2) return null
  const first = clean[0]
  const last = clean[clean.length - 1]
  if (!first) return null
  return (last / first - 1) * 100
}
