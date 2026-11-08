import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { AlertModel } from '../../../models/Alert'

const OPS = ['<', '>', '<=', '>=']

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  const id = getRouterParam(event, 'id')
  if (!id) throw createError({ statusCode: 400, statusMessage: 'id required' })
  const b = await readBody(event)
  const set: Record<string, unknown> = { armed: true } // editing re-arms
  if (typeof b?.active === 'boolean') set.active = b.active
  if (Number.isFinite(Number(b?.target))) set.target = Number(b.target)
  if (OPS.includes(String(b?.op))) set.op = b.op
  if (b?.channels) {
    set['channels.push'] = b.channels.push !== false
    set['channels.email'] = b.channels.email !== false
    set['channels.telegram'] = b.channels.telegram === true
  }
  // Switching an alert on needs a channel that reaches someone: the email unsubscribe link (one
  // click from the inbox) can leave an alert with none, and an active alert with no channel fires
  // into nothing. The rental alerts follow the same rule (rentalAlertSubscriptions.ts).
  const channelsInBody = Boolean(b?.channels)
  const noChannelLeft =
    channelsInBody && !set['channels.push'] && !set['channels.email'] && !set['channels.telegram']
  if (noChannelLeft && set.active === true)
    throw createError({ statusCode: 409, statusMessage: 'no-channel' })
  // Turning every channel off pauses it, as the rental alerts do.
  if (noChannelLeft) set.active = false
  const filter: Record<string, unknown> = { _id: id, uid }
  // Checked in the same update, so nothing can switch the channels off in between.
  if (set.active === true && !channelsInBody)
    filter.$or = [
      { 'channels.push': true },
      { 'channels.email': true },
      { 'channels.telegram': true },
    ]
  await connectDb()
  const updated = await AlertModel.findOneAndUpdate(
    filter,
    { $set: set },
    { returnDocument: 'after' }
  )
    .lean()
    .exec()
  if (!updated && filter.$or && (await AlertModel.exists({ _id: id, uid })))
    throw createError({ statusCode: 409, statusMessage: 'no-channel' })
  return updated
})
