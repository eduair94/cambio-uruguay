import { requireBotSecret } from '../../utils/telegramAuth'
import { connectDb } from '../../utils/db'
import { userByChat } from '../../utils/telegramUser'
import { AlertModel } from '../../models/Alert'

const CURRENCIES = ['USD', 'EUR', 'BRL', 'ARS']
const KINDS = ['bestBuy', 'bestSell']
const OPS = ['<', '>', '<=', '>=']

export default defineEventHandler(async event => {
  requireBotSecret(event)
  const b = await readBody(event)
  const chatId = String(b?.chatId ?? '')
  const currency = String(b?.currency ?? '')
  const kind = String(b?.kind ?? '')
  const op = String(b?.op ?? '')
  const target = Number(b?.target)
  if (
    !CURRENCIES.includes(currency) ||
    !KINDS.includes(kind) ||
    !OPS.includes(op) ||
    !Number.isFinite(target)
  ) {
    throw createError({ statusCode: 400, statusMessage: 'invalid alert' })
  }
  await connectDb()
  const user = await userByChat(chatId)
  if (!user) return { linked: false }
  const alert = await AlertModel.create({
    uid: user.uid,
    currency,
    kind,
    op,
    target,
    origin: 'any',
    channels: { push: false, email: false, telegram: true },
  })
  return { ok: true, alert }
})
