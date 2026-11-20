// Authenticated newsletter channel preferences for the current user.
import { requireUser } from '../../utils/auth'
import { connectDb } from '../../utils/db'
import { UserModel } from '../../models/User'
import { NewsletterSubscriberModel } from '../../models/NewsletterSubscriber'
import { normalizeEmail } from '../../utils/newsletter'

export default defineEventHandler(async event => {
  const { uid, email, emailVerified, anonymous } = await requireUser(event)
  await connectDb()
  const u = (await UserModel.findById(uid).lean().exec()) as any
  // Public signup and the account switch have independent consent records.
  // Only a verified mailbox identifies the public subscriber; never trust the
  // profile's cached email or an address supplied by the caller for this lookup.
  const verifiedEmail = emailVerified && !anonymous ? normalizeEmail(email || '') : ''
  const publicEmailSubscribed = verifiedEmail
    ? Boolean(
        await NewsletterSubscriberModel.exists({ email: verifiedEmail, status: 'confirmed' }).exec()
      )
    : false
  return {
    email: Boolean(u?.newsletter?.email),
    telegram: Boolean(u?.newsletter?.telegram),
    telegramLinked: Boolean(u?.telegramChatId),
    publicEmailSubscribed,
  }
})
