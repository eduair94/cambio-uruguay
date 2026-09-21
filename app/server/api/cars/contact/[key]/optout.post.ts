// "¿Es tu número? Sacalo de este sitio". Borra el teléfono del aviso y guarda el hash de cada número
// para que ninguna corrida lo vuelva a publicar, en ningún aviso. No pide pruebas de titularidad a
// propósito: sacar un número de la vista es el lado seguro de equivocarse.
import { carKeyValid } from '../../../../../utils/cars'
import { CarContactModel } from '../../../../models/CarContact'
import { CarContactOptOutModel } from '../../../../models/CarContactOptOut'
import { carContactHash, carContactRateOk } from '../../../../utils/carContacts'
import { connectDb } from '../../../../utils/db'

const requests = new Map<string, { count: number; resetAt: number }>()

export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'private, no-store')
  setResponseHeader(event, 'x-robots-tag', 'noindex, nofollow')
  const key = String(getRouterParam(event, 'key') || '')
  if (!carKeyValid(key)) throw createError({ statusCode: 404, statusMessage: 'Contact not found' })
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (!carContactRateOk(requests, ip, 5, 10 * 60_000)) {
    setResponseHeader(event, 'retry-after', '600')
    throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
  }
  try {
    await connectDb()
    const doc = await CarContactModel.findOne({ key })
      .select({ _id: 0, phones: 1 })
      .maxTimeMS(3_000)
      .lean()
    const values = [
      ...new Set(
        (Array.isArray(doc?.phones) ? doc.phones : [])
          .map(phone => String(phone?.value ?? ''))
          .filter(Boolean)
      ),
    ]
    if (!values.length) throw createError({ statusCode: 404, statusMessage: 'Contact not found' })
    const createdAt = new Date().toISOString()
    await CarContactOptOutModel.bulkWrite(
      values.map(value => ({
        updateOne: {
          filter: { _id: carContactHash(value) },
          update: { $setOnInsert: { createdAt, key } },
          upsert: true,
        },
      })),
      { ordered: false }
    )
    await CarContactModel.deleteOne({ key })
    return { removed: values.length }
  } catch (error) {
    if ((error as { statusCode?: number })?.statusCode === 404) throw error
    throw createError({
      statusCode: 503,
      statusMessage: 'Opt-out temporarily unavailable',
      cause: error,
    })
  }
})
