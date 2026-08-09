import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { WatchlistModel } from '../../../models/Watchlist'
import { sanitizeWatchlist } from '../../../../utils/watchlist'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  const body = await readBody(event)
  // Same validation the client applies to localStorage: caps the list sizes,
  // clamps the radius/amount and drops anything unrecognised, so a crafted
  // request cannot bloat the document or store a zone that matches everything.
  const list = sanitizeWatchlist(body)
  await connectDb()
  return WatchlistModel.findOneAndUpdate(
    { uid },
    { uid, ...list },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
    .lean()
    .exec()
})
