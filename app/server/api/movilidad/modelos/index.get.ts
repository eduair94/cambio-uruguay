import { MovilidadModelModel } from '../../../models/MovilidadModel'
import { connectDb } from '../../../utils/db'
import {
  monopatinModelFreshFloor,
  monopatinModelSummary,
  type MonopatinModelDoc,
  type MonopatinModelListResponse,
} from '../../../../utils/monopatinModelos'

/**
 * Todos los modelos de monopatín frescos, resumidos: la tabla de modelos de
 * /monopatines-electricos-uruguay y el selector del comparador. Sin ofertas ni serie: la tabla sólo
 * necesita el "desde", los vendedores y la ficha. Los de más vendedores primero.
 *
 * Sin modelos todavía (antes de la primera corrida) responde una lista vacía y el hub cae a la tabla
 * vieja; la base caída es 503 sin caché.
 */
export default defineEventHandler(async (event): Promise<MonopatinModelListResponse> => {
  const floor = monopatinModelFreshFloor(new Date().toISOString().slice(0, 10))
  let docs: MonopatinModelDoc[]
  try {
    await connectDb()
    docs = (await MovilidadModelModel.find({ lastSeen: { $gte: floor } })
      .select({
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
        generatedAt: 1,
        'specs.values': 1,
      })
      .maxTimeMS(5000)
      .lean()) as unknown as MonopatinModelDoc[]
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({ statusCode: 503, statusMessage: 'Modelos no disponibles por ahora', cause: error })
  }

  setResponseHeader(event, 'cache-control', 'public, max-age=900, s-maxage=900, stale-while-revalidate=86400')
  const models = docs
    .map(monopatinModelSummary)
    .sort((a, b) => b.sellers - a.sellers || b.listings - a.listings || a.slug.localeCompare(b.slug))
  const generatedAt = docs.map(doc => doc.generatedAt).sort().at(-1) ?? null
  return { generatedAt, models }
})
