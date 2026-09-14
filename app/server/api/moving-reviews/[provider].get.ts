import {
  defineEventHandler,
  getQuery,
  getRequestIP,
  getRouterParam,
  setResponseHeader,
  setResponseStatus,
} from 'h3'
import { MOVING_REVIEW_SOURCES } from '../../../utils/movingReviewSources'
import { movingReviewsResult } from '../../../utils/movingReviews'
import { createMovingReviewsService } from '../../utils/movingReviews'

const service = createMovingReviewsService({
  profiles: MOVING_REVIEW_SOURCES,
  fetcher: (url, options) => $fetch(url, options),
})

export default defineEventHandler(async event => {
  setResponseHeader(event, 'Cache-Control', 'no-store, max-age=0')
  setResponseHeader(event, 'CDN-Cache-Control', 'no-store')
  setResponseHeader(event, 'X-Robots-Tag', 'noindex')
  const providerId = getRouterParam(event, 'provider') ?? ''
  const query = getQuery(event)
  if (
    !/^[a-z0-9][a-z0-9-]{0,95}$/.test(providerId) ||
    Object.keys(query).some(key => key !== 'profileKey') ||
    (query.profileKey !== undefined &&
      (typeof query.profileKey !== 'string' || !/^[a-z0-9][\w.:-]{0,127}$/i.test(query.profileKey)))
  ) {
    setResponseStatus(event, 400)
    return movingReviewsResult('', 'invalid_request')
  }
  const { casasReviews, movingReviews } = useRuntimeConfig()
  const response = await service.read({
    providerId,
    profileKey: typeof query.profileKey === 'string' ? query.profileKey : undefined,
    ip: getRequestIP(event, { xForwardedFor: true }) || 'unknown',
    gmapsBase: movingReviews?.gmapsUrl || casasReviews?.gmapsUrl || '',
    enabled:
      movingReviews?.enabled !== false &&
      !/^(?:0|false|off)$/i.test(process.env.MOVING_REVIEWS_ENABLED || ''),
  })
  setResponseStatus(event, response.statusCode)
  if (response.retryAfter) setResponseHeader(event, 'Retry-After', response.retryAfter)
  return response.body
})
