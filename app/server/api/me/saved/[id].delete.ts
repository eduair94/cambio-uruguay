import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { SavedItemModel } from '../../../models/SavedItem'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id is required' })
  await connectDb()
  await SavedItemModel.deleteOne({ _id: id, uid })
  return { ok: true }
})
