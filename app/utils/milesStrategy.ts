// app/utils/milesStrategy.ts
// Tener la plata rindiendo en Prex o Mercado Pago y pasarla a Itaú sólo para
// comprar, para que las compras acumulen millas Volar.
//
// POR QUÉ ESTA VARIANTE ES OTRA COSA. La maniobra de pagar todo con crédito
// (`floatStrategy.ts`) pierde porque resigna la rebaja de dos puntos de IVA, que
// es sólo de débito. Ésta no tiene por qué: la Volar de DÉBITO también acumula,
// una milla cada US$2 en vez de cada US$1. Con débito se cobran las tres cosas a
// la vez —el rendimiento hasta el momento de la compra, los dos puntos de IVA y
// las millas— y lo único que se paga es el rendimiento de la plata que queda
// esperando en la cuenta del banco.
//
// EL NÚMERO QUE FALTA, Y QUE ES EL HALLAZGO. Itaú no publica cuánto vale una
// milla: está en `PROGRAMAS_OPACOS` de `financingData.ts` junto a OCA y Creditel,
// y su propia ficha lo dice ("sin ratio oficial publicado; el valor efectivo
// depende del ítem canjeado"). Sin ese dato no existe un rendimiento que
// calcular, así que este módulo NO lo inventa: DESPEJA el umbral. Contesta
// «cuánto tiene que valer tu milla para que esto te deje plata» y deja que el
// lector mida la suya con un canje real del catálogo.
//
// LAS DOS MECÁNICAS SON DISTINTAS Y NO SE PROMEDIAN:
//
//   - DÉBITO: hay que adelantar la plata al banco, así que se pierde el
//     rendimiento del saldo que queda parado. Cuánto se pierde depende de cuántas
//     veces por mes se mueve la plata, que es la única palanca real del usuario.
//   - CRÉDITO: no hay que adelantar nada —se paga al vencimiento— así que se gana
//     flote, pero se resignan los dos puntos de IVA y se paga la anualidad.
//
// FUENTES: la tasa de acumulación y la anualidad salen de la ficha de Itaú Volar
// en `cardRewards.ts`; el valor de la UI, de `transferFees.ts`; la aritmética del
// IVA, de `ivaTarjeta.ts`; el rendimiento, de `yieldAccounts.ts`.

import { type FloatCycle, floatDaysPerCycle } from './floatStrategy'
import { IVA_TASA_BASICA, ivaSavingOnTotal } from './ivaTarjeta'
import { TRANSFER_UI_VALUE, TRANSFER_UI_VALUE_DATE } from './transferFees'
import { estimateYield } from './yieldAccounts'

/** Fecha en la que se contrastaron los datos de este archivo contra sus fuentes. */
export const MILES_STRATEGY_VERIFIED_AT = '2026-09-18'

/** Anualidad de la Volar Internacional, en UI, desde el segundo año. */
export const ITAU_ANNUAL_FEE_UI = 864

/** La anualidad en pesos, al valor de UI que ya publica el sitio. */
export function itauAnnualFeeUyu(uiValue: number = TRANSFER_UI_VALUE): number {
  return round2(ITAU_ANNUAL_FEE_UI * (Number.isFinite(uiValue) ? uiValue : TRANSFER_UI_VALUE))
}

/** La fecha del valor de UI con el que se convirtió la anualidad. */
export const ITAU_ANNUAL_FEE_UI_DATE = TRANSFER_UI_VALUE_DATE

export type MilesCard = 'debito' | 'credito'

export interface MilesEarnRate {
  card: MilesCard
  label: string
  /** Dólares de consumo que hacen falta para una milla. */
  usdPerMile: number
  quote: string
}

/**
 * Las dos tasas de Volar. Van en dólares porque así las publica Itaú, y por eso
 * cuántas millas junta el mismo sueldo depende del dólar del día.
 *
 * Deliberadamente NO hay un campo con el valor de la milla: Itaú no lo publica, y
 * ponerle un número acá sería la clase de invento que esta página existe para no
 * hacer.
 */
export const MILES_EARN: readonly MilesEarnRate[] = Object.freeze([
  {
    card: 'debito',
    label: 'Débito Volar',
    usdPerMile: 2,
    quote: 'Débito Volar: 1 milla cada US$2. Confirmado en FAQ oficial y millasItauVolar.html.',
  },
  {
    card: 'credito',
    label: 'Crédito Volar',
    usdPerMile: 1,
    quote:
      'Crédito: 1 milla Itaú por cada US$1 (o su equivalente en pesos) gastado en compras. Confirmado en FAQ oficial.',
  },
])

export function getMilesEarnRate(card: MilesCard): MilesEarnRate | undefined {
  return MILES_EARN.find(rate => rate.card === card)
}

/** Millas que deja un mes de gasto, pasando el gasto en pesos por el dólar. */
export function milesPerMonth(input: {
  monthlySpendUyu: number
  usdRateUyu: number
  card: MilesCard
}): number {
  const spend = positive(input.monthlySpendUyu)
  const usd = positive(input.usdRateUyu)
  const rate = getMilesEarnRate(input.card)
  if (spend <= 0 || usd <= 0 || !rate) return 0
  return spend / usd / rate.usdPerMile
}

/**
 * Cuánto vale una milla, medido con un canje concreto del catálogo.
 *
 * Es la única forma honesta de ponerle precio a algo que el emisor no tarifa: no
 * lo que la milla «vale» en abstracto sino lo que compra en el canje que el lector
 * realmente haría.
 */
export function mileValueFromRedemption(priceUyu: number, milesRequired: number): number | null {
  const price = positive(priceUyu)
  const miles = positive(milesRequired)
  if (price <= 0 || miles <= 0) return null
  return price / miles
}

// ---------------------------------------------------------------------------

export interface MilesStrategyInput {
  /** Gasto mensual que pasaría por la tarjeta de Itaú, en pesos. */
  monthlySpendUyu: number
  card: MilesCard
  /** Cotización del dólar con la que Itaú convierte el consumo a millas. */
  usdRateUyu: number
  /** Cuántas veces por mes se pasa plata a Itaú. Sólo importa con débito. */
  transfersPerMonth: number
  /** Tasa bruta anual del fondo donde la plata rinde mientras tanto, en %. */
  annualRatePct: number
  /** Comisión anual del fondo, con IVA, en %. */
  feeAnnualPct?: number
  /** Anualidad de la tarjeta, en pesos por año. */
  annualCardFeeUyu?: number
  /** El ciclo de la tarjeta de crédito. Se ignora con débito. */
  cycle?: FloatCycle
  /** `true` si lo que se compra conserva la rebaja de IVA aun con crédito (gastronomía, turismo). */
  regimeKeepsIva?: boolean
  /** Lo que vale una milla, si el lector lo midió. Sin esto no hay resultado, sólo umbral. */
  mileValueUyu?: number
}

export interface MilesStrategyResult {
  milesPerMonth: number
  milesPerYear: number
  /** Saldo promedio que queda parado en el banco esperando las compras. */
  averageIdleUyu: number
  /** Rendimiento que ese saldo parado deja de generar, por mes. */
  lostYieldUyu: number
  /** Lo que rinde el gasto mientras espera el vencimiento. Sólo con crédito. */
  floatGainUyu: number
  /** Los dos puntos de IVA resignados. Sólo con crédito, y sólo fuera de gastronomía. */
  ivaForgoneUyu: number
  /** La anualidad prorrateada. */
  cardFeeMonthlyUyu: number
  /** Cuánto tiene que valer la milla para empatar. `null` si no hay millas que valuar. */
  breakEvenMileValueUyu: number | null
  /** El resultado del mes, sólo si el lector aportó el valor de su milla. */
  netUyu: number | null
  verdict: 'conviene' | 'no-conviene' | 'depende'
}

/**
 * Lo que deja la maniobra, y —cuando el valor de la milla no se conoce— cuánto
 * tendría que valer para que dejara algo.
 *
 * El veredicto `depende` no es un empate: es que falta el dato que Itaú no
 * publica. Decirlo así es más útil que rellenarlo con un supuesto.
 */
export function estimateMilesStrategy(input: MilesStrategyInput): MilesStrategyResult {
  const spend = positive(input.monthlySpendUyu)
  const rate = Number.isFinite(input.annualRatePct) ? input.annualRatePct : 0
  const fundFee = positive(input.feeAnnualPct ?? 0)
  const cardFeeMonthlyUyu = round2(positive(input.annualCardFeeUyu ?? 0) / 12)
  const miles = milesPerMonth({
    monthlySpendUyu: spend,
    usdRateUyu: input.usdRateUyu,
    card: input.card,
  })

  const isCredit = input.card === 'credito'

  // Con débito hay que adelantar la plata: lo que queda parado no rinde. Con una
  // sola transferencia por mes el saldo baja parejo hasta cero, así que el
  // promedio es la mitad del gasto; moverla N veces lo divide por N.
  const transfers = Math.max(1, Math.floor(positive(input.transfersPerMonth) || 1))
  const averageIdleUyu = isCredit ? 0 : round2(spend / (2 * transfers))
  const lostYieldUyu = isCredit
    ? 0
    : round2(
        estimateYield({
          amountUyu: averageIdleUyu,
          annualRatePct: rate,
          days: 30,
          feeAnnualPct: fundFee,
        }).netUyu
      )

  const floatGainUyu = isCredit
    ? round2(
        estimateYield({
          amountUyu: spend,
          annualRatePct: rate,
          days: floatDaysPerCycle(input.cycle ?? { cycleDays: 30, graceDays: 10 }),
          feeAnnualPct: fundFee,
        }).netUyu
      )
    : 0

  const ivaForgoneUyu =
    isCredit && !input.regimeKeepsIva ? round2(ivaSavingOnTotal(spend, 2, IVA_TASA_BASICA)) : 0

  const costs = lostYieldUyu + ivaForgoneUyu + cardFeeMonthlyUyu
  const gainsWithoutMiles = floatGainUyu

  const breakEvenMileValueUyu =
    miles > 0 ? round4(Math.max(0, (costs - gainsWithoutMiles) / miles)) : null

  const mileValue = input.mileValueUyu
  const hasMileValue = Number.isFinite(mileValue as number) && (mileValue as number) > 0
  const netUyu = hasMileValue
    ? round2(miles * (mileValue as number) + gainsWithoutMiles - costs)
    : null

  return {
    milesPerMonth: round2(miles),
    milesPerYear: round2(miles * 12),
    averageIdleUyu,
    lostYieldUyu,
    floatGainUyu,
    ivaForgoneUyu,
    cardFeeMonthlyUyu,
    breakEvenMileValueUyu,
    netUyu,
    verdict: netUyu === null ? 'depende' : netUyu > 0 ? 'conviene' : 'no-conviene',
  }
}

// ---------------------------------------------------------------------------

function positive(n: number | undefined): number {
  if (!Number.isFinite(n as number)) return 0
  return Math.max(0, n as number)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000
}
