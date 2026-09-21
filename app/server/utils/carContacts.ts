// La frontera pública del teléfono de un aviso de autos. Se rearma campo por campo y se revalida
// todo —número, URL de procedencia, antigüedad, bajas— sin confiar en lo que quedó en la base.
// Política: docs/app/AUTOS_CONTACTOS.md.
import { createHash } from 'node:crypto'
import { CAR_SOURCE_RULES, CAR_SOURCES_PUBLIC, carSafePermalink } from '../../utils/cars'
import type { PublicCarContact, PublicCarSource } from '../../utils/carsPublic'

export const CAR_CONTACT_MAX_AGE_DAYS = 21
const VALID = /^(?:\+598(?:9[1-9]\d{6}|[24]\d{7})|0800\d{4})$/

/** Igual que classes/autos/contacts/optout.ts; un test compara las dos. */
export const carContactHash = (value: string): string =>
  createHash('sha256').update(`car-contact:${value}`).digest('hex')

/** Igual que classes/autos/contacts/phones.ts. */
export function displayCarPhone(value: string): string {
  if (/^0800\d{4}$/.test(value)) return `0800 ${value.slice(4)}`
  const national = value.replace(/^\+598/, '')
  if (/^9\d{7}$/.test(national))
    return `0${national.slice(0, 2)} ${national.slice(2, 5)} ${national.slice(5)}`
  if (/^[24]\d{7}$/.test(national)) return `${national.slice(0, 4)} ${national.slice(4)}`
  return value
}

type Loose = Record<string, any>

export function publicCarContact(
  doc: Loose | null,
  row: Loose | null,
  options: { now: Date; optedOut: ReadonlySet<string> }
): PublicCarContact | null {
  if (!doc || !row || typeof doc.key !== 'string' || doc.key !== row.key) return null
  const source = row.source as PublicCarSource
  // Facebook se lee con sesión: su texto no es una fuente de teléfonos, pase lo que pase en la base.
  if (!CAR_SOURCES_PUBLIC.includes(source) || source === 'facebook') return null
  const observed = Date.parse(String(doc.observedAt ?? ''))
  if (
    !Number.isFinite(observed) ||
    options.now.getTime() - observed > CAR_CONTACT_MAX_AGE_DAYS * 86_400_000
  )
    return null
  const origin =
    doc.origin === 'advert_text' || doc.origin === 'dealer_site'
      ? (doc.origin as PublicCarContact['origin'])
      : null
  // "dealer_site": la página de contacto de la automotora dueña del número. Vale para los avisos de su
  // propia web y para los de Mercado Libre de una cuenta reconocida por los autos que comparte con esa
  // web, que tienen que traer esa evidencia (classes/autos/contacts/accounts.ts).
  const dealer =
    origin === 'dealer_site'
      ? CAR_SOURCES_PUBLIC.find(
          item =>
            !!CAR_SOURCE_RULES[item].contactPage &&
            CAR_SOURCE_RULES[item].contactPage === doc.sourceUrl
        )
      : undefined
  const accountTwins =
    Number.isInteger(doc.accountTwins) && doc.accountTwins > 0 ? Number(doc.accountTwins) : null
  if (origin === 'dealer_site') {
    if (!dealer) return null
    if (source !== dealer && !(source === 'mercadolibre' && accountTwins)) return null
  }
  const expectedUrl =
    origin === 'advert_text'
      ? carSafePermalink(source, row.permalink)
      : dealer
        ? CAR_SOURCE_RULES[dealer].contactPage
        : null
  if (!origin || !expectedUrl || doc.sourceUrl !== expectedUrl) return null
  const phones = (Array.isArray(doc.phones) ? doc.phones : [])
    .map((phone: Loose) => String(phone?.value ?? ''))
    .filter((value: string) => VALID.test(value) && !options.optedOut.has(carContactHash(value)))
    .slice(0, 4)
    .map((value: string) => ({
      value,
      display: displayCarPhone(value),
      // WhatsApp sólo para celulares: se decide por el número, no por lo que diga la base.
      mobile: value.startsWith('+5989'),
    }))
  if (!phones.length) return null
  return {
    key: doc.key,
    origin,
    phones,
    sourceUrl: expectedUrl,
    observedAt: new Date(observed).toISOString(),
    dealerName: dealer ? CAR_SOURCE_RULES[dealer].name : null,
    accountTwins: dealer && source === 'mercadolibre' ? accountTwins : null,
  }
}

/**
 * Límite por IP en memoria. La app corre en cluster ×2 bajo pm2, así que es por proceso: frena el
 * barrido automático de la base, no pretende ser exacto.
 */
export function carContactRateOk(
  bucket: Map<string, { count: number; resetAt: number }>,
  ip: string,
  limit: number,
  windowMs: number,
  now = Date.now()
): boolean {
  const record = bucket.get(ip)
  if (!record || record.resetAt <= now) {
    if (bucket.size > 5_000)
      for (const [key, value] of bucket) if (value.resetAt <= now) bucket.delete(key)
    bucket.set(ip, { count: 1, resetAt: now + windowMs })
    return true
  }
  record.count++
  return record.count <= limit
}
