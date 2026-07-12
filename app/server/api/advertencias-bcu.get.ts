// The BCU's advertencias, as stored by the weekly `bcu:warnings` task.
//
// Not a cached event handler: pm2 runs a 2-instance cluster and Nitro's cached-handler storage
// is per-process, so the workers would serve divergent lists after a refresh (we shipped exactly
// that bug on /api/reddit-sentiment). Mongo read + HTTP caching instead.
import { getBcuWarnings } from '../utils/bcuWarningsStore'

export default defineEventHandler(async event => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=1800, s-maxage=1800, stale-while-revalidate=86400'
  )
  try {
    return await getBcuWarnings()
  } catch {
    return { warnings: [], asOf: null, empty: true }
  }
})
