import { connectDb } from '../../utils/db'
import { AlertModel } from '../../models/Alert'
import { UserModel } from '../../models/User'
import { fetchCurrentRates, bestRateFor } from '../../utils/rates'
import { sendPush } from '../../utils/push'
import { sendMail } from '../../utils/mailer'
import { sendTelegram } from '../../utils/telegram'
import { adminAuth } from '../../utils/firebaseAdmin'
import { runAlertsCheck } from '../../utils/alertRunner'
import { rateAlertUnsubscribeToken } from '../../utils/rateAlertUnsubscribe'

const ORIGIN = 'https://cambio-uruguay.com'
// Same entities as the rental-alert emails (rentalAlertDelivery.ts).
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]!
  )

export default defineTask({
  meta: { name: 'alerts:check', description: 'Evaluate rate alerts and notify (push + email)' },
  async run() {
    await connectDb()
    const result = await runAlertsCheck({
      loadActiveAlerts: () => AlertModel.find({ active: true }).lean().exec(),
      fetchRates: () => fetchCurrentRates(),
      bestRate: (rows, currency, kind, origin) => bestRateFor(rows, currency, kind, origin),
      getUserContacts: async uid => {
        const u = await UserModel.findById(uid).lean().exec()
        // users.email is copied from the session whether Firebase verified it or not, and an
        // email/password account can be opened with anyone's address: mail only a verified one
        // (privacy audit, 2026-11-08). The search alerts already did (rentalAlertDelivery.ts).
        const account = u?.email
          ? await adminAuth()
              .getUser(uid)
              .catch(() => null)
          : null
        return {
          email: account?.emailVerified && !account.disabled ? (u?.email ?? null) : null,
          fcmTokens: u?.fcmTokens ?? [],
          telegramChatId: u?.telegramChatId ?? null,
        }
      },
      persistAlert: async (id, patch) => {
        await AlertModel.updateOne({ _id: id }, { $set: patch })
      },
      // Reclamo atómico: sólo la instancia que la desarma la envía (cluster ×2, dos tareas a la vez).
      claimAlert: async (id, at) =>
        (
          await AlertModel.updateOne(
            { _id: id, armed: true },
            { $set: { armed: false, lastFiredAt: at } }
          )
        ).modifiedCount === 1,
      pruneTokens: async (uid, tokens) => {
        await UserModel.updateOne({ _id: uid }, { $pull: { fcmTokens: { $in: tokens } } })
      },
      push: sendPush,
      // One-click unsubscribe for this alert (privacy audit, 2026-11-08): a visible link and, via
      // listUnsubscribeUrl, the List-Unsubscribe / List-Unsubscribe-Post headers. If the token
      // cannot be read the email still goes out, with the account link only.
      email: async (to, subject, text, alertId) => {
        const token = await rateAlertUnsubscribeToken(alertId).catch(() => null)
        const cancelUrl = token ? `${ORIGIN}/api/alerts/unsubscribe?token=${token}` : null
        const account = `${ORIGIN}/cuenta?tab=alerts`
        await sendMail({
          to,
          subject,
          text: `${text}\n\nVer mis alertas: ${account}${cancelUrl ? `\nDejar de recibir esta alerta por correo: ${cancelUrl}` : ''}`,
          html: `<p>${escapeHtml(text)}</p><p><a href="${account}">Ver mis alertas</a></p>${cancelUrl ? `<p><a href="${cancelUrl}">Dejar de recibir esta alerta por correo</a></p>` : ''}`,
          ...(cancelUrl ? { listUnsubscribeUrl: cancelUrl } : {}),
        })
      },
      telegram: sendTelegram,
      now: Date.now(),
    })
    return { result }
  },
})
