// app/utils/inversionesResumen.ts
// Lo que /inversiones-uruguay contesta por MONTO y lo que paga HOY lo de bajo riesgo. Sin Vue ni
// Nuxt: lo carga vitest en node.
//
// POR QUÉ EXISTE. Las consultas con monto («en qué invertir 5.000 dólares en Uruguay», «1.000
// dólares», «2 millones de pesos») eran las únicas de la página en primera pantalla con volumen, y
// la página era un directorio de entidades: 55 porcentajes, todos comisiones o IRPF, y ninguno un
// rendimiento. Esto junta lo que el repo ya publica como verificado (pizarra e-BROU, licitaciones
// del BCU, TPM, cartilla de Gletir, ayuda de Prex, cobertura de la COPAB) y hace las cuentas para
// cada monto. No elige: cuando compara dos opciones imprime los dos números.
//
// Ninguna tasa ni alícuota se escribe acá: salen de `investments.ts`, `lrm.ts` y
// `yieldAccounts.ts`. Las cinco tarifas que sí se copian (Gletir, Prex, COPAB) las ata el test a
// la prosa del catálogo, para que no se separen en silencio.
import type { FaqItem } from './faqAnswers'
import { SITE_TIME_ZONE, formatNumber } from './format'
import {
  BROU_DEPOSIT_BOARD,
  INVESTMENTS,
  getInvestment,
  minInvestmentLabel,
  netOfIrpf,
  type BankBoardTranche,
  type DepositCurrency,
} from './investments'
import {
  LRM_BASELINE,
  LRM_MIN_BID,
  LRM_PATH,
  LRM_TERM_LABEL,
  depositOutcome,
  latestFor,
  lrmOutcome,
  maturityValue,
  money,
  pct,
  shortDay,
  type LrmSnapshotDoc,
} from './lrm'
import { TRADEMARK_UI_VALUE, TRADEMARK_UI_VALUE_AT } from './trademarkRegistry'
import { TPM_CONFIRMED, TPM_PCT, getYieldProduct } from './yieldAccounts'

/** Los montos de las consultas que la página recibe. */
export const RESUMEN_AMOUNTS_USD = [1000, 5000, 10000] as const
export const RESUMEN_AMOUNT_UYU = 2_000_000

export const CUENTA_REMUNERADA_PATH = '/cuenta-remunerada-uruguay'

// --- Tarifas copiadas de la prosa del catálogo ------------------------------------------------------

/**
 * Gletir Global, acciones y ETF de EE.UU. a precio mayor a USD 5: «0,75%», mínimo «USD 10», «Por
 * operación», IVA incluido (cartilla vigente desde el 22/01/2026, api.gletir.com/Content/Attach/3590.pdf).
 */
export const GLETIR_US_PCT = 0.75
export const GLETIR_US_MIN_USD = 10

export function gletirUsCommission(orderUsd: number): number {
  return Math.max(GLETIR_US_MIN_USD, (orderUsd * GLETIR_US_PCT) / 100)
}

/**
 * Prex, compra de acciones: «U$S0.99 + 2%», «Monto máximo diario: U$S1.000. Monto máximo mensual:
 * U$S3.000» (prexcard.com/ayuda/11).
 */
export const PREX_BUY_FIXED_USD = 0.99
export const PREX_BUY_PCT = 2
export const PREX_DAILY_CAP_USD = 1000
export const PREX_MONTHLY_CAP_USD = 3000

export interface PrexBuyCost {
  /** Compras mínimas que hacen falta con el tope diario. */
  orders: number
  fee: number
  /** Meses mínimos que hacen falta con el tope mensual. */
  months: number
}

export function prexBuyCost(amountUsd: number): PrexBuyCost {
  const orders = Math.ceil(amountUsd / PREX_DAILY_CAP_USD)
  return {
    orders,
    fee: orders * PREX_BUY_FIXED_USD + (amountUsd * PREX_BUY_PCT) / 100,
    months: Math.ceil(amountUsd / PREX_MONTHLY_CAP_USD),
  }
}

/** Seguro de depósitos de la COPAB, por persona y por institución, capital más intereses. */
export const COPAB_CAP_USD = 10_000
export const COPAB_CAP_UI = 250_000

/**
 * El tope en UI pasado a pesos con la UI fechada más nueva que el repo publica: la del encabezado de
 * la tabla de la DNPI («VALOR AL 01/11/2026 6,685», `trademarkRegistry.ts`). La UI se mueve todos
 * los días, así que la cifra en pesos se imprime con su fecha y con «unos».
 */
export const COPAB_UI_VALUE = TRADEMARK_UI_VALUE
export const COPAB_UI_VALUE_AT = TRADEMARK_UI_VALUE_AT
export const COPAB_CAP_UYU = Math.round(COPAB_CAP_UI * COPAB_UI_VALUE)

// --- La pizarra en dólares del BROU ----------------------------------------------------------------

/**
 * La vigencia que el PDF del BROU imprime HOY para «PF Dólares» (nota 5), leída el 19/11/2026.
 * `BROU_DEPOSIT_BOARD` todavía trae la pizarra del 26/03/2026 y la mantiene la calculadora de plazo
 * fijo: mientras no se actualice, esta página no publica una tasa en dólares que el banco ya no
 * ofrece, y dice dónde está la vigente. Cuando la pizarra compartida se ponga al día, las cifras
 * aparecen solas.
 */
export const BROU_USD_BOARD_PUBLISHED = '2026-11-01'

type DepositBoard = Pick<typeof BROU_DEPOSIT_BOARD, 'series' | 'pdfUrl'>

/** "26/03/2026" → "2026-03-26". */
function isoFromDmy(dmy: string): string {
  const m = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(dmy.trim())
  return m ? `${m[3]}-${m[2]!.padStart(2, '0')}-${m[1]!.padStart(2, '0')}` : ''
}

/** "2026-10-08" → "8/10/2026". */
function dayMonthYear(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso)
  return m ? `${Number(m[3])}/${Number(m[2])}/${m[1]}` : ''
}

export function brouUsdBoardIsCurrent(board: DepositBoard = BROU_DEPOSIT_BOARD): boolean {
  return isoFromDmy(board.series.USD.vigenciaMoneda) >= BROU_USD_BOARD_PUBLISHED
}

export interface UsdDepositFigures {
  pending: false
  ratePct: number
  gross: number
  irpfPct: number
  net: number
  trancheLabel: string
  vigencia: string
  minimum: string
}

export interface UsdDepositPending {
  pending: true
  minimum: string
  irpfPct: number
  publishedSince: string
  pdfUrl: string
}

/** Un plazo fijo en dólares por e-BROU, o qué se sabe de él si la pizarra guardada quedó vieja. */
export function usdDeposit(
  amount: number,
  days = 365,
  board: DepositBoard = BROU_DEPOSIT_BOARD
): UsdDepositFigures | UsdDepositPending {
  const series = board.series.USD
  const irpfPct = netOfIrpf(1, 'USD', days / 30.4375).taxPct
  const tranche = series.tranches.find(t => days >= t.minDays && days <= t.maxDays)
  if (!brouUsdBoardIsCurrent(board) || !tranche) {
    return {
      pending: true,
      minimum: series.minimum,
      irpfPct,
      publishedSince: shortDay(BROU_USD_BOARD_PUBLISHED),
      pdfUrl: board.pdfUrl,
    }
  }
  const gross = maturityValue(amount, tranche.online, days) - amount
  return {
    pending: false,
    ratePct: tranche.online,
    gross,
    irpfPct,
    net: gross * (1 - irpfPct / 100),
    trancheLabel: tranche.label,
    vigencia: series.vigenciaMoneda,
    minimum: usdNotation(series.minimum),
  }
}

// --- Formatos ---------------------------------------------------------------------------------------

/** "US$ 37,50", "US$ 10" (sin centavos cuando no hay). */
function usd(value: number): string {
  const rounded = Math.round(value * 100) / 100
  return `US$ ${formatNumber(rounded, Number.isInteger(rounded) ? 0 : 2)}`
}

/** "U$S 500" (como lo escribe la pizarra del BROU) → "US$ 500", la notación del resto de la página. */
function usdNotation(text: string): string {
  return text.replace(/U\$S\s*/g, 'US$ ')
}

/** "5,5 %", "12 %". */
function rateText(value: number): string {
  return `${formatNumber(value, Number.isInteger(value) ? 0 : 1)} %`
}

/** "4,9", "26". */
function yearsText(value: number): string {
  return formatNumber(value, Number.isInteger(value) ? 0 : 1)
}

function joinY(parts: string[]): string {
  return parts.length > 1 ? `${parts.slice(0, -1).join(', ')} y ${parts.at(-1)}` : (parts[0] ?? '')
}

// --- Tarjetas por monto -----------------------------------------------------------------------------

export interface ResumenLink {
  label: string
  to: string
  external?: boolean
}

export interface ResumenLine {
  id: string
  label: string
  text: string
  link?: ResumenLink
}

export interface AmountCard {
  id: string
  title: string
  lines: ResumenLine[]
}

/**
 * Cómo se llama en una frase cada fila del catálogo con mínimo en dólares. El nombre del catálogo
 * es el de la entidad entera, y el mínimo es de UN producto suyo.
 */
export const USD_MINIMUM_LABELS: Readonly<Record<string, string>> = Object.freeze({
  'itau-inversiones': 'los fondos de Itaú',
  'santander-inversiones': 'una compra de valores en Santander',
  'prex-us-stocks-etfs': 'las acciones y ETF de Prex',
})

/** Las filas del catálogo con un mínimo en dólares PUBLICADO. Un `null` es "no se sabe", no cero. */
function usdMinimums(): { label: string; amount: number }[] {
  return INVESTMENTS.filter(i => i.minInvestment?.currency === 'USD')
    .map(i => ({ label: USD_MINIMUM_LABELS[i.id] ?? i.name, amount: i.minInvestment!.amount }))
    .sort((a, b) => a.amount - b.amount)
}

function usdDepositLine(amount: number): ResumenLine {
  const d = usdDeposit(amount)
  if (d.pending) {
    return {
      id: 'plazo-fijo',
      label: 'Plazo fijo en dólares',
      text: `Desde ${usdNotation(d.minimum)} en el BROU; el interés paga ${rateText(d.irpfPct)} de IRPF. La pizarra en dólares rige desde el ${d.publishedSince}: la tasa está en el PDF del banco.`,
      link: { label: 'Pizarra del BROU (PDF)', to: d.pdfUrl, external: true },
    }
  }
  return {
    id: 'plazo-fijo',
    label: 'Plazo fijo en dólares',
    text: `Por e-BROU a un año (${d.trancheLabel} días): ${pct(d.ratePct)} efectivo anual. Son ${usd(d.gross)} de interés y ${usd(d.net)} después del ${rateText(d.irpfPct)} de IRPF. Mínimo ${usdNotation(d.minimum)}; pizarra vigente desde el ${d.vigencia}.`,
  }
}

function usdInsuranceLine(amount: number): ResumenLine {
  const cap = usd(COPAB_CAP_USD)
  const lead =
    amount < COPAB_CAP_USD
      ? `Como depósito bancario, lo cubre hasta ${cap} por persona y por banco, capital más intereses.`
      : `${cap} es el tope del seguro de depósitos por persona y por banco, y ese tope cuenta capital más intereses.`
  return {
    id: 'seguro',
    label: 'Seguro de depósitos',
    text: `${lead} No cubre fondos, letras ni acciones.`,
  }
}

function usdStocksLine(amount: number): ResumenLine {
  const commission = gletirUsCommission(amount)
  const minimumRules = (amount * GLETIR_US_PCT) / 100 < GLETIR_US_MIN_USD
  const prex = prexBuyCost(amount)
  const gletir = `Una orden de ${usd(amount)} paga ${usd(commission)} de comisión en Gletir (${pct((commission / amount) * 100)})${minimumRules ? `: rige el mínimo de ${usd(GLETIR_US_MIN_USD)}.` : '.'}`
  const prexHow =
    amount <= PREX_DAILY_CAP_USD
      ? `Entra en una compra (${usd(prex.fee)}).`
      : amount <= PREX_MONTHLY_CAP_USD
        ? `Lleva al menos ${prex.orders} compras, en días distintos, y ${usd(prex.fee)} de comisión.`
        : `No entra en un mes: lleva al menos ${prex.orders} compras en ${prex.months} meses y ${usd(prex.fee)} de comisión.`
  return {
    id: 'acciones',
    label: 'Acciones o ETF de EE.UU. (riesgo alto)',
    text: `${gletir} En Prex, ${rateText(PREX_BUY_PCT)} más ${usd(PREX_BUY_FIXED_USD)} por compra, con tope de ${usd(PREX_DAILY_CAP_USD)} por día y ${usd(PREX_MONTHLY_CAP_USD)} por mes. ${prexHow}`,
  }
}

function usdMinimumsLine(amount: number): ResumenLine {
  const all = usdMinimums()
  const named = (m: { label: string; amount: number }) => `de ${m.label} (${usd(m.amount)})`
  const reached = all.filter(m => m.amount <= amount).map(named)
  const missed = all.filter(m => m.amount > amount).map(named)
  const parts: string[] = []
  if (reached.length) parts.push(`Alcanza el mínimo ${joinY(reached)}.`)
  if (missed.length) parts.push(`No alcanza el ${joinY(missed)}.`)
  return { id: 'minimos', label: 'Mínimos', text: parts.join(' ') }
}

function uyuCard(snapshot: LrmSnapshotDoc): AmountCard {
  const amount = RESUMEN_AMOUNT_UYU
  const lines: ResumenLine[] = []
  const d365 = depositOutcome(amount, 365)
  const d367 = depositOutcome(amount, 367)
  if (d365 && d367) {
    lines.push({
      id: 'plazo-fijo',
      label: 'Plazo fijo en pesos',
      text: `Por e-BROU a 365 días paga ${pct(d365.grossPct)}: ${money(d365.grossGain)} de interés y ${money(d365.netGain)} después del ${rateText(d365.irpfPct)} de IRPF. A 367 días la pizarra pasa a ${pct(d367.grossPct)} y el IRPF baja a ${rateText(d367.irpfPct)} por superar el año: ${money(d367.netGain)} netos. Pizarra en pesos vigente desde el ${BROU_DEPOSIT_BOARD.series.UYU.vigenciaMoneda}.`,
    })
  }
  const year = latestFor(snapshot, 360)
  const same = year ? depositOutcome(amount, year.days) : null
  if (year && same) {
    const o = lrmOutcome(amount, year, 'brou')
    lines.push({
      id: 'lrm',
      label: 'Letras de Regulación Monetaria',
      text: `La de un año cortó en ${pct(year.cutRate)} el ${shortDay(year.date)} y no paga IRPF. Comprada a través del BROU (en sucursal), la comisión es de ${money(o.commission)} y quedan ${money(o.netGain)}; el plazo fijo e-BROU al mismo plazo (${year.days} días) deja ${money(same.netGain)}.`,
      link: { label: 'La cuenta para tu monto y cada plazo', to: LRM_PATH },
    })
  }
  lines.push({
    id: 'cuenta',
    label: 'Cuenta que rinde (Prex, Mercado Pago)',
    text: `No publican tasa; sus fondos compran papel del BCU y del Estado y la referencia es la Tasa de Política Monetaria, ${rateText(TPM_PCT)}, vigente desde el ${dayMonthYear(TPM_CONFIRMED)}.`,
    link: { label: 'Cuentas que rinden', to: CUENTA_REMUNERADA_PATH },
  })
  lines.push({
    id: 'seguro',
    label: 'Seguro de depósitos',
    text: `Cubre hasta UI ${formatNumber(COPAB_CAP_UI, 0)} por persona y por banco en moneda nacional (unos ${money(COPAB_CAP_UYU)} con la UI a $ ${formatNumber(COPAB_UI_VALUE, 3)} del ${dayMonthYear(COPAB_UI_VALUE_AT)}), capital más intereses${amount > COPAB_CAP_UYU ? `: ${money(amount)} en un solo banco superan ese tope` : ''}. No cubre letras, fondos ni acciones.`,
  })
  return { id: 'uyu-2000000', title: `Con ${money(amount)}`, lines }
}

/** Las cuatro tarjetas: US$ 1.000, 5.000, 10.000 y $ 2.000.000. */
export function amountCards(snapshot: LrmSnapshotDoc): AmountCard[] {
  const usdCards = RESUMEN_AMOUNTS_USD.map(amount => ({
    id: `usd-${amount}`,
    title: `Con ${usd(amount)}`,
    lines: [
      usdDepositLine(amount),
      usdInsuranceLine(amount),
      usdStocksLine(amount),
      usdMinimumsLine(amount),
    ],
  }))
  return [...usdCards, uyuCard(snapshot)]
}

// --- Cuánto paga hoy lo de bajo riesgo -----------------------------------------------------------

export interface LowRiskRow {
  id: string
  option: string
  /** Una línea por plazo o por moneda, cada una con su fecha. */
  pays: string[]
  irpf: string
  minimum: string
  exit: string
  /** Fecha ISO del dato más nuevo de la fila. */
  asOf: string
  sourceUrl: string
  sourceLabel: string
  link: ResumenLink
}

const PLAZO_FIJO_GUIDE = '/guias/plazo-fijo-en-uruguay-conviene'
const BONOS_GUIDE = '/guias/bonos-y-renta-fija-uruguay'
const BCU_HOME = 'https://www.bcu.gub.uy/'

/**
 * Del BROU: «Opción de renovación automática al vencimiento, disponiendo de un período de 4 días
 * incluyendo el vencimiento para operar: cancelar, retirar o efectuar un depósito»
 * (brou.com.uy/personas/inversiones/plazo-fijo, leído el 20/11/2026).
 */
const PLAZO_FIJO_EXIT =
  'Se retira al vencimiento: el BROU da 4 días, contando ese, para cancelar o retirar'

function trancheLines(currency: DepositCurrency, labels: readonly string[], suffix = ''): string[] {
  const series = BROU_DEPOSIT_BOARD.series[currency]
  return series.tranches
    .filter((t: BankBoardTranche) => labels.includes(t.label))
    .map(t => `${t.label} días: ${pct(t.online)}${suffix}`)
}

function irpfByTerm(currency: DepositCurrency): string {
  const short = netOfIrpf(1, currency, 12).taxPct
  const long = netOfIrpf(1, currency, 367 / 30.4375).taxPct
  return short === long
    ? `${rateText(short)} hasta tres años`
    : `${rateText(short)} hasta un año; ${rateText(long)} de uno a tres años`
}

function brouRow(
  id: string,
  option: string,
  currency: DepositCurrency,
  labels: readonly string[],
  suffix = ''
): LowRiskRow {
  const series = BROU_DEPOSIT_BOARD.series[currency]
  return {
    id,
    option,
    pays: [
      ...trancheLines(currency, labels, suffix),
      `Pizarra vigente desde el ${series.vigenciaMoneda}`,
    ],
    irpf: irpfByTerm(currency),
    minimum: usdNotation(series.minimum),
    exit: PLAZO_FIJO_EXIT,
    asOf: isoFromDmy(series.vigenciaMoneda),
    sourceUrl: BROU_DEPOSIT_BOARD.pdfUrl,
    sourceLabel: 'Pizarra del BROU',
    link: { label: 'Guía del plazo fijo', to: PLAZO_FIJO_GUIDE },
  }
}

function usdRow(): LowRiskRow {
  const base = brouRow('plazo-fijo-dolares', 'Plazo fijo en dólares (e-BROU)', 'USD', [
    '181 – 366',
    '367 – 546',
  ])
  if (brouUsdBoardIsCurrent()) return base
  return {
    ...base,
    pays: [
      `Pizarra vigente desde el ${shortDay(BROU_USD_BOARD_PUBLISHED)}: la tasa está en el PDF del BROU`,
    ],
    asOf: BROU_USD_BOARD_PUBLISHED,
    link: { label: 'Pizarra del BROU (PDF)', to: BROU_DEPOSIT_BOARD.pdfUrl, external: true },
  }
}

function treasuryLine(snapshot: LrmSnapshotDoc, currency: 'UI' | 'UYU'): string | null {
  const t = snapshot.treasury.find(n => n.currency === currency)
  if (!t) return null
  const what = currency === 'UI' ? 'en UI' : 'en pesos'
  const real = currency === 'UI' ? ' real' : ''
  return `${what}: ${pct(t.yield)}${real} a ${yearsText(t.years)} años (${shortDay(t.date)})`
}

/** Las seis filas de la tabla, cada una con su fecha y su fuente. */
export function lowRiskRows(snapshot: LrmSnapshotDoc): LowRiskRow[] {
  const prex = getYieldProduct('prex-inversion-violeta')
  const lrm = [...snapshot.latest].sort((a, b) => a.termRef - b.termRef)
  const newestLrm =
    lrm
      .map(a => a.date)
      .sort()
      .at(-1) ?? ''
  const treasury = [treasuryLine(snapshot, 'UI'), treasuryLine(snapshot, 'UYU')].filter(
    (l): l is string => l != null
  )
  const newestTreasury =
    snapshot.treasury
      .filter(t => t.currency === 'UI' || t.currency === 'UYU')
      .map(t => t.date)
      .sort()
      .at(-1) ?? ''
  const notes = getInvestment('bonos-notas-tesoro')
  return [
    {
      id: 'cuenta-que-rinde',
      option: 'Cuenta que rinde (Prex, Mercado Pago)',
      pays: [
        `No publican tasa. Referencia: TPM ${rateText(TPM_PCT)}, vigente desde el ${dayMonthYear(TPM_CONFIRMED)} (BCU)`,
      ],
      irpf: 'Exonerado si el fondo invierte en valores públicos (Título 7, art. 38 lit. P)',
      minimum:
        prex?.minFirstUyu != null
          ? `${money(prex.minFirstUyu)} la primera vez en Prex; sin mínimo en Mercado Pago`
          : 'No publicado en Prex; sin mínimo en Mercado Pago',
      exit: 'Sí: rescate diario en días hábiles',
      asOf: TPM_CONFIRMED,
      sourceUrl: BCU_HOME,
      sourceLabel: 'BCU',
      link: { label: 'Cuentas que rinden', to: CUENTA_REMUNERADA_PATH },
    },
    {
      id: 'lrm',
      option: 'Letras de Regulación Monetaria (BCU)',
      pays: lrm.map(a => `${LRM_TERM_LABEL[a.termRef]}: ${pct(a.cutRate)} (${shortDay(a.date)})`),
      irpf: 'No paga (Título 7, art. 38 lit. A)',
      minimum: `${money(LRM_MIN_BID)}, más la comisión del banco o corredor`,
      exit: 'Sí, vendiéndola al precio de ese día; el banco cobra comisión',
      asOf: newestLrm,
      sourceUrl: snapshot.sources.operationsUrl,
      sourceLabel: 'Planilla del BCU',
      link: { label: 'Tasas y cuenta de las LRM', to: LRM_PATH },
    },
    brouRow('plazo-fijo-pesos', 'Plazo fijo en pesos (e-BROU)', 'UYU', [
      '91 – 180',
      '181 – 366',
      '367 – 546',
    ]),
    brouRow(
      'plazo-fijo-ui',
      'Plazo fijo en UI (e-BROU)',
      'UI',
      ['181 – 366', '367 – 546'],
      ' sobre la UI'
    ),
    usdRow(),
    {
      id: 'notas-tesoro',
      option: 'Notas del Tesoro (MEF)',
      pays: treasury.length ? treasury : ['Sin licitación reciente en la planilla'],
      irpf: 'No paga (Título 7, art. 38 lit. A)',
      minimum: notes ? minInvestmentLabel(notes) : '',
      exit: 'Sí, al precio de ese día: si las tasas subieron, con pérdida',
      asOf: newestTreasury,
      sourceUrl: snapshot.sources.operationsUrl,
      sourceLabel: 'Planilla del BCU',
      link: { label: 'Guía de bonos y renta fija', to: BONOS_GUIDE },
    },
  ]
}

/** El pie de la tabla: de cuándo es la planilla del BCU que se está mostrando. */
export function lowRiskCaption(snapshot: LrmSnapshotDoc): string {
  if (snapshot.capturedAt === LRM_BASELINE.capturedAt || !snapshot.capturedAt) {
    return `LRM y Notas del Tesoro: planilla de licitaciones del BCU, leída a mano el ${shortDay(LRM_BASELINE.capturedAt.slice(0, 10))}.`
  }
  const read = new Date(snapshot.capturedAt)
  const day = Number.isNaN(read.getTime())
    ? ''
    : read.toLocaleDateString('es-UY', {
        timeZone: SITE_TIME_ZONE,
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      })
  return `LRM y Notas del Tesoro: planilla de licitaciones del BCU, leída el ${day}.`
}

// --- Preguntas frecuentes -------------------------------------------------------------------------

/** "Como depósito…" → "como depósito…"; "US$ 10.000…" queda igual. */
function lowerFirst(text: string): string {
  return /^\p{Lu}\p{Ll}/u.test(text) ? text[0]!.toLowerCase() + text.slice(1) : text
}

function cardProse(card: AmountCard): string {
  return card.lines.map(l => `${l.label}: ${lowerFirst(l.text)}`).join(' ')
}

const DISCLAIMER = 'Es información, no una recomendación.'

/**
 * Las cinco preguntas que la página declaraba sólo en su JSON-LD, sin mostrarlas. Las dos primeras
 * van tal cual; las tres largas, recortadas borrando oraciones enteras (el tratamiento completo
 * sigue en su sección de la página).
 */
const STATIC_FAQ: readonly FaqItem[] = Object.freeze([
  {
    id: 'inversiones-donde',
    question: '¿Dónde puedo invertir mi dinero en Uruguay?',
    answer:
      'En Uruguay podés invertir a través de cuentas de inversión en bancos (Itaú, Santander, BROU, Scotiabank, BBVA), fintech como Prex, brokers internacionales accesibles desde Uruguay (eToro, XTB, Balanz, este último regulado localmente), instrumentos de renta fija local (plazo fijo, Letras de Regulación Monetaria del BCU, bonos y notas del Tesoro), fondos de inversión locales (República AFISA, Delta Asset Management y otras administradoras registradas ante el BCU) y exchanges de criptomonedas. Cada opción tiene distinto riesgo, mínimo de inversión, regulación y tratamiento impositivo.',
  },
  {
    id: 'inversiones-menor-riesgo',
    question: '¿Cuál es la opción de menor riesgo para invertir en Uruguay?',
    answer:
      'El plazo fijo bancario y las Letras de Regulación Monetaria del BCU son las opciones de menor riesgo, ya que devuelven capital e interés pactado sin exposición a variaciones de mercado, y ambas están supervisadas por el BCU. Los fondos de inversión y las carteras de bonos/acciones tienen riesgo variable según el instrumento, mientras que acciones, ETFs y criptomonedas tienen riesgo alto, ya que su valor puede subir o bajar significativamente según el mercado.',
  },
  {
    id: 'inversiones-gletir',
    question: '¿Es seguro invertir mediante Gletir en Uruguay?',
    answer:
      'Gletir es un corredor de bolsa activo, supervisado por el BCU y miembro de la Bolsa de Valores de Montevideo, lo que ofrece un marco local más sólido que una plataforma no habilitada. No es una inversión garantizada: Gletir Global opera mediante GTN, custodios extranjeros y cuentas ómnibus, y el riesgo del capital depende del instrumento. Además, el BCU impuso en 2025 una multa de UI 150.000 por incumplimientos materiales detectados en 2024 sobre información al inversor, perfiles, registros, custodias y controles. La resolución también recoge medidas correctivas de Gletir. La evaluación objetiva es seguridad media del intermediario y riesgo variable o alto según el activo.',
  },
  {
    id: 'inversiones-custodia',
    question:
      'Si el corredor de bolsa quiebra, ¿qué pasa con mis títulos? ¿Hay algo tipo COPAB para inversiones?',
    answer:
      'No hay un COPAB para inversiones. El Fondo de Garantía de Depósitos Bancarios que administra la COPAB tiene por objeto garantizar los depósitos en bancos y cooperativas de intermediación financiera, hasta el equivalente a USD 10.000 para el total de los depósitos en moneda extranjera y UI 250.000 en moneda nacional, por persona y por institución: no alcanza a los valores, ni a las cuotapartes de fondos de inversión, ni al efectivo que tenés en un corredor de bolsa. Lo que sí hay es separación patrimonial: la Ley 18.627 establece en su artículo 109 que el dinero y los valores que un intermediario de valores adquiera o mantenga en custodia por cuenta de sus clientes no pueden ser embargados por deudas del intermediario y, en caso de liquidación por insolvencia, no integran la masa activa de la liquidación.',
  },
  {
    id: 'inversiones-impuestos',
    question: '¿Cómo se pagan impuestos por invertir en Uruguay?',
    answer:
      'Los residentes fiscales uruguayos pagan IRPF Categoría I sobre las rentas de capital (intereses, dividendos, alquileres y ganancias de capital) a una tasa general del 12%; los dividendos de fuente uruguaya, al 7%. Los depósitos a plazo tienen tasas reducidas según moneda y plazo: en pesos 5,5% (hasta 1 año), 2,5% (1 a 3 años) y 0,5% (más de 3 años); en UI 10%, 7% y 5%; en moneda extranjera 12%, 12% y 7%. La deuda pública uruguaya (Bonos del Tesoro, Letras de Tesorería, LRM) está exenta de IRPF, tanto el interés como la ganancia de capital al transferirla. Consultá siempre con un contador y las publicaciones oficiales de la DGI antes de declarar.',
  },
])

/** Las preguntas visibles de la página: cuatro por monto y por tasa, y las cinco que ya existían. */
export function buildInversionesFaq(snapshot: LrmSnapshotDoc): FaqItem[] {
  const cards = amountCards(snapshot)
  const byId = (id: string) => cards.find(c => c.id === id)!
  const rows = lowRiskRows(snapshot)
  // Primero lo que tiene tasa (letras, pizarra) y al final la cuenta que no la publica: la
  // respuesta abre con un número.
  const lowRisk = ['lrm', 'plazo-fijo-pesos', 'cuenta-que-rinde']
    .map(id => rows.find(r => r.id === id))
    .filter((r): r is LowRiskRow => r != null)
    .map(r => `${r.option}: ${r.pays.map(lowerFirst).join('; ')}.`)
    .join(' ')
  return [
    {
      id: 'inversiones-5000-dolares',
      question: '¿En qué invertir 5.000 dólares en Uruguay?',
      answer: `${cardProse(byId('usd-5000'))} ${DISCLAIMER}`,
    },
    {
      id: 'inversiones-1000-dolares',
      question: '¿En qué invertir 1.000 dólares en Uruguay?',
      answer: `${cardProse(byId('usd-1000'))} ${DISCLAIMER}`,
    },
    {
      id: 'inversiones-2-millones-pesos',
      question: 'Tengo 2 millones de pesos: ¿en qué puedo invertir?',
      answer: `${cardProse(byId('uyu-2000000'))} ${DISCLAIMER}`,
      link: { label: 'La cuenta de las LRM para tu monto', to: LRM_PATH },
    },
    {
      id: 'inversiones-bajo-riesgo-hoy',
      question: '¿Cuánto paga hoy una inversión de bajo riesgo en Uruguay?',
      answer: `${lowRisk} Son tasas efectivas anuales: la de la pizarra es antes del IRPF y la de las letras, que no pagan IRPF, es antes de la comisión del banco o corredor.`,
      link: { label: 'Cuentas que rinden', to: CUENTA_REMUNERADA_PATH },
    },
    ...STATIC_FAQ.map(item => ({ ...item })),
  ]
}
