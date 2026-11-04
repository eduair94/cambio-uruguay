import { MovilidadModelModel } from '../../../models/MovilidadModel'
import { connectDb } from '../../../utils/db'
import {
  movilidadModelCategoria,
  movilidadModelCategoryFilter,
} from '../../../../utils/movilidadModelos'
import {
  MONOPATIN_MODEL_SLUG_RE,
  monopatinModelFreshFloor,
  monopatinModelSiblings,
  monopatinModelSummary,
  type MonopatinModelDetailResponse,
  type MonopatinModelDoc,
} from '../../../../utils/monopatinModelos'

/**
 * Un modelo para /monopatines-electricos-uruguay/<modelo> o, con `?categoria=bicicleta-electrica`,
 * para /bicicletas-electricas-uruguay/<modelo>: el documento que dejó
 * currency-movilidad-specs (classes/movilidad/models/) y hasta cuatro modelos del mismo tipo con el
 * precio más parecido. Sólo lee.
 *
 * Mismo contrato que `/api/phones/<modelo>`: un slug que nunca podría existir es 404 sin tocar la
 * base; la base caída es 503 sin caché (nunca un falso "no existe" cacheado); un modelo sin avisos
 * vistos en una semana es 404 — la página no publica un precio viejo como si fuera de hoy.
 */
const SUMMARY_PROJECTION = {
  _id: 0,
  slug: 1,
  name: 1,
  brandLabel: 1,
  modelLabel: 1,
  variant: 1,
  image: 1,
  newBand: 1,
  usedBand: 1,
  sellers: 1,
  listings: 1,
  indexable: 1,
  'specs.values': 1,
} as const

export default defineEventHandler(async (event): Promise<MonopatinModelDetailResponse> => {
  const slug = String(getRouterParam(event, 'slug') || '')
  if (!MONOPATIN_MODEL_SLUG_RE.test(slug)) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 404, statusMessage: 'Modelo no encontrado' })
  }

  const floor = monopatinModelFreshFloor(new Date().toISOString().slice(0, 10))
  // Un slug de bici pedido desde la página de monopatines (o al revés) es 404: cada página publica
  // sólo los modelos de su categoría.
  const byCategory = movilidadModelCategoryFilter(
    movilidadModelCategoria(getQuery(event).categoria)
  )
  let model: MonopatinModelDoc | null
  let others: MonopatinModelDoc[] = []
  try {
    await connectDb()
    model = (await MovilidadModelModel.findOne({ ...byCategory, slug, lastSeen: { $gte: floor } })
      .select({ _id: 0, history: 0, createdAt: 0, updatedAt: 0 })
      .maxTimeMS(5000)
      .lean()) as unknown as MonopatinModelDoc | null
    if (model) {
      others = (await MovilidadModelModel.find({
        ...byCategory,
        variant: model.variant,
        slug: { $ne: slug },
        lastSeen: { $gte: floor },
        retired: { $ne: true },
      })
        .select(SUMMARY_PROJECTION)
        .maxTimeMS(5000)
        .lean()) as unknown as MonopatinModelDoc[]
    }
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Modelo no disponible por ahora',
      cause: error,
    })
  }

  if (!model) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 404, statusMessage: 'Modelo no encontrado' })
  }

  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=900, s-maxage=900, stale-while-revalidate=86400'
  )
  return {
    generatedAt: model.generatedAt,
    model: { ...model, history: [] },
    siblings: monopatinModelSiblings(
      monopatinModelSummary(model),
      others.map(monopatinModelSummary)
    ),
  }
})
