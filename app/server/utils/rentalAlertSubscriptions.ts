import { createHash, randomBytes } from 'node:crypto'
import { createError, setResponseHeader, type H3Event } from 'h3'
import { RentalAlertModel, type RentalAlertDoc } from '../models/RentalAlert'
import { RentalAlertQuotaModel } from '../models/RentalAlertQuota'
import { RentalAlertOutboxModel } from '../models/RentalAlertOutbox'
import { withRentalAlertLease } from './rentalAlertLease'
import { prepareRentalAlertBaseline } from './rentalAlertIndex'
import { rentalAlertError, type RentalAlertUser } from './rentalAlertAuth'
import {
  RENTAL_ALERT_LIMIT,
  normalizeRentalAlertFilters,
  rentalAlertRecord,
  rentalAlertSearchUrl,
  rentalAlertSignature,
  RentalAlertValidationError,
  type RentalAlertChannels,
  type RentalAlertSubscription,
  type RentalAlertLocale,
} from '../../utils/rentalAlerts'

export const rentalAlertPublicProjection = {
  _id: 1,
  kind: 1,
  name: 1,
  filters: 1,
  channels: 1,
  frequency: 1,
  active: 1,
  locale: 1,
  createdAt: 1,
  updatedAt: 1,
  lastNotifiedAt: 1,
} as const

/** Explicit nested projection: credentials, recipient addresses and delivery ledgers stay private. */
export function publicRentalAlert(row: RentalAlertDoc): RentalAlertSubscription {
  const filters = normalizeRentalAlertFilters(row.kind, row.filters)
  const locale = row.locale === 'en' || row.locale === 'pt' ? row.locale : 'es'
  return {
    id: String(row._id),
    kind: row.kind,
    name: row.name,
    filters,
    channels: { push: row.channels.push === true, email: row.channels.email === true },
    frequency: row.frequency,
    active: row.active === true,
    locale,
    createdAt: new Date(row.createdAt).toISOString(),
    updatedAt: new Date(row.updatedAt).toISOString(),
    lastNotifiedAt: row.lastNotifiedAt ? new Date(row.lastNotifiedAt).toISOString() : null,
    searchUrl: rentalAlertSearchUrl({ kind: row.kind, filters, locale }),
  }
}

export async function rentalAlertRequest<T>(
  event: H3Event,
  callback: () => Promise<T>
): Promise<T> {
  setResponseHeader(event, 'cache-control', 'no-store, max-age=0')
  setResponseHeader(event, 'x-robots-tag', 'noindex')
  setResponseHeader(event, 'referrer-policy', 'no-referrer')
  try {
    return await callback()
  } catch (error) {
    if (error instanceof RentalAlertValidationError)
      throw createError({ statusCode: 400, statusMessage: error.code, data: { code: error.code } })
    const known = error as { statusCode?: number; data?: { code?: string } }
    const statusCode =
      known.statusCode && known.statusCode >= 400 && known.statusCode < 600 ? known.statusCode : 503
    const code =
      known.data?.code || (statusCode === 400 ? 'invalid_alert' : 'temporarily_unavailable')
    throw createError({ statusCode, statusMessage: code, data: { code } })
  }
}

function bodyRecord(body: unknown, fields: string[]): Record<string, unknown> {
  if (
    !rentalAlertRecord(body) ||
    JSON.stringify(body).length > 16000 ||
    Object.keys(body).some(key => !fields.includes(key))
  )
    throw rentalAlertError('invalid_alert')
  return body
}

function channelsValue(input: unknown): RentalAlertChannels {
  if (
    !rentalAlertRecord(input) ||
    Object.keys(input).some(key => !['push', 'email'].includes(key)) ||
    typeof input.push !== 'boolean' ||
    typeof input.email !== 'boolean'
  )
    throw rentalAlertError('invalid_alert')
  return { push: input.push, email: input.email }
}

function requireChannels(user: RentalAlertUser, channels: RentalAlertChannels): void {
  const caps = user.capabilities
  if (!caps.accountEligible) throw rentalAlertError('account_required', 403)
  if (!channels.push && !channels.email) throw rentalAlertError('invalid_alert')
  if (channels.email && !caps.emailAvailable) throw rentalAlertError('email_unavailable', 503)
  if (channels.email && !caps.emailVerified) throw rentalAlertError('email_unverified', 409)
  if (channels.push && !caps.pushAvailable) throw rentalAlertError('push_unavailable', 503)
  if (channels.push && !caps.pushRegistered) throw rentalAlertError('push_not_registered', 409)
}

function nameValue(value: unknown, fallback: string): string {
  if (value === undefined) return fallback
  if (typeof value === 'string' && !value.trim()) return fallback
  if (
    typeof value !== 'string' ||
    !value.trim() ||
    value.trim().length > 80 ||
    [...value].some(character => character.charCodeAt(0) < 32)
  )
    throw rentalAlertError('invalid_alert')
  return value.trim()
}

function frequencyValue(value: unknown): 'hourly' | 'daily' {
  if (value !== 'hourly' && value !== 'daily') throw rentalAlertError('invalid_alert')
  return value
}

function defaultName(kind: string, locale: RentalAlertLocale): string {
  return kind === 'rental-search'
    ? { es: 'Nuevos alquileres', en: 'New rentals', pt: 'Novos aluguéis' }[locale]
    : {
        es: 'Oportunidades de alquiler',
        en: 'Rental opportunities',
        pt: 'Oportunidades de aluguel',
      }[locale]
}

export async function listRentalAlertSubscriptions(user: RentalAlertUser) {
  const items = await RentalAlertModel.find({ uid: user.uid })
    .select(rentalAlertPublicProjection)
    .sort({ createdAt: -1 })
    .limit(RENTAL_ALERT_LIMIT)
    .lean()
  return {
    items: items.map(publicRentalAlert),
    capabilities: user.capabilities,
    limit: RENTAL_ALERT_LIMIT,
  }
}

export async function createRentalAlertSubscription(user: RentalAlertUser, input: unknown) {
  const body = bodyRecord(input, ['kind', 'name', 'filters', 'channels', 'frequency', 'locale'])
  if (body.kind !== 'rental-search' && body.kind !== 'rental-opportunity')
    throw rentalAlertError('invalid_alert')
  const kind = body.kind
  const filters = normalizeRentalAlertFilters(kind, body.filters)
  const channels = channelsValue(body.channels)
  requireChannels(user, channels)
  const frequency = frequencyValue(body.frequency)
  if (body.locale !== undefined && !['es', 'en', 'pt'].includes(String(body.locale)))
    throw rentalAlertError('invalid_alert')
  const locale: RentalAlertLocale =
    body.locale === 'en' || body.locale === 'pt' ? body.locale : 'es'
  const name = nameValue(body.name, defaultName(kind, locale))
  const fingerprint = createHash('sha256').update(rentalAlertSignature(kind, filters)).digest('hex')
  return withRentalAlertLease(`uid:${user.uid}`, async assertOwned => {
    const existing = await RentalAlertModel.findOne({ uid: user.uid, fingerprint }).lean()
    if (existing) return { item: publicRentalAlert(existing), alreadyExists: true }
    if ((await RentalAlertModel.countDocuments({ uid: user.uid })) >= RENTAL_ALERT_LIMIT)
      throw rentalAlertError('limit_reached', 409)
    const now = Date.now()
    const quota = await RentalAlertQuotaModel.findOneAndUpdate(
      { _id: `${user.uid}:${Math.floor(now / 60000)}` },
      { $inc: { attempts: 1 }, $setOnInsert: { expiresAt: new Date(now + 180000) } },
      { upsert: true, new: true }
    ).lean()
    if ((quota?.attempts || 0) > 10) throw rentalAlertError('too_many_requests', 429)
    const startsAt = await prepareRentalAlertBaseline(kind)
    await assertOwned()
    const row = await RentalAlertModel.create({
      uid: user.uid,
      kind,
      name,
      filters,
      fingerprint,
      channels,
      frequency,
      locale,
      active: true,
      startsAt,
      revision: 1,
      cursorAt: null,
      cursorId: '',
      emailAddress: channels.email ? user.capabilities.email : null,
      unsubscribeToken: randomBytes(32).toString('hex'),
    })
    return { item: publicRentalAlert(row), alreadyExists: false }
  })
}

function requireId(id: string | undefined): string {
  if (!id || !/^[a-f\d]{24}$/i.test(id)) throw rentalAlertError('not_found', 404)
  return id
}

export async function updateRentalAlertSubscription(
  user: RentalAlertUser,
  id: string | undefined,
  input: unknown
) {
  const key = requireId(id)
  const body = bodyRecord(input, ['active', 'channels', 'frequency', 'name'])
  if (!Object.keys(body).length || (body.active !== undefined && typeof body.active !== 'boolean'))
    throw rentalAlertError('invalid_alert')
  return withRentalAlertLease(`uid:${user.uid}`, async assertOwned => {
    const row = await RentalAlertModel.findOne({ _id: key, uid: user.uid }).lean()
    if (!row) throw rentalAlertError('not_found', 404)
    const channels = body.channels === undefined ? row.channels : channelsValue(body.channels)
    let active = body.active === undefined ? row.active : body.active === true
    if (!channels.push && !channels.email) {
      if (body.active === true) throw rentalAlertError('invalid_alert')
      active = false
    }
    const enabling = {
      push: channels.push && !row.channels.push,
      email: channels.email && !row.channels.email,
    }
    const reactivating = !row.active && active
    // Removing consent must work even when the remaining channel is unavailable.
    // Existing pending work for that remaining channel keeps its original boundary.
    if (reactivating) requireChannels(user, channels)
    else if (enabling.push || enabling.email) requireChannels(user, enabling)
    const patch: Record<string, unknown> = {
      name: nameValue(body.name, row.name),
      frequency: body.frequency === undefined ? row.frequency : frequencyValue(body.frequency),
      active,
      channels,
    }
    if (reactivating || enabling.push || enabling.email) {
      patch.startsAt = await prepareRentalAlertBaseline(row.kind)
      patch.cursorAt = null
      patch.cursorId = ''
    }
    if (!channels.email) patch.emailAddress = null
    if (enabling.email || (reactivating && channels.email)) {
      patch.emailAddress = user.capabilities.email
      patch.unsubscribeToken = randomBytes(32).toString('hex')
    }
    if (active !== row.active || enabling.push || enabling.email) patch.revision = row.revision + 1
    await assertOwned()
    const updated = await RentalAlertModel.findOneAndUpdate(
      { _id: key, uid: user.uid, revision: row.revision },
      { $set: patch },
      { new: true }
    ).lean()
    if (!updated) throw rentalAlertError('temporarily_unavailable', 503)
    return { item: publicRentalAlert(updated) }
  })
}

export async function deleteRentalAlertSubscription(user: RentalAlertUser, id: string | undefined) {
  const key = requireId(id)
  return withRentalAlertLease(`uid:${user.uid}`, async assertOwned => {
    await assertOwned()
    await RentalAlertModel.deleteOne({ _id: key, uid: user.uid })
    await RentalAlertOutboxModel.deleteMany({ alertId: key, uid: user.uid })
    return { ok: true }
  })
}
