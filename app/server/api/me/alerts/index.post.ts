import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { AlertModel } from '../../../models/Alert'

const CURRENCIES = ['USD', 'EUR', 'BRL', 'ARS']
const KINDS = ['bestBuy', 'bestSell']
const OPS = ['<', '>', '<=', '>=']

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  const b = await readBody(event)
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
  return AlertModel.create({
    uid,
    currency,
    kind,
    op,
    target,
    origin: String(b?.origin ?? 'any'),
    channels: {
      push: b?.channels?.push !== false,
      email: b?.channels?.email !== false,
    },
  })
})
