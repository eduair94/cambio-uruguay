import { loadAgencyDirectory } from '../../utils/agencies'
import { queryAgencies } from '../../../utils/agencies'
export default defineEventHandler(async event => {
  try {
    const result = queryAgencies(
      await loadAgencyDirectory(),
      getQuery(event) as Record<string, unknown>
    )
    setResponseHeader(event, 'cache-control', 'public, max-age=60, s-maxage=120')
    return result
  } catch (error) {
    setResponseHeader(event, 'cache-control', 'no-store')
    throw createError({
      statusCode: 503,
      statusMessage: 'Agency directory is temporarily unavailable',
      cause: error,
    })
  }
})
