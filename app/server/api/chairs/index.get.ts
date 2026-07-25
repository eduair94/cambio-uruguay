import { ChairCatalogMetaModel } from '../../models/ChairCatalogMeta'
import { ChairCatalogProductModel } from '../../models/ChairCatalogProduct'
import { connectDb } from '../../utils/db'
import type { ChairCatalogProduct, ChairCatalogResponse } from '../../../utils/chairCatalog'

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

  try {
    await connectDb()
    const cutoff = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString().slice(0, 10)

    const [meta, rows] = await Promise.all([
      ChairCatalogMetaModel.findOne({ key: 'uy-desk-chairs' })
        .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })
        .lean(),
      ChairCatalogProductModel.find({ lastSeen: { $gte: cutoff } })
        .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0, reviewFingerprint: 0, evidence: 0 })
        .lean(),
    ])

    const products = (rows || []) as unknown as ChairCatalogProduct[]
    if (!products.length) return { ...empty, meta: (meta as any) ?? null }

    const count = <T extends string>(values: T[]): Array<{ value: T; count: number }> => {
      const tally = new Map<T, number>()
      for (const value of values) tally.set(value, (tally.get(value) ?? 0) + 1)
      return [...tally.entries()]
        .map(([value, total]) => ({ value, count: total }))
        .sort((a, b) => b.count - a.count || String(a.value).localeCompare(String(b.value)))
    }

    return {
      meta: (meta as any) ?? null,
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
