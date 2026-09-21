import { EquiparListingModel } from '../../models/EquiparListing'
import { EquiparMetaModel } from '../../models/EquiparMeta'
import { connectDb } from '../../utils/db'
import {
  EQUIPAR_PRODUCTOS_PROJECTION,
  equiparProductoPublic,
  equiparProductosCutoff,
  equiparProductosMatch,
  equiparProductosSort,
} from '../../utils/equiparProductos'
import {
  EQUIPAR_CONDICION_LABELS,
  EQUIPAR_PRODUCTOS_EMPTY_FACETS,
  EQUIPAR_PRODUCTOS_PER_PAGE,
  EQUIPAR_SOURCE_LABELS,
  equiparProductosNormalize,
  type EquiparProductosFacet,
  type EquiparProductosQuery,
  type EquiparProductosResponse,
} from '../../../utils/equiparProductos'

/**
 * The listing directory behind /equipar-casa-uruguay/productos — the `/api/cars` shape: paginated in
 * Mongo, with each facet counted over the query WITHOUT its own filter, so the panel can say how many
 * rows each option would return alongside everything else the reader already set.
 *
 * `?ids=a,b,c` is the reader's saved list asking "is this still published, and at what price?": it
 * returns exactly those rows, with no freshness window and no filters — a row the prune already
 * removed simply does not come back, which is the answer.
 */
const IDS_MAX = 60
const FACET_MS = 10_000

async function facet(
  match: Record<string, unknown>,
  slugField: string,
  nameField: string,
  limit: number
): Promise<EquiparProductosFacet[]> {
  const rows = await EquiparListingModel.aggregate<{ _id: string; name: string; count: number }>([
    { $match: match },
    { $group: { _id: `$${slugField}`, name: { $first: `$${nameField}` }, count: { $sum: 1 } } },
    { $sort: { count: -1, _id: 1 } },
    { $limit: limit },
  ]).option({ maxTimeMS: FACET_MS })
  return rows
    .filter(row => row._id)
    .map(row => ({ slug: String(row._id), name: String(row.name ?? row._id), count: row.count }))
}

const idsOf = (raw: unknown): string[] => {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string' || !value.trim()) return []
  return [...new Set(value.split(',').map(id => id.trim()).filter(id => /^[\w:.-]{1,120}$/.test(id)))].slice(
    0,
    IDS_MAX
  )
}

export default defineEventHandler(async (event): Promise<EquiparProductosResponse> => {
  const raw = getQuery(event) as Record<string, unknown>
  const query: EquiparProductosQuery = equiparProductosNormalize(raw)
  const ids = idsOf(raw.ids)

  try {
    await connectDb()
    const meta = (await EquiparMetaModel.findOne({ key: 'equipar-casa-uruguay' })
      .select({ _id: 0, generatedAt: 1, usdUyu: 1 })
      .lean()) as { generatedAt?: string; usdUyu?: number } | null
    const generatedAt = meta?.generatedAt ?? null
    const usdUyu = meta?.usdUyu ?? null

    if (ids.length) {
      const rows = await EquiparListingModel.find({ listingId: { $in: ids } })
        .select(EQUIPAR_PRODUCTOS_PROJECTION)
        .maxTimeMS(FACET_MS)
        .lean()
      // The saved list is the reader's own: what it holds must not sit in a shared cache.
      setResponseHeader(event, 'cache-control', 'private, no-store')
      return {
        generatedAt,
        usdUyu,
        total: rows.length,
        page: 1,
        perPage: rows.length,
        items: rows.map(row => equiparProductoPublic(row as Record<string, unknown>)),
        facets: EQUIPAR_PRODUCTOS_EMPTY_FACETS,
        suspect: 0,
      }
    }

    const cutoff = equiparProductosCutoff()
    const match = equiparProductosMatch(query, cutoff)
    const [total, rows, suspect, categorias, variantes, marcas, vendedores, fuentes, condiciones] =
      await Promise.all([
        EquiparListingModel.countDocuments(match).maxTimeMS(FACET_MS),
        EquiparListingModel.find(match)
          .select(EQUIPAR_PRODUCTOS_PROJECTION)
          .sort(equiparProductosSort(query.orden))
          .skip((query.page - 1) * EQUIPAR_PRODUCTOS_PER_PAGE)
          .limit(EQUIPAR_PRODUCTOS_PER_PAGE)
          .maxTimeMS(FACET_MS)
          .lean(),
        EquiparListingModel.countDocuments({ ...match, suspect: true }).maxTimeMS(FACET_MS),
        facet(equiparProductosMatch(query, cutoff, ['categoria', 'variante']), 'category', 'categoryLabel', 40),
        query.categoria
          ? facet(equiparProductosMatch(query, cutoff, ['variante']), 'variant', 'variantLabel', 12)
          : Promise.resolve([]),
        facet(equiparProductosMatch(query, cutoff, ['marca']), 'brandKey', 'brand', 40),
        facet(equiparProductosMatch(query, cutoff, ['vendedor']), 'sellerKey', 'sellerName', 40),
        facet(equiparProductosMatch(query, cutoff, ['fuente']), 'source', 'source', 3),
        facet(equiparProductosMatch(query, cutoff, ['condicion']), 'condition', 'condition', 2),
      ])

    setResponseHeader(event, 'cache-control', 'public, max-age=300, s-maxage=300')
    return {
      generatedAt,
      usdUyu,
      total,
      page: query.page,
      perPage: EQUIPAR_PRODUCTOS_PER_PAGE,
      items: rows.map(row => equiparProductoPublic(row as Record<string, unknown>)),
      facets: {
        categorias,
        variantes,
        marcas,
        vendedores,
        // Stored values are `store`/`new`; the query speaks `tienda`/`nuevo`. The facet's slug is
        // what the panel sends back, so it is translated here, once.
        fuentes: fuentes
          .filter(row => row.slug in EQUIPAR_SOURCE_LABELS)
          .map(row => ({
            slug: row.slug === 'store' ? 'tienda' : row.slug,
            name: EQUIPAR_SOURCE_LABELS[row.slug as keyof typeof EQUIPAR_SOURCE_LABELS],
            count: row.count,
          })),
        condiciones: condiciones
          .filter(row => row.slug === 'new' || row.slug === 'used')
          .map(row => ({
            slug: row.slug === 'used' ? 'usado' : 'nuevo',
            name: EQUIPAR_CONDICION_LABELS[row.slug === 'used' ? 'usado' : 'nuevo'],
            count: row.count,
          })),
      },
      suspect,
    }
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'El directorio de avisos se está actualizando',
      cause: error,
    })
  }
})
