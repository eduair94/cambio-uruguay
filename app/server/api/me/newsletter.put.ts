// Update the current user's newsletter channel preferences. Toggling email also
// syncs a confirmed NewsletterSubscriber for their address — no double opt-in, so only when
// Firebase has verified that address: an email/password account can be opened with anyone's
// address, and this switch must not subscribe a stranger (privacy audit, 2026-11-08). Telegram
// requires a linked chat id.
import { requireUser } from '../../utils/auth'
import { connectDb } from '../../utils/db'
import { UserModel } from '../../models/User'
import { NewsletterSubscriberModel } from '../../models/NewsletterSubscriber'
import { normalizeEmail, newToken, normalizeNewsletterLang } from '../../utils/newsletter'

export default defineEventHandler(async event => {
  const { uid, email, emailVerified } = await requireUser(event)
  const body = await readBody<{ email?: boolean; telegram?: boolean }>(event)
  await connectDb()
  const u = await UserModel.findById(uid).exec()
  if (!u) throw createError({ statusCode: 404, statusMessage: 'User not found' })

  if (typeof body?.telegram === 'boolean') {
    if (body.telegram && !u.telegramChatId) {
      throw createError({ statusCode: 409, statusMessage: 'telegram-not-linked' })
    }
    u.set('newsletter.telegram', body.telegram)
  }

  if (typeof body?.email === 'boolean') {
    const addr = normalizeEmail(email || u.email || '')
    if (body.email && !addr) {
      throw createError({ statusCode: 422, statusMessage: 'no-email' })
    }
    if (body.email && !emailVerified) {
      throw createError({ statusCode: 409, statusMessage: 'email-not-verified' })
    }
    u.set('newsletter.email', body.email)
    // The list changes only for a verified address, both ways: switching off used to unsubscribe
    // whatever address the account carried, so an account opened with someone else's address could
    // take that person off the newsletter. Every newsletter email keeps its own unsubscribe link.
    if (addr && emailVerified) {
      if (body.email) {
        await NewsletterSubscriberModel.updateOne(
          { email: addr },
          {
            $set: {
              status: 'confirmed',
              language: normalizeNewsletterLang(u.settings?.locale),
              confirmedAt: new Date(),
            },
            $setOnInsert: { email: addr, unsubToken: newToken() },
          },
          { upsert: true }
        )
      } else {
        await NewsletterSubscriberModel.updateOne(
          { email: addr },
          { $set: { status: 'unsubscribed' } }
        )
      }
    }
  }

  await u.save()
  return {
    email: Boolean(u.get('newsletter.email')),
    telegram: Boolean(u.get('newsletter.telegram')),
    telegramLinked: Boolean(u.telegramChatId),
  }
})
