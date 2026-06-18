import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { SavedItemModel } from '../../../models/SavedItem'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  await connectDb()
  return SavedItemModel.find({ uid }).sort({ createdAt: -1 }).lean().exec()
})
