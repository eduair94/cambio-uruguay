import { requireUser } from '../../../utils/auth'
import { verifyTelegramAuth, type TelegramAuthData } from '../../../utils/telegramAuth'
import { connectDb } from '../../../utils/db'
import { UserModel } from '../../../models/User'

// Link the logged-in user's Telegram account from a verified Login Widget
// payload. The widget's `id` is the user's private chat id, so it maps onto the
// same `telegramChatId` field the code flow writes.
export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)

  const token = useRuntimeConfig().telegram?.token
  if (!token) {
    throw createError({ statusCode: 503, statusMessage: 'Telegram not configured' })
  }

  const body = (await readBody(event)) as TelegramAuthData
  if (!verifyTelegramAuth(body, token)) {
    throw createError({ statusCode: 400, statusMessage: 'invalid telegram signature' })
  }

  await connectDb()
  await UserModel.updateOne({ _id: uid }, { $set: { telegramChatId: String(body.id) } })

  return { ok: true, linked: true, username: (body.username as string) ?? null }
})
