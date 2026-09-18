// app/utils/floatStrategy.ts
// La maniobra de dejar la plata rindiendo y pagar todo con la tarjeta de crédito,
// medida contra lo que esa maniobra cuesta.
//
// POR QUÉ EXISTE: la idea circula sola y suena impecable. El saldo rinde en Prex o
// en Mercado Pago, la tarjeta de crédito no cobra nada por esperar, y recién el día
// del vencimiento se transfiere lo justo para pagarla. Plata gratis por administrar
// las fechas. La cuenta que casi nadie hace es la del otro lado del mostrador.
//
// LAS DOS MITADES:
//
//   1. Lo que se gana. No es el plazo del vencimiento: una compra del primer día
//      del ciclo espera casi un ciclo más que una del último, así que lo que rinde
//      es el PROMEDIO del ciclo, y a la Tasa de Política Monetaria ese promedio
//      paga décimas de por ciento del gasto.
//
//   2. Lo que se resigna. La rebaja de dos puntos de IVA de la Ley 19.210 art. 87
//      es sólo para débito y dinero electrónico: pagar con crédito la pierde, en
//      un pago y en veinticuatro. Son 1,64 % del ticket, todos los meses.
//
// El resultado en compras comunes es negativo y no por poco: lo resignado es varias
// veces lo ganado, y el punto de empate está más allá de los cien días de flote
// cuando un ciclo de tarjeta da menos de treinta. Donde sí cierra es donde no hay
// nada que resignar: gastronomía y turismo, cuyo régimen de nueve puntos (Ley
// 17.934 + Decreto 537/005) nombra a la tarjeta de crédito entre los medios
// habilitados, y las compras que no tienen IVA de por medio.
//
// LO QUE ESTE MÓDULO NO HACE: las cuotas. Un plan en cuotas mueve el flote a meses
// y mete dos costos más —el seguro sobre saldo deudor y el precio contado que se
// pierde—, y eso ya lo resuelve `cuotasVsContado.ts` con un VAN como corresponde.
// Acá el alcance es el ciclo de UN pago, que es la maniobra que se propone sola.
//
// FUENTES: los tarifarios y las normas ya están en el sitio y no se duplican acá.
// Las transferencias salen de `transferFees.ts`, la aritmética del IVA de
// `ivaTarjeta.ts` y el rendimiento de `yieldAccounts.ts`.

import { IVA_TASA_BASICA, ivaSavingOnTotal } from './ivaTarjeta'
import { estimateYield } from './yieldAccounts'

/** Fecha en la que se contrastaron los datos de este archivo contra sus fuentes. */
export const FLOAT_STRATEGY_VERIFIED_AT = '2026-09-18'

/**
 * Interés de mora en tarjeta, en % anual efectivo.
 *
 * Es el número con el que hay que comparar la ganancia: la maniobra exige pagar el
 * total el día del vencimiento, y un solo mes de atraso cuesta más que un año de
 * flote. Sale del tarifario de Santander, mayo de 2026, el mismo que publica
 * `financingData.ts`.
 */
export const MORA_TEA_PCT = 81

/** Puntos de IVA que resigna quien paga con crédito una compra común. */
export const IVA_POINTS_LOST_ON_CREDIT = 2

// ---------------------------------------------------------------------------
// Los días de flote
// ---------------------------------------------------------------------------

export interface FloatCycle {
  /** Días de un ciclo, de un cierre al siguiente. */
  cycleDays: number
  /** Días entre el cierre y el vencimiento. */
  graceDays: number
}

/**
 * Días promedio que una compra del ciclo queda financiada.
 *
 * La compra del primer día del ciclo espera los días que faltan para el cierre más
 * los de gracia; la del último día espera sólo los de gracia. Con el gasto repartido
 * parejo el promedio es `gracia + (ciclo − 1) / 2`, y ése es el plazo que rinde.
 * Usar los días de gracia solos —el error habitual— subestima el flote varias veces.
 */
export function floatDaysPerCycle(cycle: FloatCycle): number {
  const cycleDays = positive(cycle?.cycleDays)
  const graceDays = positive(cycle?.graceDays)
  if (cycleDays <= 0 && graceDays <= 0) return 0
  return graceDays + Math.max(0, cycleDays - 1) / 2
}

// ---------------------------------------------------------------------------
// La comparación
// ---------------------------------------------------------------------------

/**
 * Qué régimen de IVA tiene lo que se compra. Decide TODO el resultado, porque es
 * lo único que determina si pagar con crédito resigna algo.
 */
export type FloatRegime =
  /** Compras en general: la rebaja de dos puntos es sólo de débito, y se pierde. */
  | 'general'
  /** Gastronomía y turismo: el régimen de nueve puntos también corre con crédito. */
  | 'gastronomia'
  /** Lo que no tiene IVA en el medio: no hay rebaja que resignar. */
  | 'sin-iva'

export interface FloatStrategyInput {
  /** Gasto mensual que pasaría por la tarjeta, en pesos. */
  monthlySpendUyu: number
  regime: FloatRegime
  cycle: FloatCycle
  /** Tasa bruta anual del fondo, en %. */
  annualRatePct: number
  /** Comisión anual del fondo, con IVA, en %. */
  feeAnnualPct?: number
  /** Descuento de comercio o banco que se pierde por no pagar con débito, en % del ticket. */
  lostDiscountPct?: number
  /** Lo que cuesta mover la plata a la cuenta que paga la tarjeta, por mes. */
  transferCostUyu?: number
}

export interface FloatStrategyResult {
  /** Días promedio que el gasto del mes queda rindiendo. */
  floatDays: number
  /** Lo que rinde ese gasto mientras espera el vencimiento, por mes. */
  floatGainUyu: number
  /** Los puntos de IVA que se resignan por pagar con crédito, por mes. */
  ivaForgoneUyu: number
  /** Otros descuentos resignados, por mes. */
  discountForgoneUyu: number
  /** Lo que cuesta mover la plata, por mes. */
  transferCostUyu: number
  /** Ganancia menos todo lo resignado. Negativo quiere decir que la maniobra cuesta plata. */
  netUyu: number
  /** Días de flote que harían falta para empatar lo resignado. `null` si no hay plazo que alcance. */
  breakEvenDays: number | null
  verdict: 'conviene' | 'no-conviene' | 'empata'
}

/**
 * Lo que deja —o lo que cuesta— pagar un mes de gastos con la tarjeta de crédito
 * en vez de con el débito de la billetera que rinde.
 *
 * Todo se mide sobre el MISMO mes de gasto: lo que el flote rinde contra lo que la
 * rebaja de IVA habría descontado. Comparar la ganancia anual contra la rebaja de
 * un mes es el error que hace que la maniobra parezca buena.
 */
export function estimateFloatStrategy(input: FloatStrategyInput): FloatStrategyResult {
  const spend = positive(input.monthlySpendUyu)
  const floatDays = floatDaysPerCycle(input.cycle)
  const fee = positive(input.feeAnnualPct ?? 0)
  const rate = Number.isFinite(input.annualRatePct) ? input.annualRatePct : 0

  const floatGainUyu = round2(
    estimateYield({
      amountUyu: spend,
      annualRatePct: rate,
      days: floatDays,
      feeAnnualPct: fee,
    }).netUyu
  )

  const ivaForgoneUyu =
    input.regime === 'general'
      ? round2(ivaSavingOnTotal(spend, IVA_POINTS_LOST_ON_CREDIT, IVA_TASA_BASICA))
      : 0

  const discountForgoneUyu = round2((spend * positive(input.lostDiscountPct ?? 0)) / 100)
  const transferCostUyu = round2(positive(input.transferCostUyu ?? 0))

  const forgone = ivaForgoneUyu + discountForgoneUyu + transferCostUyu
  const netUyu = round2(floatGainUyu - forgone)

  return {
    floatDays: round2(floatDays),
    floatGainUyu,
    ivaForgoneUyu,
    discountForgoneUyu,
    transferCostUyu,
    netUyu,
    breakEvenDays: floatBreakEvenDays(spend, forgone, rate - fee),
    verdict: netUyu > 0 ? 'conviene' : netUyu < 0 ? 'no-conviene' : 'empata',
  }
}

/**
 * Cuántos días de flote harían falta para que el rendimiento iguale lo resignado.
 *
 * Es la forma honesta de contestar «¿y si espero más?»: en vez de discutir si la
 * ganancia es chica, dice cuánto habría que estirar el plazo para empatar. Devuelve
 * `null` cuando no hay nada que empatar o cuando la tasa neta no alcanza nunca,
 * porque un número ahí sería una promesa falsa.
 *
 * No se redondea a propósito: el valor se usa para comprobar que reproduce el monto
 * resignado, y redondear rompe esa identidad.
 */
export function floatBreakEvenDays(
  spendUyu: number,
  forgoneUyu: number,
  netAnnualRatePct: number
): number | null {
  const spend = positive(spendUyu)
  const forgone = positive(forgoneUyu)
  const rate = Number.isFinite(netAnnualRatePct) ? netAnnualRatePct : 0
  if (spend <= 0 || forgone <= 0 || rate <= 0) return null
  return (365 * Math.log(1 + forgone / spend)) / Math.log(1 + rate / 100)
}

// ---------------------------------------------------------------------------
// Por dónde vuelve la plata
// ---------------------------------------------------------------------------

export interface FloatRoute {
  id: 'prex-itau' | 'prex-otro-banco' | 'mercadopago'
  /** La billetera donde la plata rinde. */
  wallet: string
  /** A dónde tiene que llegar para pagar la tarjeta. */
  destination: string
  /** Lo que cuesta cada transferencia, en pesos. */
  transferCostUyu: number
  /** La frase del tarifario que fija ese costo. */
  quote: string
  /** Cuándo llega la plata, o que el emisor no lo publica. */
  settlement: string
  /** Mínimo de la primera suscripción al fondo, en pesos. `null` si no pide. */
  minFirstUyu: number | null
  /** Tope de comisión del fondo que el emisor publica, en % anual con IVA. `null` si no lo publica. */
  feeCeilingPct: number | null
  /** El riesgo propio de esta ruta. */
  caveat: string
  source: { label: string; url: string }
}

/**
 * Las tres rutas posibles, con la asimetría que decide la elección: Prex exonera un
 * banco por su nombre y cobra a todos los demás; Mercado Pago no cobra a ninguno
 * pero tampoco acredita en el día.
 */
export const FLOAT_ROUTES: readonly FloatRoute[] = Object.freeze([
  {
    id: 'prex-itau',
    wallet: 'Prex — Inversión Violeta',
    destination: 'Cuenta Itaú',
    transferCostUyu: 0,
    quote: 'Las transferencias a Banco Itaú son GRATIS.',
    settlement:
      'La cartilla fija el precio pero no publica el plazo de acreditación, así que no lo afirmamos.',
    minFirstUyu: 4000,
    feeCeilingPct: null,
    caveat:
      'Es el único par gratis en las dos direcciones: Itaú tampoco cobra por mandar plata a Prex. Fuera de Itaú, la vuelta se paga entera.',
    source: {
      label: 'Cartilla de uso Prex (Econstar S.A.)',
      url: 'https://www.prexcard.com/html/cartillaUso',
    },
  },
  {
    id: 'prex-otro-banco',
    wallet: 'Prex — Inversión Violeta',
    destination: 'BROU, Santander, BBVA, Scotiabank',
    transferCostUyu: 45,
    quote: 'Transferencias a bancos de plaza: $ 45 IVA inc o USD 1,90 IVA inc.',
    settlement:
      'La cartilla fija el precio pero no publica el plazo de acreditación, así que no lo afirmamos.',
    minFirstUyu: 4000,
    feeCeilingPct: null,
    caveat:
      'Los $ 45 son por transferencia y salen de la ganancia: sobre un pago mensual de $ 40.000 se llevan cerca de un tercio de lo que el flote rinde.',
    source: {
      label: 'Cartilla de uso Prex (Econstar S.A.)',
      url: 'https://www.prexcard.com/html/cartillaUso',
    },
  },
  {
    id: 'mercadopago',
    wallet: 'Mercado Pago — rendimientos de la cuenta',
    destination: 'Cualquier banco o IEDE uruguayo a tu nombre',
    transferCostUyu: 0,
    quote: 'Es gratis. El dinero se acredita dentro del siguiente día hábil a que pedís el retiro.',
    settlement: 'Dentro del siguiente día hábil al pedido de retiro.',
    minFirstUyu: null,
    feeCeilingPct: 3.66,
    caveat:
      'No cobra y no ata a un banco, pero el día hábil de demora obliga a mover la plata antes del vencimiento: se pierde ese día de rendimiento y, si el vencimiento cae lunes, hay que resolverlo el viernes.',
    source: {
      label: 'Mercado Pago — Cómo retirar el dinero a tu cuenta bancaria',
      url: 'https://www.mercadopago.com.uy/ayuda/retirar-para-cuenta-bancaria_273',
    },
  },
])

export function getFloatRoute(id: FloatRoute['id']): FloatRoute | undefined {
  return FLOAT_ROUTES.find(route => route.id === id)
}

// ---------------------------------------------------------------------------

/** Un número negativo o mal tipeado es cero, no un signo menos que se propaga. */
function positive(n: number | undefined): number {
  if (!Number.isFinite(n as number)) return 0
  return Math.max(0, n as number)
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}
