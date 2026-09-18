import { queryCarRisks } from '../../utils/carsRisk'
import { loadCarRisks } from '../utils/cars'

export default defineEventHandler(async event => {
  try {
    const snapshot = await loadCarRisks()
    if (!snapshot) throw new Error('CAR_RISKS_PREPARING')
    setResponseHeader(event, 'cache-control', 'public, max-age=60, s-maxage=120')
    return queryCarRisks(snapshot, getQuery(event) as Record<string, unknown>)
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Declared-risk listings are temporarily unavailable',
      cause: error,
    })
  }
})
