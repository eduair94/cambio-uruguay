import type { PriceHistorySeries } from './priceHistory'
// Shapes and maths for /equipar-casa-uruguay.
//
// `app/utils` is a FLAT auto-import namespace, so every export here is prefixed `equipar*` — a bare
// `plan()` or `TIERS` would collide with another page's helper the day someone adds one.

export type EquiparTier = 'S' | 'A' | 'B' | 'C'
export type EquiparRegime = 'modelo' | 'commodity'
export type EquiparRoom = 'cocina' | 'dormitorio' | 'bano' | 'living' | 'limpieza'

export interface EquiparBand {
  p25: number
  median: number
  p75: number
  min: number
  n: number
}

export interface EquiparOffer {
  /** El id del aviso, para cruzarlo con su historial de precio. Las filas guardadas antes del
   * 2026-09-22 no lo traen y esas tarjetas simplemente no muestran variación. */
  listingId?: string
  /** Cómo cambió el precio de ESTE aviso (`pricewatchoffers`), cuando tenemos historia suya. */
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

export interface EquiparProduct {
  slug: string
  name: string
  brand: string
  model: string
  image: string | null
  offers: EquiparOffer[]
  bestPriceUyu: number
  sellers: number
}

/** One daily point of `EquiparItemDoc.history`: medians only, no offers — the item already has those. */
export interface EquiparHistoryPoint {
  date: string
  newMedian: number | null
  usedMedian: number | null
}

export interface EquiparItemDoc {
  key: string
  category: string
  categoryLabel: string
  variant: string
  variantLabel: string
  room: EquiparRoom
  tier: EquiparTier
  /** Position in the published necessity order. The planner buys in exactly this order. */
  rank: number
  /** Order of the variant inside its category: 1 is the smallest/cheapest. */
  variantRank: number
  /** Representative photo, from a storefront or MercadoLibre only — never a Marketplace snapshot. */
  image: string | null
  regime: EquiparRegime
  reason: string
  usedOk: boolean
  usedNote?: string
  quantity: number
  newBand: EquiparBand | null
  usedBand: EquiparBand | null
  usedSavingPct: number | null
  products: EquiparProduct[]
  /** Up to 8 cheapest new offers, then up to 6 cheapest used ones. */
  offers: EquiparOffer[]
  suspectDropped: number
  observedAt: string | null
  firstSeen: string
  lastSeen: string
  /**
   * Daily medians, oldest first, kept by the backend for up to a year. Absent from the index
   * endpoint's payload (the page draws none of it there); present on the per-category endpoint,
   * which is what the price chart on `/equipar-casa-uruguay/<categoria>` reads (Task 8).
   */
  history?: EquiparHistoryPoint[]
}

export interface EquiparBasketLine {
  itemKey: string
  label: string
  variantLabel: string
  tier: EquiparTier
  quantity: number
  unitPriceUyu: number
  totalUyu: number
  condition: 'new' | 'used'
}

export interface EquiparBasket {
  key: 'minima' | 'decente' | 'completa'
  label: string
  tiers: EquiparTier[]
  lines: EquiparBasketLine[]
  totalUyu: number
  totalUsd: number | null
  missing: Array<{ itemKey: string; label: string; tier: EquiparTier }>
  complete: boolean
}

export interface EquiparMetaDoc {
  key: string
  generatedAt: string
  usdUyu: number
  listings: number
  items: number
  runs: Array<{
    key: string
    label: string
    adapter: string
    listings: number
    ok: boolean
    note: string
  }>
  baskets: EquiparBasket[]
  uncovered: string[]
}

export interface EquiparResponse {
  meta: EquiparMetaDoc | null
  items: EquiparItemDoc[]
}

/** One harvester run, stripped of `key` and `note` — the API answers "did it work", not the detail. */
export interface EquiparCategorySource {
  label: string
  ok: boolean
  listings: number
}

/** `GET /api/equipar/<categoria>`: one category, all its variants, with daily price history. */
export interface EquiparCategoryResponse {
  category: string
  generatedAt: string | null
  usdUyu: number | null
  sources: EquiparCategorySource[]
  items: EquiparItemDoc[]
}

export const EQUIPAR_TIER_ORDER: Record<EquiparTier, number> = { S: 0, A: 1, B: 2, C: 3 }

export const EQUIPAR_TIERS: EquiparTier[] = ['S', 'A', 'B', 'C']

/**
 * Puts the catalogue in reading order: tier, then the published necessity rank, then rows that can
 * actually quote a price, then size.
 *
 * It runs on READ and not only on write, which is the whole point. The job sorts before saving, but
 * `find()` hands documents back in insertion order, and these rows were first inserted by an
 * earlier build that sorted variants alphabetically — so production kept showing the calefón as
 * 100 L, 50 L, 80 L and an empty "Cubiertos / servicio para 12" above the one with prices, long
 * after the write-side sort was fixed. An upsert never moves a document; only sorting the read does.
 */
export function equiparSortItems(items: EquiparItemDoc[]): EquiparItemDoc[] {
  const priced = (item: EquiparItemDoc): number => (item.newBand || item.usedBand ? 0 : 1)
  return [...items].sort(
    (a, b) =>
      EQUIPAR_TIER_ORDER[a.tier] - EQUIPAR_TIER_ORDER[b.tier] ||
      (a.rank ?? 999) - (b.rank ?? 999) ||
      priced(a) - priced(b) ||
      (a.variantRank ?? 1) - (b.variantRank ?? 1) ||
      a.variant.localeCompare(b.variant)
  )
}

/**
 * The products of one item that can be listed: none priced under half the new band's p25.
 *
 * The backend now builds products only from listings its band kept, but documents written before
 * that fix built them from EVERY listing of the item — in production "colchón" opened its model table
 * with yogurts at $ 70–77 and "aire acondicionado" with a convector at $ 2.773, and the page publishes
 * that price as a schema.org Offer. The app deploys before the backend, so this read-side floor keeps
 * those rows off the page until the job rewrites the documents. Half of p25 sits at or above the
 * backend's own suspect line (p10/2), so it catches every row that line flags — and, rarely, also
 * hides a genuinely cheap product the fixed backend would publish: a price accepted on purpose,
 * since the next run can bring it back while a yogurt in a Product Offer cannot be taken back.
 * Without a new band there is nothing to measure against.
 */
export function equiparPlausibleProducts(
  item: Pick<EquiparItemDoc, 'products' | 'newBand'>
): EquiparProduct[] {
  const products = item.products ?? []
  if (!item.newBand) return products
  const floor = item.newBand.p25 / 2
  return products.filter(product => product.bestPriceUyu >= floor)
}

const EQUIPAR_CATEGORY_MAX_PRODUCTS = 12
const EQUIPAR_CATEGORY_MAX_PRODUCT_OFFERS = 6
/**
 * The backend stores up to 8 new offers followed by up to 6 used ones (`classes/equipar/catalog.ts`,
 * `ITEM_NEW_OFFERS` + `ITEM_USED_OFFERS`). The cap is their sum: at 8 it cut every used offer off any
 * variant priced new.
 */
const EQUIPAR_CATEGORY_MAX_ITEM_OFFERS = 14
const EQUIPAR_CATEGORY_MAX_HISTORY = 180

/**
 * Trims one category's rows for `GET /api/equipar/<categoria>`: `products` (and each product's own
 * `offers`), the item-level `offers`, and `history` all come back from Mongo effectively unbounded —
 * a variant with 400 days of history and forty listed products would multiply the payload of the ONE
 * endpoint that also has to carry that history, which the index endpoint drops entirely.
 *
 * `history` is stored oldest-first, so trimming it to a budget means keeping the TAIL (the most
 * recent points), not the head — `slice(-N)`, not `slice(0, N)`.
 */
export function equiparCategoryProjection(items: EquiparItemDoc[]): EquiparItemDoc[] {
  return items.map(item => ({
    ...item,
    products: equiparPlausibleProducts(item)
      .slice(0, EQUIPAR_CATEGORY_MAX_PRODUCTS)
      .map(product => ({
        ...product,
        offers: product.offers.slice(0, EQUIPAR_CATEGORY_MAX_PRODUCT_OFFERS),
      })),
    offers: item.offers.slice(0, EQUIPAR_CATEGORY_MAX_ITEM_OFFERS),
    history: (item.history ?? []).slice(-EQUIPAR_CATEGORY_MAX_HISTORY),
  }))
}

/** What the money actually buys for one item, given whether the reader accepts second-hand. */
export function equiparUnitPrice(
  item: EquiparItemDoc,
  acceptUsed: boolean
): { priceUyu: number; condition: 'new' | 'used' } | null {
  // The registry decides where used is sane. A mattress is the one place in this catalogue where
  // the cheap option is the wrong advice, and the row says so.
  if (acceptUsed && item.usedOk && item.usedBand) {
    return { priceUyu: item.usedBand.median, condition: 'used' }
  }
  if (item.newBand) return { priceUyu: item.newBand.p25, condition: 'new' }
  if (item.usedOk && item.usedBand) return { priceUyu: item.usedBand.median, condition: 'used' }
  return null
}

export interface EquiparPlanLine {
  item: EquiparItemDoc
  quantity: number
  unitPriceUyu: number
  totalUyu: number
  condition: 'new' | 'used'
  /** Did the money reach this line? */
  afforded: boolean
}

export interface EquiparPlan {
  lines: EquiparPlanLine[]
  spentUyu: number
  leftoverUyu: number
  /** Everything the budget did not reach, in the order it would have been bought. */
  missingUyu: number
  /** The first line the money did not cover — where the budget runs out. */
  cutAt: EquiparPlanLine | null
  budgetUyu: number
}

/**
 * Walks the catalogue in necessity order and spends the budget until it runs out.
 *
 * The order is tier, then the published rank — the SAME order the tier table prints. Two orders
 * that look sensible are both wrong here: cheapest-first buys six small things instead of the
 * fridge, and most-expensive-first buys the mattress and drops the fridge. Either way the planner
 * would be choosing which essential to sacrifice on a criterion the page never states. Sorting by
 * the published rank means the plan is readable straight off the table above it.
 */
export function equiparPlan(options: {
  items: EquiparItemDoc[]
  budgetUyu: number
  acceptUsed: boolean
  /** Item keys the reader already owns. */
  owned?: Set<string>
  /** Tiers to buy. Defaults to everything except "can wait months". */
  tiers?: EquiparTier[]
}): EquiparPlan {
  const tiers = options.tiers ?? ['S', 'A', 'B']
  const owned = options.owned ?? new Set<string>()

  // One row per category: the catalogue has several variants of each and buying three fridges is
  // not a plan. The cheapest priced variant stands for the category.
  const byCategory = new Map<
    string,
    { item: EquiparItemDoc; priceUyu: number; condition: 'new' | 'used' }
  >()
  for (const item of options.items) {
    if (!tiers.includes(item.tier)) continue
    if (owned.has(item.key) || owned.has(item.category)) continue
    const priced = equiparUnitPrice(item, options.acceptUsed)
    if (!priced) continue
    const current = byCategory.get(item.category)
    if (!current || priced.priceUyu < current.priceUyu) {
      byCategory.set(item.category, {
        item,
        priceUyu: priced.priceUyu,
        condition: priced.condition,
      })
    }
  }

  const ordered = [...byCategory.values()].sort(
    (a, b) =>
      EQUIPAR_TIER_ORDER[a.item.tier] - EQUIPAR_TIER_ORDER[b.item.tier] ||
      (a.item.rank ?? 999) - (b.item.rank ?? 999) ||
      a.item.category.localeCompare(b.item.category)
  )

  let remaining = options.budgetUyu
  const lines: EquiparPlanLine[] = []
  let cutAt: EquiparPlanLine | null = null

  for (const entry of ordered) {
    const quantity = entry.item.quantity || 1
    const totalUyu = entry.priceUyu * quantity
    const afforded = totalUyu <= remaining
    if (afforded) remaining -= totalUyu
    const line: EquiparPlanLine = {
      item: entry.item,
      quantity,
      unitPriceUyu: entry.priceUyu,
      totalUyu,
      condition: entry.condition,
      afforded,
    }
    if (!afforded && !cutAt) cutAt = line
    lines.push(line)
  }

  const spentUyu = lines.filter(line => line.afforded).reduce((sum, line) => sum + line.totalUyu, 0)
  const missingUyu = lines
    .filter(line => !line.afforded)
    .reduce((sum, line) => sum + line.totalUyu, 0)

  return {
    lines,
    spentUyu,
    leftoverUyu: remaining,
    missingUyu,
    cutAt,
    budgetUyu: options.budgetUyu,
  }
}

export const equiparMoney = (value: number): string =>
  `$${Math.round(value).toLocaleString('es-UY')}`
