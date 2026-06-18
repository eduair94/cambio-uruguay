import { requireUser } from '../../utils/auth'
import { connectDb } from '../../utils/db'
import { UserModel } from '../../models/User'

export default defineEventHandler(async event => {
  const { uid, email } = await requireUser(event)
  await connectDb()
  const user = await UserModel.findByIdAndUpdate(
    uid,
    { $setOnInsert: { _id: uid, email }, $set: { email } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  return {
    uid: user._id,
    email: user.email,
    name: user.name,
    settings: user.settings,
  }
})
