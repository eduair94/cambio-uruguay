// «Sumá un emprendimiento»: guarda la cuenta para que el job la lea primero en su próxima corrida
// (classes/emprendimientos/run.ts). Anónimo como el buzón del sitio: honeypot, límite por IP en
// memoria y nada guardado de quien sugiere. No publica nada: la cuenta pasa por la misma lectura y
// clasificación que cualquier otra.
import { EmprendimientoListingModel } from '../../models/EmprendimientoListing'
import { EmprendimientoOptOutModel } from '../../models/EmprendimientoOptOut'
import { EmprendimientoSuggestionModel } from '../../models/EmprendimientoSuggestion'
import { carContactRateOk } from '../../utils/carContacts'
import { connectDb } from '../../utils/db'
import { handleFromInput } from '../../../utils/emprendimientos'

const perMinute = new Map<string, { count: number; resetAt: number }>()
const perDay = new Map<string, { count: number; resetAt: number }>()

export default defineEventHandler(async event => {
  setResponseHeaders(event, {
    'cache-control': 'no-store',
    'x-robots-tag': 'noindex',
    'referrer-policy': 'no-referrer',
  })
  const body = await readBody<{ cuenta?: unknown; nota?: unknown; website?: unknown }>(event)
  // Honeypot: una persona nunca ve el campo.
  if (body?.website) return { ok: true, estado: 'recibida' }
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (
    !carContactRateOk(perMinute, ip, 5, 60_000) ||
    !carContactRateOk(perDay, ip, 30, 86_400_000)
  ) {
    throw createError({ statusCode: 429, statusMessage: 'Demasiadas sugerencias' })
  }
  const handle = handleFromInput(typeof body?.cuenta === 'string' ? body.cuenta : '')
  if (!handle)
    throw createError({ statusCode: 400, statusMessage: 'Cuenta de Instagram no válida' })
  const note =
    typeof body?.nota === 'string'
      ? body.nota.replace(/\s+/g, ' ').trim().slice(0, 200) || null
      : null
  await connectDb()
  if (await EmprendimientoListingModel.exists({ handle }))
    return { ok: true, estado: 'ya-esta', handle }
  // Una cuenta que pidió la baja no vuelve a entrar por una sugerencia, y no se dice por qué.
  if (await EmprendimientoOptOutModel.exists({ handle }))
    return { ok: true, estado: 'recibida', handle }
  await EmprendimientoSuggestionModel.updateOne(
    { handle, processedAt: null },
    { $setOnInsert: { handle, note, at: new Date(), processedAt: null } },
    { upsert: true }
  )
  return { ok: true, estado: 'recibida', handle }
})
