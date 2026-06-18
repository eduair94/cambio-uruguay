import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { AlertModel } from '../../../models/Alert'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })
  await connectDb()
  await AlertModel.deleteOne({ _id: id, uid })
  return { ok: true }
})
