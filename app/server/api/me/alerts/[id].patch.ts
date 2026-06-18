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
  }
  await connectDb()
  return AlertModel.findOneAndUpdate({ _id: id, uid }, { $set: set }, { new: true }).lean().exec()
})
