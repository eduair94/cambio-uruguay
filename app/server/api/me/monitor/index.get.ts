// El monitor de competencia de la cuenta en sesión: configuración, acceso (prueba/Empresa/vencido),
// último aviso, si tiene Telegram vinculado y las casas elegibles. Privado y sin caché.
import { CompetitorMonitorModel } from '../../../models/CompetitorMonitor'
import { CompetitorMonitorStateModel } from '../../../models/CompetitorMonitorState'
import { UserModel } from '../../../models/User'
import { monitorAccess } from '../../../../utils/competitorMonitor'
import { apiAdminFetch } from '../../../utils/apiAdmin'
import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { loadMonitorHouses } from '../../../utils/monitorHouses'

/** true/false según las claves de la cuenta; null si la API de claves no contestó. */
async function hasBusinessKey(uid: string): Promise<boolean | null> {
  try {
    const { keys } = await apiAdminFetch<{ keys: { status: string; plan: string }[] }>(
      '/admin/api-keys',
      {
        query: { ownerUid: uid },
      }
    )
    return keys.some(k => k.status === 'active' && k.plan === 'business')
  } catch {
    return null
  }
}

export default defineEventHandler(async event => {
  const { uid, email, emailVerified, anonymous } = await requireUser(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')
  await connectDb()
  const [monitor, state, user, houses, business] = await Promise.all([
    CompetitorMonitorModel.findOne({ uid }).lean().exec(),
    CompetitorMonitorStateModel.findOne({ uid }).lean().exec(),
    UserModel.findById(uid).lean().exec(),
    loadMonitorHouses({ counterOnly: true }).catch(() => []),
    hasBusinessKey(uid),
  ])
  return {
    monitor: monitor
      ? {
          ownOrigin: monitor.ownOrigin,
          competitors: monitor.competitors,
          currencies: monitor.currencies,
          alerts: monitor.alerts,
          channels: monitor.channels,
          active: monitor.active,
        }
      : null,
    access: monitor ? monitorAccess(monitor.trialStartedAt, business) : null,
    lastSentAt: state?.lastSentAt ?? null,
    telegramLinked: Boolean(user?.telegramChatId),
    canCreate: !anonymous && Boolean(email) && emailVerified,
    houses,
  }
})
