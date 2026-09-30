// Guardar el monitor de competencia de la cuenta en sesión. El correo sale de la SESIÓN (verificado)
// y la prueba se fija una sola vez (`$setOnInsert`): volver a guardar, pausar o reactivar no la reinicia.
import { CompetitorMonitorModel } from '../../../models/CompetitorMonitor'
import { sanitizeMonitor } from '../../../../utils/competitorMonitor'
import { requireUser } from '../../../utils/auth'
import { connectDb } from '../../../utils/db'
import { loadMonitorHouses } from '../../../utils/monitorHouses'

export default defineEventHandler(async event => {
  const { uid, email, emailVerified, anonymous } = await requireUser(event)
  setResponseHeader(event, 'cache-control', 'private, no-store')
  if (anonymous || !email || !emailVerified) {
    throw createError({
      statusCode: 403,
      statusMessage:
        'Para usar el monitor necesitás una cuenta con correo verificado: entrá con Google o verificá tu correo.',
    })
  }
  const body = await readBody(event)
  let houses: { id: string }[]
  try {
    houses = await loadMonitorHouses()
  } catch {
    throw createError({
      statusCode: 502,
      statusMessage: 'No pudimos leer la lista de casas. Probá de nuevo en un rato.',
    })
  }
  const parsed = sanitizeMonitor(body, new Set(houses.map(h => h.id)))
  if (parsed.ok === false) throw createError({ statusCode: 400, statusMessage: parsed.error })
  await connectDb()
  await CompetitorMonitorModel.findOneAndUpdate(
    { uid },
    { $set: { ...parsed.value, email }, $setOnInsert: { trialStartedAt: new Date() } },
    { upsert: true, returnDocument: 'after', setDefaultsOnInsert: true }
  )
    .lean()
    .exec()
  return { ok: true }
})
