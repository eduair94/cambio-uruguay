// Serves the daily GA4 snapshot the backend job `currency-site-analytics` writes.
//
// Read-only and unauthenticated by design: /estadisticas-del-sitio publishes these numbers. The
// document holds nothing per-visitor — totals, whole days and top-N breakdowns, with page paths
// already stripped of their query string at write time (classes/site-analytics/refresh.ts).
//
// Cached for an hour: the source refreshes once a day, so anything shorter only costs Mongo trips.
import { SiteAnalyticsSnapshotModel } from '../models/SiteAnalyticsSnapshot'
import { connectDb } from '../utils/db'

export default defineEventHandler(async event => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400'
  )

  try {
    await connectDb()
    return await SiteAnalyticsSnapshotModel.findOne({ key: 'site' })
      .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })
      .lean()
  } catch {
    // The page renders its own "sin datos todavía" state; a 500 here would only turn a missing
    // snapshot into a broken page.
    return null
  }
})
