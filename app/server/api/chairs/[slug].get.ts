import { ChairCatalogMetaModel } from '../../models/ChairCatalogMeta'
import { ChairCatalogProductModel } from '../../models/ChairCatalogProduct'
import { connectDb } from '../../utils/db'
import type { ChairCatalogMeta, ChairCatalogProduct } from '../../../utils/chairCatalog'

export interface ChairDetailResponse {
  product: ChairCatalogProduct | null
  meta: ChairCatalogMeta | null
  /** Chairs in the same category and price band, for "otras opciones". */
  related: ChairCatalogProduct[]
}

/** One chair: every offer, its price history, the evidence behind its rating. */
export default defineEventHandler(async (event): Promise<ChairDetailResponse> => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=600, s-maxage=600, stale-while-revalidate=86400'
  )
  const slug = String(getRouterParam(event, 'slug') || '').trim()
  if (!slug) return { product: null, meta: null, related: [] }

  try {
    await connectDb()
    const [product, meta] = await Promise.all([
      ChairCatalogProductModel.findOne({ slug })
        .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0, reviewFingerprint: 0 })
        .lean(),
      ChairCatalogMetaModel.findOne({ key: 'uy-desk-chairs' })
        .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })
        .lean(),
    ])
    if (!product) return { product: null, meta: (meta as any) ?? null, related: [] }

    const typed = product as unknown as ChairCatalogProduct
    const median = typed.price?.median ?? 0
    const related = median
      ? ((await ChairCatalogProductModel.find({
          slug: { $ne: slug },
          category: typed.category,
          'price.median': { $gte: Math.round(median * 0.5), $lte: Math.round(median * 1.8) },
        })
          // Card fields only. The related strip renders a photo, a name, a rating and a price;
          // shipping six whole chair documents to draw six cards was most of this response.
          .select({
            _id: 0,
            slug: 1,
            name: 1,
            category: 1,
            stars: 1,
            ratingCount: 1,
            price: 1,
            sellers: 1,
            'images.url': 1,
            'images.alt': 1,
          })
          .sort({ stars: -1, sellers: -1 })
          .limit(6)
          .lean()) as unknown as ChairCatalogProduct[])
      : []

    return { product: typed, meta: (meta as any) ?? null, related }
  } catch {
    return { product: null, meta: null, related: [] }
  }
})
