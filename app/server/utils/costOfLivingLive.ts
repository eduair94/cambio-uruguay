// Daily self-updating layer for the cost-of-living tool. Uses Gemini grounded
// google-search to refresh the most volatile 2026 figures (salario mínimo, boleto
// STM → transporte, y alquileres típicos de Montevideo) and merges the validated
// values over the static verified baseline in `~/utils/costOfLiving`. Same endpoint
// + graceful-null pattern as loanGeminiRate.ts / geminiNews.ts.
//
// Guardrails: every fetched figure must fall inside a plausible band or it is
// ignored (the baseline value is kept). So a bad or hallucinated number can never
// make the tool show something absurd; worst case the tool keeps the last-good /
// baseline data. Persisted to the `costs` fs storage so it survives restarts.
import { COST_MODEL, SALARY_REFERENCE } from '../../utils/costOfLiving'
import type { DwellingType } from '../../utils/costOfLiving'

export interface LiveCosts {
  /** Full cost model: baseline with any validated live overrides applied. */
  model: typeof COST_MODEL
  salary: { minimoNacional: number; medianaLiquidoAprox: number }
  /** ISO timestamp of the last successful refresh, or null when only the baseline is used. */
  asOf: string | null
  /** Which fields were refreshed live this cycle. */
  updated: string[]
  sources: Array<{ label: string; url: string }>
}

const STORAGE = 'costs'
const KEY = 'live'

/** Plausible bands (UYU). A value outside its band is rejected and the baseline kept. */
const BANDS = {
  salarioMinimo: [20000, 40000],
  boletoStm: [40, 120],
  rentMono: [12000, 40000],
  rent1: [18000, 55000],
  rent2: [26000, 80000],
} as const

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    groundingMetadata?: {
      groundingChunks?: Array<{ web?: { uri?: string; title?: string } }>
    }
  }>
}

const inBand = (n: unknown, band: readonly [number, number]): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= band[0] && n <= band[1]

/** Build a fresh model object (never mutate the shared baseline constant). */
function cloneBaseline(): typeof COST_MODEL {
  return {
    ...COST_MODEL,
    rentMontevideo: { ...COST_MODEL.rentMontevideo },
  }
}

const PROMPT = `Buscá con búsqueda real y citable los valores ACTUALES en Uruguay (en pesos uruguayos UYU) de:
1. Salario mínimo nacional vigente (nominal, mensual).
2. Precio del boleto común de ómnibus de Montevideo (STM, con tarjeta).
3. Alquiler mensual TÍPICO en Montevideo de: un monoambiente, un apartamento de 1 dormitorio y uno de 2 dormitorios (usá promedios de portales inmobiliarios como InfoCasas).
Respondé SOLO con un objeto JSON válido, sin texto adicional ni markdown, con este formato exacto y números sin separadores de miles:
{"salarioMinimo": <num>, "boletoStm": <num>, "rentMono": <num>, "rent1": <num>, "rent2": <num>}
Usá solo valores que hayas encontrado en una búsqueda real. Si algún dato no lo encontrás, poné null en ese campo. No inventes.`

function parseJsonLoose(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    return JSON.parse(m[0]) as Record<string, unknown>
  } catch {
    return null
  }
}

/** The pure static baseline (no Gemini call). Always safe + instant. */
export function baselineCosts(): LiveCosts {
  return {
    model: cloneBaseline(),
    salary: { ...SALARY_REFERENCE },
    asOf: null,
    updated: [],
    sources: [],
  }
}

/**
 * Fetch + validate live figures and merge them over the baseline. Returns the
 * merged LiveCosts, or the pure baseline (asOf: null) when Gemini is unavailable,
 * fails, or returns nothing usable.
 */
export async function refreshLiveCosts(): Promise<LiveCosts> {
  const baseline = baselineCosts()

  const apiKey = useRuntimeConfig().geminiApiKey as string | undefined
  if (!apiKey) return baseline

  try {
    const res = await $fetch<GeminiResponse>(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        query: { key: apiKey },
        body: {
          contents: [{ parts: [{ text: PROMPT }] }],
          tools: [{ google_search: {} }],
        },
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

    const model = cloneBaseline()
    const salary = { ...SALARY_REFERENCE }
    const updated: string[] = []

    if (inBand(data.salarioMinimo, BANDS.salarioMinimo)) {
      salary.minimoNacional = Math.round(data.salarioMinimo)
      updated.push('salarioMinimo')
    }
    if (inBand(data.boletoStm, BANDS.boletoStm)) {
      // transporte mensual ≈ 2 tramos/día × 22 días
      model.transportPerAdult = Math.round((data.boletoStm * 2 * 22) / 100) * 100
      updated.push('boletoStm')
    }
    const rentMap: Array<[keyof typeof BANDS, DwellingType]> = [
      ['rentMono', 'monoambiente'],
      ['rent1', '1_dormitorio'],
      ['rent2', '2_dormitorios'],
    ]
    for (const [field, dwelling] of rentMap) {
      const v = data[field]
      if (inBand(v, BANDS[field])) {
        model.rentMontevideo[dwelling] = Math.round(v / 500) * 500
        updated.push(field)
      }
    }

    if (updated.length === 0) return baseline

    // Grounding source hosts (best-effort, for display).
    const chunks = candidate?.groundingMetadata?.groundingChunks ?? []
    const sources = chunks
      .map(c => c.web)
      .filter((w): w is { uri: string; title?: string } => Boolean(w?.uri))
      .slice(0, 6)
      .map(w => ({ label: w.title || new URL(w.uri).hostname.replace(/^www\./, ''), url: w.uri }))

    const live: LiveCosts = { model, salary, asOf: new Date().toISOString(), updated, sources }
    await useStorage(STORAGE).setItem(KEY, live)
    return live
  } catch {
    return baseline
  }
}

/** The last successfully stored live costs, or null. */
export async function getStoredCosts(): Promise<LiveCosts | null> {
  return (await useStorage(STORAGE).getItem<LiveCosts>(KEY)) ?? null
}

/** How old (in days) a stored refresh is; Infinity when never refreshed. */
export function ageInDays(asOf: string | null): number {
  if (!asOf) return Infinity
  const t = new Date(asOf).getTime()
  if (!Number.isFinite(t)) return Infinity
  return (Date.now() - t) / 86400000
}
