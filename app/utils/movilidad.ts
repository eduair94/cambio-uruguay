import type { PriceHistorySeries } from './priceHistory'
// Shapes and helpers for /monopatines-electricos-uruguay and /bicicletas-electricas-uruguay.
//
// `app/utils` is a FLAT auto-import namespace, so every export here is prefixed `movilidad`/
// `MOVILIDAD_` — a bare `sortItems()` or `money()` would collide with equipar's (or another
// family's) helper the day someone adds one.
//
// The item/band/offer/product shapes mirror `app/utils/equipar.ts`'s `EquiparItemDoc` field for
// field: `buildEquiparCatalog` (classes/equipar/catalog.ts) always returns an `EquiparItem`-shaped
// row regardless of which registry it classified against (see `classes/movilidad/registry.ts`'s
// header). A SEPARATE type — rather than importing equipar's — is still worth it here: a
// movilidad item's `room` is always the literal `"movilidad"` (never one of equipar's five rooms)
// and `tier` is a filler value equipar's own basket never reads for this registry (`classes/equipar/
// basket.ts` only ever iterates `EQUIPAR_CATEGORIES`) — reusing `EquiparItemDoc` would either lie
// about `room`'s type or force an `as` cast at every call site for a value nothing here uses.

import { dateLocale } from './format'

export type MovilidadCategory = 'monopatin-electrico' | 'bicicleta-electrica'
export type MovilidadRegime = 'modelo' | 'commodity'

/**
 * `key` of the single `movilidadmeta` document `sync_movilidad.ts` upserts. Exported so every reader
 * (the category route and `/api/directorios`) names the same document instead of each spelling it.
 */
export const MOVILIDAD_META_KEY = 'movilidad-electrica-uruguay'

const MOVILIDAD_CATEGORY_SET: ReadonlySet<string> = new Set<MovilidadCategory>([
  'monopatin-electrico',
  'bicicleta-electrica',
])

/**
 * The only two categories this job/API ever serves (`classes/movilidad/registry.ts`). Anything
 * else 404s — checked BEFORE the database call, so a made-up slug never touches Mongo.
 */
export function isMovilidadCategorySlug(value: string): value is MovilidadCategory {
  return MOVILIDAD_CATEGORY_SET.has(value)
}

export interface MovilidadBand {
  p25: number
  median: number
  p75: number
  min: number
  n: number
}

export interface MovilidadOffer {
  /** El id del aviso, para cruzarlo con su historial de precio (`pricewatchoffers`). Aditivo: las
   * filas guardadas antes del 2026-09-22 no lo traen. */
  listingId?: string
  /** Cómo cambió el precio de ESTE aviso, cuando tenemos historia suya. */
  priceHistory?: PriceHistorySeries
  seller: string
  title: string
  url: string
  price: number
  currency: 'UYU' | 'USD'
  priceUyu: number
  condition: 'new' | 'used'
  source: 'store' | 'mercadolibre' | 'facebook'
  observedAt: string
}

export interface MovilidadProduct {
  slug: string
  name: string
  brand: string
  model: string
  image: string | null
  offers: MovilidadOffer[]
  bestPriceUyu: number
  sellers: number
}

export interface MovilidadItemDoc {
  key: string
  category: MovilidadCategory
  categoryLabel: string
  variant: string
  variantLabel: string
  room: string
  tier: string
  rank: number
  variantRank: number
  image: string | null
  regime: MovilidadRegime
  reason: string
  usedOk: boolean
  usedNote?: string
  quantity: number
  newBand: MovilidadBand | null
  usedBand: MovilidadBand | null
  usedSavingPct: number | null
  products: MovilidadProduct[]
  /** Up to 8 cheapest new offers, then up to 6 cheapest used ones — same budget as equipar. */
  offers: MovilidadOffer[]
  suspectDropped: number
  observedAt: string | null
  firstSeen: string
  lastSeen: string
  /** Never sent by `GET /api/movilidad/<categoria>` (Task 5 contract): a directory card only ever
   * needs the current band, and a year of daily points per row would multiply the payload for
   * nothing. Optional here only so the type can describe a raw Mongo document too. */
  history?: unknown[]
}

/** One harvester run, stripped to what the page can say: "did it work", not the detail. */
export interface MovilidadCategorySource {
  label: string
  ok: boolean
  listings: number
}

/** `GET /api/movilidad/<categoria>`: one category, every variant, no history. */
export interface MovilidadCategoryResponse {
  category: MovilidadCategory
  generatedAt: string | null
  usdUyu: number | null
  sources: MovilidadCategorySource[]
  items: MovilidadItemDoc[]
}

/** Raw shape of one `MovilidadMeta.runs[]` entry, mirroring `EquiparSourceRun` (`classes/equipar/
 * types.ts`) — the app-side schema stores it as `Schema.Types.Mixed`, so the route casts into this. */
export interface MovilidadRunDoc {
  key: string
  label: string
  adapter: string
  listings: number
  ok: boolean
  note: string
}

/**
 * Reading order inside one category's page: priced rows first (a variant with no band yet sinks
 * to the bottom rather than sitting ahead of one the market actually answered), then by the
 * registry's own variant order (`variantRank`), then alphabetically as a last, stable tie-break.
 */
export function movilidadSortItems(items: MovilidadItemDoc[]): MovilidadItemDoc[] {
  const priced = (item: MovilidadItemDoc): number => (item.newBand || item.usedBand ? 0 : 1)
  return [...items].sort(
    (a, b) =>
      priced(a) - priced(b) ||
      (a.variantRank ?? 1) - (b.variantRank ?? 1) ||
      a.variant.localeCompare(b.variant)
  )
}

/**
 * The products of one item that can be listed: none priced under half the new band's p25.
 *
 * Same reasoning and floor as `equiparPlausibleProducts` (`app/utils/equipar.ts`): the backend
 * only builds `products` from listings its own band kept, but this read-side floor is what keeps a
 * document written before that guard existed (or a future regression of it) from opening the
 * models table with a price the band itself would reject. Without a new band there is nothing to
 * measure against, so nothing is dropped.
 */
export function movilidadPlausibleProducts(
  item: Pick<MovilidadItemDoc, 'products' | 'newBand'>
): MovilidadProduct[] {
  const products = item.products ?? []
  if (!item.newBand) return products
  const floor = item.newBand.p25 / 2
  return products.filter(product => product.bestPriceUyu >= floor)
}

const MOVILIDAD_MAX_PRODUCTS = 12
const MOVILIDAD_MAX_PRODUCT_OFFERS = 6
/** The backend stores up to 8 new offers followed by up to 6 used ones. A cap of 8 would cut every
 * used offer off any variant priced new — same trap `EQUIPAR_CATEGORY_MAX_ITEM_OFFERS` documents. */
const MOVILIDAD_MAX_ITEM_OFFERS = 14

/**
 * Trims one category's rows for `GET /api/movilidad/<categoria>`: `products` (and each product's
 * own `offers`) and the item-level `offers` all come back from Mongo effectively unbounded. `history`
 * is never even selected out of Mongo by the route (see `MovilidadItemDoc.history`'s own comment),
 * so there is nothing to trim here — this function only bounds what the route DOES send.
 */
export function movilidadCategoryProjection(items: MovilidadItemDoc[]): MovilidadItemDoc[] {
  return items.map(item => ({
    ...item,
    products: movilidadPlausibleProducts(item)
      .slice(0, MOVILIDAD_MAX_PRODUCTS)
      .map(product => ({
        ...product,
        offers: product.offers.slice(0, MOVILIDAD_MAX_PRODUCT_OFFERS),
      })),
    offers: item.offers.slice(0, MOVILIDAD_MAX_ITEM_OFFERS),
  }))
}

/**
 * MercadoLibre does not publish a seller name for every listing; the backend's own fallback for
 * those is the literal string `"Mercado Libre"` (`classes/retail/sources/mercadolibre.ts`, where
 * the listing's `sellerKey` is `"ml:unknown"` — that key never reaches this shape, only the name
 * does). Showing that string as a seller would read as "sold by the marketplace itself", which is
 * never true — someone is selling it, we just don't know who. Only a `mercadolibre`-sourced offer
 * is rewritten: a store or Facebook listing that happened to be named "Mercado Libre" would be a
 * different bug, and papering over it here would hide it.
 */
export function movilidadSellerLabel(seller: string, source: MovilidadOffer['source']): string {
  if (source === 'mercadolibre' && seller.trim() === 'Mercado Libre') {
    return 'Vendedor sin identificar (Mercado Libre)'
  }
  return seller
}

/** Cheapest offers of one condition across every variant of a category, cheapest first. */
export function movilidadCheapestOffers(
  items: readonly MovilidadItemDoc[],
  condition: MovilidadOffer['condition'],
  limit: number
): Array<{ key: string; variantLabel: string; offer: MovilidadOffer }> {
  return items
    .flatMap(item =>
      (item.offers ?? [])
        .filter(offer => offer.condition === condition && offer.url)
        .map((offer, index) => ({
          key: `${item.key}:${condition}:${index}`,
          variantLabel: item.variantLabel,
          offer,
        }))
    )
    .sort((a, b) => a.offer.priceUyu - b.offer.priceUyu)
    .slice(0, limit)
}

/** `$ 13.019`, with a hard space between the sign and the figure so the celular never breaks the
 * amount across two lines — same convention as `/equipar-casa-uruguay/[categoria].vue`'s `money()`. */
export const movilidadMoney = (value: number): string =>
  `$\u00A0${Math.round(value).toLocaleString('es-UY')}`

export const movilidadUsd = (value: number): string =>
  `USD\u00A0${Math.round(value).toLocaleString('es-UY')}`

/** `YYYY-MM-DD` is read as midday UTC: at midnight it would fall on the previous day in Montevideo. */
function movilidadToDate(value: string | null | undefined): Date | null {
  if (!value) return null
  const iso = /^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00Z` : value
  const time = Date.parse(iso)
  return Number.isNaN(time) ? null : new Date(time)
}

/** Both pages are Spanish-only, so the locale is always `'es'` — `dateLocale('es')` is `'es-UY'`,
 * which is what renders "setiembre" instead of "septiembre" (see `utils/format.ts`). */
export function movilidadLongDate(value: string | null | undefined): string {
  const date = movilidadToDate(value)
  return date
    ? date.toLocaleDateString(dateLocale('es'), {
        day: 'numeric',
        month: 'long',
        year: 'numeric',
        timeZone: 'America/Montevideo',
      })
    : ''
}

export function movilidadShortDate(value: string | null | undefined): string {
  const date = movilidadToDate(value)
  return date
    ? date.toLocaleDateString(dateLocale('es'), {
        day: 'numeric',
        month: 'numeric',
        timeZone: 'America/Montevideo',
      })
    : ''
}

/**
 * FAQ answer: "¿cuánto sale <labelPlural>?", one clause per variant that has a new-price band,
 * busiest variant first. Mirrors the phrasing `equiparCategoryFaq` (`app/utils/
 * equiparCategoryPages.ts`) uses for the same question, generalised to any category.
 */
export function movilidadPrecioTipicoAnswer(
  items: readonly MovilidadItemDoc[],
  labelPlural: string,
  generatedAt: string | null
): string {
  const withNewBand = items
    .filter((item): item is MovilidadItemDoc & { newBand: MovilidadBand } => item.newBand !== null)
    .sort((a, b) => b.newBand.n - a.newBand.n)
  if (!withNewBand.length) {
    return `Todavía no relevamos suficientes precios nuevos de ${labelPlural} en Uruguay: sin datos suficientes para publicar una mediana.`
  }
  const porVariante = withNewBand
    .map(
      item =>
        `${item.variantLabel.toLowerCase()}: ${movilidadMoney(item.newBand.median)} (${item.newBand.n} avisos)`
    )
    .join('; ')
  const fecha = movilidadLongDate(generatedAt)
  return `Según lo relevado, la mediana nueva es ${porVariante}.${fecha ? ` Datos del ${fecha}.` : ''}`
}

/**
 * FAQ answer: "¿conviene comprar usado?". `usedOk`/`usedNote` are a judgement of the CATEGORY
 * (the registry), not of this run: a category with no items yet is not a category where used is a
 * bad idea. Only the medians and the saving come from `items`.
 */
export function movilidadUsadoAnswer(
  items: readonly MovilidadItemDoc[],
  usedOk: boolean,
  usedNote: string | undefined
): string {
  if (!usedOk) {
    return usedNote ? `No: ${usedNote}` : 'No: comprarlo usado no conviene.'
  }
  const withUsedBand = items.filter(
    (item): item is MovilidadItemDoc & { usedBand: MovilidadBand } => item.usedBand !== null
  )
  if (!withUsedBand.length) {
    const base = 'Hay oferta de segunda mano y la medimos aparte de la nueva'
    return usedNote
      ? `${base}, pero todavía no relevamos suficientes avisos usados. ${usedNote}`
      : `${base}, pero todavía no relevamos suficientes avisos usados.`
  }
  const porVariante = withUsedBand
    .sort((a, b) => b.usedBand.n - a.usedBand.n)
    .map(item => {
      const saving =
        typeof item.usedSavingPct === 'number'
          ? `, alrededor de ${Math.round(item.usedSavingPct)} % menos que la mediana nueva`
          : ''
      return `${item.variantLabel.toLowerCase()}: ${movilidadMoney(item.usedBand.median)} (${item.usedBand.n} avisos)${saving}`
    })
    .join('; ')
  return `Sí, hay oferta de segunda mano.${usedNote ? ` ${usedNote}` : ''} Mediana usada: ${porVariante}.`
}
