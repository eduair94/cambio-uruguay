import { createHash, randomUUID } from 'node:crypto'
import { createError, setResponseHeader, type H3Event } from 'h3'
import {
  RENTAL_AVAILABILITY_DAYS,
  emptyRentalAvailability,
  rentalAvailabilityAdvertId,
  type RentalAvailabilityAdvert,
  type RentalAvailabilityMutation,
  type RentalAvailabilityOwnState,
} from '../../utils/rentalAvailability'
import {
  RentalAvailabilityQuotaModel,
  RentalAvailabilityReportModel,
  type RentalAvailabilityReportDoc,
} from '../models/RentalAvailabilityReport'
import { connectDb } from './db'
import { withRentalAlertLease } from './rentalAlertLease'
import { rentalAvailabilityError, type RentalAvailabilityUser } from './rentalAvailabilityAuth'
import type { RentalAvailabilityOwner } from './rentalAvailabilityIdentity'
import {
  invalidateRentalAvailabilityIndex,
  loadAvailabilityOwners,
  loadRentalAvailabilityIndex,
} from './rentalAvailabilityIndex'

interface Input extends RentalAvailabilityAdvert {
  advertId: string
  revision: string | null
}
function inputValue(input: unknown, mutation = false): Input {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    throw rentalAvailabilityError('invalid_report')
  const value = input as Record<string, unknown>
  if (
    Object.keys(value).some(
      key => !['source', 'listingId', ...(mutation ? ['revision'] : [])].includes(key)
    )
  )
    throw rentalAvailabilityError('invalid_report')
  const advertId = rentalAvailabilityAdvertId(value.source, value.listingId)
  if (!advertId) throw rentalAvailabilityError('invalid_report')
  // Queries encode null as an empty string; omitted revisions are never accepted for mutations.
  const revision = value.revision === '' ? null : value.revision
  if (
    mutation &&
    revision !== null &&
    !(typeof revision === 'string' && /^[\da-f]{8}(?:-[\da-f]{4}){3}-[\da-f]{12}$/i.test(revision))
  )
    throw rentalAvailabilityError('invalid_report')
  const source = value.source as RentalAvailabilityAdvert['source']
  return {
    source,
    advertId,
    listingId: advertId.slice(`rent:${source}:`.length),
    revision: typeof revision === 'string' ? revision : null,
  }
}

export function rentalAvailabilityReportId(uid: string, advertId: string): string {
  return createHash('sha256')
    .update(JSON.stringify([uid, advertId]))
    .digest('hex')
}
const reportLive = (row: RentalAvailabilityReportDoc, now: Date) =>
  !row.withdrawnAt &&
  new Date(row.reportedAt).getTime() <= now.getTime() &&
  new Date(row.expiresAt).getTime() > now.getTime()

export function rentalAvailabilityOwnState(
  row: RentalAvailabilityReportDoc | null,
  owner: RentalAvailabilityOwner | undefined,
  now = new Date()
): RentalAvailabilityOwnState {
  const live = row ? reportLive(row, now) : false
  return {
    revision: row?.revision || null,
    // Withdrawal remains available even when the public advert disappears or changes identity.
    reported: live,
    expiresAt: row ? new Date(row.expiresAt).toISOString() : null,
    canReport: !!owner && !live,
  }
}

async function findOwn(user: RentalAvailabilityUser, input: Input) {
  return RentalAvailabilityReportModel.findOne({
    _id: rentalAvailabilityReportId(user.uid, input.advertId),
    uid: user.uid,
  })
    .select('+uid +evidence')
    .lean()
}

export async function getRentalAvailabilityPublic(input: unknown) {
  const advert = inputValue(input)
  await connectDb()
  const [owners, index] = await Promise.all([
    loadAvailabilityOwners([advert]),
    loadRentalAvailabilityIndex(),
  ])
  const owner = owners.get(advert.advertId)
  return {
    summary: owner ? index.summaryForOffers([advert], owner.key) : emptyRentalAvailability(),
    currentPropertyKey: owner?.key || null,
  }
}

export async function getRentalAvailabilityOwnState(user: RentalAvailabilityUser, input: unknown) {
  const advert = inputValue(input)
  await connectDb()
  const [row, owners] = await Promise.all([findOwn(user, advert), loadAvailabilityOwners([advert])])
  return rentalAvailabilityOwnState(row, owners.get(advert.advertId))
}

/** Atomic counters persist across Nitro workers and restarts; only a genuinely new observation costs quota. */
async function consumeQuota(uid: string, now: Date) {
  const ownerHash = createHash('sha256').update(uid).digest('hex')
  for (const [windowMs, limit] of [
    [60_000, 5],
    [86_400_000, 30],
  ] as const) {
    const window = Math.floor(now.getTime() / windowMs)
    const value = await RentalAvailabilityQuotaModel.findOneAndUpdate(
      { _id: `${ownerHash}:${windowMs}:${window}` },
      { $inc: { attempts: 1 }, $setOnInsert: { expiresAt: new Date((window + 2) * windowMs) } },
      { upsert: true, new: true }
    ).lean()
    if (!value || value.attempts > limit) throw rentalAvailabilityError('rate_limited', 429)
  }
}

async function mutationResult(
  row: RentalAvailabilityReportDoc | null,
  input: Input
): Promise<RentalAvailabilityMutation> {
  invalidateRentalAvailabilityIndex()
  const [index, owners] = await Promise.all([
    loadRentalAvailabilityIndex(),
    loadAvailabilityOwners([input]),
  ])
  const owner = owners.get(input.advertId)
  const state = rentalAvailabilityOwnState(row, owner)
  return {
    revision: state.revision,
    reported: state.reported,
    expiresAt: state.expiresAt,
    summary: owner ? index.summaryForOffers([input], owner.key) : emptyRentalAvailability(),
  }
}

export async function reportRentalAvailability(user: RentalAvailabilityUser, input: unknown) {
  const advert = inputValue(input, true)
  return withRentalAlertLease(`rental-availability:uid:${user.uid}`, async assertOwned => {
    const now = new Date()
    const [row, owners] = await Promise.all([
      findOwn(user, advert),
      loadAvailabilityOwners([advert], now),
    ])
    if ((row?.revision || null) !== advert.revision)
      throw rentalAvailabilityError('report_changed', 409)
    const owner = owners.get(advert.advertId)
    if (!owner) throw rentalAvailabilityError('advert_unavailable', 409)
    // An active POST is idempotent even if the browser deliberately repeats the current revision.
    if (row && reportLive(row, now)) return mutationResult(row, advert)
    await consumeQuota(user.uid, now)
    await assertOwned()
    const next: RentalAvailabilityReportDoc = {
      _id: rentalAvailabilityReportId(user.uid, advert.advertId),
      uid: user.uid,
      advertId: advert.advertId,
      source: advert.source,
      listingId: advert.listingId,
      revision: randomUUID(),
      evidence: owner.evidence,
      reportedAt: now,
      expiresAt: new Date(now.getTime() + RENTAL_AVAILABILITY_DAYS * 86_400_000),
      withdrawnAt: null,
    }
    if (row) {
      const result = await RentalAvailabilityReportModel.updateOne(
        { _id: row._id, uid: user.uid, revision: advert.revision },
        { $set: next }
      )
      if (!result.matchedCount) throw rentalAvailabilityError('report_changed', 409)
    } else {
      try {
        await RentalAvailabilityReportModel.create(next)
      } catch (error) {
        if ((error as { code?: number }).code === 11000)
          throw rentalAvailabilityError('report_changed', 409)
        throw error
      }
    }
    return mutationResult(next, advert)
  })
}

export async function withdrawRentalAvailability(user: RentalAvailabilityUser, input: unknown) {
  const advert = inputValue(input, true)
  return withRentalAlertLease(`rental-availability:uid:${user.uid}`, async assertOwned => {
    const row = await findOwn(user, advert)
    if ((row?.revision || null) !== advert.revision)
      throw rentalAvailabilityError('report_changed', 409)
    // Withdrawal is always possible for the owner, including a removed or ambiguous advert.
    if (!row || row.withdrawnAt) return mutationResult(row, advert)
    await assertOwned()
    const next = { ...row, withdrawnAt: new Date(), revision: randomUUID() }
    const result = await RentalAvailabilityReportModel.updateOne(
      { _id: row._id, uid: user.uid, revision: advert.revision },
      { $set: { withdrawnAt: next.withdrawnAt, revision: next.revision } }
    )
    if (!result.matchedCount) throw rentalAvailabilityError('report_changed', 409)
    return mutationResult(next, advert)
  })
}

export async function rentalAvailabilityRequest<T>(
  event: H3Event,
  callback: () => Promise<T>
): Promise<T> {
  setResponseHeader(event, 'cache-control', 'no-store, max-age=0')
  setResponseHeader(event, 'x-robots-tag', 'noindex')
  setResponseHeader(event, 'referrer-policy', 'no-referrer')
  try {
    return await callback()
  } catch (error) {
    const known = error as { statusCode?: number; data?: { code?: string } }
    const statusCode =
      known.statusCode && known.statusCode >= 400 && known.statusCode < 600 ? known.statusCode : 503
    const code = known.data?.code || 'temporarily_unavailable'
    throw createError({ statusCode, statusMessage: code, data: { code } })
  }
}
