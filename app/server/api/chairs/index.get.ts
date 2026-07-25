import { ChairCatalogMetaModel } from '../../models/ChairCatalogMeta'
import { ChairCatalogProductModel } from '../../models/ChairCatalogProduct'
import { connectDb } from '../../utils/db'
import type { ChairCatalogCard, ChairCatalogResponse } from '../../../utils/chairCatalog'

/**
 * The desk-chair directory.
 *
 * Returns the whole live catalogue in one payload: it is a few hundred rows, the page filters and
 * sorts them client-side without a round trip per keystroke, and the facets have to be computed
 * over the full set anyway. Chairs whose offers stopped appearing are excluded by `lastSeen` —
 * their documents stay in Mongo so the price history survives, but a dead listing is never shown
 * as if it were on sale today.
 */
const STALE_DAYS = 7

export default defineEventHandler(async (event): Promise<ChairCatalogResponse> => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=600, s-maxage=600, stale-while-revalidate=86400'
  )

  const empty: ChairCatalogResponse = {
    meta: null,
    products: [],
    total: 0,
    facets: { brands: [], categories: [], sellers: [], priceMax: 0 },
  }

  // The tier-list page only needs the headline counts to advertise the directory. Loading a few
  // hundred cards to render three numbers is what pushed that page over its weight budget, so
  // `?summary=1` reads the two fields the counters actually use.
  const summaryOnly = String(getQuery(event).summary ?? '') === '1'

  try {
    await connectDb()
    const cutoff = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString().slice(0, 10)

    if (summaryOnly) {
      const [meta, rows] = await Promise.all([
        ChairCatalogMetaModel.findOne({ key: 'uy-desk-chairs' })
          .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })
          .lean(),
        ChairCatalogProductModel.find({ lastSeen: { $gte: cutoff } })
          .select({ _id: 0, slug: 1, 'offers.sellerKey': 1 })
          .lean(),
      ])

      const counted = (rows || []) as unknown as Array<{ offers: Array<{ sellerKey: string }> }>
      return {
        ...empty,
        meta: (meta
          ? {
              ...meta,
              products: counted.length,
              offers: counted.reduce((sum, product) => sum + product.offers.length, 0),
              sellers: new Set(
                counted.flatMap(product => product.offers.map(offer => offer.sellerKey))
              ).size,
            }
          : null) as any,
        total: counted.length,
      }
    }

    const [meta, rows] = await Promise.all([
      ChairCatalogMetaModel.findOne({ key: 'uy-desk-chairs' })
        .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })
        .lean(),
      // Card-sized rows only. The full document (specs, evidence, quotes, price history) is an
      // order of magnitude larger and belongs to /api/chairs/[slug]; sending it 375 times turned
      // the directory into a megabyte of HTML nobody reads.
      ChairCatalogProductModel.find({ lastSeen: { $gte: cutoff } })
        .select({
          _id: 0,
          slug: 1,
          name: 1,
          brand: 1,
          model: 1,
          category: 1,
          stars: 1,
          ratingCount: 1,
          confidence: 1,
          tier: 1,
          price: 1,
          sellers: 1,
          lastSeen: 1,
          'images.url': 1,
          'images.alt': 1,
          'offers.id': 1,
          'offers.source': 1,
          'offers.sellerKey': 1,
          'offers.seller': 1,
          'offers.url': 1,
          'offers.priceUyu': 1,
          'offers.price': 1,
          'offers.currency': 1,
          'offers.condition': 1,
          'offers.available': 1,
        })
        .lean(),
    ])

    const full = (rows || []) as unknown as ChairCatalogCard[]
    if (!full.length) return { ...empty, meta: (meta as any) ?? null }

    // A chair sold by nine MercadoLibre sellers shipped nine offer rows the card never rendered.
    // Summarise the platforms and the condition flags server-side, then keep only the cheapest
    // offers — enough for the "desde" price and the outbound link. The chair page has the rest.
    const products: ChairCatalogCard[] = full.map(product => {
      const offers = [...product.offers].sort((a, b) => a.priceUyu - b.priceUyu)
      const counts = new Map<string, number>()
      for (const offer of offers) counts.set(offer.source, (counts.get(offer.source) ?? 0) + 1)
      return {
        ...product,
        // The card renders one photo; a chair carries up to six, and they were the single largest
        // contributor to the payload.
        images: product.images.slice(0, 1),
        platforms: [...counts.entries()].map(([source, count]) => ({
          source: source as ChairCatalogCard['offers'][number]['source'],
          count,
        })),
        hasNew: offers.some(offer => offer.condition === 'new'),
        hasUsed: offers.some(
          offer => offer.condition === 'used' || offer.condition === 'refurbished'
        ),
        offers: offers.filter(offer => offer.available).slice(0, 2).length
          ? offers.filter(offer => offer.available).slice(0, 2)
          : offers.slice(0, 2),
      }
    })

    const count = <T extends string>(values: T[]): Array<{ value: T; count: number }> => {
      const tally = new Map<T, number>()
      for (const value of values) tally.set(value, (tally.get(value) ?? 0) + 1)
      return [...tally.entries()]
        .map(([value, total]) => ({ value, count: total }))
        .sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value)))
    }

    // `meta` describes the latest harvest, while the public query deliberately retains healthy
    // rows seen during the seven-day grace window. Keep its source diagnostics and timestamp, but
    // make the headline totals describe the exact rows this response publishes.
    const publishedMeta = meta
      ? {
          ...meta,
          products: products.length,
          offers: full.reduce((sum, product) => sum + product.offers.length, 0),
          sellers: new Set(full.flatMap(product => product.offers.map(offer => offer.sellerKey)))
            .size,
        }
      : null

    return {
      meta: (publishedMeta as any) ?? null,
      products,
      total: products.length,
      facets: {
        brands: count(products.map(product => product.brand).filter(Boolean)).slice(0, 40),
        categories: count(products.map(product => product.category)),
        sellers: count(
          products.flatMap(product => [...new Set(product.offers.map(offer => offer.seller))])
        ).slice(0, 40),
        priceMax: products.reduce((max, product) => Math.max(max, product.price?.max ?? 0), 0),
      },
    }
  } catch {
    return empty
  }
})
