// GET /api/me/bankos-favorites — the logged-in user's favourite discount stores.
import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { BankosUserFavoritesModel } from '../../../models/BankosUserFavorites'
import { sanitizeFavoriteIds } from '../../../../utils/bankos'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  await connectDb()
  const doc = await BankosUserFavoritesModel.findOne({ uid }).lean().exec()
  return { uid, favorites: sanitizeFavoriteIds(doc?.favorites) }
})
