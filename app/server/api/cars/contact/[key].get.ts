// El teléfono del vendedor de UN aviso, pedido con un clic desde la ficha. Nunca va en el HTML ni en
// el catálogo: así no lo indexa un buscador y no se baja la base entera recorriendo el directorio.
// Política: docs/app/AUTOS_CONTACTOS.md.
import { carKeyValid } from '../../../../utils/cars'
import { CarCatalogModel } from '../../../models/CarCatalog'
import { CarContactModel } from '../../../models/CarContact'
import { CarContactOptOutModel } from '../../../models/CarContactOptOut'
import { carContactHash, carContactRateOk, publicCarContact } from '../../../utils/carContacts'
import { loadCarCatalogMeta } from '../../../utils/cars'
import { connectDb } from '../../../utils/db'

const reads = new Map<string, { count: number; resetAt: number }>()

export default defineEventHandler(async event => {
  setResponseHeader(event, 'cache-control', 'private, no-store')
  setResponseHeader(event, 'x-robots-tag', 'noindex, nofollow')
  const key = String(getRouterParam(event, 'key') || '')
  if (!carKeyValid(key)) throw createError({ statusCode: 404, statusMessage: 'Contact not found' })
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (!carContactRateOk(reads, ip, 30, 10 * 60_000)) {
    setResponseHeader(event, 'retry-after', '600')
    throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
  }
  let contact
  try {
    await connectDb()
    const freshDays = (await loadCarCatalogMeta())?.freshDays ?? 4
    // Sólo un aviso vigente del catálogo tiene teléfono: uno vendido o viejo ya no.
    const [row, doc] = await Promise.all([
      CarCatalogModel.findOne({
        key,
        lastSeen: { $gte: new Date(Date.now() - freshDays * 86_400_000).toISOString() },
      })
        .select({ _id: 0, key: 1, source: 1, permalink: 1 })
        .maxTimeMS(3_000)
        .lean(),
      CarContactModel.findOne({ key }).select({ _id: 0 }).maxTimeMS(3_000).lean(),
    ])
    const values: string[] = Array.isArray(doc?.phones)
      ? doc.phones.map(phone => String(phone?.value ?? ''))
      : []
    const optedOut = values.length
      ? new Set(
          (
            await CarContactOptOutModel.find({ _id: { $in: values.map(carContactHash) } })
              .select({ _id: 1 })
              .maxTimeMS(3_000)
              .lean()
          ).map(item => String(item._id))
        )
      : new Set<string>()
    contact = publicCarContact(doc, row, { now: new Date(), optedOut })
  } catch (error) {
    throw createError({
      statusCode: 503,
      statusMessage: 'Contact temporarily unavailable',
      cause: error,
    })
  }
  if (!contact) throw createError({ statusCode: 404, statusMessage: 'Contact not found' })
  return contact
})
