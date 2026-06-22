// Newsletter signup (double opt-in step 1). Validates + normalizes the email,
// upserts a `pending` subscriber with a fresh confirm token, and emails a
// confirmation link. Always returns { ok: true } (no address enumeration).
import { connectDb } from '../../utils/db'
import { NewsletterSubscriberModel } from '../../models/NewsletterSubscriber'
import { isMailerConfigured, sendMail } from '../../utils/mailer'
import {
  buildConfirmEmail,
  isValidEmail,
  newToken,
  normalizeEmail,
  normalizeNewsletterLang,
} from '../../utils/newsletter'

// Light in-memory per-IP rate limit (best-effort; resets on server restart).
const hits = new Map<string, { count: number; resetAt: number }>()
const WINDOW_MS = 60_000
const MAX_PER_WINDOW = 5

function rateOk(ip: string): boolean {
  const now = Date.now()
  const rec = hits.get(ip)
  if (!rec || now > rec.resetAt) {
    hits.set(ip, { count: 1, resetAt: now + WINDOW_MS })
    return true
  }
  rec.count += 1
  return rec.count <= MAX_PER_WINDOW
}

export default defineEventHandler(async event => {
  const body = await readBody<{ email?: string; locale?: string; website?: string }>(event)

  // Honeypot: bots fill hidden fields. Pretend success, do nothing.
  if (body?.website) return { ok: true }

  const email = normalizeEmail(body?.email ?? '')
  if (!isValidEmail(email)) {
    throw createError({ statusCode: 400, statusMessage: 'Invalid email' })
  }
  if (!isMailerConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'Newsletter temporarily unavailable' })
  }

  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (!rateOk(ip)) {
    throw createError({ statusCode: 429, statusMessage: 'Too many requests' })
  }

  const lang = normalizeNewsletterLang(body?.locale)
  await connectDb()

  const existing = await NewsletterSubscriberModel.findOne({ email })
  // Already confirmed → do nothing (don't re-send, don't leak status).
  if (existing?.status === 'confirmed') return { ok: true }

  const confirmToken = newToken()
  const unsubToken = existing?.unsubToken || newToken()
  await NewsletterSubscriberModel.updateOne(
    { email },
    {
      $set: { language: lang, status: 'pending', confirmToken, unsubToken },
      $setOnInsert: { email },
    },
    { upsert: true }
  )

  const origin = getRequestURL(event).origin
  const confirmUrl = `${origin}/api/newsletter/confirm?token=${confirmToken}`
  const built = buildConfirmEmail(lang, confirmUrl)
  try {
    await sendMail({ to: email, subject: built.subject, html: built.html, text: built.text })
  } catch (err) {
    console.error('newsletter confirmation send failed:', err)
    throw createError({ statusCode: 502, statusMessage: 'Could not send confirmation email' })
  }

  return { ok: true }
})
