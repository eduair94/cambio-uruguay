// An answer from the rental directory: the micro-survey, the suggestion box or the survey reached
// from an alert email or the newsletter. Anonymous, like the newsletter signup: a honeypot, a
// per-IP limit kept in memory (no IP is stored) and closed lists for every answer
// (utils/rentalFeedback.ts). An answer that came from an alert keeps that alert's zone, and answering
// the same survey again from a later email updates the first answer instead of adding a second.
//
// The micro-survey posts on the first tap (Sí / En parte / No) and gets the row's id back: what
// fell short and the comment come later, if at all, through PATCH /api/rental-feedback/:id, which
// only the same browser can send within FEEDBACK_FOLLOW_UP_MINUTES.
import { isValidObjectId } from 'mongoose'
import { connectDb } from '../../utils/db'
import { RentalFeedbackModel } from '../../models/RentalFeedback'
import { RentalAlertModel } from '../../models/RentalAlert'
import { carContactRateOk } from '../../utils/carContacts'
import { noticeRentalFeedback } from '../../utils/rentalFeedbackNotice'
import { sanitizeRentalFeedback, type RentalFeedbackInput } from '../../../utils/rentalFeedback'

const perMinute = new Map<string, { count: number; resetAt: number }>()
const perDay = new Map<string, { count: number; resetAt: number }>()

function alertZone(filters: Record<string, string> | undefined): string | null {
  if (!filters) return null
  const places = [filters.neighborhoods || filters.neighborhood || '', filters.department || '']
    .map(value => String(value).replace(/,/g, ', ').trim())
    .filter(Boolean)
  return places.length ? places.join(' · ').slice(0, 200) : null
}

export default defineEventHandler(async event => {
  setResponseHeaders(event, {
    'cache-control': 'no-store',
    'x-robots-tag': 'noindex',
    'referrer-policy': 'no-referrer',
  })
  const body = await readBody<RentalFeedbackInput & { website?: string }>(event)
  // Honeypot: a person never sees the field.
  if (body?.website) return { ok: true }

  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (
    !carContactRateOk(perMinute, ip, 5, 60_000) ||
    !carContactRateOk(perDay, ip, 30, 86_400_000)
  ) {
    throw createError({ statusCode: 429, statusMessage: 'Too many answers' })
  }

  const result = sanitizeRentalFeedback(body ?? {})
  if ('error' in result)
    throw createError({ statusCode: 400, statusMessage: `Invalid feedback: ${result.error}` })
  const record = result.record

  await connectDb()
  let alertKind: string | null = null
  if (record.alertId && isValidObjectId(record.alertId)) {
    const alert = await RentalAlertModel.findById(record.alertId, { kind: 1, filters: 1 }).lean()
    if (alert) {
      alertKind = alert.kind
      record.zone = alertZone(alert.filters as Record<string, string>)
    } else {
      record.alertId = null
    }
  }

  const doc = { ...record, alertKind }
  let id: string | null = null
  if (record.kind === 'survey' && record.alertId) {
    await RentalFeedbackModel.updateOne(
      { kind: 'survey', surveyVersion: record.surveyVersion, alertId: record.alertId },
      { $set: doc },
      { upsert: true }
    )
  } else {
    const created = await RentalFeedbackModel.create(doc)
    id = String(created._id)
  }

  noticeRentalFeedback(record)
  // Only the micro-survey completes its row later; the other kinds are whole when they arrive.
  return record.kind === 'micro' && id ? { ok: true, id } : { ok: true }
})
