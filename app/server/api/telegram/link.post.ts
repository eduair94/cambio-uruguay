import { requireBotSecret } from '../../utils/telegramAuth'
import { connectDb } from '../../utils/db'
import { TelegramLinkModel } from '../../models/TelegramLink'
import { UserModel } from '../../models/User'

export default defineEventHandler(async event => {
  requireBotSecret(event)
  const body = await readBody(event)
  const code = String(body?.code ?? '')
    .trim()
    .toUpperCase()
  const chatId = String(body?.chatId ?? '').trim()
  if (!code || !chatId) {
    throw createError({ statusCode: 400, statusMessage: 'code and chatId required' })
  }
  await connectDb()
  const link = await TelegramLinkModel.findOneAndDelete({ code }).exec()
  if (!link) return { ok: false, reason: 'expired' }
  await UserModel.updateOne({ _id: link.uid }, { $set: { telegramChatId: chatId } })
  return { ok: true, linked: true }
})
