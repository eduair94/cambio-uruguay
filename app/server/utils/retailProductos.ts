import type { Model } from 'mongoose'
import { connectDb } from './db'
import { pricewatchHistory } from './priceHistory'
import {
  EQUIPAR_PRODUCTOS_PROJECTION,
  equiparProductoPublic,
  equiparProductosCutoff,
  equiparProductosMatch,
  equiparProductosSort,
} from './equiparProductos'
import {
  EQUIPAR_CONDICION_LABELS,
  EQUIPAR_PRODUCTOS_EMPTY_FACETS,
  EQUIPAR_PRODUCTOS_PER_PAGE,
  EQUIPAR_SOURCE_LABELS,
  equiparProductosNormalize,
  type EquiparProductosFacet,
  type RetailProductosVertical,
  type EquiparProductoPublic,
  type EquiparProductosQuery,
  type EquiparProductosResponse,
} from '../../utils/equiparProductos'

/**
 * El cuerpo compartido de los dos directorios de avisos: `/api/equipar/productos` y
 * `/api/movilidad/productos`.
 *
 * Las dos colecciones (`equiparlistings`, `movilidadlistings`) guardan la MISMA fila —
 * `buildEquiparListings` devuelve `EquiparListingRow` sea cual sea el registro inyectado — y las
 * dos páginas piden lo mismo: una página de filas, cada faceta contada sobre la consulta SIN su
 * propio filtro, y el conteo de sospechosos que quedaron afuera. Lo único que cambia es de qué
 * colección salen las filas y de qué documento sale la fecha de la corrida, así que eso se inyecta
 * y el resto se comparte: un arreglo en la paginación o en una faceta vale para las dos.
 */
const IDS_MAX = 60
const FACET_MS = 10_000

export interface RetailProductosSource {
  /** La colección de avisos. Su forma es `EquiparListingRow` en las dos verticales. */
  model: Model<any>
  /** La fecha de la última corrida y la cotización con la que se convirtieron los dólares. */
  loadMeta: () => Promise<{ generatedAt: string | null; usdUyu: number | null }>
  /** Segundos de caché de borde en una respuesta buena. */
  maxAge?: number
  /**
   * Contra qué vocabulario se valida `?categoria=`. Sin esto, el normalizador la validaba siempre
   * contra el de equipar y una categoría de movilidad se caía en silencio: el directorio de
   * monopatines servía también las bicicletas (medido en producción el 22/9/2026).
   */
  vertical?: RetailProductosVertical
}

const idsOf = (raw: unknown): string[] => {
  const value = Array.isArray(raw) ? raw[0] : raw
  if (typeof value !== 'string' || !value.trim()) return []
  return [
    ...new Set(
      value
        .split(',')
        .map(id => id.trim())
        .filter(id => /^[\w:.-]{1,120}$/.test(id))
    ),
  ].slice(0, IDS_MAX)
}

async function facet(
  model: Model<any>,
  match: Record<string, unknown>,
  slugField: string,
  nameField: string,
  limit: number
): Promise<EquiparProductosFacet[]> {
  const rows = await model
    .aggregate<{
      _id: string
      name: string
      count: number
    }>([
      { $match: match },
      { $group: { _id: `$${slugField}`, name: { $first: `$${nameField}` }, count: { $sum: 1 } } },
      { $sort: { count: -1, _id: 1 } },
      { $limit: limit },
    ])
    .option({ maxTimeMS: FACET_MS })
  return rows
    .filter(row => row._id)
    .map(row => ({ slug: String(row._id), name: String(row.name ?? row._id), count: row.count }))
}

/**
 * Le pega a cada fila su propia variación de precio. Es un `$in` de como mucho una página de ids
 * contra el índice único de `pricewatchoffers`: no agrega sobre la colección, así que va en vivo. Si
 * la lectura falla, las filas salen igual y sin variación.
 */
async function withHistory(items: EquiparProductoPublic[]): Promise<EquiparProductoPublic[]> {
  if (!items.length) return items
  const history = await pricewatchHistory(items.map(item => item.listingId)).catch(() => new Map())
  if (!history.size) return items
  return items.map(item =>
    history.has(item.listingId) ? { ...item, priceHistory: history.get(item.listingId)! } : item
  )
}

export async function retailProductosResponse(
  event: any,
  raw: Record<string, unknown>,
  source: RetailProductosSource
): Promise<EquiparProductosResponse> {
  const { model, loadMeta, maxAge = 300, vertical = 'equipar' } = source
  const query: EquiparProductosQuery = equiparProductosNormalize(raw, vertical)
  const ids = idsOf(raw.ids)

  try {
    await connectDb()
    const { generatedAt, usdUyu } = await loadMeta()

    if (ids.length) {
      const rows = await model
        .find({ listingId: { $in: ids } })
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
        items: await withHistory(
          rows.map((row: unknown) => equiparProductoPublic(row as Record<string, unknown>))
        ),
        facets: EQUIPAR_PRODUCTOS_EMPTY_FACETS,
        suspect: 0,
      }
    }

    const cutoff = equiparProductosCutoff()
    const match = equiparProductosMatch(query, cutoff)
    const [total, rows, suspect, categorias, variantes, marcas, vendedores, fuentes, condiciones] =
      await Promise.all([
        model.countDocuments(match).maxTimeMS(FACET_MS),
        model
          .find(match)
          .select(EQUIPAR_PRODUCTOS_PROJECTION)
          .sort(equiparProductosSort(query.orden))
          .skip((query.page - 1) * EQUIPAR_PRODUCTOS_PER_PAGE)
          .limit(EQUIPAR_PRODUCTOS_PER_PAGE)
          .maxTimeMS(FACET_MS)
          .lean(),
        model.countDocuments({ ...match, suspect: true }).maxTimeMS(FACET_MS),
        facet(
          model,
          equiparProductosMatch(query, cutoff, ['categoria', 'variante']),
          'category',
          'categoryLabel',
          40
        ),
        query.categoria
          ? facet(
              model,
              equiparProductosMatch(query, cutoff, ['variante']),
              'variant',
              'variantLabel',
              12
            )
          : Promise.resolve([]),
        facet(model, equiparProductosMatch(query, cutoff, ['marca']), 'brandKey', 'brand', 40),
        facet(
          model,
          equiparProductosMatch(query, cutoff, ['vendedor']),
          'sellerKey',
          'sellerName',
          40
        ),
        facet(model, equiparProductosMatch(query, cutoff, ['fuente']), 'source', 'source', 3),
        facet(
          model,
          equiparProductosMatch(query, cutoff, ['condicion']),
          'condition',
          'condition',
          2
        ),
      ])

    setResponseHeader(event, 'cache-control', `public, max-age=${maxAge}, s-maxage=${maxAge}`)
    return {
      generatedAt,
      usdUyu,
      total,
      page: query.page,
      perPage: EQUIPAR_PRODUCTOS_PER_PAGE,
      items: await withHistory(
        rows.map((row: unknown) => equiparProductoPublic(row as Record<string, unknown>))
      ),
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
}
