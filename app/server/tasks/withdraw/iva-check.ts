// Nitro scheduled task: re-verify watchdog for the tourist-IVA facts on the
// /retirar-efectivo-uruguay page. Registered in nuxt.config under
// `nitro.scheduledTasks`. See [[withdraw-cash-page]].
//
// The page itself always renders the live status derived from the date
// (resolveIvaStatus), so this task does NOT update page content. Its job is to
// notice when the encoded rules can no longer be trusted (a new summer decree is
// due but unconfirmed, or the facts are stale) and ping the admin once so a
// human confirms the dates and updates IVA_RULES + LAST_RESEARCHED.
//
// Graceful: with no admin chat id / no bot token, it still records state + logs;
// it just doesn't send Telegram.
import { getReverifyState } from '../../../utils/ivaStatus'
import { getIvaWatchdogState, setIvaWatchdogState } from '../../utils/withdrawIvaStore'
import { sendTelegram } from '../../utils/telegram'

export default defineTask({
  meta: {
    name: 'withdraw:iva-check',
    description: 'Watchdog: flag when tourist-IVA facts need re-verification',
  },
  async run() {
    const now = new Date()
    const { needsReverify, reasons } = getReverifyState(now)
    const prev = await getIvaWatchdogState()
    const key = reasons.slice().sort().join(' | ')

    let notified = false
    if (needsReverify && key && key !== prev?.lastNotifiedKey) {
      const telegram = useRuntimeConfig().telegram as { adminChatId?: string }
      const adminChatId = telegram?.adminChatId
      if (adminChatId) {
        const msg =
          '🔔 *Cambio Uruguay* — revisar IVA de turistas\n\n' +
          reasons.map(r => `• ${r}`).join('\n') +
          '\n\nActualizá `IVA_RULES` y `LAST_RESEARCHED` en `app/utils/ivaStatus.ts` y `app/utils/withdrawCash.ts`.'
        notified = await sendTelegram(adminChatId, msg)
      } else {
        console.warn(
          '[withdraw:iva-check] re-verify due but no TELEGRAM_ADMIN_CHAT_ID set:',
          reasons
        )
      }
    }

    const state = {
      checkedAt: now.toISOString(),
      needsReverify,
      reasons,
      lastNotifiedKey: notified ? key : (prev?.lastNotifiedKey ?? null),
      lastNotifiedAt: notified ? now.toISOString() : (prev?.lastNotifiedAt ?? null),
    }
    await setIvaWatchdogState(state)

    return { result: { needsReverify, reasons, notified } }
  },
})
