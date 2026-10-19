// Serves the LRM snapshot the backend job `currency-lrm` writes twice a day (classes/lrm/): the
// last auction of every Letra de Regulación Monetaria term, the last year of auctions, the latest
// Notas del Tesoro per currency and the BCU's tentative calendar.
//
// Read-only and unauthenticated: /letras-de-regulacion-monetaria-uruguay publishes all of it, and
// every row is already public in the BCU's own spreadsheet. Nothing per-visitor.
//
// Cached for an hour at the edge: the writer runs at 11:31 and 23:31 UTC, so anything shorter only
// buys Mongo trips. A missing document returns null and the page renders its baked baseline with
// its own date — a 500 here would turn "the job has not run yet" into a broken page.
import { LrmSnapshotModel } from '../models/LrmSnapshot'
import { connectDb } from '../utils/db'

export default defineEventHandler(async event => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=1800, s-maxage=3600, stale-while-revalidate=86400'
  )

  try {
    await connectDb()
    return await LrmSnapshotModel.findOne({ key: 'uy' })
      .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })
      .lean()
  } catch {
    return null
  }
})
