import { MotoCatalogModel } from '../../models/MotoCatalog'
import { MotoCatalogMetaModel } from '../../models/MotoCatalogMeta'
import { MotoMarketSnapshotModel } from '../../models/MotoMarketSnapshot'
import { connectDb } from '../../utils/db'
import {
  MOTO_FRESH_DAYS_FALLBACK,
  MOTO_META_ID,
  MOTO_ROW_PROJECTION,
  motoCoverageOf,
  motoFreshFloor,
  motoKeyValid,
  type MotoDetailResponse,
} from '../../../utils/motos'
import type {
  MotoPublicCatalogMetaDoc,
  MotoPublicListing,
  MotoPublicModel,
  MotoPublicModelDoc,
} from '../../../utils/motosPublic'

/** Cuántos avisos del modelo viajan a la ficha. La banda y la depreciación las publica el job sobre
 * TODOS los avisos del modelo; esta lista es para mirar los baratos, no para recalcular nada. */
const MOTO_DETAIL_LISTINGS = 40

/**
 * La ficha de un modelo para `/motos-usadas-uruguay/<marca>-<modelo>`.
 *
 * La ficha sale de `motomarketsnapshots` (la banda del modelo, el desglose por año y por cilindrada
 * y la depreciación, todo calculado por el job) y los avisos de `motocatalog`. Los dos lados se
 * cruzan por `brandSlug` + `modelSlug` + propulsión, que es exactamente como el job agrupó: una
 * línea ELÉCTRICA es una ficha aparte (`yumbo-gs-electrica`), así que traerle los avisos de nafta
 * del mismo nombre mezclaría los dos mercados que el job separó a propósito.
 *
 * Qué es cada código de error, que no es lo mismo:
 *   Un slug mal formado —o la `key` reservada del informe— 404ea ANTES de tocar la base: una
 *     forma que no puede coincidir con ninguna ficha no debería gastar una ida a Mongo.
 *   Un fallo de base es 503 con `no-store`, NUNCA un 404: un negativo falso cacheado saca la
 *     ficha del índice y no vuelve solo.
 *   Sólo un slug bien formado sin documento es un 404 de verdad, y tampoco se cachea: el catálogo
 *     se publica todos los días y la ficha que hoy no existe mañana puede existir.
 */
export default defineEventHandler(async (event): Promise<MotoDetailResponse> => {
  const key = String(getRouterParam(event, 'key') || '')
  if (!motoKeyValid(key)) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 404, statusMessage: 'Modelo no encontrado' })
  }

  let model: MotoPublicModel | null
  let metaDoc: MotoPublicCatalogMetaDoc | null
  try {
    await connectDb()
    const [snapshot, meta] = await Promise.all([
      MotoMarketSnapshotModel.findOne({ key })
        .select({ _id: 0, key: 1, generatedAt: 1, snapshot: 1 })
        .lean(),
      MotoCatalogMetaModel.findOne({ key: MOTO_META_ID })
        .select({ _id: 0, key: 1, generatedAt: 1, meta: 1 })
        .lean(),
    ])
    const doc = snapshot as unknown as MotoPublicModelDoc | null
    // Un documento de esta colección que no trae `brandSlug` es el informe, no un modelo: se trata
    // como "no existe" en vez de servir una forma distinta bajo el mismo tipo.
    model = doc?.snapshot?.brandSlug ? doc.snapshot : null
    metaDoc = meta as unknown as MotoPublicCatalogMetaDoc | null
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'La ficha no está disponible por ahora',
      cause: error,
    })
  }

  if (!model) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 404, statusMessage: 'Modelo no encontrado' })
  }

  const coverage = motoCoverageOf(metaDoc?.meta ?? null)
  const freshDays = coverage?.freshDays ?? MOTO_FRESH_DAYS_FALLBACK
  const today = new Date().toISOString().slice(0, 10)
  const floor = motoFreshFloor(today, freshDays)
  // La propulsión parte los avisos igual que partió las fichas: `fuel: 'electrica'` de un lado,
  // todo lo demás del otro. `$ne` y no una lista cerrada de combustibles, para que un combustible
  // nuevo del origen caiga con las de combustión en vez de desaparecer de las dos fichas.
  const fuelMatch =
    model.propulsion === 'electrica' ? { fuel: 'electrica' } : { fuel: { $ne: 'electrica' } }
  const listingMatch: Record<string, unknown> = {
    brandSlug: model.brandSlug,
    modelSlug: model.modelSlug,
    ...fuelMatch,
    ...(floor ? { lastSeen: { $gte: floor } } : {}),
  }

  let listings: MotoPublicListing[] = []
  let listingsTotal = 0
  let siblings: MotoDetailResponse['siblings'] = []
  try {
    const [rows, count, brandDocs] = await Promise.all([
      MotoCatalogModel.find(listingMatch)
        .select(MOTO_ROW_PROJECTION)
        .sort({ priceUsd: 1, year: -1 })
        .limit(MOTO_DETAIL_LISTINGS)
        .maxTimeMS(10_000)
        .lean(),
      MotoCatalogModel.countDocuments(listingMatch).maxTimeMS(10_000),
      // Los otros modelos de la marca salen de las FICHAS PUBLICADAS y no de `meta.models`, aunque
      // la meta ya los traiga contados: la meta los lista por `marketSlug` y la ficha de una línea
      // eléctrica vive en `<marketSlug>-electrica`, así que enlazar desde la meta 404earía justo
      // en los modelos que el job separó por propulsión.
      MotoMarketSnapshotModel.find({ 'snapshot.brandSlug': model.brandSlug, key: { $ne: key } })
        .select({ _id: 0, key: 1, snapshot: 1 })
        .limit(40)
        .maxTimeMS(10_000)
        .lean(),
    ])
    listings = (rows ?? []) as unknown as MotoPublicListing[]
    listingsTotal = count
    siblings = ((brandDocs ?? []) as unknown as MotoPublicModelDoc[])
      .filter(doc => doc.snapshot?.brandSlug)
      .map(doc => ({
        slug: doc.key,
        brand: doc.snapshot.brand,
        model: doc.snapshot.model,
        listings: doc.snapshot.listings ?? 0,
      }))
      .sort((a, b) => b.listings - a.listings || a.model.localeCompare(b.model, 'es'))
      .slice(0, 12)
  } catch {
    // Los avisos son el acompañamiento de la ficha, no la ficha: si esta consulta falla se publica
    // la banda igual y la página dice que no pudo traer los avisos. Degradar no es fallar.
    listings = []
    listingsTotal = 0
    siblings = []
  }

  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=600, s-maxage=600, stale-while-revalidate=86400'
  )
  return {
    status: 'ok',
    generatedAt: model.generatedAt || (coverage?.generatedAt ?? ''),
    model,
    listings,
    listingsTotal,
    siblings,
    coverage,
  }
})
