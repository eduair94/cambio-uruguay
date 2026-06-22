import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { ImportCartModel } from '../../../models/ImportCart'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  await connectDb()
  const doc = await ImportCartModel.findOne({ uid }).lean().exec()
  return doc ?? { uid, items: [], settings: {} }
})
