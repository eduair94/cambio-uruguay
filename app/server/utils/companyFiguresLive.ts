// Daily self-updating source of truth for the volatile figures on
// /que-empresa-abrir-uruguay. Same guardrailed pattern as uyFiguresLive.ts /
// debtReliefLive.ts: ask Gemini with grounded search, validate EVERY value against
// a plausibility band, and keep the verified baseline for anything out of band. A
// hallucinated number can never reach the page.
//
// The ANNUAL CEILINGS (topes in UI) are deliberately NOT refreshed here: they are
// constants set by decree each January using the UI at the close of the previous
// ejercicio, and a search engine will happily return last year's. They stay
// hand-maintained in utils/companyTypes.ts, and the figures:daily drift watchdog
// nags when they go stale.
//
// The band validator `applyLiveCompanyFigures` is a PURE function (no I/O) so it is
// unit-tested directly in plain Node, exactly like debtReliefLive's applyLiveCaps.
import { FIGURES } from '../../utils/companyTypes'

export interface CompanyFigures {
  ivaMinimo: number
  monoPlenoFonasaSolo: number
  bpsUnipersonalPleno: number
  bpsAdminSas: number
  bpsSocioSrl: number
  icosaAnual: number
  asOf: string | null
  updated: string[]
  sources: Array<{ label: string; url: string }>
}

/** The refreshable keys. Anything not here is hand-maintained (e.g. the topes). */
const KEYS = [
  'ivaMinimo',
  'monoPlenoFonasaSolo',
  'bpsUnipersonalPleno',
  'bpsAdminSas',
  'bpsSocioSrl',
  'icosaAnual',
] as const

type RefreshableKey = (typeof KEYS)[number]

/** Anything outside these is a hallucination or a stale year. Keep them TIGHT. */
export const COMPANY_FIGURE_BANDS: Record<RefreshableKey, readonly [number, number]> = {
  ivaMinimo: [4000, 9000],
  monoPlenoFonasaSolo: [4000, 9000],
  bpsUnipersonalPleno: [7000, 12_000],
  bpsAdminSas: [8000, 15_000],
  bpsSocioSrl: [4500, 9000],
  icosaAnual: [20_000, 40_000],
}

const STORAGE = 'company'
const KEY = 'live'

const inBand = (n: unknown, band: readonly [number, number]): n is number =>
  typeof n === 'number' && Number.isFinite(n) && n >= band[0] && n <= band[1]

export function baselineCompanyFigures(): CompanyFigures {
  return {
    ivaMinimo: FIGURES.ivaMinimo.value,
    monoPlenoFonasaSolo: FIGURES.monoPlenoFonasaSolo.value,
    bpsUnipersonalPleno: FIGURES.bpsUnipersonalPleno.value,
    bpsAdminSas: FIGURES.bpsAdminSas.value,
    bpsSocioSrl: FIGURES.bpsSocioSrl.value,
    icosaAnual: FIGURES.icosaAnual.value,
    asOf: null,
    updated: [],
    sources: [],
  }
}

/**
 * Merge a raw Gemini payload over a baseline, accepting only values that fall
 * inside their plausibility band. PURE: returns a fresh object, never mutates
 * `baseline`. `updated` lists exactly the keys that were accepted.
 */
export function applyLiveCompanyFigures(
  baseline: CompanyFigures,
  payload: Partial<Record<RefreshableKey, number>>
): { figures: CompanyFigures; updated: RefreshableKey[] } {
  const figures: CompanyFigures = { ...baseline }
  const updated: RefreshableKey[] = []
  for (const k of KEYS) {
    const candidate = payload[k]
    if (inBand(candidate, COMPANY_FIGURE_BANDS[k])) {
      figures[k] = Math.round(candidate)
      updated.push(k)
    }
  }
  return { figures, updated }
}

interface GeminiResponse {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> }
    groundingMetadata?: { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> }
  }>
}

const PROMPT = `Buscá con búsqueda web real y citable los valores ACTUALES y OFICIALES en Uruguay de:
1. La cuota mensual de IVA mínimo (Literal E, pequeña empresa), en pesos.
2. El aporte mensual TOTAL de un monotributista unipersonal en régimen pleno, con cobertura FONASA, sin cónyuge ni hijos, en pesos.
3. El aporte mensual TOTAL a BPS del titular de una empresa unipersonal sin dependientes (categoría 1ª, 11 BFC), beneficiario del SNS, sin cónyuge ni hijos, en pesos.
4. El aporte mensual TOTAL a BPS del administrador o representante legal de una SAS (15 BFC, con FONASA), soltero sin hijos, en pesos.
5. El aporte mensual TOTAL a BPS de un socio de SRL con actividad (15 BFC, sin FONASA), en pesos.
6. El monto ANUAL del ICOSA (Impuesto de Control de las Sociedades Anónimas) al cierre de ejercicio, en pesos.
Usá SOLO fuentes oficiales: bps.gub.uy, dgi.gub.uy, gub.uy, impo.com.uy.
Respondé SOLO con un objeto JSON válido, sin texto adicional ni markdown, con este formato exacto y números sin separadores de miles ni símbolos:
{"ivaMinimo": <num>, "monoPlenoFonasaSolo": <num>, "bpsUnipersonalPleno": <num>, "bpsAdminSas": <num>, "bpsSocioSrl": <num>, "icosaAnual": <num>}
Si algún dato no lo encontrás en una fuente oficial, poné null. NO INVENTES NINGÚN NÚMERO.`

function parseJsonLoose(text: string): Partial<Record<RefreshableKey, number>> | null {
  const m = text.match(/\{[\s\S]*\}/)
  if (!m) return null
  try {
    return JSON.parse(m[0]) as Partial<Record<RefreshableKey, number>>
  } catch {
    return null
  }
}

/** Fetch + validate. Returns the merged figures, or the pure baseline on any failure. */
export async function refreshCompanyFigures(): Promise<CompanyFigures> {
  const baseline = baselineCompanyFigures()
  const apiKey = useRuntimeConfig().geminiApiKey as string | undefined
  if (!apiKey) return baseline

  try {
    const res = await $fetch<GeminiResponse>(
      'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent',
      {
        method: 'POST',
        query: { key: apiKey },
        body: { contents: [{ parts: [{ text: PROMPT }] }], tools: [{ google_search: {} }] },
        timeout: 30_000,
      }
    )
    const candidate = res.candidates?.[0]
    const text = (candidate?.content?.parts ?? [])
      .map(p => p.text ?? '')
      .join('')
      .trim()
    const data = parseJsonLoose(text)
    if (!data) return baseline

    const { figures, updated } = applyLiveCompanyFigures(baseline, data)
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

export async function getStoredCompanyFigures(): Promise<CompanyFigures | null> {
  return (await useStorage(STORAGE).getItem<CompanyFigures>(KEY)) ?? null
}

export function ageInDays(asOf: string | null): number {
  if (!asOf) return Infinity
  const t = new Date(asOf).getTime()
  return Number.isFinite(t) ? (Date.now() - t) / 86_400_000 : Infinity
}
