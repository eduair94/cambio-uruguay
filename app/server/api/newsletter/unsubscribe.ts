// One-click unsubscribe by token. Handles GET (link click → redirect to a
// localized goodbye page) and POST (RFC 8058 List-Unsubscribe-Post → 200 OK).
import { connectDb } from '../../utils/db'
import { NewsletterSubscriberModel } from '../../models/NewsletterSubscriber'

function localePrefix(lang: string): string {
  return lang === 'en' || lang === 'pt' ? `/${lang}` : ''
}

export default defineEventHandler(async (event) => {
  const token = getQuery(event).token
  if (!token || typeof token !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing token' })
  }
  await connectDb()
  const sub = await NewsletterSubscriberModel.findOne({ unsubToken: token })
  if (sub && sub.status !== 'unsubscribed') {
    sub.status = 'unsubscribed'
    await sub.save()
  }
  const lang = sub?.language || 'es'

  // One-click POST from the mail client: acknowledge with 200, no redirect.
  if (event.method === 'POST') {
    return { ok: true }
  }
  return sendRedirect(event, `${localePrefix(lang)}/newsletter?state=unsubscribed`, 302)
})
