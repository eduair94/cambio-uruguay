// Apply the backend's validated BCU grid over this app's verified baseline.
//
// Not Gemini logic and not arithmetic: a plain "take the live table if it proves out, otherwise
// keep the baseline". The proof is re-run HERE as well as in the backend, because this route is
// the last thing between a number and a reader — and the check is pure arithmetic, so running it
// twice costs nothing.
import { BCU_CAPS, BCU_IN_FORCE_SINCE, BCU_PERIOD, USURY_MARKUP } from '../../utils/cashAdvance'
import type { BcuCapRow } from '../../utils/cashAdvance'

/** Same row shape the backend serves. */
export interface LiveBcuRow {
  bracket: 'menor10kUI' | 'mayor10kUI'
  cortoPlazo: boolean
  currency: 'UYU' | 'USD'
  media: number
  tope: number
  topeMora: number
}

export interface LiveBcuRatesResponse {
  periodo: string
  vigenteDesde: string
  rows: LiveBcuRow[]
  asOf: string | null
  sources?: Array<{ label: string; url: string }>
}

export interface BcuRatesPayload {
  periodo: string
  vigenteDesde: string
  rows: BcuCapRow[]
  asOf: string | null
  /** `true` when the rows came from the live refresh rather than the built-in baseline. */
  live: boolean
  sources: Array<{ label: string; url: string }>
}

const EPSILON = 0.0005

/**
 * UNIT BOUNDARY — the reason this file has a test.
 *
 * The backend stores the grid the way the BCU PRINTS it (84.47 = 84,47 %), because that is what
 * makes a transcription auditable against the PDF. This app stores rates as FRACTIONS (0.8447),
 * because `pct()` multiplies by 100 on the way to the screen.
 *
 * Forwarding the payload unconverted renders "8447 %". The arithmetic proof does not catch it:
 * `tope = media × 1,55` holds in either unit, so `provesOut` is scale-invariant by construction.
 * Only an explicit conversion plus a magnitude check catches a unit slip, which is what these are.
 */
const PERCENT_PER_UNIT = 100

/** A consumer-credit annual rate, as a fraction. 2 % floor, 500 % ceiling — deliberately wide. */
const FRACTION_BAND: readonly [number, number] = [0.02, 5]

function toFraction(row: LiveBcuRow): BcuCapRow {
  return {
    bracket: row.bracket,
    cortoPlazo: row.cortoPlazo,
    currency: row.currency,
    media: row.media / PERCENT_PER_UNIT,
    tope: row.tope / PERCENT_PER_UNIT,
    topeMora: row.topeMora / PERCENT_PER_UNIT,
  }
}

/** Guards the unit boundary: catches both a missed conversion and a double one. */
export function plausibleFractions(rows: readonly BcuCapRow[]): boolean {
  return rows.every(
    r =>
      r.media >= FRACTION_BAND[0] &&
      r.media <= FRACTION_BAND[1] &&
      r.topeMora >= FRACTION_BAND[0] &&
      r.topeMora <= FRACTION_BAND[1]
  )
}

export function baselineBcuRates(): BcuRatesPayload {
  return {
    periodo: BCU_PERIOD,
    vigenteDesde: BCU_IN_FORCE_SINCE,
    rows: BCU_CAPS.map(r => ({ ...r })),
    asOf: null,
    live: false,
    sources: [
      {
        label: 'BCU — Tasas medias de interés',
        url: 'https://www.bcu.gub.uy/Servicios-Financieros-SSF/Tasas-Medias/tasas-medias-interes.pdf',
      },
    ],
  }
}

/**
 * Ley 18.212 derives both caps from the published average, so a table that does not close is a
 * table we did not read correctly. Six rows, all matching to four decimals, is the proof.
 */
export function provesOut(rows: LiveBcuRow[] | undefined): boolean {
  if (!Array.isArray(rows) || rows.length !== BCU_CAPS.length) return false
  const keys = new Set<string>()
  for (const r of rows) {
    if (!r || typeof r !== 'object') return false
    if (
      ![r.media, r.tope, r.topeMora].every(
        n => typeof n === 'number' && Number.isFinite(n) && n > 0
      )
    ) {
      return false
    }
    const key = `${r.currency}|${r.bracket}|${r.cortoPlazo}`
    if (keys.has(key)) return false
    keys.add(key)
    if (Math.abs(r.tope - r.media * (1 + USURY_MARKUP.menor2M)) > EPSILON) return false
    if (Math.abs(r.topeMora - r.media * (1 + USURY_MARKUP.menor2MMora)) > EPSILON) return false
  }
  // The live table must describe the same six cells the page renders.
  const expected = new Set(BCU_CAPS.map(r => `${r.currency}|${r.bracket}|${r.cortoPlazo}`))
  for (const k of expected) if (!keys.has(k)) return false
  return true
}

export function applyBcuRates(live: LiveBcuRatesResponse | null): BcuRatesPayload {
  const base = baselineBcuRates()
  if (!live || !provesOut(live.rows)) return base
  if (!/^\d{4}-\d{2}-\d{2}$/.test(live.vigenteDesde ?? '')) return base
  // Never move backwards: the BCU only supersedes forward.
  if (live.vigenteDesde < base.vigenteDesde) return base
  const rows = live.rows.map(toFraction)
  // The backend speaks percent, this app speaks fractions. If the conversion did not land in a
  // plausible band, something changed on the other side of the wire — keep the baseline.
  if (!plausibleFractions(rows)) return base
  return {
    periodo: live.periodo || base.periodo,
    vigenteDesde: live.vigenteDesde,
    rows,
    asOf: live.asOf ?? null,
    live: true,
    sources: live.sources?.length ? live.sources : base.sources,
  }
}
