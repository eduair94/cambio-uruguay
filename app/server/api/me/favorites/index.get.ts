import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { FavoriteModel } from '../../../models/Favorite'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  await connectDb()
  return FavoriteModel.find({ uid }).lean().exec()
})
