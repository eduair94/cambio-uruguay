// Serves the trends snapshot the backend job `currency-trends` writes every three hours.
//
// Read-only and unauthenticated: /tendencias-uruguay publishes all of it, and every row is already
// public (Google Trends' RSS, Google News' feed, Reddit's hot listings). Nothing per-visitor.
//
// Cached for 30 minutes at the edge: the writer runs every 3 hours, so anything shorter only buys
// Mongo trips. A missing document returns null and the page renders its own empty state — a 500
// here would turn "the job has not run yet" into a broken page.
import { TrendsSnapshotModel } from '../models/TrendsSnapshot'
import { connectDb } from '../utils/db'

export default defineEventHandler(async event => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=900, s-maxage=1800, stale-while-revalidate=86400'
  )

  try {
    await connectDb()
    return await TrendsSnapshotModel.findOne({ key: 'uy' })
      .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })
      .lean()
  } catch {
    return null
  }
})
