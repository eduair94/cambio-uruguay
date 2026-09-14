import { createHash } from 'node:crypto'
import {
  isLiveMovingReviewProfile,
  movingReviewsResult,
  parseMovingGoogleReview,
  type MovingReviewProfile,
  type MovingReviewsResult,
} from '../../utils/movingReviews'

// No review text, photos, authors or AI summaries are requested.
export const MOVING_REVIEW_FIELDS =
  'place_id,name,rating,user_ratings_total,url,address_components,international_phone_number,formatted_phone_number'

interface ProxyFetchOptions {
  params: { place_id: string; fields: string }
  timeout: number
  retry: 0
}

export interface MovingReviewsHttpResult {
  statusCode: number
  body: MovingReviewsResult
  retryAfter?: number
}

interface ServiceOptions {
  profiles: MovingReviewProfile[]
  fetcher: (url: string, options: ProxyFetchOptions) => Promise<unknown>
  now?: () => number
  perIpLimit?: number
  globalLimit?: number
  maxConcurrent?: number
  maxIpEntries?: number
}

interface ReadInput {
  providerId: string
  profileKey?: string
  ip: string
  gmapsBase: string
  enabled?: boolean
}

/**
 * Request-scoped data only. The maps below hold quota counters, never Google content.
 * Like newsletter's limiter these limits are per worker, reset on restart, and best effort.
 */
export function createMovingReviewsService(options: ServiceOptions) {
  const now = options.now ?? Date.now
  const perIpLimit = options.perIpLimit ?? 12
  const globalLimit = options.globalLimit ?? 120
  const maxConcurrent = options.maxConcurrent ?? 3
  const maxIpEntries = options.maxIpEntries ?? 2000
  const hits = new Map<string, { count: number; resetAt: number }>()
  let global = { count: 0, resetAt: 0 }
  let active = 0

  return {
    async read(input: ReadInput): Promise<MovingReviewsHttpResult> {
      const matching = options.profiles.filter(
        profile =>
          profile.providerId === input.providerId &&
          (!input.profileKey || profile.key === input.profileKey) &&
          isLiveMovingReviewProfile(profile)
      )
      if (matching.length !== 1) {
        const required = !input.profileKey && matching.length > 1
        return {
          statusCode: required ? 400 : 404,
          body: movingReviewsResult(
            input.providerId,
            required ? 'profile_required' : 'unknown_profile'
          ),
        }
      }
      const profile = matching[0]
      const result = (
        status: MovingReviewsResult['status'],
        statusCode: number,
        retryAfter?: number
      ) => ({
        statusCode,
        body: movingReviewsResult(input.providerId, status, profile),
        ...(retryAfter ? { retryAfter } : {}),
      })
      let endpoint: string
      try {
        const base = new URL(input.gmapsBase)
        if (input.enabled === false || !['http:', 'https:'].includes(base.protocol))
          return result('not_configured', 503)
        base.pathname = `${base.pathname.replace(/\/$/, '')}/placeDetails`
        endpoint = base.href
      } catch {
        return result('not_configured', 503)
      }

      const time = now()
      for (const [key, hit] of hits) if (hit.resetAt <= time) hits.delete(key)
      const ip = createHash('sha256').update(input.ip.slice(0, 128)).digest('hex')
      if (time >= global.resetAt) global = { count: 0, resetAt: time + 60_000 }
      let hit = hits.get(ip)
      if (!hit) {
        if (hits.size >= maxIpEntries) return result('rate_limited', 429, 60)
        hit = { count: 0, resetAt: time + 60_000 }
        hits.set(ip, hit)
      }
      if (hit.count >= perIpLimit || global.count >= globalLimit)
        return result('rate_limited', 429, Math.max(1, Math.ceil((hit.resetAt - time) / 1000)))
      if (active >= maxConcurrent) return result('busy', 503, 2)
      hit.count++
      global.count++
      active++
      try {
        const json = await options.fetcher(endpoint, {
          params: { place_id: profile.placeId!, fields: MOVING_REVIEW_FIELDS },
          timeout: 15_000,
          retry: 0,
        })
        const body = parseMovingGoogleReview(json, profile, new Date(now()).toISOString())
        return { statusCode: body.status === 'unavailable' ? 503 : 200, body }
      } catch {
        // Do not expose upstream URLs, credentials, response bodies or error messages.
        return {
          statusCode: 503,
          body: movingReviewsResult(
            input.providerId,
            'unavailable',
            profile,
            new Date(now()).toISOString()
          ),
        }
      } finally {
        active--
      }
    },
  }
}
