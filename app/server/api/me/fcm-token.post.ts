import { requireUser } from '../../utils/auth'
import { connectDb } from '../../utils/db'
import { UserModel } from '../../models/User'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  const token = String((await readBody(event))?.token ?? '').trim()
  if (!token) throw createError({ statusCode: 400, statusMessage: 'token required' })
  await connectDb()
  await UserModel.updateOne({ _id: uid }, { $addToSet: { fcmTokens: token } })
  return { ok: true }
})
