// Serves the video snapshot the backend job `currency-videos` writes every six hours.
//
// Read-only and unauthenticated: /videos-de-economia-uruguay publishes all of it, and every row is
// already public (YouTube's own channel feeds). Nothing per-visitor.
//
// Cached for an hour at the edge: the writer runs every six, so anything shorter only buys Mongo
// trips. A missing document returns null and the page renders its own empty state — a 500 here
// would turn "the job has not run yet" into a broken page, and the per-topic routes would 404 for
// a reason that has nothing to do with the topic.
import { VideosSnapshotModel } from '../models/VideosSnapshot'
import { connectDb } from '../utils/db'

export default defineEventHandler(async event => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400'
  )

  try {
    await connectDb()
    return await VideosSnapshotModel.findOne({ key: 'uy' })
      .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })
      .lean()
  } catch {
    return null
  }
})
