import { createHash } from 'node:crypto'
import { PushRegistrationModel } from '../models/PushRegistration'
import { UserModel } from '../models/User'
import { connectDb } from './db'

export function pushTokenHash(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

export function validPushToken(value: unknown): value is string {
  return (
    typeof value === 'string' && value.length >= 16 && value.length <= 4096 && !/\s/.test(value)
  )
}

export async function hasRentalAlertPushRegistration(uid: string): Promise<boolean> {
  await connectDb()
  return Boolean(await PushRegistrationModel.exists({ uid }))
}

export async function registerPushToken(uid: string, token: string): Promise<void> {
  await connectDb()
  const _id = pushTokenHash(token)
  // _id, unlike a pull-then-push across users, cannot acquire two owners in a race.
  try {
    await PushRegistrationModel.updateOne({ _id }, { $set: { uid, token } }, { upsert: true })
  } catch (error: unknown) {
    if ((error as { code?: number }).code !== 11000) throw error
    await PushRegistrationModel.updateOne({ _id }, { $set: { uid, token } })
  }
  const owned = await PushRegistrationModel.find({ uid }).sort({ updatedAt: -1, _id: 1 }).lean()
  const removed = owned.slice(8)
  if (removed.length) {
    await PushRegistrationModel.deleteMany({ uid, _id: { $in: removed.map(row => row._id) } })
  }
  // Legacy alerts retain their compatible array. New alerts always consult the
  // authoritative ownership collection, including immediately before delivery.
  await UserModel.updateMany({ _id: { $ne: uid } }, { $pull: { fcmTokens: token } })
  const current = await PushRegistrationModel.find({ uid }).sort({ updatedAt: -1 }).limit(8).lean()
  await UserModel.updateOne(
    { _id: uid },
    { $set: { fcmTokens: current.map(row => row.token) } },
    { upsert: true }
  )
}

export async function unregisterPushToken(uid: string, token: string): Promise<void> {
  await connectDb()
  await PushRegistrationModel.deleteOne({ _id: pushTokenHash(token), uid })
  await UserModel.updateOne({ _id: uid }, { $pull: { fcmTokens: token } })
}
