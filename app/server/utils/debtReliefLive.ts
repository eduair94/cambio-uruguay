// Monthly self-updating layer for /saldar-deudas-uruguay. Uses Gemini grounded
// google-search to refresh the two volatile BCU usury-cap figures (con/sin
// autorización de descuento, < 10.000 UI) and merges validated values over the
// static verified baseline in ~/utils/debtRelief. Same endpoint + graceful-null
// + guardrail-band pattern as costOfLivingLive.ts.
//
// Guardrails: every fetched number must fall inside a plausible band or it is
// ignored (baseline kept). A hallucinated number can never make the page show
// something absurd; worst case it keeps the last-good / baseline data.
import { DEBT_RELIEF_BASELINE } from '../../utils/debtRelief'
import type { DebtReliefBaseline, UsuryCap, LiveDebtRelief } from '../../utils/debtRelief'
export type { LiveDebtRelief }

const STORAGE = 'debt-relief'
const KEY = 'live'

/** Plausible bands (annual %). Outside → rejected, baseline kept. */
const BANDS = {
  topeConDescuento: [25, 45],
  moraConDescuento: [28, 55],
  topeSinDescuento: [90, 160],
  moraSinDescuento: [100, 190],
} as const

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> }
  }>
}

const inBand = (n: unknown, band: readonly [number, number]): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= band[0] && n <= band[1]

function cloneBaseline(): DebtReliefBaseline {
  return {
    asOf: DEBT_RELIEF_BASELINE.asOf,
    period: DEBT_RELIEF_BASELINE.period,
    usuryCaps: DEBT_RELIEF_BASELINE.usuryCaps.map(c => ({ ...c })),
    refiRates: DEBT_RELIEF_BASELINE.refiRates.map(r => ({ ...r })),
  }
}

/**
 * Merge validated live caps over a baseline. Pure + exported so the guardrails
 * are unit-testable without a network call. Index 0 = con descuento, 1 = sin.
 */
export function applyLiveCaps(
  baseline: DebtReliefBaseline,
  data: Record<string, unknown>
): { caps: UsuryCap[]; updated: string[] } {
  const caps = baseline.usuryCaps.map(c => ({ ...c }))
  const updated: string[] = []
  if (caps[0]) {
    if (inBand(data.topeConDescuento, BANDS.topeConDescuento)) {
      caps[0].topeTasa = data.topeConDescuento
      updated.push('topeConDescuento')
    }
    if (inBand(data.moraConDescuento, BANDS.moraConDescuento)) {
      caps[0].topeMora = data.moraConDescuento
      updated.push('moraConDescuento')
    }
  }
  if (caps[1]) {
    if (inBand(data.topeSinDescuento, BANDS.topeSinDescuento)) {
      caps[1].topeTasa = data.topeSinDescuento
      updated.push('topeSinDescuento')
    }
    if (inBand(data.moraSinDescuento, BANDS.moraSinDescuento)) {
      caps[1].topeMora = data.moraSinDescuento
      updated.push('moraSinDescuento')
    }
  }
  return { caps, updated }
}

const PROMPT = `Buscá con búsqueda real y citable los topes de usura vigentes que publica el Banco Central del Uruguay (Ley 18.212, "Tasas medias de interés") para crédito al CONSUMO de familias, en moneda nacional no reajustable, hasta 366 días, tramo menor a 10.000 UI. Necesito la TASA MÁXIMA (tope) efectiva anual, en porcentaje:
1. Con autorización de descuento (retención de haberes): tope de tasa y tope de mora.
2. Sin autorización de descuento: tope de tasa y tope de mora.
Respondé SOLO con un objeto JSON válido, sin texto ni markdown, con números en porcentaje sin el signo %:
{"topeConDescuento": <num>, "moraConDescuento": <num>, "topeSinDescuento": <num>, "moraSinDescuento": <num>}
Usá solo valores hallados en una búsqueda real (idealmente bcu.gub.uy). Si un dato no lo encontrás, poné null. No inventes.`

function parseJsonLoose(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    return JSON.parse(m[0]) as Record<string, unknown>
  } catch {
    return null
  }
}

export function baselineDebtRelief(): LiveDebtRelief {
  const b = cloneBaseline()
  return { ...b, asOf: null, updated: [], sources: [] }
}

export async function refreshLiveDebtRelief(): Promise<LiveDebtRelief> {
  const baseline = baselineDebtRelief()
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

    const merged = cloneBaseline()
    const { caps, updated } = applyLiveCaps(merged, data)
    if (updated.length === 0) return baseline
    merged.usuryCaps = caps

    const chunks = candidate?.groundingMetadata?.groundingChunks ?? []
    const sources = chunks
      .map(c => c.web)
      .filter((w): w is { uri: string; title?: string } => Boolean(w?.uri))
      .slice(0, 6)
      .map(w => ({ label: w.title || new URL(w.uri).hostname.replace(/^www\./, ''), url: w.uri }))

    const live: LiveDebtRelief = {
      ...merged,
      asOf: new Date().toISOString(),
      updated,
      sources,
    }
    await useStorage(STORAGE).setItem(KEY, live)
    return live
  } catch {
    return baseline
  }
}

export async function getStoredDebtRelief(): Promise<LiveDebtRelief | null> {
  return (await useStorage(STORAGE).getItem<LiveDebtRelief>(KEY)) ?? null
}

export function ageInDays(asOf: string | null): number {
  if (!asOf) return Infinity
  const t = new Date(asOf).getTime()
  if (!Number.isFinite(t)) return Infinity
  return (Date.now() - t) / 86400000
}
