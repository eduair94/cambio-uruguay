// Serves the Search Console snapshot the backend job `currency-gsc` writes.
//
// PRIVATE, unlike its neighbour /api/site-analytics. The document holds the queries people typed to
// reach the site: publishing it would hand every competitor the keyword list this site took three
// years to earn, and Search Console's own anonymisation is not consent to republish. Owner account
// only, and never cached at the edge.
import { SearchConsoleSnapshotModel } from '../models/SearchConsoleSnapshot'
import { connectDb } from '../utils/db'
import { requireAdmin } from '../utils/requireAdmin'

export default defineEventHandler(async event => {
  await requireAdmin(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')

  await connectDb()
  const snapshot = await SearchConsoleSnapshotModel.findOne({ key: 'gsc_snapshot' })
    .select({ _id: 0, __v: 0 })
    .lean()

  if (!snapshot) {
    // A missing snapshot is "the job has not run yet", not an error. The page renders its own empty
    // state and says which pm2 app to look at.
    return {
      snapshot: null,
      hint: 'todavía no corrió `currency-gsc` (o falta APP_MONGO_URI en el VPS)',
    }
  }
  return { snapshot }
})
