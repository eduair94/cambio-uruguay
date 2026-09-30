import { evaluateAlert } from './alertEval'
import { alertText } from './push'
import { escapeTelegramMarkdown } from './telegram'

export interface RunnerDeps {
  loadActiveAlerts: () => Promise<any[]>
  fetchRates: () => Promise<any[]>
  bestRate: (rows: any[], currency: any, kind: any, origin: string) => number | null
  getUserContacts: (
    uid: string
  ) => Promise<{ email: string | null; fcmTokens: string[]; telegramChatId: string | null }>
  persistAlert: (id: string, patch: Record<string, unknown>) => Promise<void>
  /**
   * Desarma la alerta de forma atómica ANTES de enviar (`armed: true` → `false`) y dice si esta
   * corrida se la quedó. La app corre en cluster ×2 y la tarea de Nitro corre en las dos
   * instancias: sin este reclamo cada alerta salía dos veces.
   */
  claimAlert: (id: string, at: Date) => Promise<boolean>
  pruneTokens: (uid: string, tokens: string[]) => Promise<void>
  push: (tokens: string[], title: string, body: string) => Promise<string[]>
  email: (to: string, subject: string, text: string) => Promise<void>
  telegram: (chatId: string, text: string) => Promise<boolean>
  now: number
  log?: (message: string) => void
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

    // A lo sumo una vez: se desarma antes de enviar. Si otra instancia ya la tomó, no se envía; si
    // un envío falla, no se reintenta en la próxima corrida (el cooldown de 6 h ya la cubre).
    if (!(await deps.claimAlert(String(a._id), new Date(deps.now)))) continue
    fired++

    const warn = (what: string, e: any) =>
      (deps.log ?? console.warn)(`[alerts:check] ${what} falló para ${a._id}: ${e?.message || e}`)
    const { title, body } = alertText(a, rate as number)
    let contacts: Awaited<ReturnType<RunnerDeps['getUserContacts']>>
    try {
      contacts = await deps.getUserContacts(a.uid)
    } catch (e: any) {
      // Ya está reclamada: una excepción acá no puede cortar las alertas que siguen.
      warn('contactos', e)
      continue
    }
    const attempt = async (channel: string, send: () => Promise<unknown>) => {
      try {
        await send()
      } catch (e: any) {
        // Un canal que falla (SMTP caído) no corta los otros canales ni las otras alertas.
        warn(channel, e)
      }
    }

    if (a.channels?.push && contacts.fcmTokens.length) {
      await attempt('push', async () => {
        const invalid = await deps.push(contacts.fcmTokens, title, body)
        if (invalid.length) await deps.pruneTokens(a.uid, invalid)
      })
    }
    if (a.channels?.email && contacts.email) {
      await attempt('email', () => deps.email(contacts.email as string, title, body))
    }
    if (a.channels?.telegram && contacts.telegramChatId) {
      await attempt('telegram', () =>
        deps.telegram(
          contacts.telegramChatId as string,
          escapeTelegramMarkdown(`${title}\n${body}`)
        )
      )
    }
  }

  return { checked: alerts.length, fired }
}
