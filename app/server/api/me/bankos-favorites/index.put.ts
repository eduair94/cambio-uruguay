// PUT /api/me/bankos-favorites — save the logged-in user's favourite discount stores.
// Body: { favorites: string[] } (or a bare string[]).
import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { BankosUserFavoritesModel } from '../../../models/BankosUserFavorites'
import { sanitizeFavoriteIds } from '../../../../utils/bankos'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  const body = await readBody(event)
  const favorites = sanitizeFavoriteIds(Array.isArray(body) ? body : body?.favorites)
  await connectDb()
  const doc = await BankosUserFavoritesModel.findOneAndUpdate(
    { uid },
    { uid, favorites },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
    .lean()
    .exec()
  return { uid, favorites: sanitizeFavoriteIds(doc?.favorites) }
})
