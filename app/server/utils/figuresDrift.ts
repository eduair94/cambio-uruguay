// The drift watchdog for Uruguay's key national figures. NOT Gemini: it compares the figures the
// backend already refreshed (pm2 currency-figures) with the constants baked into this app's
// prose/data (SALARY_REFERENCE, UY_FACTS, the FAQ), pinging the admin once per distinct drift so
// a human updates them. It stayed in the app because the numbers it watches live in the app, the
// Telegram creds live in the app's runtimeConfig, and it spends no AI call at all.
//
// WATCHED, WatchState and checkFiguresDrift are moved verbatim out of the old
// server/utils/uyFiguresLive.ts (which also did the Gemini refresh — that half moved to the
// backend, see classes/figures/refresh.ts). The `useStorage('figures')` mount stays in
// nuxt.config.ts for this watchdog's dedupe key.
import { sendTelegram } from './telegram'
import { UY_FIGURES_FALLBACK, type UyFigures } from './uyFiguresFallback'

const STORAGE = 'figures'
const WATCH_KEY = 'watchdog'

interface WatchState {
  lastNotifiedKey: string | null
  lastNotifiedAt: string | null
}

// Constants baked into the site's prose/data that a human must update when they
// drift. Tolerance is a fraction (e.g. 0.03 = 3%).
const WATCHED: Array<{
  id: keyof Pick<UyFigures, 'salarioMinimo' | 'bpc'>
  label: string
  baked: number
  tol: number
  where: string
}> = [
  {
    id: 'salarioMinimo',
    label: 'Salario mínimo nacional',
    baked: UY_FIGURES_FALLBACK.salarioMinimo,
    tol: 0.03,
    where: 'SALARY_REFERENCE (costOfLiving.ts), UY_FACTS (personalFinance.ts), FAQ',
  },
  {
    id: 'bpc',
    label: 'BPC',
    baked: UY_FIGURES_FALLBACK.bpc,
    tol: 0.03,
    where:
      'UY_FACTS (personalFinance.ts) y FIGURES (companyTypes.ts): la BPC mueve los topes, las tablas de BPS y las escalas de IRPF — TODAS se fijan por decreto en enero y se actualizan a mano',
  },
]

/**
 * Compare live figures with the baked constants and ping the admin (once per
 * distinct drift) when something meaningful changed, so the prose/constants get
 * updated. No-op when nothing drifted or no admin chat id / bot token.
 */
export async function checkFiguresDrift(
  figures: UyFigures
): Promise<{ drift: string[]; notified: boolean }> {
  const drift: string[] = []
  for (const w of WATCHED) {
    if (!figures.updated.includes(w.id)) continue // only trust a live value
    const live = figures[w.id]
    if (Math.abs(live - w.baked) / w.baked > w.tol) {
      drift.push(
        `${w.label}: horneado $${w.baked.toLocaleString('es-UY')} → real $${live.toLocaleString('es-UY')} — actualizar ${w.where}`
      )
    }
  }

  const store = useStorage(STORAGE)
  const prev = (await store.getItem<WatchState>(WATCH_KEY)) ?? {
    lastNotifiedKey: null,
    lastNotifiedAt: null,
  }
  const key = drift.slice().sort().join(' | ')

  let notified = false
  if (drift.length && key !== prev.lastNotifiedKey) {
    const adminChatId = (useRuntimeConfig().telegram as { adminChatId?: string })?.adminChatId
    if (adminChatId) {
      const msg =
        '🔔 *Cambio Uruguay* — indicadores desactualizados\n\n' +
        drift.map(d => `• ${d}`).join('\n')
      notified = await sendTelegram(adminChatId, msg)
    } else {
      console.warn('[figures:drift] drift detected but no TELEGRAM_ADMIN_CHAT_ID:', drift)
    }
  }
  await store.setItem(WATCH_KEY, {
    lastNotifiedKey: notified ? key : prev.lastNotifiedKey,
    lastNotifiedAt: notified ? new Date().toISOString() : prev.lastNotifiedAt,
  })
  return { drift, notified }
}
