// Préstamo hipotecario en Uruguay: en qué unidad va la cuota, hasta cuánto se puede pedir y qué
// baja del IRPF.
//
// PURE module (sin Vue/Nuxt, imports relativos) para que vitest-node lo cargue y lo compartan la
// página y el sitemap, igual que `rentalGuarantee.ts` e `indicators.ts`.
//
// POR QUÉ EXISTE ESTA PÁGINA. La demanda medida de "préstamo hipotecario" es alta y de marca (BHU,
// ANV, "préstamo soñado") y el sitio no tenía ninguna página propia — `/comprar-o-alquilar-uruguay`
// compara la cuota contra el alquiler y da la cuota por sabida. Pero el ángulo no es repetir tasas:
// es que el crédito hipotecario uruguayo **no se denomina en pesos ni en dólares**, va en UI o en
// UR, y los requisitos del FGCH están escritos en UR. Este sitio publica el valor de la UR y de la
// BPC del día, así que puede contestar en pesos lo que el organismo publica sólo en unidades, que
// es la misma razón por la que existen `/garantia-de-alquiler-uruguay` y `/elecciones-bps-2026`.
//
// LO QUE ESTA PÁGINA NO PUBLICA: **ninguna tasa de interés**. Cada prestamista publica la suya, se
// mueve, y una tasa congelada en el código es el error recurrente del repo. Tampoco publica las
// condiciones propias del BHU: su sitio devuelve 403 a toda lectura automatizada, así que no se
// pudieron leer de la fuente y una cifra que no se pudo verificar no se publica. Se lo enlaza para
// que el lector las lea en el mostrador.
//
// Todas las cifras de acá salen de la fuente oficial de cada programa, leídas el
// {@link MORTGAGE_VERIFIED_AT}, y cada una viaja con su URL.

import type { FaqItem } from './faqAnswers'
import { BPC_2026, IRPF_MORTGAGE_DEDUCTION_BPC, IRPF_MORTGAGE_HOME_CAP_UI } from './irpfCasos'

export const MORTGAGE_VERIFIED_AT = '2026-09-28'

/** Una fuente citada al pie, y en el `citation` del JSON-LD. */
export interface MortgageSource {
  label: string
  url: string
}

export const ANV_FGCH_SOURCE: MortgageSource = Object.freeze({
  label: 'ANV — Fondo de Garantía de Créditos Hipotecarios (FGCH)',
  url: 'https://www.anv.gub.uy/fondo-de-garantia-de-creditos-hipotecarios-fgch-0',
})

export const DGI_MORTGAGE_SOURCE: MortgageSource = Object.freeze({
  label: 'DGI — Deducción de préstamos hipotecarios en el IRPF',
  url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/deduccion-prestamos-hipotecarios-destinados-adquisicion-vivienda-irpf',
})

export const ANV_PLAN_UR_SOURCE: MortgageSource = Object.freeze({
  label: 'ANV — Plan UR',
  url: 'https://www.anv.gub.uy/planur',
})

export const BHU_SOURCE: MortgageSource = Object.freeze({
  label: 'BHU — préstamos hipotecarios',
  url: 'https://www.bhu.com.uy/preguntas-frecuentes/prestamos',
})

export const MORTGAGE_SOURCES: readonly MortgageSource[] = Object.freeze([
  ANV_FGCH_SOURCE,
  DGI_MORTGAGE_SOURCE,
  ANV_PLAN_UR_SOURCE,
  BHU_SOURCE,
])

// ---------------------------------------------------------------------------
// Las dos unidades: lo único que hay que entender antes de firmar
// ---------------------------------------------------------------------------

export interface MortgageUnit {
  /** El slug del indicador del sitio, para enlazar al valor del día. */
  slug: 'unidad-indexada' | 'unidad-reajustable'
  code: 'UI' | 'UR'
  name: string
  /** Qué índice la mueve. */
  follows: string
  /** Cada cuánto se actualiza su valor. */
  cadence: string
  /** Qué implica para la cuota de quien debe. */
  meaning: string
}

/**
 * Las definiciones NO son una cifra nueva: son las mismas que el sitio ya publica en
 * `indicators.ts` para `/indicadores/unidad-indexada` y `/indicadores/unidad-reajustable`. Acá se
 * repiten sólo en lo que cambia la cuota de un hipotecario, y la página enlaza al valor del día en
 * vez de imprimirlo — ese valor es del indicador, y dos páginas propias reclamando "valor de la UI
 * hoy" se lo quitan entre sí (`seoContract.test.ts`, el cluster UR).
 */
export const MORTGAGE_UNITS: readonly MortgageUnit[] = Object.freeze([
  Object.freeze({
    slug: 'unidad-indexada',
    code: 'UI',
    name: 'Unidad Indexada',
    follows: 'la inflación, medida por el Índice de Precios al Consumo (IPC) del INE',
    cadence: 'todos los días',
    meaning:
      'La cuota sigue a los precios. Si la inflación corre más rápido que tu sueldo, la cuota te pesa más cada año, aunque el número de UI no se mueva.',
  }),
  Object.freeze({
    slug: 'unidad-reajustable',
    code: 'UR',
    name: 'Unidad Reajustable',
    follows: 'los salarios, por el Índice Medio de Salarios del INE',
    cadence: 'una vez por mes',
    meaning:
      'La cuota sigue a los sueldos. Si tu sueldo acompaña al promedio, la cuota se mantiene más o menos igual en proporción a lo que ganás.',
  }),
])

// ---------------------------------------------------------------------------
// FGCH: los requisitos, tal como los publica la ANV
// ---------------------------------------------------------------------------

/**
 * Los seis límites del Fondo de Garantía de Créditos Hipotecarios, con la frase de la ANV que los
 * sostiene. Se guarda la cita textual y no una paráfrasis porque la paráfrasis es donde se cuela la
 * cifra que el organismo no dijo: la ANV escribe «entre el 5% y el 25%» de ahorro previo, y
 * resumirlo como «5 % de ahorro» publica un requisito más blando que el real.
 */
export interface FgchLimit {
  id: string
  label: string
  /** El valor, ya listo para imprimir. */
  value: string
  /** La frase publicada por la ANV, textual. */
  quote: string
}

export const FGCH_LIMITS: readonly FgchLimit[] = Object.freeze([
  Object.freeze({
    id: 'unidad',
    label: 'En qué unidad va',
    value: 'UI o pesos',
    quote: 'El préstamo es en Unidades Indexadas (UI) o en pesos.',
  }),
  Object.freeze({
    id: 'plazo',
    label: 'Plazo máximo',
    value: '25 años',
    quote: 'Plazo máximo de 25 años.',
  }),
  Object.freeze({
    id: 'financiacion',
    label: 'Cuánto financia',
    value: '95 % del valor (mínimo 75 %)',
    quote: 'El préstamo máximo es del 95% del valor de la vivienda (el mínimo es del 75%).',
  }),
  Object.freeze({
    id: 'cuota',
    label: 'Tope de la cuota',
    value: 'menos del 35 % del ingreso del núcleo',
    quote: 'La cuota debe ser inferior al 35% de los ingresos del núcleo familiar.',
  }),
  Object.freeze({
    id: 'ingreso',
    label: 'Techo de ingreso',
    value: 'UR 100 líquidas del núcleo',
    quote: 'El ingreso líquido del núcleo familiar no puede superar las UR 100.',
  }),
  Object.freeze({
    id: 'ahorro',
    label: 'Ahorro previo',
    value: 'entre 5 % y 25 % del valor',
    quote: 'Contar con un ahorro previo de entre el 5% y el 25% del valor de la vivienda.',
  }),
])

/** El techo de ingreso del FGCH, en UR. Es el número que la página convierte a pesos. */
export const FGCH_MAX_HOUSEHOLD_INCOME_UR = 100

/** El tope de la cuota del FGCH, como fracción del ingreso del núcleo. */
export const FGCH_MAX_PAYMENT_SHARE = 0.35

// ---------------------------------------------------------------------------
// Lo que baja del IRPF
// ---------------------------------------------------------------------------

/** El tope anual de la deducción, en BPC. Reexportado: la cifra vive en `irpfCasos.ts`. */
export const MORTGAGE_DEDUCTION_BPC = IRPF_MORTGAGE_DEDUCTION_BPC

/** El costo máximo de la vivienda para que la deducción exista, en UI. */
export const MORTGAGE_HOME_CAP_UI = IRPF_MORTGAGE_HOME_CAP_UI

/**
 * Lo que la DGI publicó en pesos, con su ejercicio. Va con el año a la vista porque el monto sube
 * con la BPC cada enero: sin el año, es una cifra que envejece en silencio.
 */
export const DGI_PUBLISHED_DEDUCTION = Object.freeze({
  year: 2025,
  amountUyu: 236736,
})

/**
 * Los prestamistas cuyas cuotas la DGI admite deducir, tal como los enumera.
 * No es una recomendación ni un ranking: es la lista de la norma.
 */
export const DEDUCTIBLE_LENDERS: readonly string[] = Object.freeze([
  'Préstamos hipotecarios',
  'Cuotas de promitente comprador del BHU, la ANV, el MVOTMA y MEVIR',
  'Cuotas de cooperativas de vivienda, fondos sociales y sociedades civiles',
])

// ---------------------------------------------------------------------------
// Plan UR: para los créditos viejos, no para uno nuevo
// ---------------------------------------------------------------------------

export interface PlanUrBenefit {
  id: string
  /** Cuándo se tomó el crédito. */
  window: string
  /** La tasa a la que queda. */
  rate: string
}

/**
 * El Plan UR de la ANV rebaja la tasa de créditos en UR ya otorgados. Va en esta página porque la
 * consulta «préstamo hipotecario en UR» la hace tanto quien va a pedir uno como quien arrastra uno
 * de los noventa, y para el segundo la respuesta útil es ésta y no una comparativa de bancos.
 */
export const PLAN_UR_BENEFITS: readonly PlanUrBenefit[] = Object.freeze([
  Object.freeze({
    id: 'pre-1994',
    window: 'tomados hasta el 31 de diciembre de 1993',
    rate: '0 % de interés',
  }),
  Object.freeze({
    id: '1994-2008',
    window: 'tomados entre el 1.º de enero de 1994 y el 31 de diciembre de 2008',
    rate: '2,5 % de interés',
  }),
])

/** Tope del monto original del crédito para entrar al Plan UR, en dólares a la fecha de otorgado. */
export const PLAN_UR_MAX_ORIGINAL_USD = 80000

// ---------------------------------------------------------------------------
// Las cuentas (puras, testeadas)
// ---------------------------------------------------------------------------

/**
 * Un monto en UR llevado a pesos con la UR viva. Devuelve `null` si no hay UR: la página imprime
 * entonces sólo el monto en UR y lo dice, nunca un peso inventado ni una UR congelada en el código.
 * Misma regla y misma firma que `urToPesos` de `rentalGuarantee.ts`.
 */
export function urToPesos(ur: number, urValue: number | null | undefined): number | null {
  if (!Number.isFinite(ur) || ur <= 0) return null
  if (urValue == null || !Number.isFinite(urValue) || urValue <= 0) return null
  return Math.round(ur * urValue)
}

/**
 * El tope de cuota que sale de un ingreso del núcleo: el 35 % del que manda la ANV. Se redondea
 * HACIA ABAJO porque el requisito es «inferior al 35 %»: un redondeo hacia arriba publicaría como
 * admisible una cuota que el fondo rechaza.
 */
export function maxPaymentFromIncome(monthlyIncome: number): number | null {
  if (!Number.isFinite(monthlyIncome) || monthlyIncome <= 0) return null
  return Math.floor(monthlyIncome * FGCH_MAX_PAYMENT_SHARE)
}

/**
 * La deducción anual del IRPF en pesos, con la BPC de 2026. Es la cuenta que la DGI publica sólo
 * para el ejercicio 2025: el tope es de 36 BPC y la BPC cambia cada enero, así que el monto de este
 * año se calcula y no se copia.
 */
export function deductionCapUyu(bpc: number = BPC_2026): number | null {
  if (!Number.isFinite(bpc) || bpc <= 0) return null
  return Math.round(MORTGAGE_DEDUCTION_BPC * bpc)
}

/** El ahorro previo que pide el FGCH sobre un precio de vivienda, en su rango publicado. */
export function priorSavingsRange(homePrice: number): { min: number; max: number } | null {
  if (!Number.isFinite(homePrice) || homePrice <= 0) return null
  return { min: Math.round(homePrice * 0.05), max: Math.round(homePrice * 0.25) }
}

// ---------------------------------------------------------------------------
// FAQ
// ---------------------------------------------------------------------------

export const MORTGAGE_FAQ: readonly FaqItem[] = Object.freeze([
  Object.freeze({
    id: 'en-que-moneda',
    question: '¿En qué moneda es un préstamo hipotecario en Uruguay?',
    answer:
      'En unidades, no en pesos ni en dólares. El Fondo de Garantía de Créditos Hipotecarios de la ANV establece que «el préstamo es en Unidades Indexadas (UI) o en pesos», y los créditos más viejos del BHU están en Unidades Reajustables (UR). La UI sigue a la inflación y se actualiza todos los días; la UR sigue a los salarios y se actualiza una vez por mes. Por eso la cuota en pesos cambia sola, sin que el banco toque nada.',
  }),
  Object.freeze({
    id: 'cuanto-puedo-pedir',
    question: '¿Hasta cuánto me pueden prestar y cuánto tengo que tener ahorrado?',
    answer:
      'Con el Fondo de Garantía de Créditos Hipotecarios de la ANV, «el préstamo máximo es del 95% del valor de la vivienda (el mínimo es del 75%)», el plazo máximo es de 25 años y hay que «contar con un ahorro previo de entre el 5% y el 25% del valor de la vivienda». Además la cuota «debe ser inferior al 35% de los ingresos del núcleo familiar» y el ingreso líquido del núcleo «no puede superar las UR 100».',
  }),
  Object.freeze({
    id: 'irpf',
    question: '¿Las cuotas del préstamo hipotecario se descuentan del IRPF?',
    answer:
      'Sí, con tope y sólo por la vivienda única y permanente. La DGI admite deducir las cuotas siempre que «el costo de la vivienda no haya superado UI 1:000.000» y «el monto máximo a deducir no podrá superar las 36 BPC anuales». No baja la retención de cada mes: entra presentando la declaración jurada anual, formulario 1102 o 1103. Si hay dos o más titulares, la deducción se reparte de común acuerdo y, si no lo hay, en partes iguales.',
  }),
  Object.freeze({
    id: 'credito-viejo-en-ur',
    question: 'Tengo un crédito viejo en UR, ¿puedo bajarle la tasa?',
    answer:
      'El Plan UR de la ANV rebaja la tasa de créditos en Unidades Reajustables ya otorgados, siempre que el monto original no haya superado los USD 80.000 a la fecha de otorgamiento y que el crédito haya sido para vivienda propia. Los tomados hasta el 31 de diciembre de 1993 quedan a 0 % de interés, y los tomados entre el 1.º de enero de 1994 y el 31 de diciembre de 2008, a 2,5 %.',
  }),
  Object.freeze({
    id: 'tasas',
    question: '¿Cuál es la tasa de un préstamo hipotecario hoy?',
    answer:
      'Esta página no la publica. Cada prestamista fija y publica su propia tasa, la mueve, y una tasa copiada acá envejece sin avisar: la que decide tu cuota es la del contrato que te ofrecen, en el mostrador o en el simulador del propio banco. Lo que sí podés comparar antes de entrar es la unidad (UI o UR), el plazo y el porcentaje del ingreso que se lleva la cuota, que es lo que está en esta página con su fuente.',
  }),
])
