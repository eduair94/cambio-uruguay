// Panel de clientes: todos los monitores de competencia con su acceso y el último aviso. Sólo
// NUXT_ADMIN_EMAILS, nunca cacheado.
import { CompetitorMonitorModel } from '../../models/CompetitorMonitor'
import { CompetitorMonitorStateModel } from '../../models/CompetitorMonitorState'
import { monitorAccess } from '../../../utils/competitorMonitor'
import { apiAdminFetch } from '../../utils/apiAdmin'
import { connectDb } from '../../utils/db'
import { requireAdmin } from '../../utils/requireAdmin'

export default defineEventHandler(async event => {
  await requireAdmin(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')
  await connectDb()
  const monitors = await CompetitorMonitorModel.find({}).sort({ createdAt: -1 }).lean().exec()
  const states = await CompetitorMonitorStateModel.find({ uid: { $in: monitors.map(m => m.uid) } })
    .lean()
    .exec()
  const lastSent = new Map(states.map(s => [s.uid, s.lastSentAt]))
  let business = new Set<string>()
  try {
    const { keys } = await apiAdminFetch<{
      keys: { ownerUid: string; status: string; plan: string }[]
    }>('/admin/api-keys', { query: {} })
    business = new Set(
      keys.filter(k => k.status === 'active' && k.plan === 'business').map(k => k.ownerUid)
    )
  } catch {
    // Sin la API, el acceso se muestra como si no hubiera plan: el panel sigue sirviendo.
  }
  return {
    monitors: monitors.map(m => ({
      uid: m.uid,
      email: m.email,
      ownOrigin: m.ownOrigin,
      competitors: m.competitors,
      currencies: m.currencies,
      active: m.active,
      access: monitorAccess(m.trialStartedAt, business.has(m.uid)),
      lastSentAt: lastSent.get(m.uid) ? new Date(lastSent.get(m.uid) as Date).toISOString() : null,
      createdAt: m.createdAt ?? null,
    })),
  }
})
