// The signed-in account's ad-free period and its donations (no provider ids).
import { requireUser } from '../../../utils/auth'
import { adFreeSummary } from '../../../utils/adFreeStore'

export default defineEventHandler(async event => {
  const { uid } = await requireUser(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')
  return adFreeSummary(uid)
})
