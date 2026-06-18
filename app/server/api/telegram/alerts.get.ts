import { requireBotSecret } from '../../utils/telegramAuth'
import { connectDb } from '../../utils/db'
import { userByChat } from '../../utils/telegramUser'
import { AlertModel } from '../../models/Alert'

export default defineEventHandler(async event => {
  requireBotSecret(event)
  const chatId = String(getQuery(event).chatId ?? '')
  await connectDb()
  const user = await userByChat(chatId)
  if (!user) return { linked: false }
  const alerts = await AlertModel.find({ uid: user.uid }).lean().exec()
  return { linked: true, alerts }
})
