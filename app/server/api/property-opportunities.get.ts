import {
  normalizeOpportunityQuery,
  queryPropertyOpportunities,
} from '../../utils/propertyOpportunityQuery'
import { loadPropertyOpportunities } from '../utils/propertyOpportunities'
import { loadRentalAvailabilityIndex } from '../utils/rentalAvailability'

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
    const availability = query.operation === 'rent' ? await loadRentalAvailabilityIndex() : null
    // The cached price analysis stays immutable. Community observations only annotate the
    // subject currently being offered; neither comparables nor stored medians are rewritten.
    const current = availability
      ? {
          ...snapshot,
          items: snapshot.items.map(item => ({
            ...item,
            subject: {
              ...item.subject,
              availability: availability.byAdvertId.get(item.subject.id),
            },
          })),
        }
      : snapshot
    setResponseHeader(event, 'cache-control', 'public, max-age=30, s-maxage=60')
    return queryPropertyOpportunities(current, input)
  } catch {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Property comparison is temporarily unavailable',
    })
  }
})
