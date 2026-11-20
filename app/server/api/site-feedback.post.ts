// The site-wide suggestion box, bug report and "¿Te sirvió esta página?" (utils/siteFeedback.ts).
// Anonymous, like the newsletter signup and the rental feedback: a honeypot, a per-IP limit kept in
// memory (no IP is stored) and closed lists for every field.
//
// Every answer is stored (`sitefeedbacks`). One that carries a message is also emailed to the owner
// (runtimeConfig.feedback.to, set only in the server's .env: the repo is public) with Reply-To set
// to the person's address when they left one, and announced on the admin Telegram chat. A one-tap
// vote is only stored: an email per tap would bury the messages that need reading.
//
// The mail is sent after the answer is stored and never fails the request: losing the email must
// not lose the feedback, and the person should not see an error for our SMTP.
import { connectDb } from '../utils/db'
import { SiteFeedbackModel } from '../models/SiteFeedback'
import { carContactRateOk } from '../utils/carContacts'
import { isMailerConfigured, sendMail } from '../utils/mailer'
import { escapeTelegramMarkdown, sendTelegram } from '../utils/telegram'
import {
  feedbackEmail,
  needsAttention,
  sanitizeFeedback,
  type FeedbackInput,
} from '../../utils/siteFeedback'

const perMinute = new Map<string, { count: number; resetAt: number }>()
const perDay = new Map<string, { count: number; resetAt: number }>()
/** Shared cap on emails + Telegram notices, so a burst cannot flood the inbox. */
const notices = new Map<string, { count: number; resetAt: number }>()

const SITE_URL = 'https://cambio-uruguay.com'

export default defineEventHandler(async event => {
  setResponseHeaders(event, {
    'cache-control': 'no-store',
    'x-robots-tag': 'noindex',
    'referrer-policy': 'no-referrer',
  })
  const body = await readBody<FeedbackInput & { website?: string }>(event)
  // Honeypot: a person never sees the field.
  if (body?.website) return { ok: true }

  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (
    !carContactRateOk(perMinute, ip, 6, 60_000) ||
    !carContactRateOk(perDay, ip, 40, 86_400_000)
  ) {
    throw createError({ statusCode: 429, statusMessage: 'Too many answers' })
  }

  const result = sanitizeFeedback(body ?? {})
  if ('error' in result)
    throw createError({ statusCode: 400, statusMessage: `Invalid feedback: ${result.error}` })
  const record = result.record
  const userAgent = record.tech
    ? String(getRequestHeader(event, 'user-agent') || '').slice(0, 300) || null
    : null

  await connectDb()
  const created = await SiteFeedbackModel.create({ ...record, userAgent, emailed: false })

  if (needsAttention(record) && carContactRateOk(notices, 'owner', 30, 3_600_000)) {
    const config = useRuntimeConfig()
    const to = String((config.feedback as { to?: string } | undefined)?.to || '')
    const mail = feedbackEmail(record, { siteUrl: SITE_URL, userAgent, at: created.createdAt })
    if (to && isMailerConfigured()) {
      sendMail({ to, ...mail, ...(record.email ? { replyTo: record.email } : {}) })
        .then(() => SiteFeedbackModel.updateOne({ _id: created._id }, { emailed: true }))
        .catch(error => console.error('[site-feedback] email failed', error))
    }
    const chatId = String(config.telegram?.adminChatId || '')
    if (chatId) {
      void sendTelegram(
        chatId,
        escapeTelegramMarkdown(`${mail.subject}\n\n${record.message.slice(0, 1500)}`)
      )
    }
  }

  return { ok: true }
})
