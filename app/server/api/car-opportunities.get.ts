import { queryCarOpportunities } from '../../utils/cars'
import { loadCarOpportunities } from '../utils/cars'

export default defineEventHandler(async event => {
  try {
    const snapshot = await loadCarOpportunities()
    if (!snapshot) throw new Error('CAR_OPPORTUNITIES_PREPARING')
    setResponseHeader(event, 'cache-control', 'public, max-age=30, s-maxage=60')
    return queryCarOpportunities(snapshot, getQuery(event) as Record<string, unknown>)
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Used-car comparison is temporarily unavailable',
      cause: error,
    })
  }
})
