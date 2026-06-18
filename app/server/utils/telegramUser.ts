import { UserModel } from '../models/User'

/** Resolve a Telegram chatId to its linked user uid, or null. */
export async function userByChat(chatId: string): Promise<{ uid: string } | null> {
  if (!chatId) return null
  const u = await UserModel.findOne({ telegramChatId: chatId }).lean().exec()
  return u ? { uid: String((u as any)._id) } : null
}
