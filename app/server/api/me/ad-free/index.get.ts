// The signed-in account's ad-free period and its donations (no provider ids). Before answering it
// gives the account's recent unsettled orders a quick second look at the provider: the fallback
// for a webhook that never arrived (a cash payment credited later, a provider outage). Bounded, so
// the page-load check in plugins/ad-free.client.ts is never held up for long; what does not finish
// in time keeps running and shows on the next request.
import { requireUser } from '../../../utils/auth'
import { adFreeSummary, sessionIsComplimentary } from '../../../utils/adFreeStore'
import { reconcileRecentOrders } from '../../../utils/adFreeReconcile'
import { connectDb } from '../../../utils/db'

const RECONCILE_BUDGET_MS = 2000

export default defineEventHandler(async event => {
  const user = await requireUser(event)
  const { uid } = user
  setResponseHeader(event, 'cache-control', 'private, no-store')
  await connectDb()
  const reconciling = reconcileRecentOrders(uid).catch(() => {})
  await Promise.race([
    reconciling,
    new Promise(resolve => setTimeout(resolve, RECONCILE_BUDGET_MS)),
  ])
  return adFreeSummary(uid, { complimentary: sessionIsComplimentary(user) })
})
