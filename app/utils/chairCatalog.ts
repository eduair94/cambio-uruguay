// Types and pure helpers for the desk-chair market directory (/sillas-escritorio-uruguay).
//
// The backend job (root `sync_chairs.ts`) writes these documents into the app's MongoDB; the app
// only reads them. This file is the hand-kept mirror of `classes/chairs/types.ts` — the two
// packages compile under separate tsconfigs and cannot share a module. Change both together.

import type { ChairEvidence } from './chairTiers'

export type ChairMarketSource = 'mercadolibre' | 'facebook' | 'store'
export type ChairChannel = 'marketplace' | 'local-store' | 'importer' | 'classifieds'
export type ChairCategory = 'ergonomic' | 'gaming' | 'executive' | 'operative' | 'unknown'
export type ChairCondition = 'new' | 'refurbished' | 'used' | 'unknown'
export type ChairCatalogConfidence = 'low' | 'medium' | 'high'

export interface ChairCatalogOffer {
  id: string
  source: ChairMarketSource
  sellerKey: string
  seller: string
  channel: ChairChannel
  title: string
  url: string
  price: number
  currency: 'UYU' | 'USD'
  priceUyu: number
  condition: ChairCondition
  available: boolean
  freeShipping: boolean | null
  location: string | null
  image: string | null
  observedAt: string
}

export interface ChairCatalogPriceStats {
  min: number
  max: number
  median: number
  currency: 'UYU'
  samples: number
  bestNew: number | null
  bestUsed: number | null
}

export interface ChairCatalogRatingSignal {
  source: 'reddit' | 'mercadolibre' | 'store' | 'expert'
  stars: number
  sampleSize: number
  weight: number
  detail: string
}

export interface ChairCatalogSpec {
  id: string
  label: string
  value: string
}

export interface ChairCatalogReview {
  source: string
  sourceUrl: string
  rating: number | null
  text: string
  date: string | null
}

export interface ChairCatalogPoint {
  text: string
  sourceIds: string[]
}

export interface ChairCatalogPricePoint {
  date: string
  median: number
  min: number
  offers: number
}

export interface ChairCatalogImage {
  url: string
  alt: string
  sourceName: string
  sourceUrl: string
}

export interface ChairCatalogProduct {
  slug: string
  key: string
  name: string
  brand: string
  model: string
  category: ChairCategory
  stars: number | null
  ratingCount: number
  ratingSignals: ChairCatalogRatingSignal[]
  confidence: ChairCatalogConfidence
  redditSlug: string | null
  tier: 'S' | 'A' | 'B' | 'C' | 'D' | null
  price: ChairCatalogPriceStats | null
  offers: ChairCatalogOffer[]
  sellers: number
  specs: ChairCatalogSpec[]
  verdict: string
  pros: ChairCatalogPoint[]
  cons: ChairCatalogPoint[]
  evidence: ChairEvidence[]
  reviews: ChairCatalogReview[]
  images: ChairCatalogImage[]
  history: ChairCatalogPricePoint[]
  firstSeen: string
  lastSeen: string
}

/**
 * What /api/chairs sends for the directory: everything a card needs and nothing else.
 *
 * The heavy halves of a chair — its specs, its evidence, its quoted reviews and its price history —
 * are an order of magnitude larger than the card and are only ever read on the chair page, so they
 * are optional here and fetched by /api/chairs/[slug].
 */
export type ChairCatalogCard = Omit<
  ChairCatalogProduct,
  | 'key'
  | 'specs'
  | 'verdict'
  | 'pros'
  | 'cons'
  | 'evidence'
  | 'reviews'
  | 'history'
  | 'ratingSignals'
  | 'firstSeen'
> &
  Partial<
    Pick<
      ChairCatalogProduct,
      | 'key'
      | 'specs'
      | 'verdict'
      | 'pros'
      | 'cons'
      | 'evidence'
      | 'reviews'
      | 'history'
      | 'ratingSignals'
      | 'firstSeen'
    >
  > & {
    /**
     * How many offers each platform has, precomputed.
     *
     * `offers` on a card is truncated to the cheapest few — a chair sold by nine MercadoLibre
     * sellers would otherwise ship nine rows the card never renders — so the counts cannot be
     * derived client-side any more.
     */
    platforms?: Array<{ source: ChairMarketSource; count: number }>
    /** Whether a new / used offer exists at all, for the condition filter. */
    hasNew?: boolean
    hasUsed?: boolean
  }

export interface ChairCatalogSourceRun {
  key: string
  label: string
  adapter: string
  listings: number
  chairs: number
  ok: boolean
  note: string
}

export interface ChairCatalogMeta {
  key: string
  asOf: string
  usdUyu: number
  products: number
  offers: number
  sellers: number
  sources: ChairCatalogSourceRun[]
}

export interface ChairCatalogResponse {
  meta: ChairCatalogMeta | null
  products: ChairCatalogCard[]
  total: number
  facets: {
    brands: Array<{ value: string; count: number }>
    categories: Array<{ value: ChairCategory; count: number }>
    sellers: Array<{ value: string; count: number }>
    priceMax: number
  }
}

export const CHAIR_CATEGORY_ORDER: ChairCategory[] = [
  'ergonomic',
  'gaming',
  'executive',
  'operative',
  'unknown',
]

export const chairSourceIcon = (source: ChairMarketSource): string =>
  source === 'mercadolibre'
    ? 'mdi-shopping-outline'
    : source === 'facebook'
      ? 'mdi-facebook'
      : 'mdi-storefront-outline'

/** Full, half and empty stars for a 1-5 rating. */
export function starIcons(stars: number | null): string[] {
  if (stars === null) return Array.from({ length: 5 }, () => 'mdi-star-outline')
  return Array.from({ length: 5 }, (_, index) => {
    const filled = stars - index
    if (filled >= 0.75) return 'mdi-star'
    if (filled >= 0.25) return 'mdi-star-half-full'
    return 'mdi-star-outline'
  })
}

export const formatChairPrice = (value: number, currency: 'UYU' | 'USD' = 'UYU'): string =>
  currency === 'USD'
    ? `US$ ${Math.round(value).toLocaleString('es-UY')}`
    : `$ ${Math.round(value).toLocaleString('es-UY')}`

/** Cheapest available offer, preferring new over used at equal price. */
export function bestChairOffer(product: ChairCatalogCard): ChairCatalogOffer | null {
  const available = product.offers.filter(offer => offer.available)
  const pool = available.length ? available : product.offers
  return (
    [...pool].sort(
      (a, b) =>
        a.priceUyu - b.priceUyu || Number(a.condition !== 'new') - Number(b.condition !== 'new')
    )[0] ?? null
  )
}

/** Platform chips for a card: uses the precomputed counts, falling back to the offers it has. */
export function platformSummary(
  product: ChairCatalogCard
): Array<{ source: ChairMarketSource; count: number }> {
  if (product.platforms?.length) return product.platforms
  return offersByPlatform(product).map(group => ({
    source: group.source,
    count: group.offers.length,
  }))
}

/** One entry per platform, so "dónde comprarla" never repeats the same shop. */
export function offersByPlatform(product: ChairCatalogCard): Array<{
  source: ChairMarketSource
  offers: ChairCatalogOffer[]
}> {
  const groups = new Map<ChairMarketSource, ChairCatalogOffer[]>()
  for (const offer of product.offers) {
    const bucket = groups.get(offer.source) ?? []
    bucket.push(offer)
    groups.set(offer.source, bucket)
  }
  const order: ChairMarketSource[] = ['store', 'mercadolibre', 'facebook']
  return order
    .filter(source => groups.has(source))
    .map(source => ({
      source,
      offers: (groups.get(source) ?? []).sort((a, b) => a.priceUyu - b.priceUyu),
    }))
}

/** Percentage drop between the first and last price point, or null when there is no history. */
export function priceTrend(product: ChairCatalogProduct): number | null {
  const points = (product.history ?? []).filter(point => point.median > 0)
  if (points.length < 2) return null
  const first = points[0]!.median
  const last = points[points.length - 1]!.median
  if (!first) return null
  return Math.round(((last - first) / first) * 1000) / 10
}

export interface ChairDirectoryFilters {
  query: string
  category: ChairCategory | 'all'
  brand: string | 'all'
  maxPrice: number | null
  condition: 'all' | 'new' | 'used'
  minStars: number
  sort: 'relevance' | 'price-asc' | 'price-desc' | 'rating' | 'sellers'
}

export const emptyChairFilters = (): ChairDirectoryFilters => ({
  query: '',
  category: 'all',
  brand: 'all',
  maxPrice: null,
  condition: 'all',
  minStars: 0,
  sort: 'relevance',
})

const matchesText = (product: ChairCatalogCard, query: string): boolean => {
  const needle = query.trim().toLowerCase()
  if (!needle) return true
  // The directory endpoint sends card-sized rows, so `specs` is absent there and present on the
  // chair page. Both have to search.
  const specs = (product.specs ?? []).map(spec => spec.value).join(' ')
  const haystack = `${product.name} ${product.brand} ${product.model} ${specs}`.toLowerCase()
  return needle.split(/\s+/).every(token => haystack.includes(token))
}

/**
 * Client-side filtering for the directory.
 *
 * Exported and pure so the ranking can be unit-tested: a chair must never disappear because of a
 * filter it actually satisfies (the price filter looks at the cheapest offer, not the median).
 */
export function filterChairProducts(
  products: readonly ChairCatalogCard[],
  filters: ChairDirectoryFilters
): ChairCatalogCard[] {
  const filtered = products.filter(product => {
    if (!matchesText(product, filters.query)) return false
    if (filters.category !== 'all' && product.category !== filters.category) return false
    if (filters.brand !== 'all' && product.brand !== filters.brand) return false
    if (filters.minStars > 0 && (product.stars ?? 0) < filters.minStars) return false
    if (filters.condition !== 'all') {
      // `hasNew`/`hasUsed` come from the API because a card only carries its cheapest offers.
      const wanted =
        filters.condition === 'new'
          ? (product.hasNew ?? product.offers.some(offer => offer.condition === 'new'))
          : (product.hasUsed ??
            product.offers.some(
              offer => offer.condition === 'used' || offer.condition === 'refurbished'
            ))
      if (!wanted) return false
    }
    if (filters.maxPrice !== null) {
      const cheapest = bestChairOffer(product)
      if (!cheapest || cheapest.priceUyu > filters.maxPrice) return false
    }
    return true
  })

  const byPrice = (product: ChairCatalogCard): number =>
    bestChairOffer(product)?.priceUyu ?? Number.POSITIVE_INFINITY

  return filtered.sort((a, b) => {
    switch (filters.sort) {
      case 'price-asc':
        return byPrice(a) - byPrice(b)
      case 'price-desc':
        return byPrice(b) - byPrice(a)
      case 'rating':
        return (b.stars ?? 0) - (a.stars ?? 0) || b.ratingCount - a.ratingCount
      case 'sellers':
        return b.sellers - a.sellers || byPrice(a) - byPrice(b)
      default:
        // Relevance: rated chairs sold by several sellers first, then price.
        return (
          (b.stars ?? 0) * Math.log10(b.ratingCount + 10) -
            (a.stars ?? 0) * Math.log10(a.ratingCount + 10) ||
          b.sellers - a.sellers ||
          byPrice(a) - byPrice(b)
        )
    }
  })
}
