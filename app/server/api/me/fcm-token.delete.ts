import { requireUser } from '../../utils/auth'
import { unregisterPushToken, validPushToken } from '../../utils/pushRegistrations'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  const token = (await readBody(event))?.token
  if (!validPushToken(token)) throw createError({ statusCode: 400, statusMessage: 'Invalid token' })
  await unregisterPushToken(uid, token)
  return { ok: true }
})
