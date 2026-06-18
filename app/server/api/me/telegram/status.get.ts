import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { UserModel } from '../../../models/User'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  await connectDb()
  const u = await UserModel.findById(uid).lean().exec()
  return { linked: Boolean((u as any)?.telegramChatId) }
})
