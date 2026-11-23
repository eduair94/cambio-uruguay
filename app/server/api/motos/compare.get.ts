import { MotoCatalogModel } from '../../models/MotoCatalog'
import { MotoCatalogMetaModel } from '../../models/MotoCatalogMeta'
import { connectDb } from '../../utils/db'
import {
  MOTO_COMPARE_MAX,
  MOTO_FRESH_DAYS_FALLBACK,
  MOTO_META_ID,
  MOTO_ROW_PROJECTION,
  motoAssembleComparison,
  motoCompareKeys,
  motoCoverageOf,
  type MotoCompareResponse,
} from '../../../utils/motos'
import type { MotoPublicCatalogMetaDoc, MotoPublicListing } from '../../../utils/motosPublic'

/** Una sola lectura acotada para el comparador, en vez de tres fichas enteras. */
export default defineEventHandler(async (event): Promise<MotoCompareResponse> => {
  const keys = motoCompareKeys(getQuery(event).motos)
  if (!keys.length) return { items: [], missing: [] }
  try {
    await connectDb()
    const [rows, metaDoc] = await Promise.all([
      MotoCatalogModel.find({ key: { $in: keys } })
        .select({ ...MOTO_ROW_PROJECTION, pictures: 0 })
        .limit(MOTO_COMPARE_MAX)
        .maxTimeMS(5_000)
        .lean(),
      MotoCatalogMetaModel.findOne({ key: MOTO_META_ID })
        .select({ _id: 0, key: 1, generatedAt: 1, meta: 1 })
        .maxTimeMS(5_000)
        .lean(),
    ])
    const freshDays =
      motoCoverageOf((metaDoc as unknown as MotoPublicCatalogMetaDoc | null)?.meta ?? null)
        ?.freshDays ?? MOTO_FRESH_DAYS_FALLBACK
    setResponseHeader(event, 'cache-control', 'public, max-age=60, s-maxage=120')
    return motoAssembleComparison(keys, rows as unknown as MotoPublicListing[], freshDays)
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 503, statusMessage: 'Comparación no disponible', cause: error })
  }
})
