// The per-casa intent pages (`/casa/:origin/:intent`).
//
// Search Console says the site's largest untapped demand is brand + intent:
// "cambio gales horario", "cambio gales telefono", "cambio gales sucursales",
// "cambio principal rivera". Those queries land on `/casa/:origin`, which
// answers the rate and buries the rest, and the CTR shows it (7.602 impressions
// and 45 clicks for "cambio gales"). This module gives each intent its own URL,
// its own H1 and its own body, built from data we already hold.
//
// PURE module (no Vue/Nuxt runtime, relative imports only): the page, the
// sitemap route and the tests all derive the same slug set and the same copy.
//
// The hard rule for this family: a page only exists when we have the DATA that
// answers it. No branch with a phone number means no `/telefono` page, and the
// sitemap never lists one — a page whose whole job is to print a phone number
// and cannot is the definition of thin.

import { deptLabel, displayableHours, tidy, type BranchPage } from './branches'
import {
  CURRENCY_SLUG_TO_CODE,
  currencyDisplayName,
  type CurrencyCode,
  type CurrencySlug,
} from './currencyPages'
import { offMarketDetector } from './marketOutlier'

/** The fixed, non-currency intents a casa page can be sliced into. */
export const CASA_FIXED_INTENTS = [
  'horarios',
  'telefono',
  'opiniones',
  'comprar-dolares',
  'vender-dolares',
] as const

export type CasaFixedIntent = (typeof CASA_FIXED_INTENTS)[number]

/**
 * Currency slices, one per currency the casa actually quotes.
 *
 * The dollar is deliberately absent: `comprar-dolares` and `vender-dolares`
 * already answer it from both sides, and a third `/casa/x/dolar` would compete
 * with them for the same query. Everything else has real, unanswered demand —
 * "euro brou" (153 impressions, no clicks), "cotizacion euro brou" (73),
 * "real cotizacion brou" (47), "precio del oro en uruguay brou" (153) — and 148
 * casa×currency quotes exist in the live feed to answer it with.
 */
export const CASA_CURRENCY_INTENTS = Object.freeze(
  (Object.keys(CURRENCY_SLUG_TO_CODE) as CurrencySlug[]).filter(slug => slug !== 'dolar')
)

/** Every intent slug: the fixed ones first, then one per non-dollar currency. */
export const CASA_INTENTS = Object.freeze([
  ...CASA_FIXED_INTENTS,
  ...CASA_CURRENCY_INTENTS,
]) as readonly (CasaFixedIntent | CurrencySlug)[]

export type CasaIntent = CasaFixedIntent | CurrencySlug

/** Narrow an arbitrary route param to a known intent. */
export function isCasaIntent(value: string): value is CasaIntent {
  return (CASA_INTENTS as readonly string[]).includes(value)
}

/** True when the intent is a currency slice rather than a fixed section. */
export function isCurrencyIntent(intent: string): intent is CurrencySlug {
  return (CASA_CURRENCY_INTENTS as readonly string[]).includes(intent)
}

/** ISO code behind a currency intent, or `null` for the fixed ones. */
export function intentCurrencyCode(intent: string): CurrencyCode | null {
  return isCurrencyIntent(intent) ? CURRENCY_SLUG_TO_CODE[intent] : null
}

/** Static presentation metadata for an intent. */
export interface CasaIntentMeta {
  slug: CasaIntent
  /** Uppercase chip/OG label. */
  tag: string
  /** Nav/breadcrumb label. */
  label: string
  /** MDI icon used on the casa hub's intent chips. */
  icon: string
}

/** Icon per currency slice; anything unlisted falls back to a generic bill. */
const CURRENCY_ICONS: Readonly<Partial<Record<CurrencySlug, string>>> = Object.freeze({
  euro: 'mdi-currency-eur',
  real: 'mdi-cash',
  'peso-argentino': 'mdi-cash-multiple',
  oro: 'mdi-gold',
  yen: 'mdi-currency-jpy',
  'libra-esterlina': 'mdi-currency-gbp',
  'franco-suizo': 'mdi-cash-100',
})

/** Metadata for one currency slice, derived from the shared currency catalogue. */
function currencyIntentMeta(slug: CurrencySlug): CasaIntentMeta {
  const name = currencyDisplayName(CURRENCY_SLUG_TO_CODE[slug], 'es')
  return {
    slug,
    tag: name.toLocaleUpperCase('es'),
    label: name,
    icon: CURRENCY_ICONS[slug] ?? 'mdi-cash',
  }
}

export const CASA_INTENT_META: Readonly<Record<CasaIntent, CasaIntentMeta>> = Object.freeze({
  ...(Object.fromEntries(
    CASA_CURRENCY_INTENTS.map(slug => [slug, currencyIntentMeta(slug)])
  ) as Record<CurrencySlug, CasaIntentMeta>),
  horarios: {
    slug: 'horarios',
    tag: 'HORARIOS',
    label: 'Horarios',
    icon: 'mdi-clock-outline',
  },
  telefono: {
    slug: 'telefono',
    tag: 'CONTACTO',
    label: 'Teléfonos',
    icon: 'mdi-phone-outline',
  },
  opiniones: {
    slug: 'opiniones',
    tag: 'OPINIONES',
    label: 'Opiniones',
    icon: 'mdi-star-outline',
  },
  'comprar-dolares': {
    slug: 'comprar-dolares',
    tag: 'COMPRAR',
    label: 'Comprar dólares',
    icon: 'mdi-cash-plus',
  },
  'vender-dolares': {
    slug: 'vender-dolares',
    tag: 'VENDER',
    label: 'Vender dólares',
    icon: 'mdi-cash-minus',
  },
})

/** Everything an intent page needs to know about the casa, resolved server-side. */
export interface CasaFacts {
  origin: string
  name: string
  /** Branches of this casa, already slugged. */
  branches: BranchPage[]
  /** Department labels where it operates, deduped and sorted. */
  departments: string[]
  /** This casa's USD cash quote today, when it publishes one. */
  usd: { buy: number; sell: number; type: string } | null
  /** Cheapest USD sell across the market today (what the best casa charges you). */
  marketBestSell: number | null
  /** Highest USD buy across the market today (what the best casa pays you). */
  marketBestBuy: number | null
  /** How many casas quote USD today — the denominator of "puesto N de M". */
  marketSize: number
  /** 1-based position by cheapest sell; `null` when this casa does not quote. */
  sellRank: number | null
  /** 1-based position by highest buy; `null` when this casa does not quote. */
  buyRank: number | null
  /** Google rating for the casa, when the reviews store has one. */
  rating: { score: number; count: number } | null
  /** BCU institution page for the casa, when `localData` carries it. */
  bcuUrl: string
  website: string
  /** ISO codes this casa quotes publicly today (drives the currency slices). */
  quotedCurrencies: string[]
  /** The currency slice being rendered, when the intent is one. */
  currency: CurrencyQuoteFacts | null
}

/**
 * What one unit of a currency is called, for prose like "por cada ___".
 *
 * Gold is the reason this exists: the catalogue calls XAU "Oro", and the
 * templated sentence came out as "ninguna otra casa te cobra menos por cada
 * oro". It is quoted per troy ounce, and it is a metal, not a currency — so the
 * surrounding copy has to change nouns with it.
 */
export function currencyUnitNoun(code: CurrencyCode): string {
  if (code === 'XAU') return 'onza'
  return currencyDisplayName(code, 'es').toLocaleLowerCase('es')
}

/** `'este metal'` for gold, `'esta moneda'` for everything else. */
export function currencyKindNoun(code: CurrencyCode): string {
  return code === 'XAU' ? 'este metal' : 'esta moneda'
}

/** What a casa would have in stock: bars for gold, notes for a currency. */
export function currencyStockNoun(code: CurrencyCode): string {
  return code === 'XAU' ? 'disponibilidad' : 'billetes'
}

/** One casa's position in a single currency's market today. */
export interface CurrencyQuoteFacts {
  code: CurrencyCode
  slug: CurrencySlug
  /** Display name in Spanish, e.g. `'Euro'`. */
  name: string
  buy: number
  sell: number
  /** Quote type as published (`''` for the plain cash board). */
  type: string
  /** Buy/sell spread as a percentage of the midpoint. */
  spreadPct: number
  /** Cheapest sell in the market for this currency, outliers excluded. */
  bestSell: number | null
  /** Highest buy in the market for this currency, outliers excluded. */
  bestBuy: number | null
  /** How many casas quote it — the denominator of "puesto N de M". */
  marketSize: number
  sellRank: number | null
  buyRank: number | null
}

/** A quote row as the market feed publishes it. */
export interface MarketQuoteRow {
  origin: string
  code: string
  type?: string | null
  buy: number
  sell: number
  isInterBank?: boolean
}

/** One casa's chosen quote for a currency, before ranking. */
interface PickedQuote {
  origin: string
  type: string
  buy: number
  sell: number
}

/**
 * Type preference when a casa quotes the same currency several ways: the plain
 * cash board (`''`) is the walk-in price, `BILLETE` its bank equivalent, and
 * anything else (EBROU, wallet promos) only applies under conditions.
 *
 * Same ordering `casasDirectory.buildUsdComparison` uses for the dollar, so the
 * currency slices and the USD comparison never disagree about which board of a
 * casa is "the" price.
 */
const quoteRank = (type: string): number => (type === '' ? 0 : type === 'BILLETE' ? 1 : 2)

/**
 * Reduce the market feed to one quote per casa for `code`, ranked.
 *
 * INTERBANCARIO rows are dropped by NAME as well as by the `isInterBank` flag:
 * the feed publishes Cambio La Favorita's interbank reference with the flag
 * unset, and a wholesale price no member of the public can take must never be
 * crowned "the best of the day".
 *
 * Off-market boards are excluded from the ranking (not from the casa's own
 * quote) through the shared detector, which stands down below ten quotes — so a
 * thin market like the Swiss franc never has one of its five prices dismissed.
 */
export function buildCurrencyMarket(
  rows: readonly MarketQuoteRow[],
  code: string
): { picked: Map<string, PickedQuote>; bySell: PickedQuote[]; byBuy: PickedQuote[] } {
  const byOrigin = new Map<string, PickedQuote>()
  for (const row of rows) {
    if (!row?.origin || row.code !== code || row.isInterBank) continue
    if (String(row.type ?? '').toUpperCase() === 'INTERBANCARIO') continue
    if (!(Number(row.buy) > 0) || !(Number(row.sell) > 0)) continue
    const type = String(row.type ?? '')
    const previous = byOrigin.get(row.origin)
    if (
      !previous ||
      quoteRank(type) < quoteRank(previous.type) ||
      (quoteRank(type) === quoteRank(previous.type) && row.sell < previous.sell)
    ) {
      byOrigin.set(row.origin, { origin: row.origin, type, buy: row.buy, sell: row.sell })
    }
  }

  const picked = [...byOrigin.values()]
  const isOffMarket = offMarketDetector(picked)
  const ranked = picked.filter(quote => !isOffMarket(quote))

  return {
    picked: byOrigin,
    bySell: [...ranked].sort((a, b) => a.sell - b.sell),
    byBuy: [...ranked].sort((a, b) => b.buy - a.buy),
  }
}

/** Every currency a casa quotes publicly today, in catalogue order. */
export function quotedCurrenciesFor(
  rows: readonly MarketQuoteRow[],
  origin: string
): CurrencyCode[] {
  const codes = new Set<string>()
  for (const row of rows) {
    if (row?.origin !== origin || row.isInterBank) continue
    if (String(row.type ?? '').toUpperCase() === 'INTERBANCARIO') continue
    if (!(Number(row.buy) > 0) || !(Number(row.sell) > 0)) continue
    codes.add(row.code)
  }
  return CASA_CURRENCY_INTENTS.map(slug => CURRENCY_SLUG_TO_CODE[slug]).filter(code =>
    codes.has(code)
  )
}

/** Resolve one casa's standing in one currency, or `null` when it does not quote it. */
export function currencyFactsFor(
  rows: readonly MarketQuoteRow[],
  origin: string,
  slug: CurrencySlug
): CurrencyQuoteFacts | null {
  const code = CURRENCY_SLUG_TO_CODE[slug]
  const market = buildCurrencyMarket(rows, code)
  const mine = market.picked.get(origin)
  if (!mine) return null

  const rankOf = (list: PickedQuote[]): number | null => {
    const index = list.findIndex(quote => quote.origin === origin)
    return index === -1 ? null : index + 1
  }

  return {
    code,
    slug,
    name: currencyDisplayName(code, 'es'),
    buy: mine.buy,
    sell: mine.sell,
    type: mine.type,
    spreadPct: ((mine.sell - mine.buy) / ((mine.sell + mine.buy) / 2)) * 100,
    bestSell: market.bySell[0]?.sell ?? null,
    bestBuy: market.byBuy[0]?.buy ?? null,
    marketSize: market.bySell.length,
    sellRank: rankOf(market.bySell),
    buyRank: rankOf(market.byBuy),
  }
}

/** Branches whose opening-hours field holds something worth printing. */
export function branchesWithHours(branches: readonly BranchPage[]): BranchPage[] {
  return branches.filter(branch => displayableHours(branch.hoursLabel))
}

/** Branches with a phone number. */
export function branchesWithPhone(branches: readonly BranchPage[]): BranchPage[] {
  return branches.filter(branch => tidy(branch.phoneLabel).length >= 7)
}

/** The minimum a caller must know to decide which intent pages exist. */
export interface IntentAvailabilityInput {
  branches: readonly BranchPage[]
  /** True when the casa publishes a public USD quote today. */
  quotesUsd: boolean
  /** True when `localData` carries the casa's BCU institution page. */
  hasBcu: boolean
  /** True when a Google rating is known for the casa. */
  hasRating: boolean
  /** ISO codes the casa quotes publicly today; gates the currency slices. */
  quotedCurrencies?: readonly string[]
}

/**
 * Whether an intent has enough data to deserve a URL.
 *
 * This predicate is the single gate: the page's route guard, the casa hub's
 * chips and the XML sitemap all resolve through it, so the three can never
 * disagree about whether `/casa/brou/telefono` exists. A page whose only job is
 * to print data we do not have is exactly the thin page this family must not
 * ship 200 of.
 */
export function intentAvailable(intent: CasaIntent, input: IntentAvailabilityInput): boolean {
  switch (intent) {
    case 'horarios':
      return branchesWithHours(input.branches).length > 0
    case 'telefono':
      return branchesWithPhone(input.branches).length > 0
    case 'opiniones':
      // A rating, a BCU registry entry or a physical presence each give the page
      // something real to say; a casa with none of the three would be a stub.
      return input.hasRating || input.hasBcu || input.branches.length > 0
    case 'comprar-dolares':
    case 'vender-dolares':
      return input.quotesUsd
    default: {
      // A currency slice exists only where that casa actually quotes that
      // currency: 44 casas quote the dollar but only five quote the guaraní,
      // and a "Guaraní en X" page with no price is the thin page this gate
      // exists to prevent.
      const code = intentCurrencyCode(intent)
      return code ? (input.quotedCurrencies ?? []).includes(code) : false
    }
  }
}

/** Every intent that has data, in display order. */
export function intentsFor(input: IntentAvailabilityInput): CasaIntent[] {
  return CASA_INTENTS.filter(intent => intentAvailable(intent, input))
}

/** {@link intentAvailable} against the facts a page already resolved. */
export function intentIsAvailable(intent: CasaIntent, facts: CasaFacts): boolean {
  return intentAvailable(intent, factsToAvailability(facts))
}

/** Every intent that currently has data for this casa, in display order. */
export function availableIntents(facts: CasaFacts): CasaIntent[] {
  return intentsFor(factsToAvailability(facts))
}

function factsToAvailability(facts: CasaFacts): IntentAvailabilityInput {
  return {
    branches: facts.branches,
    quotesUsd: Boolean(facts.usd),
    hasBcu: Boolean(facts.bcuUrl),
    hasRating: Boolean(facts.rating),
    quotedCurrencies: facts.quotedCurrencies,
  }
}

/** Departments of a casa as display labels, deduped and alphabetical. */
export function departmentLabels(branches: readonly BranchPage[]): string[] {
  const labels = new Set<string>()
  for (const branch of branches) {
    const label = deptLabel(branch.dept)
    if (label) labels.add(label)
  }
  return [...labels].sort((a, b) => a.localeCompare(b, 'es'))
}

/** Join a list the way Spanish prose does: `'a, b y c'`. */
export function joinEs(items: readonly string[]): string {
  const list = items.filter(Boolean)
  if (list.length === 0) return ''
  if (list.length === 1) return list[0] as string
  return `${list.slice(0, -1).join(', ')} y ${list[list.length - 1]}`
}

/** Format a rate the way the site does elsewhere: `'42,35'`. */
export function formatRateEs(value: number): string {
  // Decimals scale with magnitude. A fixed 2–3 printed the ounce of gold as
  // "$ 182.907,296" (three decimals on a six-figure number, which reads like a
  // typo) and would have rounded the Chilean peso's "$ 0,053" down to "$ 0,05",
  // losing the only digits that carry information.
  const magnitude = Math.abs(value)
  if (magnitude >= 1000) {
    return value.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
  }
  if (magnitude >= 1) {
    return value.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 3 })
  }
  return value.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 4 })
}

/** Format a percentage the way Uruguay writes it: `'10,7%'` — comma, not dot. */
export function formatPctEs(value: number): string {
  return `${value.toLocaleString('es-UY', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`
}

/** Format a peso amount with no decimals: `'1.250'`. */
export function formatPesosEs(value: number): string {
  return Math.round(value).toLocaleString('es-UY')
}

/** H1 for an intent page. Shaped like the query it answers. */
export function intentHeading(intent: CasaIntent, facts: CasaFacts): string {
  if (isCurrencyIntent(intent)) {
    const name = facts.currency?.name ?? CASA_INTENT_META[intent].label
    return `${name} en ${facts.name}: cotización de hoy`
  }
  switch (intent) {
    case 'horarios':
      return `Horarios de ${facts.name}`
    case 'telefono':
      return `Teléfonos de ${facts.name}`
    case 'opiniones':
      return `${facts.name}: opiniones, reputación y datos verificables`
    case 'comprar-dolares':
      return `Comprar dólares en ${facts.name}`
    case 'vender-dolares':
      return `Vender dólares en ${facts.name}`
  }
}

/** Document `<title>`, with the geographic qualifier the query usually carries. */
export function intentTitle(intent: CasaIntent, facts: CasaFacts): string {
  const where = facts.departments.length === 1 ? ` en ${facts.departments[0]}` : ' en Uruguay'
  if (isCurrencyIntent(intent)) {
    const name = facts.currency?.name ?? CASA_INTENT_META[intent].label
    return `${name} en ${facts.name}: compra y venta de hoy${where}`
  }
  switch (intent) {
    case 'horarios':
      return `Horarios de ${facts.name}${where}: a qué hora abre cada sucursal`
    case 'telefono':
      return `Teléfono de ${facts.name}${where}: contacto de cada sucursal`
    case 'opiniones':
      return `${facts.name}: opiniones y reputación${where}`
    case 'comprar-dolares':
      return `Comprar dólares en ${facts.name}: precio de hoy y cuánto te cuesta de más`
    case 'vender-dolares':
      return `Vender dólares en ${facts.name}: cuánto te pagan hoy`
  }
}

/**
 * Meta description built from THIS casa's numbers.
 *
 * Deliberately fact-first (branch count, department list, today's gap to the
 * best price) so that 44 casas do not share one templated sentence with the
 * name swapped — which is what makes a programmatic family look like a doorway
 * set to both a reader and a crawler.
 */
export function intentDescription(intent: CasaIntent, facts: CasaFacts): string {
  const withHours = branchesWithHours(facts.branches).length
  const withPhone = branchesWithPhone(facts.branches).length
  const where = facts.departments.length ? ` en ${joinEs(facts.departments.slice(0, 4))}` : ''

  if (isCurrencyIntent(intent)) {
    const currency = facts.currency
    const name = currency?.name ?? CASA_INTENT_META[intent].label
    if (!currency) {
      return `Cotización del ${name.toLocaleLowerCase('es')} en ${facts.name}: compra, venta y comparación con el resto del mercado uruguayo.`
    }
    const rank =
      currency.sellRank && currency.marketSize > 1
        ? ` Está ${currency.sellRank}º de ${currency.marketSize} casas que lo cotizan.`
        : ''
    return `${facts.name} compra el ${name.toLocaleLowerCase('es')} a $ ${formatRateEs(
      currency.buy
    )} y lo vende a $ ${formatRateEs(currency.sell)}.${rank} Comparado con el resto del mercado, y dónde operar${where}.`.slice(
      0,
      300
    )
  }

  switch (intent) {
    case 'horarios':
      return `A qué hora abre y cierra ${facts.name}: horario declarado ante el BCU de ${withHours} ${
        withHours === 1 ? 'sucursal' : 'sucursales'
      }${where}, día por día, con la dirección y el teléfono de cada una.`
    case 'telefono':
      return `Teléfonos de ${facts.name}: ${withPhone} ${
        withPhone === 1 ? 'número' : 'números'
      } de contacto por sucursal${where}, con dirección y horario de atención de cada local.`
    case 'opiniones': {
      const rating = facts.rating
        ? `Calificación de ${facts.rating.score.toFixed(1)} sobre ${facts.rating.count} reseñas de Google`
        : 'Reputación'
      return `${rating}, registro en el Banco Central y qué tan competitiva es hoy la pizarra de ${facts.name} frente al resto del mercado.`
    }
    case 'comprar-dolares': {
      const price = facts.usd ? `Hoy vende el dólar a $ ${formatRateEs(facts.usd.sell)}. ` : ''
      return `${price}Cuánto te cuesta comprar dólares en ${facts.name} frente a la casa más barata del día, en qué puesto del mercado está y dónde operar${where}.`
    }
    case 'vender-dolares': {
      const price = facts.usd ? `Hoy compra el dólar a $ ${formatRateEs(facts.usd.buy)}. ` : ''
      return `${price}Cuánto te pagan por tus dólares en ${facts.name} frente a la casa que mejor paga hoy, y cuánto perdés si vendés en el lugar equivocado.`
    }
  }
}

/**
 * A sentence quantifying this casa's position today, or `''` when it does not quote.
 *
 * The rank clause is appended only when the casa is inside the ranked set: a
 * board flagged as off-market is excluded from the ranking, and printing
 * "0º de 43" (or silently dropping the whole comparison) would be worse than
 * stating the gap without a position.
 */
export function marketPositionSentence(
  intent: 'comprar-dolares' | 'vender-dolares',
  facts: CasaFacts
): string {
  if (!facts.usd) return ''

  if (intent === 'comprar-dolares') {
    if (facts.marketBestSell === null) return ''
    const gap = facts.usd.sell - facts.marketBestSell
    if (gap <= 0.0001) {
      return `Hoy ${facts.name} tiene la venta más barata del mercado: ningún otro lugar te cobra menos por cada dólar.`
    }
    const rank =
      facts.sellRank && facts.marketSize
        ? ` Está ${facts.sellRank}º de ${facts.marketSize} casas.`
        : ''
    return `Hoy ${facts.name} vende a $ ${formatRateEs(facts.usd.sell)} y la casa más barata vende a $ ${formatRateEs(
      facts.marketBestSell
    )}: son $ ${formatRateEs(gap)} más por dólar, unos $ ${formatPesosEs(
      gap * 1000
    )} extra en una compra de 1.000 dólares.${rank}`
  }

  if (facts.marketBestBuy === null) return ''
  const gap = facts.marketBestBuy - facts.usd.buy
  if (gap <= 0.0001) {
    return `Hoy ${facts.name} es quien mejor paga el dólar: nadie te da más por cada billete.`
  }
  const rank =
    facts.buyRank && facts.marketSize ? ` Está ${facts.buyRank}º de ${facts.marketSize} casas.` : ''
  return `Hoy ${facts.name} paga $ ${formatRateEs(facts.usd.buy)} por dólar y el que mejor paga da $ ${formatRateEs(
    facts.marketBestBuy
  )}: son $ ${formatRateEs(gap)} menos por dólar, unos $ ${formatPesosEs(
    gap * 1000
  )} de diferencia si vendés 1.000 dólares.${rank}`
}

/**
 * The body paragraph for a currency slice, built from that currency's own market.
 *
 * Deliberately not the dollar's copy with a noun swapped: the numbers, the
 * denominator ("de 39 casas que lo cotizan") and the spread all come from the
 * market for THAT currency, which is a different and much thinner market — 39
 * casas quote the euro, five the guaraní, four the ounce of gold.
 */
export function currencyPositionSentence(facts: CasaFacts): string {
  const currency = facts.currency
  if (!currency) return ''

  const name = currency.name.toLocaleLowerCase('es')
  const unit = currencyUnitNoun(currency.code)
  const kind = currencyKindNoun(currency.code)
  const stock = currencyStockNoun(currency.code)
  const parts: string[] = [
    `Hoy ${facts.name} compra el ${name} a $ ${formatRateEs(currency.buy)} y lo vende a $ ${formatRateEs(
      currency.sell
    )}. La diferencia entre las dos puntas —el spread— es de ${formatPctEs(
      currency.spreadPct
    )}: es lo que te cuesta comprar y vender en el mismo lugar.`,
  ]

  if (currency.marketSize > 1 && currency.bestSell !== null) {
    const gap = currency.sell - currency.bestSell
    if (gap <= 0.0001) {
      parts.push(
        `Es la venta más barata del mercado: ninguna otra casa te cobra menos por cada ${unit}.`
      )
    } else {
      const rank = currency.sellRank ? ` Está ${currency.sellRank}º de ${currency.marketSize}.` : ''
      parts.push(
        `La casa más barata lo vende a $ ${formatRateEs(currency.bestSell)}, así que acá pagás $ ${formatRateEs(
          gap
        )} más por ${unit}.${rank}`
      )
    }
  }

  if (currency.marketSize > 1 && currency.bestBuy !== null) {
    const gap = currency.bestBuy - currency.buy
    if (gap <= 0.0001) {
      parts.push(`Y es quien mejor lo paga: nadie te da más si venís a vender.`)
    } else {
      parts.push(
        `Del otro lado, quien mejor paga da $ ${formatRateEs(currency.bestBuy)} por ${unit}, $ ${formatRateEs(
          gap
        )} más que acá.`
      )
    }
  }

  if (currency.marketSize <= 1) {
    parts.push(
      `Es de las pocas casas que publican ${kind}, así que no hay contra qué comparar el precio: conviene llamar antes de ir, porque en lo que casi nadie pide el valor se pacta en el mostrador y no siempre hay ${stock} en caja.`
    )
  } else if (currency.marketSize < 10) {
    parts.push(
      `Solo ${currency.marketSize} casas del mercado publican ${kind}. Con tan pocas pizarras conviene confirmar por teléfono que haya ${stock} antes de ir hasta el local.`
    )
  }

  return parts.join(' ')
}
