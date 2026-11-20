import { queryCarOpportunities } from '../../utils/cars'
import {
  carOpportunityFreshItems,
  carOpportunitySummary,
  type CarOpportunitiesWithSummary,
} from '../../utils/carOpportunitySummary'
import { loadCarOpportunities } from '../utils/cars'

export default defineEventHandler(async (event): Promise<CarOpportunitiesWithSummary> => {
  try {
    const snapshot = await loadCarOpportunities()
    if (!snapshot) throw new Error('CAR_OPPORTUNITIES_PREPARING')
    setResponseHeader(event, 'cache-control', 'public, max-age=30, s-maxage=60')
    // One clock for the page and the summary, so both retire exactly the same stale adverts.
    const now = new Date()
    const page = queryCarOpportunities(snapshot, getQuery(event) as Record<string, unknown>, now)
    // The summary always describes the whole unfiltered list, whatever page or filter was asked:
    // it is what /oportunidades-autos-usados-uruguay prints above the cards (utils/carOpportunitySummary.ts).
    return { ...page, summary: carOpportunitySummary(carOpportunityFreshItems(snapshot, now)) }
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Used-car comparison is temporarily unavailable',
      cause: error,
    })
  }
})
