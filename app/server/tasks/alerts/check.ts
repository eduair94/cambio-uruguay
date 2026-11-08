import { connectDb } from '../../utils/db'
import { AlertModel } from '../../models/Alert'
import { UserModel } from '../../models/User'
import { fetchCurrentRates, bestRateFor } from '../../utils/rates'
import { sendPush } from '../../utils/push'
import { sendMail } from '../../utils/mailer'
import { sendTelegram } from '../../utils/telegram'
import { adminAuth } from '../../utils/firebaseAdmin'
import { runAlertsCheck } from '../../utils/alertRunner'

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
      email: (to, subject, text) =>
        sendMail({
          to,
          subject,
          text,
          html: `<p>${text}</p><p><a href="https://cambio-uruguay.com/cuenta">Ver mis alertas</a></p>`,
        }),
      telegram: sendTelegram,
      now: Date.now(),
    })
    return { result }
  },
})
