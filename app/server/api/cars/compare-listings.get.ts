import { assembleCarComparison, carComparisonKeys } from '../../../utils/carComparison'
import { CarCatalogModel } from '../../models/CarCatalog'
import { carFichaProjection, loadCarCatalogMeta, publicCarRow } from '../../utils/cars'
import { connectDb } from '../../utils/db'

/** One bounded read instead of three full detail requests (history, cohort, insight, etc.). */
export default defineEventHandler(async event => {
  const keys = carComparisonKeys(getQuery(event).autos)
  if (!keys.length) return { items: [], missing: [] }
  try {
    await connectDb()
    const [rows, meta] = await Promise.all([
      CarCatalogModel.find({ key: { $in: keys } })
        .select(carFichaProjection)
        .limit(3)
        .maxTimeMS(5_000)
        .lean(),
      loadCarCatalogMeta(),
    ])
    const cars = rows.map(row => publicCarRow(row as Record<string, unknown>))
    setResponseHeader(event, 'cache-control', 'public, max-age=60, s-maxage=120')
    return assembleCarComparison(keys, cars, meta?.freshDays ?? 4)
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Car comparison temporarily unavailable',
      cause: error,
    })
  }
})
