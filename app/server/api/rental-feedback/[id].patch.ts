// The follow-up to a one-tap rental answer: what fell short (closed list) and a comment, written
// on the row the tap created (POST /api/rental-feedback returned its id). Only that row, only from
// the browser that tapped (its random clientId must match), only a `micro` answer and only within
// FEEDBACK_FOLLOW_UP_MINUTES of it: anything else is a 404, the same answer an unknown id gets.
// Same honeypot and same per-IP limits as the POST, kept in memory; no IP is stored.
import { connectDb } from '../../utils/db'
import { RentalFeedbackModel } from '../../models/RentalFeedback'
import { carContactRateOk } from '../../utils/carContacts'
import { noticeRentalFeedback } from '../../utils/rentalFeedbackNotice'
import {
  FEEDBACK_FOLLOW_UP_MINUTES,
  isFeedbackId,
  sanitizeRentalFeedbackFollowUp,
  type RentalFeedbackFollowUpInput,
} from '../../../utils/rentalFeedback'

const perMinute = new Map<string, { count: number; resetAt: number }>()
const perDay = new Map<string, { count: number; resetAt: number }>()

export default defineEventHandler(async event => {
  setResponseHeaders(event, {
    'cache-control': 'no-store',
    'x-robots-tag': 'noindex',
    'referrer-policy': 'no-referrer',
  })
  const body = await readBody<RentalFeedbackFollowUpInput & { website?: string }>(event)
  // Honeypot: a person never sees the field.
  if (body?.website) return { ok: true }

  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (
    !carContactRateOk(perMinute, ip, 5, 60_000) ||
    !carContactRateOk(perDay, ip, 30, 86_400_000)
  ) {
    throw createError({ statusCode: 429, statusMessage: 'Too many answers' })
  }

  const id = getRouterParam(event, 'id')
  if (!isFeedbackId(id)) throw createError({ statusCode: 404, statusMessage: 'Answer not found' })
  const result = sanitizeRentalFeedbackFollowUp(body ?? {})
  if ('error' in result)
    throw createError({ statusCode: 400, statusMessage: `Invalid follow-up: ${result.error}` })
  const { clientId, reasons, comment } = result.followUp

  await connectDb()
  const before = await RentalFeedbackModel.findOneAndUpdate(
    {
      _id: id,
      kind: 'micro',
      clientId,
      createdAt: { $gte: new Date(Date.now() - FEEDBACK_FOLLOW_UP_MINUTES * 60_000) },
    },
    { $set: { reasons, comment } },
    {
      returnDocument: 'before',
      projection: { kind: 1, surface: 1, zone: 1, propertyKey: 1, found: 1, comment: 1 },
    }
  ).lean()
  if (!before) throw createError({ statusCode: 404, statusMessage: 'Answer not found' })

  // A comment sent again unchanged (a double tap on "Enviar") does not notify twice.
  if (comment && comment !== before.comment) noticeRentalFeedback({ ...before, reasons, comment })
  return { ok: true }
})
