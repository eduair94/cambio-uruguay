import { requireUser } from '../../utils/auth'
import { connectDb } from '../../utils/db'
import { UserModel } from '../../models/User'

export default defineEventHandler(async event => {
  const { uid, email } = await requireUser(event)
  await connectDb()
  // _id comes from the filter on insert; keep email only in $set to avoid a
  // conflicting-path error (same field in $set and $setOnInsert).
  const user = await UserModel.findByIdAndUpdate(
    uid,
    { $set: { email } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  return {
    uid: user._id,
    email: user.email,
    name: user.name,
    settings: user.settings,
  }
})
