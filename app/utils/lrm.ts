// Letras de Regulación Monetaria (LRM) del BCU: tipos, foto de respaldo y cuentas puras de
// /letras-de-regulacion-monetaria-uruguay. Sin Vue ni Nuxt: lo carga vitest en node.
//
// Las tasas las escribe el job `currency-lrm` (classes/lrm/) a partir de la planilla OFICIAL del
// BCU con todas las licitaciones desde 2019, y las sirve /api/letras-regulacion-monetaria. Lo que
// está horneado acá (`LRM_BASELINE`) es la misma planilla leída a mano el 19/10/2026: sólo se usa
// si la base todavía no tiene la foto, y la página dice de qué fecha es cada número.
//
// Las cuentas de esta página son las que ninguna fuente hace por vos: el BCU publica la tasa de
// corte y los bancos publican su comisión, pero nadie junta las dos con el plazo fijo que el mismo
// banco te ofrece al lado. Con la comisión mínima del BROU, una letra chica rinde menos que un
// plazo fijo aunque no pague IRPF; `breakEvenAmount` dice desde qué monto deja de pasar.
import type { FaqItem } from './faqAnswers'
import { formatNumber, formatUYU } from './format'
import { BROU_DEPOSIT_BOARD, netOfIrpf, type BankBoardTranche } from './investments'

export const LRM_PATH = '/letras-de-regulacion-monetaria-uruguay'

/** Día en que se leyeron a mano la planilla, el calendario, los tarifarios y las normas. */
export const LRM_VERIFIED_AT = '2026-10-19'

// --- Forma de la foto (espejo de classes/lrm/types.ts) -------------------------------------------

export type LrmTermRef = 30 | 90 | 180 | 360 | 720

export interface LrmAuction {
  date: string
  settlement: string
  maturity: string
  series: string
  days: number
  termRef: LrmTermRef
  /** Licitado, millones de pesos. */
  auctioned: number
  /** Adjudicado, millones de pesos. */
  awarded: number
  /** Tasa de corte, % efectivo anual. */
  cutRate: number
}

export interface TreasuryAuction {
  date: string
  series: string
  currency: 'UYU' | 'UI' | 'UP'
  coupon: number
  maturity: string
  years: number
  awarded: number
  yield: number
}

export interface LrmUpcoming {
  date: string
  settlement: string
  maturity: string
  series: string
  days: number
  amount: number
  nonCompetitive: number
  hour: string
}

export interface LrmCalendar {
  from: string
  to: string
  publishedOn: string | null
  items: LrmUpcoming[]
}

export interface LrmSnapshotDoc {
  key: string
  capturedAt: string
  sources: {
    operationsUrl: string
    operationsModified: string | null
    calendarUrl: string
    pageUrl: string
  }
  latest: LrmAuction[]
  recent: LrmAuction[]
  treasury: TreasuryAuction[]
  calendar: LrmCalendar | null
  counts: { auctions: number; rejected: number }
}

export const LRM_SOURCES = Object.freeze({
  operationsUrl:
    'https://www.bcu.gub.uy/Politica-Economica-y-Mercados/Emisiones%20BCU/Operaciones%20BCU%20y%20MEF%20local.xlsx',
  calendarUrl:
    'https://www.bcu.gub.uy/Politica-Economica-y-Mercados/Calendario%20Deuda/calendario_deuda.pdf',
  pageUrl:
    'https://www.bcu.gub.uy/Politica-Economica-y-Mercados/Paginas/Instrumentos-emitidos-por-el-BCU-y-el-Gobierno-Central.aspx',
  characteristicsUrl:
    'https://www.bcu.gub.uy/Politica-Economica-y-Mercados/Documents/caracteristicas_instrumentos_BCU.pdf',
  primaryDealersUrl:
    'https://www.bcu.gub.uy/Politica-Economica-y-Mercados/Documents/Reglamento%20OP%20junio%202024.pdf',
  irpfUrl: 'https://impo.com.uy/bases/todgi2023/101-2024/38_T7',
  dgiConsultaUrl: 'https://www.impo.com.uy/bases/consultas-tributarias/6322-2020',
  brouTariffUrl:
    'https://www.brou.com.uy/documents/20182/112335/Tarifario_Sitio.pdf/681aecbe-2ba8-4616-844a-97ebd97e0175',
  itauTariffUrl: 'https://www.itau.com.uy/inst/aci/docs/tarifario.pdf',
})

/**
 * La planilla leída a mano el 19/10/2026 («Operaciones BCU y MEF local.xlsx», Last-Modified
 * 16/10/2026) y el calendario publicado el 16/10/2026. Se publica sólo si la base no tiene foto.
 * `recent` lleva el último mes y la licitación de cada plazo de hace un año, que es lo que la página
 * compara; la foto del job trae los últimos 400 días enteros.
 */
export const LRM_BASELINE: LrmSnapshotDoc = Object.freeze({
  key: 'uy',
  capturedAt: '2026-10-19T18:00:00.000Z',
  sources: {
    operationsUrl: LRM_SOURCES.operationsUrl,
    operationsModified: 'Fri, 16 Oct 2026 22:32:32 GMT',
    calendarUrl: LRM_SOURCES.calendarUrl,
    pageUrl: LRM_SOURCES.pageUrl,
  },
  latest: [
    {
      date: '2026-10-13',
      settlement: '2026-10-13',
      maturity: '2026-11-16',
      series: '13845-1',
      days: 34,
      termRef: 30,
      auctioned: 15000,
      awarded: 16914.51,
      cutRate: 6.04,
    },
    {
      date: '2026-10-14',
      settlement: '2026-10-14',
      maturity: '2027-01-05',
      series: '13844-2',
      days: 83,
      termRef: 90,
      auctioned: 15000,
      awarded: 8681.71,
      cutRate: 6.26,
    },
    {
      date: '2026-10-09',
      settlement: '2026-10-09',
      maturity: '2027-04-02',
      series: '13808-3',
      days: 175,
      termRef: 180,
      auctioned: 3960,
      awarded: 4372.42,
      cutRate: 6.12,
    },
    {
      date: '2026-10-15',
      settlement: '2026-10-16',
      maturity: '2027-10-15',
      series: '13842-2',
      days: 364,
      termRef: 360,
      auctioned: 6000,
      awarded: 5900,
      cutRate: 6.2,
    },
  ],
  recent: [
    {
      date: '2026-10-15',
      settlement: '2026-10-16',
      maturity: '2027-10-15',
      series: '13842-2',
      days: 364,
      termRef: 360,
      auctioned: 6000,
      awarded: 5900,
      cutRate: 6.2,
    },
    {
      date: '2026-10-14',
      settlement: '2026-10-14',
      maturity: '2027-01-05',
      series: '13844-2',
      days: 83,
      termRef: 90,
      auctioned: 15000,
      awarded: 8681.71,
      cutRate: 6.26,
    },
    {
      date: '2026-10-13',
      settlement: '2026-10-13',
      maturity: '2026-11-16',
      series: '13845-1',
      days: 34,
      termRef: 30,
      auctioned: 15000,
      awarded: 16914.51,
      cutRate: 6.04,
    },
    {
      date: '2026-10-09',
      settlement: '2026-10-09',
      maturity: '2027-04-02',
      series: '13808-3',
      days: 175,
      termRef: 180,
      auctioned: 3960,
      awarded: 4372.42,
      cutRate: 6.12,
    },
    {
      date: '2026-10-07',
      settlement: '2026-10-07',
      maturity: '2027-01-05',
      series: '13844-1',
      days: 90,
      termRef: 90,
      auctioned: 8040,
      awarded: 9521.14,
      cutRate: 6.04,
    },
    {
      date: '2026-10-05',
      settlement: '2026-10-05',
      maturity: '2026-11-09',
      series: '13843-1',
      days: 35,
      termRef: 30,
      auctioned: 11040,
      awarded: 10034.04,
      cutRate: 5.88,
    },
    {
      date: '2026-10-01',
      settlement: '2026-10-02',
      maturity: '2027-10-15',
      series: '13842-1',
      days: 378,
      termRef: 360,
      auctioned: 6000,
      awarded: 3960.21,
      cutRate: 6.4,
    },
    {
      date: '2026-09-30',
      settlement: '2026-09-30',
      maturity: '2026-12-23',
      series: '13841-2',
      days: 84,
      termRef: 90,
      auctioned: 12960,
      awarded: 15137.68,
      cutRate: 6.04,
    },
    {
      date: '2026-09-28',
      settlement: '2026-09-28',
      maturity: '2026-10-26',
      series: '13840-2',
      days: 28,
      termRef: 30,
      auctioned: 15000,
      awarded: 12647.67,
      cutRate: 5.94,
    },
    {
      date: '2026-09-25',
      settlement: '2026-09-25',
      maturity: '2027-03-19',
      series: '13839-2',
      days: 175,
      termRef: 180,
      auctioned: 6000,
      awarded: 3156.85,
      cutRate: 6.1,
    },
    {
      date: '2026-09-23',
      settlement: '2026-09-23',
      maturity: '2026-12-23',
      series: '13841-1',
      days: 91,
      termRef: 90,
      auctioned: 9960,
      awarded: 7825.01,
      cutRate: 5.99,
    },
    {
      date: '2026-09-21',
      settlement: '2026-09-21',
      maturity: '2026-10-26',
      series: '13840-1',
      days: 35,
      termRef: 30,
      auctioned: 14040,
      awarded: 15635.24,
      cutRate: 5.8,
    },
    {
      date: '2026-09-17',
      settlement: '2026-09-18',
      maturity: '2027-09-03',
      series: '13836-2',
      days: 350,
      termRef: 360,
      auctioned: 5040,
      awarded: 5899.93,
      cutRate: 6.25,
    },
    {
      date: '2026-09-16',
      settlement: '2026-09-16',
      maturity: '2026-12-09',
      series: '13838-2',
      days: 84,
      termRef: 90,
      auctioned: 10080,
      awarded: 10867.61,
      cutRate: 5.95,
    },
    {
      date: '2025-10-16',
      settlement: '2025-10-17',
      maturity: '2026-10-30',
      series: '13773-1',
      days: 378,
      termRef: 360,
      auctioned: 8040,
      awarded: 8049.07,
      cutRate: 7.74,
    },
    {
      date: '2025-10-15',
      settlement: '2025-10-15',
      maturity: '2026-01-07',
      series: '13771-2',
      days: 84,
      termRef: 90,
      auctioned: 8040,
      awarded: 9662.9,
      cutRate: 7.9,
    },
    {
      date: '2025-10-13',
      settlement: '2025-10-13',
      maturity: '2025-11-17',
      series: '13772-1',
      days: 35,
      termRef: 30,
      auctioned: 8040,
      awarded: 8634.6,
      cutRate: 8.24,
    },
    {
      date: '2025-10-10',
      settlement: '2025-10-10',
      maturity: '2026-04-10',
      series: '13721-3',
      days: 182,
      termRef: 180,
      auctioned: 8040,
      awarded: 8647.24,
      cutRate: 7.9,
    },
  ],
  treasury: [
    {
      date: '2026-10-13',
      series: '13-10',
      currency: 'UYU',
      coupon: 8.125,
      maturity: '2030-06-29',
      years: 4.9,
      awarded: 4500,
      yield: 7.25,
    },
    {
      date: '2026-10-06',
      series: '32-14',
      currency: 'UI',
      coupon: 3.125,
      maturity: '2036-02-28',
      years: 12,
      awarded: 146.4,
      yield: 3,
    },
    {
      date: '2026-09-22',
      series: '4-18',
      currency: 'UP',
      coupon: 2.45,
      maturity: '2037-01-27',
      years: 17,
      awarded: 2140.5,
      yield: 1.86,
    },
  ],
  calendar: {
    from: '2026-10-19',
    to: '2026-10-30',
    publishedOn: '2026-10-16',
    items: [
      {
        date: '2026-10-19',
        settlement: '2026-10-19',
        maturity: '2026-11-23',
        series: '13846-1',
        days: 35,
        amount: 13300,
        nonCompetitive: 2660,
        hour: '14:00',
      },
      {
        date: '2026-10-21',
        settlement: '2026-10-21',
        maturity: '2027-01-13',
        series: '13847-1',
        days: 84,
        amount: 8400,
        nonCompetitive: 1680,
        hour: '14:00',
      },
      {
        date: '2026-10-23',
        settlement: '2026-10-23',
        maturity: '2027-04-30',
        series: '13848-1',
        days: 189,
        amount: 4100,
        nonCompetitive: 820,
        hour: '14:00',
      },
      {
        date: '2026-10-26',
        settlement: '2026-10-26',
        maturity: '2026-11-30',
        series: '13849-1',
        days: 35,
        amount: 13300,
        nonCompetitive: 2660,
        hour: '14:00',
      },
      {
        date: '2026-10-28',
        settlement: '2026-10-28',
        maturity: '2027-01-13',
        series: '13847-2',
        days: 77,
        amount: 8400,
        nonCompetitive: 1680,
        hour: '14:00',
      },
      {
        date: '2026-10-29',
        settlement: '2026-10-30',
        maturity: '2027-10-15',
        series: '13842-3',
        days: 350,
        amount: 4100,
        nonCompetitive: 820,
        hour: '14:00',
      },
    ],
  },
  counts: { auctions: 1369, rejected: 11 },
}) as LrmSnapshotDoc

/** La foto que vino de la API, si sirve; si no, `null` y la página usa {@link LRM_BASELINE}. */
export function usableSnapshot(doc: unknown): LrmSnapshotDoc | null {
  if (!doc || typeof doc !== 'object') return null
  const d = doc as Partial<LrmSnapshotDoc>
  if (!Array.isArray(d.latest) || !d.latest.length) return null
  const ok = d.latest.every(
    a =>
      a &&
      typeof a.cutRate === 'number' &&
      Number.isFinite(a.cutRate) &&
      typeof a.date === 'string' &&
      typeof a.days === 'number'
  )
  if (!ok) return null
  return {
    key: d.key ?? 'uy',
    capturedAt: String(d.capturedAt ?? ''),
    sources: d.sources ?? LRM_BASELINE.sources,
    latest: d.latest,
    recent: Array.isArray(d.recent) ? d.recent : [],
    treasury: Array.isArray(d.treasury) ? d.treasury : [],
    calendar: d.calendar ?? null,
    counts: d.counts ?? { auctions: 0, rejected: 0 },
  }
}

// --- Fechas y números ------------------------------------------------------------------------------

const MONTHS = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'setiembre',
  'octubre',
  'noviembre',
  'diciembre',
]
const WEEKDAYS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado']

/**
 * "15/10/2026" a partir de un día de calendario ISO. Por texto, sin `Date` local: el mismo día en el
 * servidor (UTC) y en el navegador de quien lee (UTC-3).
 */
export function shortDay(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${m[3]}/${m[2]}/${m[1]}` : ''
}

/** "jueves 15 de octubre" (o "jueves 15 de octubre de 2026" con `withYear`). */
export function longDay(iso: string, withYear = false): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  if (!m) return ''
  const weekday = WEEKDAYS[new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])).getUTCDay()]
  return `${weekday} ${Number(m[3])} de ${MONTHS[Number(m[2]) - 1]}${withYear ? ` de ${m[1]}` : ''}`
}

/** "6,04 %". */
export function pct(value: number | null | undefined, decimals = 2): string {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—'
  return `${formatNumber(value, decimals)} %`
}

export const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000)

// --- Plazos ------------------------------------------------------------------------------------------

export const LRM_TERM_LABEL: Readonly<Record<LrmTermRef, string>> = Object.freeze({
  30: '30 días',
  90: '90 días',
  180: '180 días',
  360: '1 año',
  720: '2 años',
})

/**
 * Qué día licita el BCU cada plazo, según «Instrumentos emitidos por el Banco Central del
 * Uruguay» (caracteristicas_instrumentos_BCU.pdf, punto 1.2). El propio documento aclara que el
 * criterio puede variar si hay feriados o paros: por eso la página prefiere el calendario.
 */
export const LRM_SCHEDULE: readonly { termRef: LrmTermRef; rule: string }[] = Object.freeze([
  { termRef: 30, rule: 'los lunes, todas las semanas' },
  { termRef: 90, rule: 'los miércoles, todas las semanas' },
  { termRef: 180, rule: 'los viernes, una semana sí y otra no (alterna con el de un año)' },
  { termRef: 360, rule: 'los jueves con liquidación el viernes, alternando con el de 180 días' },
  { termRef: 720, rule: 'los martes con liquidación el miércoles, una vez por mes' },
])

/** El plazo de referencia de una licitación del calendario, que trae sólo los días. */
export function termRefOfDays(days: number): LrmTermRef {
  if (days <= 45) return 30
  if (days <= 135) return 90
  if (days <= 270) return 180
  if (days <= 540) return 360
  return 720
}

/** La licitación del mismo plazo de hace un año (±21 días), para decir cuánto se movió la tasa. */
export function yearAgoOf(recent: readonly LrmAuction[], auction: LrmAuction): LrmAuction | null {
  const target = Date.parse(`${auction.date}T00:00:00Z`) / 86_400_000 - 365
  let best: { a: LrmAuction; distance: number } | null = null
  for (const a of recent) {
    if (a.termRef !== auction.termRef) continue
    const distance = Math.abs(Date.parse(`${a.date}T00:00:00Z`) / 86_400_000 - target)
    if (distance <= 21 && (!best || distance < best.distance)) best = { a, distance }
  }
  return best?.a ?? null
}

/** Las licitaciones del calendario desde `today` (inclusive), en orden. */
export function upcomingFrom(calendar: LrmCalendar | null, today: string): LrmUpcoming[] {
  return (calendar?.items ?? []).filter(i => i.date >= today)
}

/**
 * Pesos que se pagan hoy por una letra que devuelve `nominal` al vencer: VA = VN / (1 + i)^(t/365),
 * la fórmula del punto 1.1 del documento del BCU.
 */
export function presentValue(nominal: number, ratePct: number, days: number): number {
  return nominal / Math.pow(1 + ratePct / 100, days / 365)
}

/** Lo que devuelve al vencer una letra comprada hoy por `invested` pesos. */
export function maturityValue(invested: number, ratePct: number, days: number): number {
  return invested * Math.pow(1 + ratePct / 100, days / 365)
}

/** Tasa efectiva anual de ganar `gain` sobre `invested` en `days` días. */
export function annualized(invested: number, gain: number, days: number): number {
  if (!(invested > 0) || !(days > 0)) return NaN
  return (Math.pow((invested + gain) / invested, 365 / days) - 1) * 100
}

// --- Comisiones publicadas ----------------------------------------------------------------------------

export type BrokerId = 'brou' | 'itau' | 'none'

export interface BrokerTariff {
  id: BrokerId
  name: string
  /** La regla, en las palabras del tarifario. */
  rule: string
  source: string
  sourceLabel: string
}

/**
 * Las dos tarifas publicadas que se encontraron para comprar LRM, leídas el 19/10/2026.
 *
 * BROU: «Tarifario de servicios financieros», apartado 2.2 «Instrumentos que operan por Tasa» (las
 * LRM se licitan y se negocian por tasa): en pesos, 1,50 % por debajo de $ 250.000, 1,00 % hasta
 * $ 9.999.999 y 0,50 % desde $ 10.000.000, con un mínimo de $ 2.500, «sobre valor nominal» y
 * «ponderadas por tiempo remanente», topeadas en un año. Custodia sin cargo (3.2).
 *
 * Itaú: tarifario versión 01/10/2026, 10.1: «Letras de Regulación Monetarias — Comisión Entrada:
 * 2 puntos de la tasa; Comisión Salida: 1 punto de la tasa». Custodia sin costo (10.2).
 */
export const BROKER_TARIFFS: readonly BrokerTariff[] = Object.freeze([
  {
    id: 'brou',
    name: 'BROU',
    rule: '1,50 % anual sobre el valor nominal hasta $ 250.000, 1 % hasta $ 9.999.999 y 0,50 % desde $ 10.000.000, ponderado por el plazo, con un mínimo de $ 2.500 por operación',
    source: LRM_SOURCES.brouTariffUrl,
    sourceLabel: 'BROU — Tarifario de instrumentos financieros, apartado 2.2',
  },
  {
    id: 'itau',
    name: 'Itaú',
    rule: '2 puntos de la tasa al comprar y 1 punto al vender antes del vencimiento',
    source: LRM_SOURCES.itauTariffUrl,
    sourceLabel: 'Itaú — Tarifario, versión del 1/10/2026, apartado 10.1',
  },
  {
    id: 'none',
    name: 'Sin comisión',
    rule: 'la tasa de corte entera, el techo de lo que puede rendir la letra',
    source: LRM_SOURCES.operationsUrl,
    sourceLabel: 'BCU — tasa de corte de la licitación',
  },
])

export const BROU_MIN_COMMISSION = 2500

/** Comisión del BROU por comprar una LRM de `nominal` pesos a `days` días. */
export function brouCommission(nominal: number, days: number): number {
  const rate = nominal < 250_000 ? 0.015 : nominal < 10_000_000 ? 0.01 : 0.005
  const weighted = (nominal * rate * Math.min(days, 365)) / 365
  return Math.max(BROU_MIN_COMMISSION, weighted)
}

/** Puntos de tasa que Itaú descuenta al comprar. */
export const ITAU_ENTRY_POINTS = 2

export interface LrmOutcome {
  invested: number
  nominal: number
  grossGain: number
  commission: number
  netGain: number
  netAnnualPct: number
}

/** Qué te queda de una LRM comprada por `invested` pesos, según quién la compre por vos. */
export function lrmOutcome(invested: number, auction: LrmAuction, broker: BrokerId): LrmOutcome {
  const nominal = maturityValue(invested, auction.cutRate, auction.days)
  const grossGain = nominal - invested
  let commission = 0
  if (broker === 'brou') commission = brouCommission(nominal, auction.days)
  if (broker === 'itau') {
    const net =
      maturityValue(invested, auction.cutRate - ITAU_ENTRY_POINTS, auction.days) - invested
    commission = grossGain - net
  }
  const netGain = grossGain - commission
  return {
    invested,
    nominal,
    grossGain,
    commission,
    netGain,
    netAnnualPct: annualized(invested, netGain, auction.days),
  }
}

// --- El plazo fijo de al lado ---------------------------------------------------------------------------

/** El tramo de la pizarra e-BROU en pesos para un plazo en días, o `null` si no hay. */
export function depositTrancheForDays(days: number): BankBoardTranche | null {
  return (
    BROU_DEPOSIT_BOARD.series.UYU.tranches.find(t => days >= t.minDays && days <= t.maxDays) ?? null
  )
}

export interface DepositOutcome {
  tranche: BankBoardTranche
  grossPct: number
  irpfPct: number
  grossGain: number
  irpf: number
  netGain: number
  netAnnualPct: number
}

/** Un plazo fijo en pesos por e-BROU al mismo plazo, después del IRPF. */
export function depositOutcome(invested: number, days: number): DepositOutcome | null {
  const tranche = depositTrancheForDays(days)
  if (!tranche) return null
  const tax = netOfIrpf(tranche.online, 'UYU', days / 30.4375)
  const grossGain = maturityValue(invested, tranche.online, days) - invested
  const irpf = (grossGain * tax.taxPct) / 100
  const netGain = grossGain - irpf
  return {
    tranche,
    grossPct: tranche.online,
    irpfPct: tax.taxPct,
    grossGain,
    irpf,
    netGain,
    netAnnualPct: annualized(invested, netGain, days),
  }
}

/** Mínimo del sistema del BCU para una propuesta: $ 100.000 en múltiplos de $ 10.000. */
export const LRM_MIN_BID = 100_000
export const LRM_BID_STEP = 10_000
/** Hasta dónde se busca el punto de equilibrio. */
export const BREAK_EVEN_CAP = 50_000_000

/** Si con `amount` pesos la letra deja al menos lo mismo que el plazo fijo e-BROU. */
function lrmWins(amount: number, auction: LrmAuction, broker: BrokerId): boolean {
  const deposit = depositOutcome(amount, auction.days)
  return Boolean(deposit && lrmOutcome(amount, auction, broker).netGain >= deposit.netGain)
}

/**
 * El menor monto (múltiplo de $ 10.000, desde $ 100.000) desde el que la LRM comprada con esa
 * tarifa deja más que el plazo fijo e-BROU al mismo plazo, o `null` si no pasa antes de
 * $ 50 millones.
 *
 * Búsqueda binaria, y es válida porque «gana» no se des-gana al subir el monto: mientras rige el
 * mínimo de comisión la letra mejora con cada peso, y cuando la comisión pasa a ser proporcional
 * gana o pierde por la misma proporción en todo el tramo — y los tramos sólo bajan la tasa.
 */
export function breakEvenAmount(auction: LrmAuction, broker: BrokerId): number | null {
  if (!depositTrancheForDays(auction.days)) return null
  const steps = Math.floor((BREAK_EVEN_CAP - LRM_MIN_BID) / LRM_BID_STEP)
  const at = (n: number): number => LRM_MIN_BID + n * LRM_BID_STEP
  if (!lrmWins(at(steps), auction, broker)) return null
  let lo = 0
  let hi = steps
  while (lo < hi) {
    const mid = Math.floor((lo + hi) / 2)
    if (lrmWins(at(mid), auction, broker)) hi = mid
    else lo = mid + 1
  }
  return at(lo)
}

// --- Textos de la página -----------------------------------------------------------------------------

export function latestFor(snapshot: LrmSnapshotDoc, termRef: LrmTermRef): LrmAuction | null {
  return snapshot.latest.find(a => a.termRef === termRef) ?? null
}

export const LRM_STATIC_TITLE = 'Letras de Regulación Monetaria (LRM)'

/** El `<title>` con la tasa a 30 días, o el estable si no hay dato. Cabe en 43 caracteres. */
export function lrmTitle(snapshot: LrmSnapshotDoc): string {
  const thirty = latestFor(snapshot, 30)
  return thirty ? `Tasas LRM del BCU: ${pct(thirty.cutRate)} a 30 días` : LRM_STATIC_TITLE
}

export const LRM_STATIC_DESCRIPTION =
  'Tasas de las Letras de Regulación Monetaria del BCU, cuándo es la próxima licitación, cómo comprarlas, qué comisión cobra el banco y si pagan IRPF.'

/**
 * La descripción con las tasas de corte de la última licitación de cada plazo. Cabe en 155
 * caracteres aun con tasas de dos dígitos enteros (lo prueba `lrm.test.ts`).
 */
export function lrmDescription(snapshot: LrmSnapshotDoc): string {
  const ordered = [...snapshot.latest].sort((a, b) => a.termRef - b.termRef)
  if (!ordered.length) return LRM_STATIC_DESCRIPTION
  // La primera lleva "días" y las demás no: "6,04 % a 30 días, 6,26 % a 90, 6,12 % a 180".
  const parts = ordered.map((a, i) =>
    a.termRef === 360
      ? `${pct(a.cutRate)} a un año`
      : a.termRef === 720
        ? `${pct(a.cutRate)} a dos años`
        : `${pct(a.cutRate)} a ${a.termRef}${i === 0 ? ' días' : ''}`
  )
  const newest =
    ordered
      .map(a => a.date)
      .sort()
      .at(-1) ?? ''
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}` : parts[0]
  return `Letras de Regulación Monetaria al ${shortDay(newest)}: ${list}. Cómo comprarlas, comisión e IRPF.`
}

/** Las preguntas frecuentes, armadas con los números de la foto. */
export function buildLrmFaq(
  snapshot: LrmSnapshotDoc,
  next: LrmUpcoming | null,
  thirtyBreakEven: number | null
): FaqItem[] {
  const rates = snapshot.latest
    .map(a => `${LRM_TERM_LABEL[a.termRef]}: ${pct(a.cutRate)} (${shortDay(a.date)})`)
    .join('; ')
  const ui = snapshot.treasury.find(t => t.currency === 'UI')
  // La alícuota del plazo fijo en pesos a menos de un año, leída de la matriz y no escrita a mano.
  const depositIrpf = netOfIrpf(1, 'UYU', 12).taxPct
  const items: FaqItem[] = [
    {
      id: 'lrm-tasa',
      question: '¿Qué tasa pagan hoy las Letras de Regulación Monetaria?',
      answer: rates
        ? `La tasa la fija cada licitación del BCU, que adjudica todo a una misma tasa de corte. En las últimas: ${rates}. Es tasa efectiva anual en pesos.`
        : 'La tasa la fija cada licitación del BCU, que adjudica todo a una misma tasa de corte, efectiva anual en pesos.',
    },
    {
      id: 'lrm-proxima',
      question: '¿Cuándo es la próxima licitación de LRM?',
      answer: next
        ? `Según el calendario tentativo del BCU, el ${longDay(next.date)} a las ${next.hour}: letra a ${next.days} días por $ ${formatNumber(next.amount, 0)} millones, más $ ${formatNumber(next.nonCompetitive, 0)} millones en el tramo no competitivo. El BCU publica el calendario de las dos semanas siguientes cada viernes.`
        : 'El BCU licita a 30 días los lunes, a 90 días los miércoles y alterna 180 días (viernes) con un año (jueves). El calendario de las dos semanas siguientes sale cada viernes en la portada del BCU.',
    },
    {
      id: 'lrm-como-comprar',
      question: '¿Cómo compro LRM siendo una persona?',
      answer:
        'No directamente: en la licitación compiten sólo los bancos y corredores de bolsa que el BCU designa como Operadores Primarios, y el resto de los bancos, corredores y casas financieras entra en el tramo no competitivo, a la misma tasa de corte. Una persona compra a través de su banco o de un corredor de bolsa, que la anota en esa licitación o le vende letras ya emitidas.',
    },
    {
      id: 'lrm-minimo',
      question: '¿Cuál es el monto mínimo para comprar Letras de Regulación Monetaria?',
      answer:
        'El sistema del BCU no admite propuestas por menos de $ 100.000 y exige múltiplos de $ 10.000. El banco o el corredor puede pedirte más, y su comisión mínima pesa mucho en montos chicos.',
    },
    {
      id: 'lrm-irpf',
      question: '¿Las LRM pagan IRPF?',
      answer: `No. El IRPF exonera los intereses de los títulos de deuda pública y la ganancia por venderlos (Título 7, art. 38, literal A), y la DGI trata a las LRM como títulos de deuda pública (Consulta 6.322 de 2020). Un plazo fijo en pesos a menos de un año, en cambio, paga ${pct(depositIrpf, 1)} de IRPF sobre el interés.`,
    },
    {
      id: 'lrm-conviene',
      question: '¿Rinde más una LRM que un plazo fijo?',
      answer: thirtyBreakEven
        ? `Depende del monto. La tasa de corte es más alta que la pizarra e-BROU y no paga IRPF, pero la comisión mínima del BROU es de $ 2.500 por operación: a 30 días, la letra le gana al plazo fijo recién desde unos $ ${formatNumber(thirtyBreakEven, 0)}.`
        : 'Depende del monto y del plazo: la tasa de corte es más alta que la pizarra e-BROU y no paga IRPF, pero la comisión del banco se come esa diferencia en montos chicos.',
      link: { label: 'Calculadora de plazo fijo', to: '/herramientas/calculadora-plazo-fijo' },
    },
    {
      id: 'lrm-ui',
      question: '¿Hay Letras de Regulación Monetaria en UI o en dólares?',
      answer: ui
        ? `Hoy el BCU emite LRM sólo en pesos nominales. En unidades indexadas, lo que licita el Estado son Notas del Tesoro del MEF: la última, el ${shortDay(ui.date)}, cortó en ${pct(ui.yield)} real anual a ${formatNumber(ui.years, 0)} años.`
        : 'Hoy el BCU emite LRM sólo en pesos nominales. En unidades indexadas, lo que licita el Estado son Notas del Tesoro del MEF.',
    },
    {
      id: 'lrm-vender',
      question: '¿Puedo vender una LRM antes de que venza?',
      answer:
        'Sí, en el mercado secundario, a la tasa que haya ese día: si las tasas subieron desde que compraste, la vendés con pérdida. Y vender también cobra comisión (Itaú publica 1 punto de la tasa). Si vas a necesitar la plata antes, elegí un plazo más corto.',
    },
  ]
  return items
}

/** Pesos con signo y sin decimales, para las tarjetas de la cuenta. */
export function money(value: number): string {
  return formatUYU(Math.round(value), 0)
}
