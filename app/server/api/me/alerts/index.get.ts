import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { AlertModel } from '../../../models/Alert'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  await connectDb()
  return AlertModel.find({ uid }).sort({ createdAt: -1 }).lean().exec()
})
