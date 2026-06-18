import { requireBotSecret } from '../../utils/telegramAuth'
import { connectDb } from '../../utils/db'
import { UserModel } from '../../models/User'

export default defineEventHandler(async event => {
  requireBotSecret(event)
  const chatId = String((await readBody(event))?.chatId ?? '').trim()
  if (!chatId) throw createError({ statusCode: 400, statusMessage: 'chatId required' })
  await connectDb()
  await UserModel.updateOne({ telegramChatId: chatId }, { $set: { telegramChatId: null } })
  return { ok: true }
})
