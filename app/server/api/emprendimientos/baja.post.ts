// «Pedir la baja»: la cuenta deja de aparecer en el momento (se borra su ficha y la API la filtra)
// y el job no la vuelve a leer ni a sumar por ninguna fuente. Desde acá no se puede verificar que
// quien la pide sea el dueño: se prefiere sacar de más a mostrar a alguien que no quiere estar, y
// cada baja avisa al chat de administración para poder revisarla.
import { EmprendimientoListingModel } from '../../models/EmprendimientoListing'
import { EmprendimientoOptOutModel } from '../../models/EmprendimientoOptOut'
import { carContactRateOk } from '../../utils/carContacts'
import { connectDb } from '../../utils/db'
import { escapeTelegramMarkdown, sendTelegram } from '../../utils/telegram'
import { handleFromInput } from '../../../utils/emprendimientos'

const perDay = new Map<string, { count: number; resetAt: number }>()

export default defineEventHandler(async event => {
  setResponseHeaders(event, {
    'cache-control': 'no-store',
    'x-robots-tag': 'noindex',
    'referrer-policy': 'no-referrer',
  })
  const body = await readBody<{ cuenta?: unknown; website?: unknown }>(event)
  if (body?.website) return { ok: true }
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (!carContactRateOk(perDay, ip, 5, 86_400_000)) {
    throw createError({ statusCode: 429, statusMessage: 'Demasiados pedidos' })
  }
  const handle = handleFromInput(typeof body?.cuenta === 'string' ? body.cuenta : '')
  if (!handle)
    throw createError({ statusCode: 400, statusMessage: 'Cuenta de Instagram no válida' })
  await connectDb()
  await EmprendimientoOptOutModel.updateOne(
    { handle },
    { $setOnInsert: { handle, at: new Date() } },
    { upsert: true }
  )
  const removed = await EmprendimientoListingModel.deleteOne({ handle })
  const chatId = String(useRuntimeConfig().telegram?.adminChatId || '')
  if (chatId) {
    void sendTelegram(
      chatId,
      escapeTelegramMarkdown(
        `Emprendimientos: baja de @${handle}${removed.deletedCount ? '' : ' (no estaba publicada)'}`
      )
    )
  }
  return { ok: true }
})
