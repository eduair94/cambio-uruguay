import { EquiparItemModel } from '../../models/EquiparItem'
import { EquiparMetaModel } from '../../models/EquiparMeta'
import { connectDb } from '../../utils/db'
import { pricewatchHistory } from '../../utils/priceHistory'
import { isEquiparCategorySlug } from '../../../utils/equiparCategoryPages'
import {
  equiparCategoryProjection,
  equiparSortItems,
  type EquiparCategoryResponse,
  type EquiparItemDoc,
  type EquiparMetaDoc,
} from '../../../utils/equipar'

/**
 * One category's rows for `/equipar-casa-uruguay/<categoria>` (Task 8): every variant of that
 * category, with the daily price history the index endpoint (`./index.get.ts`) deliberately drops —
 * that one is under a hundred rows read on every load and a year of history per row would multiply
 * it for nothing; this one is a single category read on demand, so the chart can afford it.
 *
 * The 404 for an unknown slug runs BEFORE the database call and before the cache header: a category
 * that never existed should never touch Mongo, and it must not be swallowed by the `catch` below,
 * which only guards the DB read. The page's own `definePageMeta.validate` checks
 * `isEquiparCategorySlug` directly (Task 8) — this check is the same list, for whoever calls the API
 * without going through the page.
 */
const STALE_DAYS = 4

/**
 * Le pega a cada oferta mostrada su propia variación de precio. Lo mismo que hace el directorio de
 * `/equipar-casa-uruguay/productos`, para las tarjetas de producto: un `$in` por tandas contra el
 * índice único de `pricewatchoffers`, y si la lectura falla la página sale igual, sin variación.
 *
 * Facebook Marketplace nunca entra a `pricewatchoffers` (ver `classes/pricewatch/record.ts`), así que
 * sus ofertas simplemente no encuentran serie.
 */
async function attachOfferHistory<T extends { offers: any[]; products?: { offers: any[] }[] }>(
  items: T[]
): Promise<T[]> {
  const ids: string[] = []
  for (const item of items) {
    for (const offer of item.offers ?? []) if (offer?.listingId) ids.push(offer.listingId)
    for (const product of item.products ?? [])
      for (const offer of product.offers ?? []) if (offer?.listingId) ids.push(offer.listingId)
  }
  if (!ids.length) return items
  const history = await pricewatchHistory(ids).catch(() => new Map())
  if (!history.size) return items
  const withSeries = (offer: any) =>
    offer?.listingId && history.has(offer.listingId)
      ? { ...offer, priceHistory: history.get(offer.listingId) }
      : offer
  return items.map(item => ({
    ...item,
    offers: (item.offers ?? []).map(withSeries),
    ...(item.products
      ? { products: item.products.map(p => ({ ...p, offers: (p.offers ?? []).map(withSeries) })) }
      : {}),
  }))
}

export default defineEventHandler(async (event): Promise<EquiparCategoryResponse> => {
  const slug = String(getRouterParam(event, 'categoria') || '')
  if (!isEquiparCategorySlug(slug)) {
    throw createError({ statusCode: 404, statusMessage: 'Categoría no encontrada' })
  }

  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=900, s-maxage=900, stale-while-revalidate=86400'
  )

  try {
    await connectDb()
    const cutoff = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString().slice(0, 10)

    const [meta, rows] = await Promise.all([
      EquiparMetaModel.findOne({ key: 'equipar-casa-uruguay' })
        .select({ generatedAt: 1, usdUyu: 1, runs: 1 })
        .lean(),
      EquiparItemModel.find({ category: slug, lastSeen: { $gte: cutoff } })
        .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })
        .lean(),
    ])

    const metaDoc = meta as unknown as Pick<
      EquiparMetaDoc,
      'generatedAt' | 'usdUyu' | 'runs'
    > | null

    return {
      category: slug,
      generatedAt: metaDoc?.generatedAt ?? null,
      usdUyu: metaDoc?.usdUyu ?? null,
      sources: (metaDoc?.runs ?? []).map(run => ({
        label: run.label,
        ok: run.ok,
        listings: run.listings,
      })),
      // Sorted the same way as the index endpoint, then trimmed for payload.
      items: await attachOfferHistory(
        equiparCategoryProjection(equiparSortItems((rows as unknown as EquiparItemDoc[]) ?? []))
      ),
    }
  } catch {
    // A database hiccup renders the page's empty state, never a 500.
    return { category: slug, generatedAt: null, usdUyu: null, sources: [], items: [] }
  }
})
