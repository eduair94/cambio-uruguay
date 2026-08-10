// app/utils/usdSpending.ts
// Motor de /cobrar-en-dolares-gastar-en-pesos: cobrás en dólares y gastás en pesos, ¿dejás que
// el banco convierta cuando pagás con la tarjeta, o vendés los dólares y pagás en pesos?
//
// POR QUÉ EXISTE: fue el hueco #1 del backlog de la auditoría de los subs uruguayos — cuatro
// análisis temáticos independientes lo marcaron, y es terreno propio del sitio. El hilo que mejor
// lo muestra es de r/AskUruguayan con 70 comentarios y ninguna cuenta cerrada.
//
// LA DECISIÓN DE DISEÑO QUE SOSTIENE ESTE MÓDULO: **no publicamos el spread de ningún banco.**
// Ninguna institución publica de forma uniforme y estable el tipo de cambio que aplica al
// convertir un consumo, así que cualquier número que pusiéramos sería inventado o quedaría viejo.
// Lo que sí podemos hacer —y es mejor— es darle al lector el método para MEDIR el suyo con un
// dato que ya tiene: su propio estado de cuenta. `impliedRate()` es exactamente eso.
//
// El otro lado de la cuenta sí es dato duro: la rebaja de IVA por pagar con débito o dinero
// electrónico (Ley 19.210 art. 87). No lo duplicamos: se reusa `ivaReduccionFrac` y los valores
// por defecto de `cuotasVsContado.ts`, que ya estaban auditados.
//
// FUENTES:
//   - Ley 19.210 art. 87 — reducción de IVA para débito y dinero electrónico
//     https://www.impo.com.uy/bases/leyes/19210-2014/87
//   - Los tipos de cambio de compra y venta de cada casa los publica el propio sitio.

import { DEFAULTS, ivaReduccionFrac } from './cuotasVsContado'

/** Fecha en que las reglas de este módulo se contrastaron. */
export const USD_SPENDING_VERIFIED_AT = '2026-08-10'

/** Puntos de IVA que saca el débito, y tasa básica. Reusados, no redefinidos. */
export const IVA_DEBITO_PUNTOS = DEFAULTS.ivaDebitoPuntos
export const IVA_BASICA = DEFAULTS.ivaBasica

/**
 * Cuánto baja el precio final por pagar con débito, como fracción del precio CON IVA.
 * Dos puntos sobre 22 no son «2 % más barato»: son 2/122 = 1,64 %.
 */
export const ivaDebitoFrac = (): number => ivaReduccionFrac(IVA_DEBITO_PUNTOS, IVA_BASICA)

// ---------------------------------------------------------------------------
// Medir el tipo de cambio que te aplicó el banco
// ---------------------------------------------------------------------------

/**
 * El tipo de cambio implícito de un consumo, sacado del estado de cuenta: pesos cobrados
 * dividido dólares debitados. Es el único número honesto sobre el spread de tu banco, porque
 * sale de tu propia factura y no de una tabla que nosotros inventemos.
 *
 * Devuelve null cuando no se puede calcular, en vez de Infinity o NaN.
 */
export function impliedRate(input: { uyuCharged: number; usdDebited: number }): number | null {
  const uyu = Number(input.uyuCharged)
  const usd = Number(input.usdDebited)
  if (!Number.isFinite(uyu) || !Number.isFinite(usd) || usd <= 0 || uyu <= 0) return null
  return Math.round((uyu / usd) * 100) / 100
}

/**
 * Cuánto peor es ese tipo de cambio que el mejor que conseguirías vendiendo los dólares.
 * Positivo = el banco te liquidó por debajo del mercado.
 */
export function spreadVsMarket(bankRate: number, bestSellRate: number): number | null {
  if (!Number.isFinite(bankRate) || !Number.isFinite(bestSellRate) || bestSellRate <= 0) return null
  return Math.round(((bestSellRate - bankRate) / bestSellRate) * 10000) / 100
}

// ---------------------------------------------------------------------------
// Comparar las rutas
// ---------------------------------------------------------------------------

export type UsdRouteId = 'tarjeta-usd' | 'vender-y-debito' | 'vender-y-credito'

export interface UsdRouteResult {
  id: UsdRouteId
  label: string
  /** Pesos que efectivamente te cuesta cubrir el gasto del mes. */
  effectiveCost: number
  /** Dólares que tenés que entregar para cubrirlo. */
  usdNeeded: number
  /** Qué explica la diferencia, en una línea. */
  why: string
}

export interface UsdRoutesInput {
  /** Gasto mensual en pesos que querés cubrir. */
  monthlySpendUyu: number
  /** El tipo de cambio que te aplica el banco al convertir un consumo (medido por vos). */
  bankRate: number
  /** El mejor tipo de cambio de venta que conseguís (el sitio lo publica). */
  bestSellRate: number
  /** ¿La parte que pagás con tarjeta de crédito pierde la rebaja de IVA del débito? */
  applyIvaBenefit?: boolean
}

/**
 * Compara las tres rutas sobre el mismo gasto mensual.
 *
 * Modelo, explícito para que se pueda auditar:
 *  - `tarjeta-usd`: pagás el gasto en pesos y el banco te lo cobra en dólares a SU tipo de cambio.
 *    Al ser tarjeta de crédito no aplica la rebaja de IVA por débito.
 *  - `vender-y-debito`: vendés dólares al mejor tipo de venta y pagás con débito. El gasto baja
 *    por la rebaja de IVA de la Ley 19.210.
 *  - `vender-y-credito`: vendés al mejor tipo pero pagás con crédito, así que no hay rebaja.
 *
 * No modela comisiones de la casa de cambio ni costos de la tarjeta: esos varían por institución
 * y el sitio ya los trata en sus propias páginas.
 */
export function compareUsdRoutes(input: UsdRoutesInput): UsdRouteResult[] {
  const spend = Math.max(0, input.monthlySpendUyu || 0)
  const bank = Math.max(0, input.bankRate || 0)
  const market = Math.max(0, input.bestSellRate || 0)
  const ivaOff = input.applyIvaBenefit === false ? 0 : ivaDebitoFrac()

  const round2 = (n: number) => Math.round(n * 100) / 100

  const rows: UsdRouteResult[] = [
    {
      id: 'tarjeta-usd',
      label: 'Pago con la tarjeta y el banco convierte',
      effectiveCost: round2(spend),
      usdNeeded: bank > 0 ? round2(spend / bank) : 0,
      why: 'El banco liquida a su propio tipo de cambio y, al ser crédito, no hay rebaja de IVA.',
    },
    {
      id: 'vender-y-debito',
      label: 'Vendo los dólares y pago con débito',
      effectiveCost: round2(spend * (1 - ivaOff)),
      usdNeeded: market > 0 ? round2((spend * (1 - ivaOff)) / market) : 0,
      why: `Vendés al mejor tipo del mercado y el débito te saca ${IVA_DEBITO_PUNTOS} puntos de IVA (${(ivaDebitoFrac() * 100).toFixed(2)} % del precio).`,
    },
    {
      id: 'vender-y-credito',
      label: 'Vendo los dólares pero pago con crédito',
      effectiveCost: round2(spend),
      usdNeeded: market > 0 ? round2(spend / market) : 0,
      why: 'Ganás el mejor tipo de cambio pero perdés la rebaja de IVA del débito.',
    },
  ]

  return rows
}

export interface UsdRoutesVerdict {
  routes: UsdRouteResult[]
  /** La ruta que menos dólares consume. */
  best: UsdRouteResult
  /** Dólares que te ahorrás por año contra pagar con la tarjeta. */
  annualUsdSaved: number
}

export function usdRoutesVerdict(input: UsdRoutesInput): UsdRoutesVerdict {
  const routes = compareUsdRoutes(input)
  const usable = routes.filter(r => r.usdNeeded > 0)
  const card = routes.find(r => r.id === 'tarjeta-usd')!
  const best = usable.length ? usable.reduce((a, b) => (b.usdNeeded < a.usdNeeded ? b : a)) : card
  const saved = card.usdNeeded > 0 ? (card.usdNeeded - best.usdNeeded) * 12 : 0
  return {
    routes,
    best,
    annualUsdSaved: Math.round(Math.max(0, saved) * 100) / 100,
  }
}

// ---------------------------------------------------------------------------
// Contenido
// ---------------------------------------------------------------------------

export interface SpendingStep {
  title: string
  detail: string
  icon: string
}

/** Cómo medir tu propio tipo de cambio. Es lo que reemplaza a la tabla de spreads que no existe. */
export const MEASURE_STEPS: readonly SpendingStep[] = Object.freeze([
  {
    title: 'Buscá un consumo en pesos en tu estado de cuenta en dólares',
    detail:
      'Tiene que ser una compra que hiciste en pesos y que el banco te cobró en dólares. Anotá los dos importes.',
    icon: 'mdi-file-document-outline',
  },
  {
    title: 'Dividí los pesos entre los dólares',
    detail:
      'Ese cociente es el tipo de cambio que te aplicaron a vos, en esa compra. No es un promedio ni una estimación: es tu número.',
    icon: 'mdi-calculator-variant-outline',
  },
  {
    title: 'Compará contra la pizarra de ese día',
    detail:
      'Miralo contra el mejor tipo de cambio de venta que había ese día. La diferencia, en porcentaje, es lo que te cuesta la comodidad de no hacer nada.',
    icon: 'mdi-scale-balance',
  },
])

export interface SpendingFaq {
  question: string
  short: string
  answer: string
}

export const SPENDING_FAQ: readonly SpendingFaq[] = Object.freeze([
  {
    question: '¿Por qué no publican el spread de cada banco?',
    short: 'Porque ninguno lo publica de forma estable, y un número inventado es peor que nada.',
    answer:
      'El tipo de cambio que aplica una institución al convertir un consumo no se publica de manera uniforme ni permanente, y cambia. En vez de poner una tabla que envejecería mal, esta página te da el método para medir el tuyo con tu propio estado de cuenta. Es un dato exacto, tuyo y de hoy, en vez de un promedio ajeno.',
  },
  {
    question: '¿Cuánto me da de descuento pagar con débito?',
    short: `${IVA_DEBITO_PUNTOS} puntos de IVA, que sobre el precio final son ${(ivaDebitoFrac() * 100).toFixed(2)} %.`,
    answer:
      'La Ley 19.210 le saca dos puntos de IVA a las compras con débito o dinero electrónico. Ojo con la aritmética: dos puntos sobre una tasa del 22 % no son «2 % más barato», son 2/122 = 1,64 % sobre el precio con IVA incluido. La tarjeta de crédito no tiene ese beneficio, ni pagando en una cuota.',
  },
  {
    question: '¿Conviene entonces vender todo apenas cobro?',
    short: 'No necesariamente: eso es una decisión de en qué moneda querés estar.',
    answer:
      'Esta página compara el costo de cubrir un gasto que ya vas a hacer en pesos. Cuánto de tus ahorros mantener en dólares es otra decisión, que depende de en qué moneda tenés tus gastos futuros y tu horizonte. Vender de golpe todo lo que cobrás para tenerlo en pesos te expone a lo contrario de lo que te expone no vender nada.',
  },
  {
    question: '¿Hay un mejor día del mes para cambiar?',
    short: 'No hay una regla; lo que sí se puede ver es el histórico.',
    answer:
      'Es una de las preguntas que más se repite en los hilos y la respuesta honesta es que no existe una regla estable que se pueda publicar como consejo. Lo que sí podés hacer es mirar la serie histórica y la dispersión entre casas del mismo día, que suele ser más grande que la variación de un día al otro.',
  },
])
