import { requireBotSecret } from '../../utils/telegramAuth'
import { connectDb } from '../../utils/db'
import { userByChat } from '../../utils/telegramUser'
import { FavoriteModel } from '../../models/Favorite'

export default defineEventHandler(async event => {
  requireBotSecret(event)
  const chatId = String(getQuery(event).chatId ?? '')
  await connectDb()
  const user = await userByChat(chatId)
  if (!user) return { linked: false }
  const favorites = await FavoriteModel.find({ uid: user.uid }).lean().exec()
  return { linked: true, favorites }
})
