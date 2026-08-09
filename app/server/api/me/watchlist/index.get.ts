import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { WatchlistModel } from '../../../models/Watchlist'
import { DEFAULT_WATCHLIST } from '../../../../utils/watchlist'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  await connectDb()
  const doc = await WatchlistModel.findOne({ uid }).lean().exec()
  return doc ?? { uid, ...DEFAULT_WATCHLIST }
})
