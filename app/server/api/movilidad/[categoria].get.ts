import { MovilidadItemModel } from '../../models/MovilidadItem'
import { MovilidadMetaModel } from '../../models/MovilidadMeta'
import { MovilidadListingModel } from '../../models/MovilidadListing'
import { MovilidadSpecSnapshotModel } from '../../models/MovilidadSpecSnapshot'
import { monopatinSpecsPublic } from '../../../utils/monopatinFicha'
import { connectDb } from '../../utils/db'
import { pricewatchHistory } from '../../utils/priceHistory'
import {
  MOVILIDAD_META_KEY,
  isMovilidadCategorySlug,
  movilidadCategoryProjection,
  movilidadSortItems,
  type MovilidadCategoryResponse,
  type MovilidadItemDoc,
  type MovilidadRunDoc,
  type MonopatinSpecStats,
} from '../../../utils/movilidad'

/**
 * One category's rows for `/monopatines-electricos-uruguay` or `/bicicletas-electricas-uruguay`
 * (Task 5): only `monopatin-electrico` and `bicicleta-electrica` exist (`classes/movilidad/
 * registry.ts`) — anything else 404s BEFORE the database call, same pattern as `/api/equipar/
 * <categoria>`.
 *
 * Cache is 600 s on success: shorter than equipar's 900 s on purpose — this catalogue is smaller
 * (two categories, harvested from four dedicated stores plus the shared ones) and the pages lean
 * harder on "how many offers, since when", so a slightly fresher number costs little.
 *
 * `history` is never selected out of Mongo: neither page draws a price chart, so there is nothing
 * downstream that would use it, and skipping it at the database keeps the payload to what the
 * pages actually render.
 *
 * A database hiccup returns the empty shape with `cache-control: no-store` — never a 404 and never
 * a cached error: the CDN must not keep serving an empty page once Mongo recovers.
 */
const STALE_DAYS = 4

/** Igual que en `/api/equipar/<categoria>`: la variación del propio aviso, por oferta mostrada. */
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

/**
 * Sólo monopatín: la ficha técnica de cada modelo (la primera de sus ofertas que tenga ficha propia
 * leída) y las medianas por tipo del snapshot de currency-movilidad-specs. Un `$in` acotado a las
 * ofertas que la página muestra, contra el índice único de `listingId`: no agrega sobre la colección.
 * Si algo falla, la página sale igual sin ficha.
 */
async function attachMonopatinSpecs<T extends { products?: { offers: any[] }[] }>(
  items: T[]
): Promise<{ items: T[]; specStats: MonopatinSpecStats | null }> {
  const ids = items.flatMap(item =>
    (item.products ?? []).flatMap(product =>
      (product.offers ?? []).map(offer => offer?.listingId).filter(Boolean)
    )
  )
  const [rows, snapshot] = await Promise.all([
    ids.length
      ? MovilidadListingModel.find({ listingId: { $in: ids } })
          .select({ _id: 0, listingId: 1, specs: 1 })
          .maxTimeMS(5_000)
          .lean()
          .catch(() => [])
      : Promise.resolve([]),
    MovilidadSpecSnapshotModel.findOne({ key: 'monopatin-electrico' })
      .select({ _id: 0, stats: 1 })
      .maxTimeMS(5_000)
      .lean()
      .catch(() => null),
  ])
  const byId = new Map<string, ReturnType<typeof monopatinSpecsPublic>>()
  for (const row of rows as Array<{ listingId: string; specs?: unknown }>) {
    const specs = monopatinSpecsPublic(row.specs)
    if (specs?.fromFicha) byId.set(row.listingId, specs)
  }
  return {
    specStats: ((snapshot as { stats?: MonopatinSpecStats } | null)?.stats ?? null) || null,
    items: items.map(item =>
      item.products
        ? {
            ...item,
            products: item.products.map(product => {
              const found = (product.offers ?? [])
                .map(offer => byId.get(offer?.listingId))
                .find(Boolean)
              return found ? { ...product, specs: found } : product
            }),
          }
        : item
    ),
  }
}

export default defineEventHandler(async (event): Promise<MovilidadCategoryResponse> => {
  const slug = String(getRouterParam(event, 'categoria') || '')
  if (!isMovilidadCategorySlug(slug)) {
    throw createError({ statusCode: 404, statusMessage: 'Categoría no encontrada' })
  }

  try {
    await connectDb()
    const cutoff = new Date(Date.now() - STALE_DAYS * 86_400_000).toISOString().slice(0, 10)

    const [meta, rows] = await Promise.all([
      MovilidadMetaModel.findOne({ key: MOVILIDAD_META_KEY })
        .select({ generatedAt: 1, usdUyu: 1, runs: 1 })
        .lean(),
      MovilidadItemModel.find({ category: slug, lastSeen: { $gte: cutoff } })
        .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0, history: 0 })
        .lean(),
    ])

    const metaDoc = meta as unknown as {
      generatedAt?: string
      usdUyu?: number
      runs?: MovilidadRunDoc[]
    } | null

    setResponseHeader(
      event,
      'cache-control',
      'public, max-age=600, s-maxage=600, stale-while-revalidate=86400'
    )

    const items = await attachOfferHistory(
      movilidadCategoryProjection(movilidadSortItems((rows as unknown as MovilidadItemDoc[]) ?? []))
    )
    const withSpecs =
      slug === 'monopatin-electrico'
        ? await attachMonopatinSpecs(items)
        : { items, specStats: null }

    return {
      category: slug,
      generatedAt: metaDoc?.generatedAt ?? null,
      usdUyu: metaDoc?.usdUyu ?? null,
      sources: (metaDoc?.runs ?? []).map(run => ({
        label: run.label,
        ok: run.ok,
        listings: run.listings,
      })),
      items: withSpecs.items,
      ...(slug === 'monopatin-electrico' ? { specStats: withSpecs.specStats } : {}),
    }
  } catch {
    setResponseHeader(event, 'cache-control', 'no-store')
    return { category: slug, generatedAt: null, usdUyu: null, sources: [], items: [] }
  }
})
