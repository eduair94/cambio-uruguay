// Framework-agnostic catalogue + helpers for the Uruguayan economic-indicator
// pages (`pages/indicadores/index.vue` and `pages/indicadores/[indicador].vue`).
//
// PURE module (no Vue/Nuxt runtime, relative imports only) so it can be
// unit-tested in plain Node via vitest and shared by the pages, the server
// sitemap route and the route guard.
//
// These pages target very high recurring Uruguayan searches ("valor de la unidad
// indexada hoy", "unidad reajustable", "valor de la BPC"). The live-valued
// indicators (UI, UR) read their current value from the same API the rest of the
// site uses; the BPC is a yearly legal value and is stored statically here. The
// editorial bodies are Spanish-only (the audience is Uruguay), like the guides.

import type { ExchangeRate } from '../types/api'
import { BCU_ORIGIN } from './rateSource'

/** A single FAQ entry rendered both as visible copy and FAQPage schema. */
export interface IndicatorFaq {
  question: string
  answer: string
}

/** A related internal link shown on the indicator page. */
export interface IndicatorLink {
  label: string
  to: string
}

/**
 * The official act behind a statically-valued indicator (the BPC): what the page cites when it
 * says "desde cuándo rige". Every field was read at the source on `seenOn`.
 */
export interface IndicatorLegalSource {
  /** e.g. `'Decreto N° 11/026'`. */
  act: string
  /** The act's text at IMPO. */
  url: string
  /** ISO date from which the value applies. Its year is the year the value is valid for. */
  validFrom: string
  /** ISO dates of promulgation and of publication in the Diario Oficial. */
  promulgated: string
  published: string
  /** The rule behind the yearly update, as the act itself cites it (one sentence, no period). */
  basis: string
  /** The value it replaced, with its own act and the change the act states. */
  previous: { value: number; act: string; changePct: number }
  /** ISO date we read the act. */
  seenOn: string
}

/** A complete economic indicator, addressable at `/indicadores/{slug}`. */
export interface Indicator {
  /** URL-safe identifier, e.g. `'unidad-indexada'`. */
  slug: string
  /**
   * API `ExchangeRate.code` used to read the live value, or `null` for
   * statically-valued indicators (the BPC, a yearly legal figure).
   */
  code: 'UI' | 'UR' | null
  /** Full name, e.g. `'Unidad Indexada'`. */
  name: string
  /** Short abbreviation, e.g. `'UI'`. */
  abbr: string
  /** Uppercase label for the OG image. */
  tag: string
  /** One-line summary for meta description / cards. */
  shortDef: string
  /** First explanatory paragraph (what it is). */
  whatItIs: string
  /** Bullet list of common real-world uses. */
  usedFor: string[]
  /** How and how often it is updated. */
  howUpdated: string
  /**
   * Reference value used when there is no live `code` (BPC) or as a defensive
   * fallback if the API row is missing. For UI/UR the live API value wins.
   */
  referenceValue: number
  /** Context for {@link referenceValue}, e.g. `'Vigente en 2026'`. */
  referenceLabel: string
  /** Decimal places used to display the value. */
  decimals: number
  /** Only for statically-valued indicators: the act that fixes {@link referenceValue}. */
  legal?: IndicatorLegalSource
  /** Frequently-asked questions (also emitted as FAQPage JSON-LD). */
  faqs: IndicatorFaq[]
  /** Related internal links. */
  related: IndicatorLink[]
  /** ISO date (`YYYY-MM-DD`) of last editorial review. */
  updatedAt: string
}

/**
 * BPC 2026, read at IMPO on 2026-10-19 (Decreto N° 11/026): "Fíjase el valor de la Base de
 * Prestaciones y Contribuciones a partir del 1° de enero de 2026, en $ 6.864". Promulgated
 * 2026-01-20, published 2026-01-29. Its considerando cites the 2025 value ($ 6.576, Decreto N°
 * 5/025) and the 4,38 % adjustment by the IPC that Ley 17.856 allows, "con un margen de hasta
 * 20% en exceso". The same figure lives in `irpfCasos.ts` (`BPC_2026`) and `calculators.ts`
 * (`URUGUAY.bpc`); `indicators.test.ts` keeps the three together.
 */
const BPC_2026 = 6864
const BPC_2025 = 6576

/** `13728` → `'$ 13.728'`: whole pesos, the way a decree or a payslip prints them. */
const wholePesos = (n: number): string => `$ ${Math.round(n).toLocaleString('es-UY')}`

/**
 * The catalogue of indicators, in the order shown on `/indicadores`.
 *
 * UI and UR are read live from the API (BCU is the authoritative source); the BPC
 * is the yearly legal value and must be refreshed each January.
 */
export const indicators: readonly Indicator[] = Object.freeze([
  {
    slug: 'unidad-indexada',
    code: 'UI',
    name: 'Unidad Indexada',
    abbr: 'UI',
    tag: 'INDICADOR',
    shortDef:
      'La Unidad Indexada (UI) es una unidad de valor que se ajusta a diario según la inflación. Mirá su valor de hoy y convertilo a pesos.',
    whatItIs:
      'La Unidad Indexada (UI) es una unidad de valor creada en Uruguay que se ajusta todos los días según la inflación, medida por el Índice de Precios al Consumo (IPC). Su objetivo es mantener el poder de compra a lo largo del tiempo: como su valor en pesos sube con la inflación, un monto expresado en UI conserva su valor real aunque pasen los meses o los años.',
    usedFor: [
      'Alquileres ajustados por inflación',
      'Préstamos y créditos hipotecarios',
      'Depósitos y ahorros en UI',
      'Contratos y obligaciones de largo plazo',
    ],
    howUpdated:
      'El Instituto Nacional de Estadística (INE) publica el valor de la UI todos los días, calculado a partir de la inflación del IPC con un rezago de algunas semanas.',
    referenceValue: 6.58,
    referenceLabel: 'Valor de referencia',
    decimals: 4,
    faqs: [
      {
        question: '¿Cuánto vale la Unidad Indexada hoy?',
        answer:
          'El valor de la UI se actualiza todos los días. En esta página mostramos el valor vigente tomado del Banco Central del Uruguay; multiplicá la cantidad de UI por ese valor para obtener el monto en pesos.',
      },
      {
        question: '¿Cómo se calcula la Unidad Indexada?',
        answer:
          'La UI se ajusta diariamente según la variación del Índice de Precios al Consumo (IPC) que publica el INE, por lo que acompaña a la inflación.',
      },
      {
        question: '¿Para qué se usa la UI en Uruguay?',
        answer:
          'Se usa principalmente en alquileres, préstamos hipotecarios, depósitos y contratos de largo plazo, para que los montos mantengan su valor real frente a la inflación.',
      },
      {
        question: '¿Qué diferencia hay entre la UI y la UR?',
        answer:
          'La UI se ajusta por la inflación (IPC) y de forma diaria; la Unidad Reajustable (UR) se ajusta por la evolución de los salarios y se publica una vez al mes.',
      },
    ],
    related: [
      { label: 'Conversor de Unidad Indexada', to: '/herramientas/conversor-unidad-indexada' },
      { label: 'Unidad Indexada explicada', to: '/guias/unidad-indexada-explicada' },
      { label: 'Crédito hipotecario: comparativa', to: '/guias/credito-hipotecario-uruguay' },
      { label: 'Calculadora de inflación', to: '/herramientas/calculadora-inflacion' },
      { label: 'Unidad Reajustable (UR)', to: '/indicadores/unidad-reajustable' },
    ],
    updatedAt: '2026-06-20',
  },
  {
    slug: 'unidad-reajustable',
    code: 'UR',
    name: 'Unidad Reajustable',
    abbr: 'UR',
    tag: 'INDICADOR',
    shortDef:
      'La Unidad Reajustable (UR) se ajusta según los salarios y se usa sobre todo en alquileres. Consultá su valor de hoy y pasalo a pesos.',
    whatItIs:
      'La Unidad Reajustable (UR) es una unidad de valor que se ajusta según la evolución del Índice Medio de Salarios. A diferencia de la Unidad Indexada, que sigue a la inflación, la UR acompaña a los salarios, por lo que se utiliza en contratos donde se busca seguir la capacidad de pago de las personas, como muchos alquileres y préstamos del Banco Hipotecario.',
    usedFor: [
      'Alquileres con ajuste por UR',
      'Préstamos del Banco Hipotecario (BHU)',
      'Cuotas y obligaciones de largo plazo',
      'Topes y referencias en normativa',
    ],
    howUpdated:
      'El Instituto Nacional de Estadística (INE) publica el valor de la UR una vez al mes, en base a la variación del Índice Medio de Salarios.',
    referenceValue: 1921.36,
    referenceLabel: 'Valor de referencia',
    decimals: 2,
    faqs: [
      {
        question: '¿Cuánto vale la Unidad Reajustable hoy?',
        answer:
          'La UR se actualiza una vez al mes. En esta página mostramos el valor vigente tomado del Banco Central del Uruguay; multiplicá la cantidad de UR por ese valor para obtener el monto en pesos.',
      },
      {
        question: '¿Cómo se ajusta la UR?',
        answer:
          'La Unidad Reajustable se ajusta según la evolución del Índice Medio de Salarios que calcula el INE, por lo que sigue a los salarios y no directamente a la inflación.',
      },
      {
        question: '¿Para qué se usa la UR?',
        answer:
          'Se usa sobre todo en alquileres con ajuste anual y en préstamos del Banco Hipotecario del Uruguay (BHU), además de servir como referencia en distintas normas.',
      },
      {
        question: '¿La UR es lo mismo que la UI?',
        answer:
          'No. La UR sigue a los salarios y se actualiza mensualmente; la UI sigue a la inflación (IPC) y se actualiza a diario. Por eso sus valores y su evolución son distintos.',
      },
    ],
    related: [
      { label: 'Garantías de alquiler comparadas', to: '/guias/garantias-de-alquiler-uruguay' },
      {
        label: 'Cómo rescindir un contrato de alquiler',
        to: '/guias/como-rescindir-contrato-alquiler-uruguay',
      },
      { label: 'UI, UR y BPC: diferencias', to: '/guias/ui-ur-bpc-diferencias' },
      { label: 'Unidad Indexada (UI)', to: '/indicadores/unidad-indexada' },
      { label: 'Calculadora de inflación', to: '/herramientas/calculadora-inflacion' },
    ],
    updatedAt: '2026-06-20',
  },
  {
    slug: 'bpc',
    code: null,
    name: 'Base de Prestaciones y Contribuciones',
    abbr: 'BPC',
    tag: 'INDICADOR',
    shortDef:
      'La BPC es el valor de referencia que usa el Estado para tributos, multas, prestaciones y los topes del IRPF. Mirá su valor 2026 y convertilo a pesos.',
    whatItIs:
      'La Base de Prestaciones y Contribuciones (BPC) es un valor de referencia que fija el Estado uruguayo una vez al año y que se usa para expresar montos en muchas normas: tributos, multas, prestaciones sociales, asignaciones familiares y, muy especialmente, las franjas del IRPF. Al estar expresados en BPC, esos montos se actualizan automáticamente cada año cuando se fija el nuevo valor.',
    usedFor: [
      'Franjas y mínimo no imponible del IRPF (hasta 7 BPC por mes no se retiene)',
      'La tasa del FONASA, que cambia por encima de 2,5 BPC',
      'Multas y tributos expresados en BPC',
      'Prestaciones sociales y asignaciones familiares',
    ],
    howUpdated:
      'La fija el Poder Ejecutivo por decreto una vez al año, con vigencia desde el 1° de enero, ajustándola según la variación del Índice de Precios al Consumo (Ley N° 17.856). La de 2026 la fijó el Decreto N° 11/026.',
    referenceValue: BPC_2026,
    referenceLabel: 'Vigente en 2026',
    decimals: 0,
    legal: {
      act: 'Decreto N° 11/026',
      url: 'https://www.impo.com.uy/bases/decretos/11-2026',
      validFrom: '2026-01-01',
      promulgated: '2026-01-20',
      published: '2026-01-29',
      basis:
        'la Ley N° 17.856 (arts. 2 y 3) permite ajustarla según la variación del IPC, con un margen de hasta 20 % en exceso',
      previous: { value: BPC_2025, act: 'Decreto N° 5/025', changePct: 4.38 },
      seenOn: '2026-10-19',
    },
    faqs: [
      {
        question: '¿Cuánto vale la BPC en 2026?',
        answer: `La BPC vale ${wholePesos(BPC_2026)} desde el 1° de enero de 2026 y rige todo el año. La fijó el Decreto N° 11/026, publicado en el Diario Oficial el 29 de enero de 2026.`,
      },
      {
        question: '¿Cuánto valía la BPC en 2025?',
        answer: `${wholePesos(BPC_2025)}, según el Decreto N° 5/025. La de 2026 es 4,38 % más alta: la Ley N° 17.856 le permite al Poder Ejecutivo ajustarla según la variación del IPC, con un margen de hasta 20 % en exceso.`,
      },
      {
        question: '¿Para qué sirve la BPC?',
        answer: `Para expresar montos que se actualizan solos cada año: las franjas del IRPF (hasta 7 BPC por mes, ${wholePesos(7 * BPC_2026)} en 2026, no se retiene), el cambio de tasa del FONASA a partir de 2,5 BPC, multas, tributos y prestaciones sociales.`,
      },
      {
        question: '¿Cómo paso un monto en BPC a pesos?',
        answer: `Multiplicá la cantidad de BPC por ${wholePesos(BPC_2026)}. En 2026, 2 BPC son ${wholePesos(2 * BPC_2026)}, 3 BPC ${wholePesos(3 * BPC_2026)}, 5 BPC ${wholePesos(5 * BPC_2026)} y 10 BPC ${wholePesos(10 * BPC_2026)}.`,
      },
      {
        question: '¿Cada cuánto cambia la BPC?',
        answer:
          'Una vez al año. El decreto que la fija rige desde el 1° de enero aunque se publique después: el de 2026 se promulgó el 20 de enero y salió en el Diario Oficial el 29.',
      },
    ],
    related: [
      { label: 'Calculadora de sueldo líquido', to: '/herramientas/calculadora-sueldo-liquido' },
      { label: 'Calculadora de IRPF', to: '/herramientas/calculadora-irpf' },
      { label: 'Calculadora de aguinaldo', to: '/herramientas/calculadora-aguinaldo' },
      { label: 'UI, UR y BPC: diferencias', to: '/guias/ui-ur-bpc-diferencias' },
      { label: 'Unidad Indexada (UI)', to: '/indicadores/unidad-indexada' },
    ],
    updatedAt: '2026-10-19',
  },
])

/** Look up an indicator by slug. Returns `null` when the slug is unknown. */
export function indicatorFromSlug(slug: string): Indicator | null {
  const normalized = slug.trim().toLowerCase()
  if (!normalized) return null
  return indicators.find(i => i.slug === normalized) ?? null
}

/** Every indicator slug, for sitemap generation and internal linking. */
export function listIndicatorSlugs(): string[] {
  return indicators.map(i => i.slug)
}

/**
 * Resolve the current value of an indicator from a set of API rows.
 *
 * For live-valued indicators (UI, UR) the authoritative BCU row wins, falling
 * back to any row with the right code, and finally to the static
 * {@link Indicator.referenceValue}. Statically-valued indicators (BPC) always
 * return their reference value.
 *
 * @returns the value in pesos for one unit of the indicator.
 */
export function currentIndicatorValue(rows: readonly ExchangeRate[], indicator: Indicator): number {
  if (!indicator.code) return indicator.referenceValue
  return liveIndicatorReading(rows, indicator)?.value ?? indicator.referenceValue
}

/** A value read from the API today, with the date the source stamped on it. */
export interface IndicatorReading {
  value: number
  /** ISO date of the row, or `null` when the row carried none. */
  date: string | null
}

/**
 * The live reading ONLY — never the catalogue's reference value.
 *
 * `currentIndicatorValue` falls back to `referenceValue`, which is right for the calculator but
 * wrong for a `<title>`: when the API read fails, a title built from it stamps a months-old number
 * as "hoy". That already happened once on this page (the guard in `[indicador].vue` checked for
 * `null`, and the old helper never returned `null`). Anything that publishes the number —
 * title, description, the equivalence table — must read it from here.
 *
 * Statically-valued indicators (BPC) have no live reading and return `null`.
 */
export function liveIndicatorReading(
  rows: readonly ExchangeRate[],
  indicator: Indicator
): IndicatorReading | null {
  if (!indicator.code) return null

  let fallback: IndicatorReading | null = null
  for (const row of rows) {
    if (row.code !== indicator.code) continue
    const value = typeof row.sell === 'number' && row.sell > 0 ? row.sell : row.buy
    if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) continue
    const reading = { value, date: row.date || null }
    if (row.origin === BCU_ORIGIN) return reading // authoritative
    if (fallback === null) fallback = reading
  }
  return fallback
}

/**
 * The amounts each equivalence table lists.
 *
 * Taken from what people actually type (Search Console, 2026-08-15..09-11): "15 ur a pesos
 * uruguayos", "12 ur", "10 ur", "1.25 ur en pesos uruguayos"; "20 ui a pesos uruguayos", "500 ui",
 * "1000 unidades indexadas", "1500 ui". The rest fill the ladder people need for a rent (UR), a
 * mortgage (UI, in the hundreds of thousands) or the IRPF brackets (7, 10, 15, 30 and 50 BPC).
 */
export const EQUIVALENCE_AMOUNTS: Readonly<Record<string, readonly number[]>> = Object.freeze({
  'unidad-indexada': [1, 10, 20, 50, 100, 500, 1000, 1500, 5000, 10000, 100000],
  'unidad-reajustable': [1, 1.25, 5, 10, 12, 15, 20, 25, 30, 50, 100],
  // 2, 3, 4 and 5 are what people type for the BPC (Search Console, 2026-07-20..10-17: "2 bpc
  // cuanto es", "cuanto es 3 bpc en uruguay", "4 bpc cuanto es", "5 bpc cuanto es"); 2,5 is the
  // FONASA threshold and 7/10/15/30/50 the IRPF bracket edges.
  bpc: [0.5, 1, 2, 2.5, 3, 4, 5, 7, 10, 15, 20, 30, 50],
})

export interface EquivalenceRow {
  units: number
  pesos: number
}

/** `units × value` for every amount, rounded to cents (what a contract or a receipt shows). */
export function equivalenceTable(amounts: readonly number[], value: number): EquivalenceRow[] {
  if (!Number.isFinite(value) || value <= 0) return []
  return amounts.map(units => ({ units, pesos: Math.round(units * value * 100) / 100 }))
}

/** One point of `GET /evolution/:origin/:code`. */
export interface EvolutionPoint {
  date: string
  buy?: number | null
  sell?: number | null
}

export interface MonthlyValue {
  /** `YYYY-MM`, in Montevideo time. */
  month: string
  /** ISO date of the last observation of that month. */
  date: string
  value: number
  /** Percent change against the previous month in the series, or `null` for the first one. */
  changePct: number | null
}

const MONTEVIDEO_OFFSET_MS = 3 * 60 * 60 * 1000 // UTC−3 all year: Uruguay dropped DST in 2015.

function pointValue(point: EvolutionPoint): number | null {
  const sell = point.sell
  const buy = point.buy
  const value = typeof sell === 'number' && sell > 0 ? sell : buy
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : null
}

function pointTime(point: EvolutionPoint): number | null {
  const t = Date.parse(point.date)
  return Number.isNaN(t) ? null : t
}

/**
 * Month key in Montevideo time. The API stamps each day at 03:00 UTC (local midnight), so a naive
 * UTC month would still be right today — but a row written at 01:00 UTC on the 1st belongs to the
 * previous local month, and that is exactly the row that would silently move a month boundary.
 */
export function montevideoMonthKey(iso: string): string | null {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return new Date(t - MONTEVIDEO_OFFSET_MS).toISOString().slice(0, 7)
}

/** The calendar year in Montevideo at `now`. */
export function montevideoYear(now: Date = new Date()): number {
  return Number(new Date(now.getTime() - MONTEVIDEO_OFFSET_MS).toISOString().slice(0, 4))
}

/** `'2026-01-01'` → `'1° de enero de 2026'`, read as a calendar day (no timezone shift). */
export function isoDayLabelEs(iso: string): string | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!match) return null
  const [, y, m, d] = match
  const date = new Date(Date.UTC(Number(y), Number(m) - 1, Number(d)))
  // The full date, not the month alone: ICU capitalises a stand-alone month in es-UY ("Enero").
  const label = date.toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  })
  return Number(d) === 1 ? label.replace(/^1 /, '1° ') : label
}

/**
 * Whether a statically-valued indicator (the BPC) may be published as the value in force today:
 * the year its act applies to is this year in Montevideo.
 *
 * The same guard UI/UR get from `liveIndicatorReading`, for a number that changes once a year. On
 * January 1st, until someone loads the new decree, the page stops putting last year's BPC in the
 * `<title>` as the current one — the decree comes out weeks later (2026's was promulgated on
 * January 20th) and the old number would otherwise sit there as "hoy" with no error anywhere.
 */
export function staticValueIsCurrent(ind: Indicator, now: Date = new Date()): boolean {
  if (ind.code || !ind.legal) return false
  return Number(ind.legal.validFrom.slice(0, 4)) === montevideoYear(now)
}

/** The multiples the BPC description lists: the ones people search ("2 bpc cuanto es", …). */
export const STATIC_SNIPPET_UNITS: readonly number[] = Object.freeze([2, 3, 5, 10])

export interface IndicatorSnippet {
  /** Without the brand: `app.vue`'s `titleTemplate` appends " | Cambio Uruguay". */
  title: string
  description: string
}

/**
 * `<title>` and meta description of a statically-valued indicator while its value is current, or
 * `null` (the page then falls back to the copy without numbers).
 *
 * Why this shape and not the UR's ("Valor de la UR hoy: $ X"): the BPC page had exactly that
 * title since September and 2.286 impressions with one click in 28 days (Search Console,
 * 2026-09-20..10-17), at position ~10 for "valor bpc", "1 bpc" and "2 bpc cuanto es". For a value
 * that changes once a year the year IS the freshness signal, and the multiples people type go in
 * the description, next to the act that fixes it.
 */
export function staticIndicatorSnippet(
  ind: Indicator,
  now: Date = new Date()
): IndicatorSnippet | null {
  if (!ind.legal || !staticValueIsCurrent(ind, now)) return null
  const year = ind.legal.validFrom.slice(0, 4)
  const value = wholePesos(ind.referenceValue)
  const since = isoDayLabelEs(ind.legal.validFrom) ?? year
  const multiples = STATIC_SNIPPET_UNITS.map(
    n => `${n} ${ind.abbr} = ${wholePesos(n * ind.referenceValue)}`
  )
  const listed = `${multiples.slice(0, -1).join(', ')} y ${multiples[multiples.length - 1]}`
  const act = ind.legal.act.replace('N° ', '')
  return {
    title: `Valor de la ${ind.abbr} ${year}: 1 ${ind.abbr} = ${value}`,
    description: `La ${ind.abbr} vale ${value}: rige desde el ${since} (${act}). ${listed}.`,
  }
}

/**
 * The last observation of each month, oldest first, with the month-on-month change.
 *
 * The UR is published once a month, so its last daily row IS the month's value; for the UI (daily)
 * it is the closing value. The change of the first returned month is computed against the month
 * before the window when the series has it, so trimming never produces a spurious `null`.
 */
export function monthlyHistory(points: readonly EvolutionPoint[], maxMonths = 13): MonthlyValue[] {
  const latest = new Map<string, { time: number; date: string; value: number }>()
  for (const point of points) {
    const value = pointValue(point)
    const time = pointTime(point)
    if (value === null || time === null) continue
    const month = montevideoMonthKey(point.date)
    if (!month) continue
    const current = latest.get(month)
    if (!current || time > current.time) latest.set(month, { time, date: point.date, value })
  }

  const months = [...latest.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
  const withChange: MonthlyValue[] = months.map(([month, entry], i) => {
    const prev = i > 0 ? months[i - 1]![1].value : null
    return {
      month,
      date: entry.date,
      value: entry.value,
      changePct: prev ? ((entry.value - prev) / prev) * 100 : null,
    }
  })
  return withChange.slice(-Math.max(0, maxMonths))
}

/**
 * Percent change between the newest observation and the one `days` earlier.
 *
 * Returns `null` unless the series has a point within `toleranceDays` of that date: a "12 month"
 * change measured against a point from month 9 is a different, smaller number with the same label.
 */
export function changeOverDays(
  points: readonly EvolutionPoint[],
  days = 365,
  toleranceDays = 7
): number | null {
  const valid = points
    .map(p => ({ time: pointTime(p), value: pointValue(p) }))
    .filter((p): p is { time: number; value: number } => p.time !== null && p.value !== null)
  if (valid.length < 2) return null

  const newest = valid.reduce((a, b) => (b.time > a.time ? b : a))
  const target = newest.time - days * 86_400_000
  let best: { time: number; value: number } | null = null
  for (const p of valid) {
    if (!best || Math.abs(p.time - target) < Math.abs(best.time - target)) best = p
  }
  if (!best || Math.abs(best.time - target) > toleranceDays * 86_400_000) return null
  return ((newest.value - best.value) / best.value) * 100
}

/** `'2026-09'` → `'setiembre de 2026'` (Uruguayan spelling; see `dateLocale` in `format.ts`). */
export function monthLabelEs(month: string): string {
  const match = /^(\d{4})-(\d{2})$/.exec(month)
  if (!match) return month
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, 15))
  return date.toLocaleDateString('es-UY', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}

/** An ISO timestamp as a Montevideo calendar day: `'16 de setiembre de 2026'`. */
export function dayLabelEs(iso: string): string | null {
  const t = Date.parse(iso)
  if (Number.isNaN(t)) return null
  return new Date(t).toLocaleDateString('es-UY', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Montevideo',
  })
}
