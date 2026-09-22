import type { PriceHistorySeries } from './priceHistory'
// Shapes and helpers for `/celulares-uruguay` (Task 6: `GET /api/phones` + `GET /api/phones/<modelo>`).
//
// `app/utils` is a FLAT auto-import namespace, so every export here is prefixed `phone`/`PHONE_` —
// see app/utils/equipar.ts's own header comment for the same rule. `app/utils/phoneImport.ts` and
// `app/utils/phoneUsPrices.ts` (Task 5) already claim that prefix for the "should I import it from the
// US" calculator; this file owns the DIRECTORY's own shapes instead, and none of its names collide
// with either (checked by grep before writing this file).
//
// Mirrors `classes/phones/{types,catalog}.ts`. `app/` cannot import from the root package — separate
// `package.json`, separate deploy, see the root AGENTS.md — so these are hand-kept copies, not
// re-exports; a shape drift between the two is caught the same way as every other collection `app/`
// mirrors: `tests/appdb/schema_parity.test.ts` compares the two `new Schema({...})` blocks field by
// field. `app/server/models/PhoneModel.ts` / `PhoneMeta.ts` import their Doc types FROM here (not the
// other way around) — the same direction `EquiparItem.ts`/`ChairCatalogProduct.ts` already use for
// their own Doc types — so there is exactly one place these shapes are declared for the app side.

export type PhoneBrand =
  | 'apple'
  | 'samsung'
  | 'motorola'
  | 'xiaomi'
  | 'honor'
  | 'oppo'
  | 'realme'
  | 'tcl'
  | 'zte'
  | 'nokia'
  | 'infinix'
  | 'tecno'

export type PhoneCondition = 'new' | 'open-box' | 'refurbished' | 'used'

export interface PhoneOfferDoc {
  /** El id del aviso, para cruzarlo con su historial de precio. Opcional: las filas guardadas antes
   * del 2026-09-22 no lo traen, y una ficha vieja simplemente no muestra la variación. */
  listingId?: string
  /** Cómo cambió el precio de ESTE aviso (`pricewatchoffers`), cuando tenemos historia suya. */
  priceHistory?: PriceHistorySeries
  seller: string
  sellerKey: string
  source: 'store' | 'mercadolibre'
  officialStore: boolean
  title: string
  url: string
  price: number
  currency: 'UYU' | 'USD'
  priceUyu: number
  listPrice: number | null
  condition: PhoneCondition
  esimOnly: boolean
  observedAt: string
}

export interface PhoneBandDoc {
  min: number
  p25: number
  median: number
  p75: number
  n: number
  sellers: number
}

/** One daily point of `PhoneModelDoc.history` — see `classes/phones/store.ts`'s `withPhoneHistory`. */
export interface PhoneHistoryPointDoc {
  date: string
  newMin: number | null
  newMedian: number | null
  sellers: number
}

/**
 * One document per phone MODEL (brand+family+storage) — mirrors `classes/phones/catalog.ts`'s
 * `PhoneModel`. `bands` holds one entry per condition, never pooled: they are separate markets, and
 * pooling them would publish a number that describes neither (the same "nuevo y usado nunca se
 * promedian" rule PRECIOS.md/EQUIPAR.md already encode). `ambiguousConditions` records a condition the
 * backend abstained on — two co-equal price populations merged onto one key — rather than arbitrate
 * between them; see `phonePublishable` below for what that means for a page.
 */
export interface PhoneModelDoc {
  key: string
  slug: string
  brand: string
  brandLabel: string
  family: string
  familyLabel: string
  storageGb: number
  name: string
  image: string | null
  bands: Partial<Record<PhoneCondition, PhoneBandDoc>>
  /** New first, then open-box, refurbished, used; cheapest per seller within a condition. Capped at 30. */
  offers: PhoneOfferDoc[]
  newSellers: number
  esimOnlySeen: boolean
  suspectDropped: number
  ambiguousDropped: number
  ambiguousConditions: PhoneCondition[]
  observedAt: string | null
  /** Up to 365 daily points, oldest first — real weight on a LIST document, see PHONE_LIST_PROJECTION. */
  history: PhoneHistoryPointDoc[]
  firstSeen: string
  lastSeen: string
}

export interface PhoneMetaSourceRun {
  key: string
  label: string
  adapter: string
  listings: number
  ok: boolean
  note: string
}

/** Companion of PhoneModelDoc: one document describing the last celulares run. */
export interface PhoneMetaDoc {
  key: string
  generatedAt: string
  usdUyu: number
  listings: number
  models: number
  runs: PhoneMetaSourceRun[]
}

/** Mirrors `classes/phones/store.ts`'s `PHONE_META_KEY` — the single PhoneMeta document's `key`. */
export const PHONE_META_KEY = 'celulares-uruguay'

/**
 * How many days a model's `lastSeen` may lag before its price is treated as stale rather than
 * "today's cheapest" — same horizon `app/server/api/equipar/index.get.ts`'s own `STALE_DAYS` uses.
 * The pizarra lesson applies here too (see MEMORY `pizarra-congelada-escala-el-ranking`): an old price
 * that nothing marks as old is worse than no price, because "cheapest first" puts it at the top.
 */
export const PHONE_STALE_DAYS = 4

/** A model's own `slug` (== its `key`, `${brand}-${family}-${storage}`, see identify.ts). */
export const PHONE_SLUG_RE = /^[a-z0-9][a-z0-9-]{3,80}$/

/**
 * Mongo projection shared by every LIST read (`GET /api/phones`, and the sibling lookup inside
 * `GET /api/phones/<modelo>`): excludes `history` — up to 365 daily points per model, real weight on
 * a document a list endpoint reads in bulk, and the one field `PhoneModel.ts`'s own doc comment
 * explicitly calls out for this — plus Mongo's own bookkeeping fields. A single model's own page
 * (`PHONE_DETAIL_PROJECTION` below) keeps `history`; nothing else here is private.
 */
export const PHONE_LIST_PROJECTION = {
  _id: 0,
  __v: 0,
  createdAt: 0,
  updatedAt: 0,
  history: 0,
} as const

/** Mongo projection for a single model's own page: everything except Mongo's bookkeeping fields. */
export const PHONE_DETAIL_PROJECTION = { _id: 0, __v: 0, createdAt: 0, updatedAt: 0 } as const

/** One directory card — the hub's and the sibling list's unit. */
export interface PhoneHubCard {
  slug: string
  name: string
  brandLabel: string
  familyLabel: string
  storageGb: number
  image: string | null
  /** The cheapest surviving NEW offer, in UYU (whole pesos — see PhoneBandDoc's own doc comment). */
  bestNewUyu: number
  /** The same offer, in whatever currency the seller actually published it in. */
  bestNewOriginal: { price: number; currency: 'UYU' | 'USD' }
  newSellers: number
  lastSeen: string
}

export interface PhoneHubBrandGroup {
  brand: string
  brandLabel: string
  models: PhoneHubCard[]
}

export interface PhoneHubResponse {
  generatedAt: string
  usdUyu: number
  brands: PhoneHubBrandGroup[]
}

export interface PhoneDetailResponse {
  generatedAt: string
  usdUyu: number
  model: PhoneModelDoc
  stale: boolean
  /** Same rule as the hub filter (`phonePublishable`) — the page must not headline an unpublishable price. */
  publishable: boolean
  siblings: PhoneHubCard[]
}

/**
 * Is `lastSeen` older than `staleDays` relative to `today`? Both are `YYYY-MM-DD` strings (as stored
 * by `classes/phones/store.ts`'s `withPhoneHistory`), compared the same way
 * `app/server/api/equipar/index.get.ts` computes its own cutoff — `lastSeen >= cutoff` is fresh, so
 * `lastSeen < cutoff` is stale. Pure and deterministic on purpose: no reliance on the system clock, so
 * a test can pin an exact "today" instead of racing real time.
 */
/**
 * The oldest `lastSeen` a model may have and still count as fresh, as a YYYY-MM-DD string. The hub
 * query uses it as a floor so a directory that only grows does not read every discontinued model on
 * every cache refresh; `phoneIsStale` stays the authority for what the page publishes.
 */
export function phoneFreshFloor(today: string, staleDays: number = PHONE_STALE_DAYS): string {
  const cutoff = new Date(`${today}T00:00:00.000Z`)
  cutoff.setUTCDate(cutoff.getUTCDate() - staleDays)
  return cutoff.toISOString().slice(0, 10)
}

export function phoneIsStale(
  lastSeen: string,
  today: string,
  staleDays: number = PHONE_STALE_DAYS
): boolean {
  return lastSeen < phoneFreshFloor(today, staleDays)
}

/**
 * May this model's NEW price headline a page (the hub, or its own page's "mejor precio")?
 *
 * Three conditions, ALL required — see `PhoneModelDoc`'s own doc comment and
 * `classes/phones/catalog.ts`'s module comment for why each exists on its own axis:
 *   - a NEW band exists at all (fewer than `PHONE_MIN_BAND_SAMPLE` surviving offers, or none, means
 *     there is nothing to publish as "the" price);
 *   - `"new"` is not in `ambiguousConditions` (two co-equal price populations were merged onto this
 *     key and the backend abstained rather than arbitrate — see `findAmbiguousSplit`);
 *   - `lastSeen` is not stale (see `phoneIsStale`) — a frozen price is not "cheapest today".
 *
 * The single-model page (Task 7) still SERVES a model that fails this — the page decides what to show
 * for a model with no current new price — but must read this same flag (returned as `publishable` by
 * `GET /api/phones/<modelo>`) before treating it as headline-worthy, and the hub/sibling lists filter
 * by it outright.
 */
export function phonePublishable(
  model: Pick<PhoneModelDoc, 'bands' | 'ambiguousConditions' | 'lastSeen'>,
  today: string,
  staleDays: number = PHONE_STALE_DAYS
): boolean {
  if (!model.bands?.new) return false
  if ((model.ambiguousConditions ?? []).includes('new')) return false
  if (phoneIsStale(model.lastSeen, today, staleDays)) return false
  return true
}

const ML_UNKNOWN_SELLER_LABEL = 'Vendedor sin identificar (Mercado Libre)'

/**
 * What to print for an offer's seller.
 *
 * `classes/phones/catalog.ts`'s `sellerIdentity` already collapses every anonymous MercadoLibre
 * listing — no real seller id, or the literal fallback display name "Mercado Libre" — onto the shared
 * `ml:unknown` bucket so they don't inflate `sellers`/`newSellers` counts; this is the matching PAGE
 * rule: rendering that bucket (or the raw "Mercado Libre" fallback name, in case an offer somehow
 * carries a real `sellerKey` alongside the fallback name) as if "Mercado Libre" were itself a seller
 * would misrepresent an anonymous individual listing as the platform selling it directly. Every other
 * offer — a real ML seller, or any store, which always has its own registry key — keeps its own name.
 */
export function phoneSellerLabel(offer: Pick<PhoneOfferDoc, 'sellerKey' | 'seller'>): string {
  if (offer.sellerKey === 'ml:unknown' || offer.seller.trim() === 'Mercado Libre')
    return ML_UNKNOWN_SELLER_LABEL
  return offer.seller
}

/** The cheapest surviving NEW offer, or null when the model has none (used-only, refurb-only, …). */
function bestNewOffer(offers: readonly PhoneOfferDoc[]): PhoneOfferDoc | null {
  let best: PhoneOfferDoc | null = null
  for (const offer of offers) {
    if (offer.condition !== 'new') continue
    if (!best || offer.priceUyu < best.priceUyu) best = offer
  }
  return best
}

/**
 * One directory card per model — a PURE shape mapper, not a filter: the caller decides which models
 * belong on a card list (`phoneHubGroups`/`phoneSiblings` below both filter by `phonePublishable`
 * first) and in what order; this only reshapes whatever it is handed, in the same order.
 *
 * `bestNewUyu` reads the NEW band's own `min` when a band exists (the same figure `phonePublishable`
 * required to be non-null) rather than recomputing it from `offers`, because the band is exactly what
 * screened those offers; the "original currency" companion still has to come from an actual OFFER —
 * a band has no currency of its own, only a UYU figure — so this falls back to deriving the cheapest
 * surviving new offer directly when a caller hands a model with offers but no band (e.g. a sibling
 * candidate a future task widens the filter for).
 */
export function phoneHubCards(models: readonly PhoneModelDoc[]): PhoneHubCard[] {
  return models.map(model => {
    const band = model.bands.new ?? null
    const offer = bestNewOffer(model.offers)
    return {
      slug: model.slug,
      name: model.name,
      brandLabel: model.brandLabel,
      familyLabel: model.familyLabel,
      storageGb: model.storageGb,
      image: model.image,
      bestNewUyu: band ? band.min : (offer?.priceUyu ?? 0),
      bestNewOriginal: offer
        ? { price: offer.price, currency: offer.currency }
        : { price: band?.min ?? 0, currency: 'UYU' as const },
      newSellers: model.newSellers,
      lastSeen: model.lastSeen,
    }
  })
}

/**
 * Fixed reading order for the hub's brand buckets: the five brands with named phone series the
 * identifier resolves down to family+storage precisely enough to compare across stores (Apple,
 * Samsung, Motorola, Xiaomi, Honor — see `classes/phones/identify.ts`), in that order; every other
 * brand ("resto": Oppo, Realme, TCL, ZTE, Nokia, Infinix, Tecno) follows, ordered alphabetically by
 * its own key for a deterministic tie-break.
 */
const PHONE_BRAND_ORDER: readonly string[] = ['apple', 'samsung', 'motorola', 'xiaomi', 'honor']

function phoneBrandRank(brand: string): number {
  const index = PHONE_BRAND_ORDER.indexOf(brand)
  return index === -1 ? PHONE_BRAND_ORDER.length : index
}

/**
 * The hub's brand → model-card groups, in reading order.
 *
 * Filters to `phonePublishable` first (see its own doc comment for the three conditions), then
 * orders by `PHONE_BRAND_ORDER`, then family, then storage ascending within a family (the
 * smallest/cheapest variant leads) — matching the brief's own "ordenados por marca … y dentro por
 * familia y almacenamiento".
 */
export function phoneHubGroups(
  models: readonly PhoneModelDoc[],
  today: string
): PhoneHubBrandGroup[] {
  const eligible = models.filter(model => phonePublishable(model, today))
  const sorted = [...eligible].sort(
    (a, b) =>
      phoneBrandRank(a.brand) - phoneBrandRank(b.brand) ||
      a.brand.localeCompare(b.brand) ||
      a.family.localeCompare(b.family) ||
      a.storageGb - b.storageGb
  )
  const cards = phoneHubCards(sorted)
  const groups: PhoneHubBrandGroup[] = []
  sorted.forEach((model, index) => {
    const last = groups[groups.length - 1]
    if (!last || last.brand !== model.brand) {
      groups.push({ brand: model.brand, brandLabel: model.brandLabel, models: [cards[index]!] })
    } else {
      last.models.push(cards[index]!)
    }
  })
  return groups
}

const PHONE_SIBLINGS_MAX = 8

/**
 * Up to `limit` related models for a model's own page: the same family at a DIFFERENT storage tier
 * first (ascending), then other families of the same brand — never the model itself, and never a
 * model this run could not publish a NEW price for (`phonePublishable`): a sibling link the reader
 * clicks into and finds without a headline price is a worse experience than one fewer link.
 */
export function phoneSiblings(
  models: readonly PhoneModelDoc[],
  current: Pick<PhoneModelDoc, 'key' | 'brand' | 'family'>,
  today: string,
  limit: number = PHONE_SIBLINGS_MAX
): PhoneHubCard[] {
  const candidates = models.filter(
    model => model.key !== current.key && phonePublishable(model, today)
  )
  const sameFamily = candidates
    .filter(model => model.family === current.family)
    .sort((a, b) => a.storageGb - b.storageGb)
  const otherFamilies = candidates
    .filter(model => model.brand === current.brand && model.family !== current.family)
    .sort((a, b) => a.family.localeCompare(b.family) || a.storageGb - b.storageGb)
  return phoneHubCards([...sameFamily, ...otherFamilies].slice(0, limit))
}

const PHONE_DETAIL_MAX_OFFERS = 30
const PHONE_DETAIL_MAX_HISTORY = 180

/**
 * Trims one model's own page payload for `GET /api/phones/<modelo>`: `offers` (already capped at 30
 * by the backend, re-capped here defensively — the API's own contract, not an assumption about what
 * the database currently holds) and `history` (up to 365 stored daily points) down to what the page
 * draws. `history` is stored oldest-first, so trimming to a budget keeps the TAIL (`slice(-N)`, not
 * `slice(0, N)`) — the same rule `equiparCategoryProjection` uses for the same reason.
 */
export function phoneModelProjection(doc: PhoneModelDoc): PhoneModelDoc {
  return {
    ...doc,
    offers: doc.offers.slice(0, PHONE_DETAIL_MAX_OFFERS),
    history: (doc.history ?? []).slice(-PHONE_DETAIL_MAX_HISTORY),
  }
}

/** Whole-peso UYU, grouped for `es-UY` — mirrors `equiparMoney`. */
export const phoneMoney = (uyu: number): string => `$${Math.round(uyu).toLocaleString('es-UY')}`

/** Whole-dollar USD, grouped for `es-UY` (the site's own convention, not `en-US`'s comma). */
export const phoneUsd = (usd: number): string => `US$${Math.round(usd).toLocaleString('es-UY')}`
