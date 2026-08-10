// app/utils/unemploymentBenefit.ts
// Motor + datos del seguro de paro para /seguro-de-paro-uruguay.
//
// POR QUÉ EXISTE: al auditar 13.196 hilos de r/uruguay, r/AskUruguayan, r/Burises,
// r/UruguayFinanzas y r/LegalUruguay, «me mandaron al seguro de paro, ¿cuánto cobro, cuántos
// meses y por qué me pagan menos cada mes?» apareció como hueco en CINCO análisis temáticos
// independientes (trabajo, salud, educación/carrera, banca y costo de vida). El sitio no tenía
// una sola mención del seguro de paro.
//
// MÓDULO PURO (sin Vue/Nuxt), compartido por la página y `app/tests/unit/unemploymentBenefit.test.ts`.
//
// EL PUNTO QUE LA GENTE NO SABE: el subsidio por despido baja mes a mes por diseño (66 % → 40 %)
// Y ADEMÁS tiene un tope distinto para cada mes. Un sueldo alto puede cobrar el tope los seis
// meses y ver que el importe baja igual, sin que nadie le haya descontado nada.
//
// FUENTES PRIMARIAS, verificadas el 2026-08-09:
//   - Decreto-Ley 15.180 y Ley 18.399 — régimen del subsidio por desempleo. Resumen oficial:
//     MTSS, «Seguro de paro»
//     https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/derecho-reglamentacion-laboral/derecho-laboral-uruguayo/seguro-paro
//   - BPS, «Subsidio por desempleo por despido» (porcentajes, duración, topes 2026)
//     https://www.bps.gub.uy/4802/subsidio-por-desempleo-por-despido.html
//   - BPS, «Subsidio por desempleo por suspensión» (50 %, topes máximo y mínimo enero 2026)
//     https://www.bps.gub.uy/18239/subsidio-por-desempleo-por-suspension.html
//
// LA BPC NO SE DUPLICA ACÁ: sale de `URUGUAY.bpc` en `calculators.ts`, que ya está auditada.

import { URUGUAY } from './calculators'

/** Fecha en que cada cifra de este módulo se contrastó con las fuentes de arriba. */
export const UNEMPLOYMENT_VERIFIED_AT = '2026-08-09'

/** Los topes que publica BPS corresponden a este año. BPS los actualiza. */
export const UNEMPLOYMENT_CAPS_YEAR = 2026

export interface BenefitSource {
  label: string
  url: string
}

export const UNEMPLOYMENT_SOURCES: readonly BenefitSource[] = Object.freeze([
  {
    label: 'MTSS — Seguro de paro (Decreto-Ley 15.180 y Ley 18.399)',
    url: 'https://www.gub.uy/ministerio-trabajo-seguridad-social/politicas-y-gestion/derecho-reglamentacion-laboral/derecho-laboral-uruguayo/seguro-paro',
  },
  {
    label: 'BPS — Subsidio por desempleo por despido (porcentajes y topes 2026)',
    url: 'https://www.bps.gub.uy/4802/subsidio-por-desempleo-por-despido.html',
  },
  {
    label: 'BPS — Subsidio por desempleo por suspensión',
    url: 'https://www.bps.gub.uy/18239/subsidio-por-desempleo-por-suspension.html',
  },
])

// ---------------------------------------------------------------------------
// Régimen
// ---------------------------------------------------------------------------

export type Causal = 'despido' | 'suspension' | 'reduccion'

export interface CausalDef {
  id: Causal
  label: string
  /** Qué situación es, en las palabras del trabajador. */
  what: string
  /** Meses de subsidio en el régimen general. */
  months: number
  /** Equivalente en jornales, para quien cobra por día. */
  jornales: number
}

export const CAUSALES: readonly CausalDef[] = Object.freeze([
  {
    id: 'despido',
    label: 'Despido',
    what: 'Te desvincularon. Es la causal con más meses y la única con porcentaje decreciente.',
    months: 6,
    jornales: 72,
  },
  {
    id: 'suspension',
    label: 'Suspensión total',
    what: 'La empresa te suspendió: no trabajás ni cobrás sueldo, pero seguís siendo empleado.',
    months: 4,
    jornales: 48,
  },
  {
    id: 'reduccion',
    label: 'Trabajo reducido',
    what: 'Te bajaron los días o las horas y el ingreso cayó. Se cobra la diferencia, no el total.',
    months: 6,
    jornales: 72,
  },
])

/** Meses extra para quien tiene 50 años o más al configurarse la causal (o 54 jornales). */
export const EXTENSION_MONTHS_50_PLUS = 6

/** Porcentaje del promedio de los últimos 6 meses, por mes de subsidio (causal despido). */
export const DESPIDO_PERCENTAGES: readonly number[] = Object.freeze([66, 57, 50, 45, 42, 40])

/**
 * Topes 2026 publicados por BPS, uno por cada mes de subsidio por despido.
 *
 * NO SON UN PORCENTAJE DE UN TOPE ÚNICO: es una tabla que BPS publica mes a mes y que no se
 * deriva de una sola base salarial (93.155/0,66 = 141.144 pero 67.754/0,50 = 135.508). Por eso
 * se guarda como tabla y no como fórmula: cualquier "simplificación" acá inventa plata.
 */
export const DESPIDO_MONTHLY_CAPS: readonly number[] = Object.freeze([
  93155, 80445, 67754, 59287, 55044, 50802,
])

/** Causal suspensión: porcentaje fijo del promedio, sin escalonamiento. */
export const SUSPENSION_PERCENTAGE = 50

/** Topes de la causal suspensión (enero 2026). */
export const SUSPENSION_CAP = 67754
export const SUSPENSION_FLOOR = 8467

/** Complemento por cargas familiares. */
export const FAMILY_COMPLEMENT_PCT = 20

/**
 * El ingreso de la persona a cargo no puede superar 1 BPC para habilitar el complemento.
 * Se toma de `URUGUAY.bpc` para no duplicar el valor.
 */
export const dependantIncomeCap = (): number => URUGUAY.bpc

// ---------------------------------------------------------------------------
// Cálculo
// ---------------------------------------------------------------------------

export interface BenefitInput {
  /** Promedio mensual de las remuneraciones NOMINALES computables de los últimos 6 meses. */
  averageNominal: number
  causal: Causal
  /** Edad al configurarse la causal. 50 o más extiende la prestación. */
  age: number
  /** ¿Tiene cónyuge, concubino, hijos menores o personas a cargo con ingresos de hasta 1 BPC? */
  hasDependants: boolean
  /**
   * Sólo en trabajo reducido: lo que sigue cobrando de la empresa por mes. El subsidio cubre la
   * diferencia contra lo que cobraría por la causal, no el sueldo entero.
   */
  reducedIncome?: number
}

export interface BenefitMonth {
  month: number
  /** Porcentaje aplicado al promedio. */
  percentage: number
  /** Lo que da la cuenta antes del tope y antes del complemento. */
  gross: number
  /** Tope aplicable a ese mes. `null` cuando la causal no lo tiene por mes. */
  cap: number | null
  /** `true` cuando el tope, y no el porcentaje, es lo que define el importe. */
  cappedByLimit: boolean
  /** Complemento por cargas familiares efectivamente sumado. */
  complement: number
  /** Lo que se cobra ese mes. */
  amount: number
  /** `true` cuando este mes viene de la extensión por tener 50 años o más. */
  isExtension: boolean
}

export interface BenefitResult {
  causal: CausalDef
  months: BenefitMonth[]
  /** Total de todo el período. */
  total: number
  /** Cuántos meses dura en total, ya con la extensión si corresponde. */
  totalMonths: number
  /** Notas que la página muestra: qué regla se activó en este caso concreto. */
  notes: string[]
}

const round0 = (n: number): number => Math.round(n)

const causalDef = (id: Causal): CausalDef => CAUSALES.find(c => c.id === id) as CausalDef

/**
 * Calcula el subsidio mes a mes.
 *
 * Orden de las operaciones, que es donde se equivocan las calculadoras que circulan: primero el
 * porcentaje sobre el promedio, después el tope del mes, y recién al final el complemento del
 * 20 %. Aplicar el complemento antes del tope infla el resultado.
 */
export function estimateUnemploymentBenefit(input: BenefitInput): BenefitResult {
  const causal = causalDef(input.causal)
  const avg = Math.max(0, input.averageNominal || 0)
  const notes: string[] = []

  const extend = input.age >= 50
  if (extend) {
    notes.push(
      `Con 50 años o más la prestación se extiende ${EXTENSION_MONTHS_50_PLUS} meses más (o 54 jornales, según cómo cobres).`
    )
  }

  const baseMonths = causal.months
  const totalMonths = baseMonths + (extend ? EXTENSION_MONTHS_50_PLUS : 0)
  const months: BenefitMonth[] = []

  for (let i = 0; i < totalMonths; i++) {
    const isExtension = i >= baseMonths
    // En la extensión se mantiene el último porcentaje y el último tope del régimen general:
    // no vuelve a empezar en 66 %.
    const idx = Math.min(i, DESPIDO_PERCENTAGES.length - 1)

    let percentage: number
    let cap: number | null
    if (causal.id === 'despido' || causal.id === 'reduccion') {
      percentage = DESPIDO_PERCENTAGES[idx]
      cap = DESPIDO_MONTHLY_CAPS[idx]
    } else {
      percentage = SUSPENSION_PERCENTAGE
      cap = SUSPENSION_CAP
    }

    let gross = (avg * percentage) / 100

    // Trabajo reducido: se cobra la diferencia contra lo que se sigue percibiendo.
    if (causal.id === 'reduccion') {
      gross = Math.max(0, gross - Math.max(0, input.reducedIncome || 0))
    }

    const capped = cap !== null ? Math.min(gross, cap) : gross
    const cappedByLimit = cap !== null && gross > cap

    const complement = input.hasDependants ? (capped * FAMILY_COMPLEMENT_PCT) / 100 : 0
    let amount = capped + complement

    if (causal.id === 'suspension') amount = Math.max(amount, SUSPENSION_FLOOR)

    months.push({
      month: i + 1,
      percentage,
      gross: round0(gross),
      cap,
      cappedByLimit,
      complement: round0(complement),
      amount: round0(amount),
      isExtension,
    })
  }

  if (months.some(m => m.cappedByLimit)) {
    notes.push(
      `Tu sueldo supera el tope de BPS en al menos un mes: ahí no cobrás el porcentaje sino el tope de ${UNEMPLOYMENT_CAPS_YEAR}.`
    )
  }
  if (input.hasDependants) {
    notes.push(
      `Se sumó el complemento del ${FAMILY_COMPLEMENT_PCT} % por cargas familiares. Hay que pedirlo en BPS: no sale solo.`
    )
  }
  if (causal.id === 'despido') {
    notes.push(
      'El importe baja todos los meses por diseño del régimen, del 66 % al 40 % del promedio. No es un error de liquidación.'
    )
  }
  if (causal.id === 'suspension' && months.some(m => m.amount === SUSPENSION_FLOOR)) {
    notes.push('Se aplicó el tope mínimo de la causal suspensión.')
  }

  return {
    causal,
    months,
    total: round0(months.reduce((n, m) => n + m.amount, 0)),
    totalMonths,
    notes,
  }
}

// ---------------------------------------------------------------------------
// Requisitos y cortes
// ---------------------------------------------------------------------------

export interface Requirement {
  label: string
  detail: string
}

/** Aportes previos exigidos, en los 12 meses anteriores a la causal. */
export const REQUIREMENTS: readonly Requirement[] = Object.freeze([
  {
    label: 'Si cobrás por mes',
    detail: '180 días en planilla (seis meses de trabajo registrado) en los 12 meses previos.',
  },
  {
    label: 'Si cobrás por jornal',
    detail: '150 jornales en los 12 meses previos.',
  },
  {
    label: 'Si cobrás a destajo o por comisión',
    detail: 'Haber percibido al menos 6 BPC en los 12 meses previos.',
  },
])

/** Situaciones que cortan el subsidio. Es la parte que sorprende a la gente. */
export const TERMINATION_CAUSES: readonly string[] = Object.freeze([
  'Volvés a cualquier actividad remunerada, aunque sea changa o por poco tiempo.',
  'Rechazás un empleo adecuado sin causa legítima.',
  'Te jubilás o pedís la jubilación.',
])

export interface UnemploymentFaq {
  question: string
  short: string
  answer: string
}

export const UNEMPLOYMENT_FAQ: readonly UnemploymentFaq[] = Object.freeze([
  {
    question: '¿Por qué cada mes me pagan menos?',
    short: 'Porque el régimen es decreciente por diseño: 66 %, 57 %, 50 %, 45 %, 42 % y 40 %.',
    answer:
      'En la causal despido el subsidio es un porcentaje del promedio mensual de tus remuneraciones nominales de los seis meses anteriores, y ese porcentaje baja mes a mes. Además cada mes tiene su propio tope, que también baja. Si tu sueldo era alto podés estar cobrando el tope los seis meses y ver que el importe igual se reduce: no te descontaron nada, es el régimen.',
  },
  {
    question: '¿Sobre qué sueldo se calcula?',
    short: 'Sobre el promedio nominal de los últimos 6 meses, no sobre el líquido.',
    answer:
      'Se toma el promedio mensual de las remuneraciones nominales computables percibidas en los seis meses inmediatamente anteriores a configurarse la causal. Es el nominal, no lo que te caía en la cuenta.',
  },
  {
    question: '¿Cuántos meses me corresponden?',
    short: 'Seis por despido o trabajo reducido, cuatro por suspensión total.',
    answer:
      'En jornales son 72 y 48 respectivamente. Si tenés 50 años o más al configurarse la causal, la prestación se extiende seis meses más (o 54 jornales). El MTSS puede autorizar extensiones especiales en algunos sectores.',
  },
  {
    question: '¿Puedo trabajar mientras estoy en el seguro de paro?',
    short: 'No: reingresar a cualquier actividad remunerada corta el subsidio.',
    answer:
      'El subsidio cesa si volvés a una actividad remunerada, si rechazás un empleo adecuado sin causa legítima o si te jubilás. Es la causa más común de que a alguien le reclamen devolver lo cobrado.',
  },
  {
    question: '¿Qué es el complemento del 20 %?',
    short: 'Un adicional si tenés cónyuge, concubino, hijos menores o personas a cargo.',
    answer:
      'Se suma un 20 % al subsidio cuando hay cargas familiares cuyos ingresos no superen 1 BPC. Hay que solicitarlo en BPS: no se aplica automáticamente.',
  },
  {
    question: '¿Sigo teniendo mutualista mientras estoy en el seguro de paro?',
    short: 'Sí, se mantiene la cobertura del SNIS — y por eso te descuentan FONASA del subsidio.',
    answer:
      'Durante el período de amparo al subsidio por desempleo se mantiene el derecho a la cobertura asistencial del Sistema Nacional Integrado de Salud, realizando los aportes correspondientes al FONASA. Esos aportes salen del propio subsidio: es la razón de que el importe que te llega sea menor que el que da la cuenta del porcentaje. Los montos de esta página son nominales, antes de ese descuento.',
  },
])
