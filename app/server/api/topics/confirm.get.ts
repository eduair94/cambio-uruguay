// Aviso de un tema, paso 2: confirma por token y vuelve a la página del tema con `?aviso=`.
import { connectDb } from '../../utils/db'
import { TopicSubscriptionModel } from '../../models/TopicSubscription'
import { normalizeNewsletterLang } from '../../utils/newsletter'
import { TOPIC_PATH, isTopic, localePrefix } from '../../utils/topics'

export default defineEventHandler(async event => {
  const token = getQuery(event).token
  if (!token || typeof token !== 'string') {
    throw createError({ statusCode: 400, statusMessage: 'Missing token' })
  }
  await connectDb()
  const sub = await TopicSubscriptionModel.findOne({ confirmToken: token })
  if (!sub || sub.status === 'unsubscribed' || !isTopic(sub.topic)) {
    return sendRedirect(event, '/guias?aviso=invalido', 302)
  }
  if (sub.status !== 'confirmed') {
    sub.status = 'confirmed'
    sub.confirmedAt = new Date()
    await sub.save()
  }
  const lang = normalizeNewsletterLang(sub.language)
  return sendRedirect(event, `${localePrefix(lang)}${TOPIC_PATH[sub.topic]}?aviso=confirmado`, 302)
})
