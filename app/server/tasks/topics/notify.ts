// Tarea Nitro: cuando el dato de un tema cambia de estado (el aumento de las jubilaciones pasa de
// `pendiente` a `provisorio` o a `definitivo` en utils/aumentoJubilaciones.ts, o sea con un
// deploy), manda UN correo a cada aviso confirmado. Registrada en nuxt.config `scheduledTasks`.
//
// La app corre en pm2 cluster ×2 y la tarea se dispara en los dos workers. Cada suscriptor se
// reclama con una actualización atómica (`notified` sin el estado → con el estado) ANTES de
// mandar: sólo uno de los dos lo consigue, así que nadie recibe dos correos. Si el envío falla se
// devuelve el reclamo y la corrida siguiente lo reintenta.
import { connectDb } from '../../utils/db'
import { TopicSubscriptionModel } from '../../models/TopicSubscription'
import { isMailerConfigured, sendMail } from '../../utils/mailer'
import { normalizeNewsletterLang } from '../../utils/newsletter'
import {
  TOPIC_IDS,
  TOPIC_PATH,
  buildTopicNoticeEmail,
  localePrefix,
  topicState,
  topicStateToNotify,
} from '../../utils/topics'

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
/** Por corrida y por worker: lo que queda sale en la próxima hora. */
const MAX_PER_RUN = 300

export default defineTask({
  meta: {
    name: 'topics:notify',
    description: 'Email confirmed topic notices when the topic data changes state',
  },
  async run() {
    if (!isMailerConfigured()) return { result: 'mailer-off' }
    const site = (
      (useRuntimeConfig().public as { siteUrl?: string }).siteUrl || 'https://cambio-uruguay.com'
    ).replace(/\/$/, '')
    await connectDb()
    const sent: Record<string, number> = {}
    for (const topic of TOPIC_IDS) {
      const state = topicStateToNotify(topicState(topic), [])
      if (!state || state === 'pendiente') continue
      let count = 0
      const failed: unknown[] = []
      while (count < MAX_PER_RUN && failed.length < 5) {
        const sub = await TopicSubscriptionModel.findOneAndUpdate(
          { topic, status: 'confirmed', notified: { $ne: state }, _id: { $nin: failed } },
          { $addToSet: { notified: state } },
          { new: true }
        )
        if (!sub) break
        const lang = normalizeNewsletterLang(sub.language)
        const unsubUrl = `${site}/api/topics/unsubscribe?token=${sub.unsubToken}`
        const built = buildTopicNoticeEmail(
          topic,
          state,
          lang,
          `${site}${localePrefix(lang)}${TOPIC_PATH[topic]}`,
          unsubUrl
        )
        try {
          await sendMail({
            to: sub.email,
            subject: built.subject,
            html: built.html,
            text: built.text,
            listUnsubscribeUrl: unsubUrl,
          })
          count++
        } catch (err) {
          console.error('topic notice send failed:', err)
          // Se devuelve el reclamo (la corrida siguiente lo reintenta) y se sigue con otro: una
          // dirección que rebota no puede trabar la cola.
          await TopicSubscriptionModel.updateOne({ _id: sub._id }, { $pull: { notified: state } })
          failed.push(sub._id)
        }
        await sleep(1000)
      }
      sent[`${topic}:${state}`] = count
    }
    return { result: sent }
  },
})
