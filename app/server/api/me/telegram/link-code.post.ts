import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { TelegramLinkModel } from '../../../models/TelegramLink'
import { makeLinkCode } from '../../../utils/telegramLink'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  const botUsername = useRuntimeConfig().telegram?.username || ''
  await connectDb()
  const code = makeLinkCode()
  await TelegramLinkModel.create({ uid, code })
  return { code, botUsername, deepLink: `https://t.me/${botUsername}?start=${code}` }
})
