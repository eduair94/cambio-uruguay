import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { FavoriteModel } from '../../../models/Favorite'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  const key = getRouterParam(event, 'key')
  const { type } = getQuery(event)
  if (!key || !type) {
    throw createError({ statusCode: 400, statusMessage: 'type and key are required' })
  }
  await connectDb()
  await FavoriteModel.deleteOne({ uid, type: String(type), key: String(key) })
  return { ok: true }
})
