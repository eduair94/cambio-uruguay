// The weekly lender-fact snapshot for /mejores-prestamos-uruguay.
//
// Returns null rather than an error when the row is missing or Mongo is unreachable: the page
// carries its own seed catalogue and renders the full board without this. The snapshot only
// overlays fresher facts — so the worst outcome of this route failing is a board scored on the
// values a human last checked, which is exactly what a tier list used to be.
import { LoanTierSnapshotModel } from '../models/LoanTierSnapshot'
import { connectDb } from '../utils/db'

export default defineEventHandler(async event => {
  setResponseHeader(
    event,
    'cache-control',
    'public, max-age=1800, s-maxage=1800, stale-while-revalidate=604800'
  )

  try {
    await connectDb()
    return await LoanTierSnapshotModel.findOne({ key: 'uy-personal-loans' })
      .select({ _id: 0, __v: 0, createdAt: 0, updatedAt: 0 })
      .lean()
  } catch {
    return null
  }
})
