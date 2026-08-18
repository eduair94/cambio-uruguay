// GET /api/me/bankos-cards — the logged-in user's saved Bankos card selection.
import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { BankosUserCardsModel } from '../../../models/BankosUserCards'
import { sanitizeCardIds } from '../../../../utils/bankos'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  await connectDb()
  const doc = await BankosUserCardsModel.findOne({ uid }).lean().exec()
  return { uid, cards: sanitizeCardIds(doc?.cards) }
})
