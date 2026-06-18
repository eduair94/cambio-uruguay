import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { FavoriteModel } from '../../../models/Favorite'

const TYPES = ['casa', 'currency', 'pair']

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  const body = await readBody(event)
  const type = String(body?.type ?? '')
  const key = String(body?.key ?? '').trim()
  if (!TYPES.includes(type) || !key) {
    throw createError({ statusCode: 400, statusMessage: 'type and key are required' })
  }
  await connectDb()
  await FavoriteModel.updateOne(
    { uid, type, key },
    { $set: { label: String(body?.label ?? '') } },
    { upsert: true }
  )
  return FavoriteModel.findOne({ uid, type, key }).lean().exec()
})
