import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { UserModel } from '../../../models/User'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  await connectDb()
  await UserModel.updateOne({ _id: uid }, { $set: { telegramChatId: null } })
  return { ok: true }
})
