// Aviso de un tema, paso 1 de la doble confirmación (server/utils/topics.ts). Mismo contrato que
// /api/newsletter/subscribe: honeypot, límite por IP, 503 sin correo configurado y siempre
// { ok: true } para no revelar si una dirección ya estaba.
import { connectDb } from '../../utils/db'
import { TopicSubscriptionModel } from '../../models/TopicSubscription'
import { isMailerConfigured, sendMail } from '../../utils/mailer'
import {
  isValidEmail,
  newToken,
  normalizeEmail,
  normalizeNewsletterLang,
} from '../../utils/newsletter'
import { buildTopicConfirmEmail, isTopic, topicState } from '../../utils/topics'

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
  const body = await readBody<{
    email?: string
    topic?: string
    locale?: string
    website?: string
  }>(event)
  if (body?.website) return { ok: true }
  if (!isTopic(body?.topic)) throw createError({ statusCode: 400, statusMessage: 'Unknown topic' })
  const topic = body.topic
  const email = normalizeEmail(body?.email ?? '')
  if (!isValidEmail(email)) throw createError({ statusCode: 400, statusMessage: 'Invalid email' })
  if (!isMailerConfigured()) {
    throw createError({ statusCode: 503, statusMessage: 'Notices temporarily unavailable' })
  }
  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  if (!rateOk(ip)) throw createError({ statusCode: 429, statusMessage: 'Too many requests' })

  const lang = normalizeNewsletterLang(body?.locale)
  await connectDb()
  const existing = await TopicSubscriptionModel.findOne({ email, topic })
  if (existing?.status === 'confirmed') return { ok: true }

  const confirmToken = newToken()
  // Lo que ya salió cuando se pide el aviso no se avisa: se marca como avisado de entrada.
  const current = topicState(topic)
  await TopicSubscriptionModel.updateOne(
    { email, topic },
    {
      $set: { language: lang, status: 'pending', confirmToken },
      $setOnInsert: {
        email,
        topic,
        unsubToken: newToken(),
        notified: current === 'pendiente' ? [] : [current],
      },
    },
    { upsert: true }
  )

  const origin = getRequestURL(event).origin
  const built = buildTopicConfirmEmail(
    topic,
    lang,
    `${origin}/api/topics/confirm?token=${confirmToken}`
  )
  try {
    await sendMail({ to: email, subject: built.subject, html: built.html, text: built.text })
  } catch (err) {
    console.error('topic confirmation send failed:', err)
    throw createError({ statusCode: 502, statusMessage: 'Could not send confirmation email' })
  }
  return { ok: true }
})
