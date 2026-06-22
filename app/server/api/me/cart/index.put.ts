import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { ImportCartModel } from '../../../models/ImportCart'
import { sanitizeStoredCart } from '../../../../utils/cartMerge'

/** Cap stored items so a malicious/huge payload can't bloat a document. */
const MAX_ITEMS = 100

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  const body = await readBody(event)
  // Reuse the same validation as the client: drops invalid items, http(s)-only
  // urls, whitelists settings keys. Then cap the item count.
  const { items, settings } = sanitizeStoredCart(body)
  const cappedItems = items.slice(0, MAX_ITEMS)
  await connectDb()
  const doc = await ImportCartModel.findOneAndUpdate(
    { uid },
    { uid, items: cappedItems, settings },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
    .lean()
    .exec()
  return doc
})
