// Double opt-in step 2: confirm a subscription by token, then redirect to the
// localized newsletter page with a success state.
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
  const sub = await NewsletterSubscriberModel.findOne({ confirmToken: token })
  let lang = 'es'
  if (sub && sub.status !== 'unsubscribed') {
    lang = sub.language || 'es'
    if (sub.status !== 'confirmed') {
      sub.status = 'confirmed'
      sub.confirmedAt = new Date()
      await sub.save()
    }
    return sendRedirect(event, `${localePrefix(lang)}/newsletter?state=confirmed`, 302)
  }
  return sendRedirect(event, `${localePrefix(lang)}/newsletter?state=invalid`, 302)
})
