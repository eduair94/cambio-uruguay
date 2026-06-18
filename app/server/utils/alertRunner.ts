import { evaluateAlert } from './alertEval'
import { alertText } from './push'

export interface RunnerDeps {
  loadActiveAlerts: () => Promise<any[]>
  fetchRates: () => Promise<any[]>
  bestRate: (rows: any[], currency: any, kind: any, origin: string) => number | null
  getUserContacts: (
    uid: string
  ) => Promise<{ email: string | null; fcmTokens: string[]; telegramChatId: string | null }>
  persistAlert: (id: string, patch: Record<string, unknown>) => Promise<void>
  pruneTokens: (uid: string, tokens: string[]) => Promise<void>
  push: (tokens: string[], title: string, body: string) => Promise<string[]>
  email: (to: string, subject: string, text: string) => Promise<void>
  telegram: (chatId: string, text: string) => Promise<boolean>
  now: number
}

export async function runAlertsCheck(
  deps: RunnerDeps
): Promise<{ checked: number; fired: number }> {
  const alerts = await deps.loadActiveAlerts()
  if (!alerts.length) return { checked: 0, fired: 0 }
  const rows = await deps.fetchRates()
  let fired = 0

  for (const a of alerts) {
    const rate = deps.bestRate(rows, a.currency, a.kind, a.origin)
    const { fire, armed } = evaluateAlert(a, rate, deps.now)

    if (!fire) {
      if (armed !== a.armed) await deps.persistAlert(String(a._id), { armed })
      continue
    }

    const { title, body } = alertText(a, rate as number)
    const contacts = await deps.getUserContacts(a.uid)

    if (a.channels?.push && contacts.fcmTokens.length) {
      const invalid = await deps.push(contacts.fcmTokens, title, body)
      if (invalid.length) await deps.pruneTokens(a.uid, invalid)
    }
    if (a.channels?.email && contacts.email) {
      await deps.email(contacts.email, title, body)
    }
    if (a.channels?.telegram && contacts.telegramChatId) {
      await deps.telegram(contacts.telegramChatId, `${title}\n${body}`)
    }

    await deps.persistAlert(String(a._id), { armed: false, lastFiredAt: new Date(deps.now) })
    fired++
  }

  return { checked: alerts.length, fired }
}
