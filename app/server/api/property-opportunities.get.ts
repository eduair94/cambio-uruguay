import {
  normalizeOpportunityQuery,
  queryPropertyOpportunities,
} from '../../utils/propertyOpportunityQuery'
import { loadPropertyOpportunities } from '../utils/propertyOpportunities'

export default defineEventHandler(async event => {
  const input = getQuery(event) as Record<string, unknown>
  const query = normalizeOpportunityQuery(input)
  try {
    const snapshot = await loadPropertyOpportunities(query.operation)
    if (!snapshot) {
      setResponseHeader(event, 'cache-control', 'no-store')
      throw createError({
        statusCode: 503,
        statusMessage: 'Property comparison is not available yet',
      })
    }
    setResponseHeader(event, 'cache-control', 'public, max-age=60, s-maxage=180')
    return queryPropertyOpportunities(snapshot, input)
  } catch {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Property comparison is temporarily unavailable',
    })
  }
})
