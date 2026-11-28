// Baja de un aviso de tema en un clic: GET (enlace → vuelve a la página con `?aviso=baja`) y POST
// (List-Unsubscribe-Post del cliente de correo → 200).
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
  const sub = await TopicSubscriptionModel.findOne({ unsubToken: token })
  if (sub && sub.status !== 'unsubscribed') {
    sub.status = 'unsubscribed'
    await sub.save()
  }
  if (event.method === 'POST') return { ok: true }
  if (!sub || !isTopic(sub.topic)) return sendRedirect(event, '/guias?aviso=invalido', 302)
  const lang = normalizeNewsletterLang(sub.language)
  return sendRedirect(event, `${localePrefix(lang)}${TOPIC_PATH[sub.topic]}?aviso=baja`, 302)
})
