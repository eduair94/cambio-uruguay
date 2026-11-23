import { MotoCatalogModel } from '../../../models/MotoCatalog'
import { MotoCatalogMetaModel } from '../../../models/MotoCatalogMeta'
import { MotoMarketSnapshotModel } from '../../../models/MotoMarketSnapshot'
import { connectDb } from '../../../utils/db'
import { motoHistory } from '../../../utils/priceHistory'
import {
  MOTO_FRESH_DAYS_FALLBACK,
  MOTO_META_ID,
  MOTO_ROW_PROJECTION,
  motoAvisoKeyValid,
  motoCoverageOf,
  motoFichaSlug,
  motoFreshFloor,
  type MotoAvisoResponse,
} from '../../../../utils/motos'
import type {
  MotoPublicCatalogMetaDoc,
  MotoPublicListing,
  MotoPublicModelDoc,
} from '../../../../utils/motosPublic'

/** Cuántas parecidas viajan con la ficha. */
const MOTO_SIMILAR = 8

/**
 * La ficha de UN aviso para `/motos-usadas-uruguay/aviso/<key>`.
 *
 * Los mismos tres códigos que la ficha de autos y la del modelo, por las mismas razones: una clave
 * con forma imposible 404ea antes de tocar la base; un fallo de base es 503 con `no-store` (un 404
 * cacheado sacaría la ficha del índice de los navegadores); y sólo una clave bien formada que no
 * está en el catálogo es un 404 de verdad.
 *
 * La ficha del modelo, las parecidas y la historia de precio son opcionales: una lectura lenta de
 * cualquiera de ellas nunca esconde el aviso.
 */
export default defineEventHandler(async (event): Promise<MotoAvisoResponse> => {
  const key = String(getRouterParam(event, 'key') || '')
  if (!motoAvisoKeyValid(key))
    throw createError({ statusCode: 404, statusMessage: 'Aviso no encontrado' })
  let moto: MotoPublicListing | null
  let freshDays: number
  let generatedAt: string
  try {
    await connectDb()
    const [row, metaDoc] = await Promise.all([
      MotoCatalogModel.findOne({ key }).select(MOTO_ROW_PROJECTION).maxTimeMS(5_000).lean(),
      MotoCatalogMetaModel.findOne({ key: MOTO_META_ID })
        .select({ _id: 0, key: 1, generatedAt: 1, meta: 1 })
        .maxTimeMS(5_000)
        .lean(),
    ])
    moto = (row as unknown as MotoPublicListing | null) ?? null
    const coverage = motoCoverageOf(
      (metaDoc as unknown as MotoPublicCatalogMetaDoc | null)?.meta ?? null
    )
    freshDays = coverage?.freshDays ?? MOTO_FRESH_DAYS_FALLBACK
    generatedAt = coverage?.generatedAt ?? ''
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Aviso no disponible por ahora',
      cause: error,
    })
  }
  if (!moto) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 404, statusMessage: 'Aviso no encontrado' })
  }

  const today = new Date().toISOString().slice(0, 10)
  const floor = motoFreshFloor(today, freshDays)
  const subject = moto
  const [modelDoc, similarRows, priceHistory] = await Promise.all([
    MotoMarketSnapshotModel.findOne({ key: motoFichaSlug(subject) })
      .select({ _id: 0, key: 1, generatedAt: 1, snapshot: 1 })
      .maxTimeMS(3_000)
      .lean()
      .catch(() => null),
    MotoCatalogModel.find({
      marketSlug: subject.marketSlug,
      key: { $ne: subject.key },
      // Una eléctrica sólo se parece a otra eléctrica: son dos mercados (ver la ficha del modelo).
      fuel: subject.fuel === 'electrica' ? 'electrica' : { $ne: 'electrica' },
      ...(floor ? { lastSeen: { $gte: floor } } : {}),
    })
      .select({ ...MOTO_ROW_PROJECTION, pictures: 0 })
      .limit(40)
      .maxTimeMS(3_000)
      .lean()
      .catch(() => []),
    motoHistory(key).catch(() => null),
  ])
  const model = (modelDoc as unknown as MotoPublicModelDoc | null)?.snapshot ?? null
  const similar = ((similarRows ?? []) as unknown as MotoPublicListing[])
    // Las de año más parecido primero; a igual distancia, la más barata.
    .sort(
      (a, b) =>
        Math.abs(a.year - subject.year) - Math.abs(b.year - subject.year) ||
        a.priceUsd - b.priceUsd ||
        a.key.localeCompare(b.key)
    )
    .slice(0, MOTO_SIMILAR)

  setResponseHeader(event, 'cache-control', 'public, max-age=60, s-maxage=120')
  return {
    moto: subject,
    model,
    yearBand: model?.years?.find(band => band.year === subject.year) ?? null,
    similar,
    priceHistory,
    generatedAt,
  }
})
