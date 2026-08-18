// PUT /api/me/bankos-cards — save the logged-in user's Bankos card selection.
// Body: { cards: string[] } (or a bare string[]). Unknown ids are dropped; there are only 16 valid
// cards, so sanitizeCardIds already bounds the size.
import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { BankosUserCardsModel } from '../../../models/BankosUserCards'
import { sanitizeCardIds } from '../../../../utils/bankos'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  const body = await readBody(event)
  const cards = sanitizeCardIds(Array.isArray(body) ? body : body?.cards)
  await connectDb()
  const doc = await BankosUserCardsModel.findOneAndUpdate(
    { uid },
    { uid, cards },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
    .lean()
    .exec()
  return { uid, cards: sanitizeCardIds(doc?.cards) }
})
