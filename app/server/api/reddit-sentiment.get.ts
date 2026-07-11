// What Uruguayans say about each bank/fintech on Reddit — the snapshot written by the
// daily `reddit:sentiment` task. This handler never calls Reddit: it reads MongoDB.
//
// Deliberately NOT a `defineCachedEventHandler`. pm2 runs this app as a 2-instance cluster and
// Nitro's cached-handler storage is per-process, so the two instances hold independent caches:
// after a refresh, the instance that ran it serves fresh data while the other keeps serving its
// stale copy for the rest of the TTL — the page then flickers between "sin datos" and the real
// board depending on which worker answers. Invalidation can't fix that from inside one worker.
//
// So we just read Mongo (one indexed find over ~12 small docs — cheaper than the cache dance)
// and cache at the HTTP layer instead, where the CDN and the browser share one view of it.
import { getPublishedSentiment } from '../utils/redditSentimentStore'

export default defineEventHandler(async event => {
  // Shared, revalidatable HTTP cache: 5 min fresh, then serve stale for a day while the CDN
  // refetches. The data only moves once a day, so this costs nothing and keeps both workers
  // (and every reader) consistent.
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=300, s-maxage=300, stale-while-revalidate=86400'
  )

  try {
    return await getPublishedSentiment()
  } catch {
    // No Mongo configured / unreachable: degrade to "no data" instead of a 500.
    return { entities: [], asOf: null, empty: true, subs: [], minSample: 5 }
  }
})
