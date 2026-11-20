import { ProductosVidaItemModel } from '../../models/ProductosVidaItem'
import { ProductosVidaMetaModel } from '../../models/ProductosVidaMeta'
import { connectDb } from '../../utils/db'
import {
  PRODUCTOS_VIDA_EMPTY,
  PRODUCTOS_VIDA_META_KEY,
  productosVidaResponse,
  type ProductosVidaItemDoc,
  type ProductosVidaMetaDoc,
  type ProductosVidaResponse,
} from '../../../utils/productosVida'
import { PRODUCTOS_VIDA_SLUGS } from '../../../utils/productosVidaCatalog'

/**
 * Los precios de /productos-que-te-cambian-la-vida-uruguay: la única fuente de datos de la página.
 * Todo lo que decide qué se muestra (el corte de 48 h, `stale`, el «leído el», las ofertas sólo de
 * variantes con banda) vive en `productosVidaResponse`, que es puro y lo usan esta ruta y la vista
 * previa de dev.
 *
 * Mongo: la meta y los ítems del catálogo con `lastSeen` desde hace dos días UTC (prefiltro por el
 * índice `{category, lastSeen}`); el corte fino de 48 h lo hace el armado con `observedAt`, que por
 * eso va en la proyección — sin él, todo ítem fallaría el corte y la página saldría vacía con los
 * tests en verde (la trampa del PR #288). Nunca se seleccionan `history`, `products` ni lo usado, y
 * nunca se lee `productosvidalistings`.
 *
 * Una falla de Mongo devuelve la forma vacía con `unavailable: true` y `no-store`: nunca un 404 ni
 * un 500, y nunca un vacío cacheado que el borde siga sirviendo cuando Mongo vuelve.
 */
export default defineEventHandler(async (event): Promise<ProductosVidaResponse> => {
  // Vista previa en dev: el JSON de `sync_productos_vida.ts --dry-run --json=<archivo>`, por el
  // mismo armado. No conecta a Mongo (el .env local apunta a producción). El build lo saca entero.
  if (import.meta.dev && process.env.PRODUCTOS_VIDA_PREVIEW_FILE) {
    const { readFile } = await import('node:fs/promises')
    const file = JSON.parse(await readFile(process.env.PRODUCTOS_VIDA_PREVIEW_FILE, 'utf8'))
    setResponseHeader(event, 'cache-control', 'no-store')
    // Se lee como recién escrito, para ver la página como la vería alguien a la hora de la corrida.
    const now = (Date.parse(file?.meta?.generatedAt ?? '') || Date.now()) + 60_000
    return productosVidaResponse(file?.meta ?? null, file?.items ?? [], now)
  }

  try {
    await connectDb()
    const nowMs = Date.now()
    const cutoffDay = new Date(nowMs - 2 * 86_400_000).toISOString().slice(0, 10)

    const [meta, items] = await Promise.all([
      ProductosVidaMetaModel.findOne({ key: PRODUCTOS_VIDA_META_KEY })
        .select({ _id: 0, generatedAt: 1, usdUyu: 1, listings: 1 })
        .maxTimeMS(5_000)
        .lean(),
      ProductosVidaItemModel.find({
        category: { $in: [...PRODUCTOS_VIDA_SLUGS] },
        lastSeen: { $gte: cutoffDay },
      })
        .select({
          _id: 0,
          category: 1,
          variant: 1,
          variantLabel: 1,
          variantRank: 1,
          newBand: 1,
          offers: 1,
          lastSeen: 1,
          observedAt: 1,
        })
        .maxTimeMS(5_000)
        .lean(),
    ])

    setResponseHeader(
      event,
      'cache-control',
      'public, max-age=900, s-maxage=900, stale-while-revalidate=86400'
    )
    return productosVidaResponse(
      meta as unknown as ProductosVidaMetaDoc | null,
      items as unknown as ProductosVidaItemDoc[],
      nowMs
    )
  } catch {
    setResponseHeader(event, 'cache-control', 'no-store')
    return { ...PRODUCTOS_VIDA_EMPTY, unavailable: true }
  }
})
