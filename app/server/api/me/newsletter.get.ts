// Authenticated newsletter channel preferences for the current user.
import { requireUser } from '../../utils/auth'
import { connectDb } from '../../utils/db'
import { UserModel } from '../../models/User'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  await connectDb()
  const u = (await UserModel.findById(uid).lean().exec()) as any
  return {
    email: Boolean(u?.newsletter?.email),
    telegram: Boolean(u?.newsletter?.telegram),
    telegramLinked: Boolean(u?.telegramChatId),
  }
})
