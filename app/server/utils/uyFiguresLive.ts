// Daily self-updating source of truth for Uruguay's key national figures used
// across the finance pages: salario mínimo, BPC, boleto STM and annual inflation.
// Same guardrailed Gemini-grounded pattern as costOfLivingLive.ts: fetch, validate
// each value against a plausible band (out-of-band → keep baseline), persist to the
// `figures` fs store. Also a drift watchdog: when a figure baked into the site's
// prose/constants no longer matches reality, ping the admin so it gets updated.
import { sendTelegram } from './telegram'

export interface UyFigures {
  /** Salario mínimo nacional (UYU/mes, nominal). */
  salarioMinimo: number
  /** Base de Prestaciones y Contribuciones (UYU). */
  bpc: number
  /** Boleto común de Montevideo con tarjeta STM (UYU). */
  boletoStm: number
  /** Variación anual del IPC (%). */
  inflacionAnual: number
  /** ISO timestamp of the last successful live refresh, or null (baseline only). */
  asOf: string | null
  updated: string[]
  sources: Array<{ label: string; url: string }>
}

// Verified baseline (2026). Kept when Gemini is unavailable or returns nothing usable.
const BASELINE = {
  salarioMinimo: 25383, // desde 1-jul-2026
  bpc: 6864, // valor 2026 (BPC 2025 era $6.576)
  boletoStm: 52, // boleto STM con tarjeta desde 5-ene-2026
  inflacionAnual: 4.3, // IPC interanual ~jun-2026
} as const

const BANDS = {
  salarioMinimo: [20000, 45000],
  bpc: [6000, 10000],
  boletoStm: [40, 120],
  inflacionAnual: [1, 15],
} as const

const STORAGE = 'figures'
const KEY = 'live'
const WATCH_KEY = 'watchdog'

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> }
  }>
}

const inBand = (n: unknown, band: readonly [number, number]): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= band[0] && n <= band[1]

export function baselineFigures(): UyFigures {
  return { ...BASELINE, asOf: null, updated: [], sources: [] }
}

const PROMPT = `Buscá con búsqueda web real y citable los valores ACTUALES en Uruguay de estos indicadores oficiales:
1. Salario mínimo nacional vigente (nominal, mensual, en pesos uruguayos).
2. Valor actual de la BPC (Base de Prestaciones y Contribuciones), en pesos.
3. Precio del boleto común de ómnibus de Montevideo (STM, con tarjeta), en pesos.
4. Variación anual del IPC (inflación interanual), en porcentaje.
Respondé SOLO con un objeto JSON válido, sin texto adicional ni markdown, con este formato exacto y números sin separadores de miles ni símbolos:
{"salarioMinimo": <num>, "bpc": <num>, "boletoStm": <num>, "inflacionAnual": <num>}
Usá solo valores encontrados en fuentes oficiales (MTSS, BPS, INE, Intendencia de Montevideo). Si algún dato no lo encontrás, poné null. No inventes.`

function parseJsonLoose(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    return JSON.parse(m[0]) as Record<string, unknown>
  } catch {
    return null
  }
}

/** Fetch + validate live figures. Returns the merged figures or the pure baseline. */
export async function refreshUyFigures(): Promise<UyFigures> {
  const baseline = baselineFigures()
  const apiKey = useRuntimeConfig().geminiApiKey as string | undefined
  if (!apiKey) return baseline

  try {
    const res = await $fetch<GeminiResponse>(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        query: { key: apiKey },
        body: { contents: [{ parts: [{ text: PROMPT }] }], tools: [{ google_search: {} }] },
        timeout: 30000,
      }
    )
    const candidate = res.candidates?.[0]
    const text = (candidate?.content?.parts ?? [])
      .map(p => p.text ?? '')
      .join('')
      .trim()
    const data = parseJsonLoose(text)
    if (!data) return baseline

    const figures: UyFigures = baselineFigures()
    const updated: string[] = []
    for (const k of ['salarioMinimo', 'bpc', 'boletoStm', 'inflacionAnual'] as const) {
      if (inBand(data[k], BANDS[k])) {
        figures[k] =
          k === 'inflacionAnual'
            ? Math.round((data[k] as number) * 10) / 10
            : Math.round(data[k] as number)
        updated.push(k)
      }
    }
    if (updated.length === 0) return baseline

    const chunks = candidate?.groundingMetadata?.groundingChunks ?? []
    figures.sources = chunks
      .map(c => c.web)
      .filter((w): w is { uri: string; title?: string } => Boolean(w?.uri))
      .slice(0, 6)
      .map(w => ({ label: w.title || new URL(w.uri).hostname.replace(/^www\./, ''), url: w.uri }))
    figures.asOf = new Date().toISOString()
    figures.updated = updated

    await useStorage(STORAGE).setItem(KEY, figures)
    return figures
  } catch {
    return baseline
  }
}

export async function getStoredFigures(): Promise<UyFigures | null> {
  return (await useStorage(STORAGE).getItem<UyFigures>(KEY)) ?? null
}

export function ageInDays(asOf: string | null): number {
  if (!asOf) return Infinity
  const t = new Date(asOf).getTime()
  return Number.isFinite(t) ? (Date.now() - t) / 86400000 : Infinity
}

interface WatchState {
  lastNotifiedKey: string | null
  lastNotifiedAt: string | null
}

// Constants baked into the site's prose/data that a human must update when they
// drift. Tolerance is a fraction (e.g. 0.03 = 3%).
const WATCHED: Array<{
  id: keyof typeof BASELINE
  label: string
  baked: number
  tol: number
  where: string
}> = [
  {
    id: 'salarioMinimo',
    label: 'Salario mínimo nacional',
    baked: BASELINE.salarioMinimo,
    tol: 0.03,
    where: 'SALARY_REFERENCE (costOfLiving.ts), UY_FACTS (personalFinance.ts), FAQ',
  },
  {
    id: 'bpc',
    label: 'BPC',
    baked: BASELINE.bpc,
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
      console.warn('[figures:daily] drift detected but no TELEGRAM_ADMIN_CHAT_ID:', drift)
    }
  }
  await store.setItem(WATCH_KEY, {
    lastNotifiedKey: notified ? key : prev.lastNotifiedKey,
    lastNotifiedAt: notified ? new Date().toISOString() : prev.lastNotifiedAt,
  })
  return { drift, notified }
}
