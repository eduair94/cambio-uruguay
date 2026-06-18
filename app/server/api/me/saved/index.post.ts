import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { SavedItemModel } from '../../../models/SavedItem'

const KINDS = ['conversion', 'tool']

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  const body = await readBody(event)
  const kind = String(body?.kind ?? '')
  const toolSlug = String(body?.toolSlug ?? '').trim()
  const title = String(body?.title ?? '').trim()
  if (!KINDS.includes(kind) || !toolSlug || !title) {
    throw createError({ statusCode: 400, statusMessage: 'kind, toolSlug and title are required' })
  }
  await connectDb()
  return SavedItemModel.create({
    uid,
    kind,
    toolSlug,
    title,
    inputs: body?.inputs ?? {},
    result: body?.result ?? {},
    snapshot: body?.snapshot ?? { capturedAt: new Date(), rates: [] },
  })
})
