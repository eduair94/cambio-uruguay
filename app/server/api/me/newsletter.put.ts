// Update the current user's newsletter channel preferences. Toggling email also
// syncs a confirmed NewsletterSubscriber for their address — no double opt-in, so only when
// Firebase has verified that address: an email/password account can be opened with anyone's
// address, and this switch must not subscribe a stranger (privacy audit, 2026-11-08). Telegram
// requires a linked chat id.
import { requireUser } from '../../utils/auth'
import { adminAuth } from '../../utils/firebaseAdmin'
import { connectDb } from '../../utils/db'
import { UserModel } from '../../models/User'
import { NewsletterSubscriberModel } from '../../models/NewsletterSubscriber'
import { normalizeEmail, newToken, normalizeNewsletterLang } from '../../utils/newsletter'

export default defineEventHandler(async event => {
  const { uid, email } = await requireUser(event)
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
    // Verified according to the account record, not the session: an ID token minted before the
    // address was verified keeps saying "unverified" for up to an hour, and switching off from a
    // device holding one would change the preference without leaving the list (review,
    // 2026-11-08). Same source as the alert emails (tasks/alerts/check.ts).
    // Only "no such account" means unverified. Any other failure answers 503 before anything is
    // set: counting it as unverified switched the preference off while the address stayed on the
    // list, and told a verified user to verify (review, 2026-11-08).
    let record: Awaited<ReturnType<ReturnType<typeof adminAuth>['getUser']>> | null = null
    try {
      record = await adminAuth().getUser(uid)
    } catch (error) {
      if ((error as { code?: string })?.code !== 'auth/user-not-found')
        throw createError({ statusCode: 503, statusMessage: 'account-unavailable' })
    }
    // The address is proven to belong to the account; subscribing also needs it enabled.
    const proven = Boolean(record?.email && record.emailVerified)
    const verified = proven && !record?.disabled
    const addr = normalizeEmail((proven ? record?.email : null) || email || u.email || '')
    if (body.email && !addr) {
      throw createError({ statusCode: 422, statusMessage: 'no-email' })
    }
    if (body.email && !verified) {
      throw createError({ statusCode: 409, statusMessage: 'email-not-verified' })
    }
    u.set('newsletter.email', body.email)
    // The list changes only for a proven address, both ways: switching off used to unsubscribe
    // whatever address the account carried, so an account opened with someone else's address could
    // take that person off the newsletter. Every newsletter email keeps its own unsubscribe link.
    if (addr && (body.email ? verified : proven)) {
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
