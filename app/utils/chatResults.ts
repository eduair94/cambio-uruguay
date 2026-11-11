// What the /asistente-ia chat draws next to an answer: the listings, rates, history and pages the
// assistant actually looked at, turned into cards instead of a wall of text.
//
// The MCP returns every tool result twice: a text the model reads and a structured payload
// (`structuredContent`) with the same facts plus what only a screen needs, like each advert's photo.
// The chat used to throw the payload away. This module keeps it: it maps each tool's payload to a
// small set of blocks, and marks the cards whose link the answer itself cites, so what the
// assistant recommends comes first and is labelled as such.
//
// PURE (no Vue/Nuxt imports): the chat component only renders what this returns.

import { currencySlug, type CurrencyCode } from './currencyPages'

const SITE = 'https://cambio-uruguay.com'

/** One tool call of a turn, as the chat recorded it. */
export interface ToolCallRecord {
  name: string
  args?: Record<string, unknown>
  data?: Record<string, unknown> | null
  isError?: boolean
}

export type CardVertical = 'alquiler' | 'auto' | 'producto' | 'oportunidad'
export type BadgeTone = 'good' | 'info' | 'warn'

export interface ResultCard {
  id: string
  vertical: CardVertical
  title: string
  image?: string
  /** The headline figure, already formatted ("$ 33.000/mes", "US$ 13.900"). */
  price: string
  /** One line under the price: the total with common expenses, where the price is from… */
  priceCaption?: string
  facts: string[]
  place?: string
  badges: Array<{ label: string; tone: BadgeTone }>
  /** The site's own page for it: the card links there, never straight to a portal. */
  url: string
  source?: string
  /** The answer links to it. */
  mentioned: boolean
}

export interface CardsBlock {
  kind: 'cards'
  vertical: CardVertical
  title: string
  cards: ResultCard[]
  /** How many matched in total, when the tool said (the carousel shows a page of them). */
  total?: number
  moreUrl?: string
}

export interface RateHouse {
  name: string
  buy: number
  sell: number
  /** Not crowned by the site's rule (off-market or a frozen board): drawn hollow. */
  excluded: boolean
}

export interface RatesBlock {
  kind: 'rates'
  currency: string
  bestSell?: { name: string; rate: number }
  bestBuy?: { name: string; rate: number }
  avgBuy?: number
  avgSell?: number
  houses: RateHouse[]
  moreUrl: string
}

export interface QuoteBlock {
  kind: 'quote'
  /** "Te venden dólares", "100 USD son". */
  label: string
  value: string
  caption: string
  moreUrl: string
  /** The best house of a currency: redundant next to that currency's rate panel. */
  bestOf?: string
}

export interface SeriesPoint {
  date: string
  buy: number | null
  sell: number | null
}

export interface SeriesBlock {
  kind: 'series'
  title: string
  currency: string
  points: SeriesPoint[]
  moreUrl?: string
}

export interface LinkItem {
  title: string
  url: string
  meta?: string
  snippet?: string
}

export interface LinksBlock {
  kind: 'links'
  variant: 'sources' | 'news'
  title: string
  items: LinkItem[]
}

export type ChatBlock = CardsBlock | RatesBlock | QuoteBlock | SeriesBlock | LinksBlock

/** How many cards one carousel holds, and how many links one list. */
export const MAX_CARDS = 12
export const MAX_LINKS = 6

// ── Formatting ────────────────────────────────────────────────────────────────────────────────

const int = new Intl.NumberFormat('es-UY', { maximumFractionDigits: 0 })
const dec2 = new Intl.NumberFormat('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

const num = (v: unknown): number | undefined =>
  typeof v === 'number' && Number.isFinite(v) ? v : undefined
const str = (v: unknown): string | undefined =>
  typeof v === 'string' && v.trim() ? v.trim() : undefined
const obj = (v: unknown): Record<string, unknown> | undefined =>
  v && typeof v === 'object' && !Array.isArray(v) ? (v as Record<string, unknown>) : undefined
const list = (v: unknown): Record<string, unknown>[] =>
  Array.isArray(v) ? v.map(obj).filter((x): x is Record<string, unknown> => !!x) : []

/** "$ 33.000" for pesos, "US$ 13.900" for dollars. */
export function money(amount: number, currency = 'UYU'): string {
  const prefix = currency === 'USD' ? 'US$' : currency === 'UYU' ? '$' : currency
  return `${prefix} ${int.format(Math.round(amount))}`
}

/** A rate the way the site prints it: "40,73". */
export function rate(value: number): string {
  return dec2.format(value)
}

/** Only an https photo without credentials may be drawn. */
export function safeImage(value: unknown): string | undefined {
  const url = str(value)
  if (!url || url.length > 1000) return undefined
  try {
    const parsed = new URL(url)
    return parsed.protocol === 'https:' && !parsed.username && !parsed.password ? url : undefined
  } catch {
    return undefined
  }
}

/** A link the card may point to: http(s) only. */
function safeUrl(value: unknown): string | undefined {
  const url = str(value)
  return url && /^https?:\/\//i.test(url) ? url : undefined
}

/**
 * "ALQUILER EN CORDON DE 1 DORMITORIO" → "Alquiler en cordon de 1 dormitorio". A shouted title is
 * the portal's, not information, and four of them in a row read as an alarm.
 */
export function calmTitle(title: string): string {
  const letters = title.replace(/\P{L}/gu, '')
  if (letters.length < 8) return title
  const upper = letters.replace(/\P{Lu}/gu, '').length
  if (upper / letters.length < 0.7) return title
  const lower = title.toLocaleLowerCase('es')
  return lower.charAt(0).toLocaleUpperCase('es') + lower.slice(1)
}

const SOURCE_LABEL: Record<string, string> = {
  mercadolibre: 'Mercado Libre',
  infocasas: 'InfoCasas',
  facebook: 'Facebook',
  elpais: 'El País',
  casasweb: 'Casasweb',
  tiktok: 'TikTok',
  instagram: 'Instagram',
}

const TYPE_LABEL: Record<string, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  habitacion: 'Habitación',
  local: 'Local',
  oficina: 'Oficina',
  garaje: 'Garaje',
  terreno: 'Terreno',
}

const TRANSMISSION_LABEL: Record<string, string> = { automatica: 'Automático', manual: 'Manual' }

const pctLabel = (value: number) => `${int.format(Math.round(value))} %`

// ── Cards ─────────────────────────────────────────────────────────────────────────────────────

function rentalCard(r: Record<string, unknown>): ResultCard | null {
  const url = safeUrl(r.siteUrl) ?? safeUrl(r.listingUrl)
  const id = str(r.key) ?? url
  if (!url || !id) return null
  const rent = obj(r.rent)
  const amount = num(rent?.amount)
  const currency = str(rent?.currency) ?? 'UYU'
  const expenses = num(r.expensesUyu)
  const monthly = num(r.monthlyUyu)
  const bedrooms = num(r.bedrooms)
  const bathrooms = num(r.bathrooms)
  const area = num(r.areaM2)
  const drop = obj(r.priceDrop)
  const badges: ResultCard['badges'] = []
  if (num(drop?.pct)) badges.push({ label: `Bajó ${pctLabel(num(drop?.pct)!)}`, tone: 'good' })
  if (r.pets === true) badges.push({ label: 'Mascotas', tone: 'info' })
  if (r.parking === true) badges.push({ label: 'Garaje', tone: 'info' })
  if (r.perNightSuspect === true) badges.push({ label: '¿Precio por noche?', tone: 'warn' })
  if (str(r.reported)) badges.push({ label: 'Reportado', tone: 'warn' })
  const distance = num(r.distanceKm)
  const sources = Array.isArray(r.sources) ? r.sources.map(s => String(s)) : []
  return {
    id,
    vertical: 'alquiler',
    title: calmTitle(str(r.title) ?? TYPE_LABEL[str(r.type) ?? ''] ?? 'Vivienda'),
    image: safeImage(r.image),
    price: amount !== undefined ? `${money(amount, currency)}/mes` : 'Precio sin publicar',
    // One line at a card's width: the total is what gets compared, the expenses are in it.
    priceCaption:
      expenses === 0
        ? 'Sin gastos comunes'
        : monthly !== undefined && expenses !== undefined
          ? `Total ${money(monthly)} con gastos comunes`
          : amount !== undefined
            ? 'Gastos comunes sin publicar'
            : undefined,
    facts: [
      TYPE_LABEL[str(r.type) ?? ''] ?? '',
      bedrooms === undefined ? '' : bedrooms === 0 ? 'Monoambiente' : `${bedrooms} dorm.`,
      bathrooms === undefined ? '' : `${bathrooms} baño${bathrooms === 1 ? '' : 's'}`,
      area === undefined ? '' : `${int.format(area)} m²`,
      distance === undefined ? '' : `a ${dec2.format(distance).replace(/,?0+$/, '')} km`,
    ].filter(Boolean),
    // The barrio says where; the department only when there is none (a card is 232px wide).
    place: str(r.neighborhood) ?? str(r.department),
    badges,
    url,
    source: sources.length ? (SOURCE_LABEL[sources[0]!] ?? sources[0]) : undefined,
    mentioned: false,
  }
}

function carCard(c: Record<string, unknown>): ResultCard | null {
  const url = safeUrl(c.siteUrl) ?? safeUrl(c.listingUrl)
  const id = str(c.key) ?? url
  if (!url || !id) return null
  const priceUsd = num(c.priceUsd)
  const km = num(c.km)
  const year = num(c.year)
  const opportunity = obj(c.opportunity)
  const drop = obj(c.priceDrop)
  const badges: ResultCard['badges'] = []
  if (num(opportunity?.gapPct))
    badges.push({ label: `${pctLabel(num(opportunity?.gapPct)!)} bajo su cohorte`, tone: 'good' })
  if (num(drop?.pct)) badges.push({ label: `Bajó ${pctLabel(num(drop?.pct)!)}`, tone: 'good' })
  if (Array.isArray(c.declaredRisks) && c.declaredRisks.length)
    badges.push({ label: 'Riesgo declarado', tone: 'warn' })
  if (c.currencyInferred === true) badges.push({ label: 'Moneda deducida', tone: 'warn' })
  const title = str(c.title) ?? [str(c.brand), str(c.model)].filter(Boolean).join(' ')
  return {
    id,
    vertical: 'auto',
    title: calmTitle(title || 'Auto usado'),
    image: safeImage(c.image),
    price: priceUsd !== undefined ? money(priceUsd, 'USD') : 'Precio sin publicar',
    priceCaption: str(c.listedAs) ? `Publicado en ${str(c.listedAs)}` : undefined,
    facts: [
      year === undefined ? '' : String(year),
      km === undefined ? '' : `${int.format(km)} km`,
      TRANSMISSION_LABEL[str(c.transmission) ?? ''] ?? '',
      str(c.fuel) ? str(c.fuel)!.charAt(0).toLocaleUpperCase('es') + str(c.fuel)!.slice(1) : '',
    ].filter(Boolean),
    place: str(c.department),
    badges,
    url,
    source: str(c.source),
    mentioned: false,
  }
}

function productCard(p: Record<string, unknown>): ResultCard | null {
  const url = safeUrl(p.siteUrl)
  const name = str(p.name)
  if (!url || !name) return null
  const best = num(p.bestPriceUyu)
  const offer = obj(p.bestOffer)
  const seller = str(offer?.seller)
  const sellers = num(p.sellers)
  const used = obj(p.usedBand)
  const usedFrom = num(used?.min) ?? num(used?.p25)
  const saving = num(p.usedSavingPct)
  const badges: ResultCard['badges'] = []
  if (saving && saving > 0) badges.push({ label: `Usado ${pctLabel(saving)} menos`, tone: 'good' })
  return {
    id: url,
    vertical: 'producto',
    title: calmTitle(name),
    image: safeImage(p.image),
    price: best !== undefined ? `desde ${money(best)}` : 'Sin precio hoy',
    priceCaption: seller
      ? `en ${seller}`
      : sellers
        ? `${int.format(sellers)} vendedor${sellers === 1 ? '' : 'es'}`
        : undefined,
    facts: [
      str(p.brand) ?? '',
      str(p.rating) ?? '',
      usedFrom !== undefined ? `usado desde ${money(usedFrom)}` : '',
    ].filter(Boolean),
    badges,
    url,
    mentioned: false,
  }
}

function opportunityCard(o: Record<string, unknown>): ResultCard | null {
  const url = safeUrl(o.siteUrl) ?? safeUrl(o.listingUrl)
  if (!url) return null
  const gap = num(o.gapPct)
  const bedrooms = num(o.bedrooms)
  const area = num(o.areaM2)
  const badges: ResultCard['badges'] = []
  if (gap) badges.push({ label: `${pctLabel(gap)} bajo la mediana`, tone: 'good' })
  if (str(o.confidence)) badges.push({ label: `Evidencia ${str(o.confidence)}`, tone: 'info' })
  return {
    id: url,
    vertical: 'oportunidad',
    title: calmTitle(str(o.title) ?? 'Oportunidad'),
    image: safeImage(o.image),
    price: str(o.comparedPrice) ?? str(o.price) ?? 'Precio sin publicar',
    priceCaption: str(o.medianOfComparables)
      ? `Parecidos: mediana ${str(o.medianOfComparables)}${num(o.comparables) ? ` (${num(o.comparables)} avisos)` : ''}`
      : undefined,
    facts: [
      TYPE_LABEL[str(o.type) ?? ''] ?? '',
      bedrooms === undefined ? '' : bedrooms === 0 ? 'Monoambiente' : `${bedrooms} dorm.`,
      area === undefined ? '' : `${int.format(area)} m²`,
    ].filter(Boolean),
    place: str(o.neighborhood) ?? str(o.department),
    badges,
    url,
    source: str(o.source),
    mentioned: false,
  }
}

const CARD_TITLES: Record<CardVertical, string> = {
  alquiler: 'Alquileres',
  auto: 'Autos',
  producto: 'Productos',
  oportunidad: 'Oportunidades',
}

// ── Blocks per tool ───────────────────────────────────────────────────────────────────────────

interface Collected {
  cards: Map<CardVertical, { cards: ResultCard[]; total?: number; moreUrl?: string }>
  rates: RatesBlock[]
  quotes: QuoteBlock[]
  series: SeriesBlock[]
  sources: LinkItem[]
  news: LinkItem[]
}

function addCards(
  acc: Collected,
  vertical: CardVertical,
  cards: Array<ResultCard | null>,
  total?: number,
  moreUrl?: string
) {
  const entry = acc.cards.get(vertical) ?? { cards: [] }
  for (const card of cards) {
    if (card && !entry.cards.some(c => c.id === card.id)) entry.cards.push(card)
  }
  // The first search of the turn says how many matched and where to see them all.
  if (entry.total === undefined && total !== undefined) entry.total = total
  entry.moreUrl ??= safeUrl(moreUrl)
  acc.cards.set(vertical, entry)
}

function cotizacionUrl(code: string): string {
  try {
    return `${SITE}/cotizacion/${currencySlug(code as CurrencyCode)}`
  } catch {
    return `${SITE}/cotizacion`
  }
}

/** The series of one board: the counter quote when the house publishes several (BROU's eBROU). */
function seriesPoints(evolution: Record<string, unknown>[]): SeriesPoint[] {
  const byType = new Map<string, Record<string, unknown>[]>()
  for (const row of evolution) {
    const type = str(row.type) ?? ''
    byType.set(type, [...(byType.get(type) ?? []), row])
  }
  const rows =
    byType.get('') ??
    byType.get('BILLETE') ??
    [...byType.values()].sort((a, b) => b.length - a.length)[0] ??
    []
  return rows
    .map(row => ({
      date: str(row.date) ?? '',
      buy: num(row.buy) && num(row.buy)! > 0 ? num(row.buy)! : null,
      sell: num(row.sell) && num(row.sell)! > 0 ? num(row.sell)! : null,
    }))
    .filter(p => p.date && (p.buy !== null || p.sell !== null))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** "11 nov.": a day the way the chat prints it. */
const newsDate = (value: unknown): string | undefined => {
  const text = str(value) ?? ''
  const time = Date.parse(text)
  if (!Number.isFinite(time)) return undefined
  return new Date(time).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'short',
    // A bare day ("2026-10-19") parses as midnight UTC, which in Montevideo is the day before.
    timeZone: /^\d{4}-\d{2}-\d{2}$/.test(text) ? 'UTC' : 'America/Montevideo',
  })
}

function readTool(acc: Collected, call: ToolCallRecord) {
  const data = call.data
  if (!data || call.isError) return
  switch (call.name) {
    case 'search_rentals':
      addCards(
        acc,
        'alquiler',
        list(data.items).map(rentalCard),
        num(data.total),
        str(data.siteUrl)
      )
      break
    case 'get_rental': {
      const main = obj(data.property)
      addCards(acc, 'alquiler', [
        main ? rentalCard(main) : null,
        ...list(data.similar).map(rentalCard),
      ])
      break
    }
    case 'rank_rentals_for_household':
      addCards(
        acc,
        'alquiler',
        list(data.results).map(r => rentalCard(obj(r.property) ?? r)),
        num(data.matched),
        str(data.siteUrl)
      )
      break
    case 'find_property_opportunities':
      addCards(
        acc,
        'oportunidad',
        list(data.items).map(opportunityCard),
        num(data.total),
        str(data.siteUrl)
      )
      break
    case 'search_used_cars':
    case 'find_car_opportunities':
    case 'car_declared_risks':
      addCards(acc, 'auto', list(data.items).map(carCard), num(data.total), str(data.siteUrl))
      break
    case 'get_car': {
      const main = obj(data.car)
      addCards(acc, 'auto', [main ? carCard(main) : null, ...list(data.similar).map(carCard)])
      break
    }
    case 'search_products':
      addCards(acc, 'producto', list(data.items).map(productCard), num(data.total))
      break
    case 'get_rates': {
      const code = str(data.currency) ?? 'USD'
      const best = (v: unknown) => {
        const o = obj(v)
        return o && str(o.name) && num(o.rate)
          ? { name: str(o.name)!, rate: num(o.rate)! }
          : undefined
      }
      acc.rates.push({
        kind: 'rates',
        currency: code,
        bestSell: best(data.bestSell),
        bestBuy: best(data.bestBuy),
        avgBuy: num(data.marketAvgBuy),
        avgSell: num(data.marketAvgSell),
        houses: list(data.houses)
          .filter(h => (num(h.buy) ?? 0) > 0 && (num(h.sell) ?? 0) > 0)
          .map(h => ({
            name: str(h.name) ?? str(h.origin) ?? '',
            buy: num(h.buy)!,
            sell: num(h.sell)!,
            excluded: h.offMarket === true,
          })),
        moreUrl: cotizacionUrl(code),
      })
      break
    }
    case 'best_house': {
      const code = str(data.currency) ?? 'USD'
      const value = num(data.rate)
      if (value === undefined) break
      const buying = data.side === 'buy'
      acc.quotes.push({
        kind: 'quote',
        label: buying ? `Para comprar ${code}` : `Para vender ${code}`,
        value: `$ ${rate(value)}`,
        caption:
          `${buying ? 'Te lo vende' : 'Te lo compra'} ${str(data.name) ?? str(data.origin) ?? ''}`.trim(),
        moreUrl: cotizacionUrl(code),
        bestOf: code,
      })
      break
    }
    case 'convert': {
      const amount = num(data.amount)
      const result = num(data.result)
      const from = str(data.from)
      const to = str(data.to)
      if (amount === undefined || result === undefined || !from || !to) break
      const fmt = (value: number, code: string) =>
        code === 'UYU' ? money(value) : `${dec2.format(value)} ${code}`
      acc.quotes.push({
        kind: 'quote',
        label: `${fmt(amount, from)} son`,
        value: fmt(result, to),
        caption: 'Con la mejor cotización de hoy',
        moreUrl: cotizacionUrl(from === 'UYU' ? to : from),
      })
      break
    }
    case 'get_evolution': {
      const points = seriesPoints(list(data.evolution))
      if (points.length < 2) break
      const code = str(data.code) ?? str(obj(data.statistics)?.code) ?? ''
      const house = str(obj(data.localData)?.name) ?? str(data.origin) ?? ''
      acc.series.push({
        kind: 'series',
        title: [house, code].filter(Boolean).join(' · '),
        currency: code,
        points,
        moreUrl: str(data.origin)
          ? `${SITE}/historico/${encodeURIComponent(str(data.origin)!)}`
          : undefined,
      })
      break
    }
    case 'search_site':
      for (const page of list(data.pages)) {
        const url = safeUrl(page.url)
        if (url && str(page.title))
          acc.sources.push({ title: str(page.title)!, url, meta: str(page.section) })
      }
      for (const page of list(data.content)) {
        const url = safeUrl(page.url)
        if (!url || !str(page.title)) continue
        const passage = list(page.passages)[0]
        acc.sources.push({
          title: str(page.title)!,
          url,
          meta: newsDate(page.crawledAt) ? `leído el ${newsDate(page.crawledAt)}` : undefined,
          snippet: str(passage?.text)?.replace(/\s+/g, ' ').slice(0, 180),
        })
      }
      break
    case 'read_page': {
      const url = safeUrl(data.url)
      if (url && str(data.title)) acc.sources.push({ title: str(data.title)!, url })
      break
    }
    case 'get_news':
      for (const item of list(data.items)) {
        const url = safeUrl(item.link)
        if (url && str(item.title))
          acc.news.push({
            title: str(item.title)!,
            url,
            meta: [str(item.source), newsDate(item.pubDate)].filter(Boolean).join(' · '),
          })
      }
      break
  }
}

/** Every URL and key an answer cites, folded for a forgiving match. */
function citations(answer: string): string {
  return answer.toLowerCase()
}

function isCited(card: ResultCard, cited: string): boolean {
  if (cited.includes(card.url.toLowerCase())) return true
  // A ficha URL also cites the card by its key ("/alquileres/<key>").
  const key = card.url.split('/').pop()?.toLowerCase()
  return !!key && key.length > 8 && cited.includes(key)
}

const dedupeLinks = (items: LinkItem[]) => {
  const seen = new Set<string>()
  return items.filter(item => {
    const key = item.url.replace(/[#?].*$/, '').replace(/\/$/, '')
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

/**
 * The blocks to draw under an answer, in reading order: the direct figures first (rates,
 * conversions), then the listings, the history, and the pages it read.
 */
export function buildChatBlocks(calls: readonly ToolCallRecord[], answer = ''): ChatBlock[] {
  const acc: Collected = {
    cards: new Map(),
    rates: [],
    quotes: [],
    series: [],
    sources: [],
    news: [],
  }
  for (const call of calls) readTool(acc, call)

  const cited = citations(answer)
  const blocks: ChatBlock[] = []
  // The last reading of each currency wins: a second get_rates of the same turn is fresher.
  const rates = new Map(acc.rates.map(block => [block.currency, block]))
  // The panel already names the best house of its currency, on both sides.
  const quotes = acc.quotes.filter(quote => !quote.bestOf || !rates.has(quote.bestOf))
  blocks.push(...quotes, ...rates.values())

  for (const [vertical, entry] of acc.cards) {
    const cards = entry.cards.map(card => ({ ...card, mentioned: isCited(card, cited) }))
    // What the answer cites first, otherwise in the tool's own order (its sort is the user's).
    const ordered = [...cards.filter(c => c.mentioned), ...cards.filter(c => !c.mentioned)]
    if (!ordered.length) continue
    blocks.push({
      kind: 'cards',
      vertical,
      title: CARD_TITLES[vertical],
      cards: ordered.slice(0, MAX_CARDS),
      total: entry.total,
      moreUrl: entry.moreUrl,
    })
  }

  blocks.push(...acc.series)
  const news = dedupeLinks(acc.news).slice(0, MAX_LINKS)
  if (news.length) blocks.push({ kind: 'links', variant: 'news', title: 'Noticias', items: news })
  const sources = dedupeLinks(acc.sources)
  // The pages the answer cites lead; the rest follow, as the assistant found them.
  const citedSources = sources.filter(s => cited.includes(s.url.toLowerCase()))
  const ordered = [...citedSources, ...sources.filter(s => !citedSources.includes(s))]
  if (ordered.length)
    blocks.push({
      kind: 'links',
      variant: 'sources',
      title: 'Fuentes',
      items: ordered.slice(0, MAX_LINKS),
    })
  return blocks
}

// ── Follow-ups and tool steps ─────────────────────────────────────────────────────────────────

const FOLLOW_UPS: Record<string, string[]> = {
  alquiler: [
    '¿Cuál me conviene más y por qué?',
    'Mostrame opciones más baratas',
    'Compará los tres primeros',
  ],
  oportunidad: ['¿Cuál tiene la evidencia más sólida?', 'Mostrame sólo las de 2 dormitorios'],
  auto: [
    '¿Cuál tiene mejor precio para su año y kilometraje?',
    '¿Alguno bajó de precio?',
    'Mostrame sólo automáticos',
  ],
  producto: ['¿Hay usados más baratos?', '¿Es confiable la tienda más barata?'],
  rates: ['¿Cómo vino este mes?', '¿Y el euro?', '¿Cuánto me dan por 500 dólares?'],
  series: ['¿Cómo está hoy en las demás casas?'],
}

/** Up to three questions that continue from what the answer showed, never the one just asked. */
export function followUps(blocks: readonly ChatBlock[], lastQuestion = ''): string[] {
  const kinds = blocks.map(block =>
    block.kind === 'cards'
      ? block.vertical
      : block.kind === 'rates' || block.kind === 'quote'
        ? 'rates'
        : block.kind === 'series'
          ? 'series'
          : ''
  )
  const asked = lastQuestion.trim().toLowerCase()
  const out: string[] = []
  for (const kind of kinds) {
    for (const question of FOLLOW_UPS[kind] ?? []) {
      if (out.length >= 3) return out
      if (!out.includes(question) && question.toLowerCase() !== asked) out.push(question)
    }
  }
  return out
}

/**
 * The answer as a screen reader should hear it: link texts without their URLs, no markdown marks.
 */
export function plainAnswer(markdown: string): string {
  return markdown
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_`#>]+/g, '')
    .replace(/\s+/g, ' ')
    .trim()
}

/** One line of the chat's progress list: a tool call of the turn being answered. */
export interface ChatStep {
  name: string
  label: string
  state: 'running' | 'done' | 'error'
}

export type ToolFamily = 'alquileres' | 'autos' | 'productos' | 'cambio' | 'sitio'

/** Which part of the site a tool reads: it picks the icon of its step. */
export function toolFamily(name: string): ToolFamily {
  if (/rental|propert|neighborhood|fair_rent|geocode/.test(name)) return 'alquileres'
  if (/car/.test(name)) return 'autos'
  if (/product|home_setup|store|supermarket|directories/.test(name)) return 'productos'
  if (/site|read_page|sections/.test(name)) return 'sitio'
  return 'cambio'
}

export const FAMILY_ICON: Record<ToolFamily, string> = {
  alquileres: 'mdi-home-city-outline',
  autos: 'mdi-car-outline',
  productos: 'mdi-shopping-outline',
  cambio: 'mdi-swap-horizontal',
  sitio: 'mdi-compass-outline',
}
