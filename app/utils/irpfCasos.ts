// app/utils/irpfCasos.ts
// Los tres casos con números de /declaracion-de-irpf-uruguay: cuánto te retienen por mes en 2026,
// qué significa que la declaración "salga negativa" y qué pasa si debés IRPF.
//
// POR QUÉ EXISTE. Cuatro consultas de la cola de demanda apuntaban a la misma página y la página
// no las respondía: "cuánto irpf me tienen que quitar" (retención mensual: no había ni la BPC),
// "qué pasa si el irpf sale negativo" (la página hablaba de devolución sin definir el signo),
// "qué pasa si debo irpf" (tenía la tabla de multas pero no las cuotas, los códigos ni el
// convenio) y "puedo cobrar irpf de años anteriores" (la sección existía pero sin las dos
// cifras que deciden: 4 años de caducidad del crédito, 5/10 de prescripción de la deuda).
//
// `dgiTaxes.ts` sigue siendo el dueño del trámite (obligados, formularios, multa del art. 94,
// prescripción, crédito por alquiler). Este módulo agrega SÓLO lo que tiene número y fecha, y
// cada número lleva su fuente en `IRPF_CASOS_SOURCES`, leída el día de `IRPF_CASOS_VERIFIED_AT`.
//
// REGLA DE ESTE MÓDULO: DGI publica escalas, parámetros y simuladores; no publica "sueldo →
// retención". Cualquier ejemplo de retención es aritmética del sitio con los parámetros del
// simulador de DGI y se publica DICIÉNDOLO (`IRPF_EXAMPLE_DISCLAIMER`). Una cifra que no tenga
// fuente primaria no entra: se dice que no está publicada.
//
// LO QUE NO SE AFIRMA, a propósito (cada punto se contrastó con la fuente el 2026-09-22):
//   - Que un "IRPF negativo" en el recibo mensual signifique que el empleador te paga algo ese
//     mes: la retención mensual es como mínimo cero (Decreto 148/007 art. 63).
//   - Que la devolución automática de junio incluya el crédito por alquiler o las cuotas
//     hipotecarias: DGI dice que esas exigen declaración jurada.
//   - Que la deducción por hijo sea 13 BPC (cifra pre-2023): es 20 BPC, 40 con discapacidad.
//   - Que el crédito por alquiler sea 6 %: es 8 % para vivienda permanente.
//   - Que el convenio exija 20 % de entrega inicial: DGI publica un mínimo del 10 %.
//   - Que la deuda prescriba a los 4 años: son 5 (10 sin declaraciones); los 4 años son la
//     caducidad de TU crédito contra el Estado (Código Tributario art. 77).
//   - Que el recargo por mora sea una tasa anual fija: es mensual, la fija el Poder Ejecutivo y
//     DGI la publica mes a mes; octubre–diciembre de 2026 no estaban publicados al verificar.
//   - Que las 5 cuotas sean un derecho permanente: son los vencimientos de la Resolución DGI
//     2284/025 para el saldo del ejercicio 2025.
//   - Que DGI pague intereses por devolver tarde: ninguna fuente primaria lo afirma.
//   - Que el límite de exclusión de retenciones sea $ 65.400: es el valor 2025 que todavía
//     imprime el instructivo del 3100; para 2026 rige $ 68.300 (Decreto 32/026).

import { irpfBracketsUyu, progressiveTax, round } from './calculators'

/** Fecha en que cada cifra de este módulo se leyó en su fuente. */
export const IRPF_CASOS_VERIFIED_AT = '2026-09-22'

const SEEN = IRPF_CASOS_VERIFIED_AT

// ---------------------------------------------------------------------------
// Fuentes
// ---------------------------------------------------------------------------

export interface IrpfSource {
  id: string
  label: string
  publisher: string
  url: string
  /** Fecha en que se leyó (ISO). Una cifra vale con su fecha, no sola. */
  seenOn: string
}

export const IRPF_CASOS_SOURCES: readonly IrpfSource[] = Object.freeze([
  {
    id: 'bpc-2026',
    label: 'Decreto 11/026: valor de la BPC desde el 1.º de enero de 2026',
    publisher: 'IMPO',
    url: 'https://www.impo.com.uy/bases/decretos/11-2026',
    seenOn: SEEN,
  },
  {
    id: 'escalas',
    label: 'IRPF categoría 2: escalas y alícuotas 2025 y 2026 (planilla oficial)',
    publisher: 'DGI',
    url: 'https://www.gub.uy/direccion-general-impositiva/sites/direccion-general-impositiva/files/2026-02/IRPF%20categor%C3%ADa%202%20escalas%20y%20al%C3%ADcuotas.xlsx',
    seenOn: SEEN,
  },
  {
    id: 'simulador',
    label: 'Simulador de IRPF mensual a partir de febrero de 2026',
    publisher: 'DGI',
    url: 'https://www.gub.uy/direccion-general-impositiva/politicas-y-gestion/simulador-irpf-mensual-partir-febrero-2026',
    seenOn: SEEN,
  },
  {
    id: 'dependientes',
    label: 'IRPF para trabajadores dependientes (mínimo no imponible, aguinaldo, formulario 3100)',
    publisher: 'DGI',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/irpf-para-trabajadores-dependientes',
    seenOn: SEEN,
  },
  {
    id: 'decreto-148-63',
    label: 'Decreto 148/007 art. 63: cómo se determina la retención mensual',
    publisher: 'IMPO',
    url: 'https://www.impo.com.uy/bases/decretos/148-2007/63',
    seenOn: SEEN,
  },
  {
    id: 'decreto-148-64',
    label: 'Decreto 148/007 art. 64: ajuste anual de diciembre',
    publisher: 'IMPO',
    url: 'https://www.impo.com.uy/bases/decretos/148-2007/64',
    seenOn: SEEN,
  },
  {
    id: 'deducciones',
    label: 'Deducciones admitidas en la liquidación del IRPF',
    publisher: 'DGI',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/deducciones-admitidas-liquidacion-del-irpf',
    seenOn: SEEN,
  },
  {
    id: 'bps-r5',
    label: 'Comunicado R 5/2026: valores mensuales de las deducciones de IRPF (BPC $ 6.864)',
    publisher: 'BPS',
    url: 'https://www.bps.gub.uy/bps/file/23860/3/2026---comunicado-r-5---valores-escalas-irpf-2026.pdf',
    seenOn: SEEN,
  },
  {
    id: 'fonasa',
    label: 'Tasas de aporte personal al FONASA',
    publisher: 'BPS',
    url: 'https://www.bps.gub.uy/10314/tasas-fonasa.html',
    seenOn: SEEN,
  },
  {
    id: 'exclusion',
    label: 'Decreto 32/026: límite de exclusión del régimen de retenciones 2026',
    publisher: 'IMPO',
    url: 'https://www.impo.com.uy/bases/decretos/32-2026',
    seenOn: SEEN,
  },
  {
    id: 'tres-pasos',
    label: 'Chequear, confirmar y listo: la declaración de IRPF en tres pasos',
    publisher: 'DGI',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/chequear-confirmar-listo-declaracion-irpf-tres-pasos',
    seenOn: SEEN,
  },
  {
    id: 'auto-2026',
    label: 'Consulta de devoluciones automáticas 2026',
    publisher: 'DGI',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/noticias/consulta-devoluciones-automaticas',
    seenOn: SEEN,
  },
  {
    id: 'devoluciones',
    label: 'Devoluciones de IRPF: cómo surge una devolución y a quién le corresponde la automática',
    publisher: 'DGI',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/devoluciones-irpf',
    seenOn: SEEN,
  },
  {
    id: 'calendario-devoluciones',
    label: 'Calendario de devoluciones IRPF 2026 (fecha de presentación → banco / redes)',
    publisher: 'DGI',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/calendario-devoluciones-irpf',
    seenOn: SEEN,
  },
  {
    id: 'cobrar',
    label: 'Devoluciones del IRPF: cómo cobrar y qué hacer si hay observaciones',
    publisher: 'DGI',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/devoluciones-del-irpf',
    seenOn: SEEN,
  },
  {
    id: 'vencimientos',
    label: 'Vencimientos IRPF, IASS e IVA servicios personales: las 5 cuotas del saldo 2025',
    publisher: 'DGI',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/vencimientos-irpf-iass-iva-servicios-personales',
    seenOn: SEEN,
  },
  {
    id: 'pagar-saldo',
    label: 'Cómo pagar el saldo de la declaración jurada de IRPF (códigos, boleto 2908)',
    publisher: 'DGI',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/pagar-saldo-declaracion-jurada-irpf',
    seenOn: SEEN,
  },
  {
    id: 'ct-94',
    label: 'Código Tributario art. 94: mora, multa y recargos',
    publisher: 'IMPO',
    url: 'https://www.impo.com.uy/bases/codigo-tributario/14306-1974/94',
    seenOn: SEEN,
  },
  {
    id: 'recargo-mora',
    label: 'Tasas de interés mensual de recargos por mora (art. 94 CT), 2026',
    publisher: 'DGI',
    url: 'https://www.gub.uy/direccion-general-impositiva/datos-y-estadisticas/datos/tasas-interes-mensual-recargos-art-94-ct-recargo-mora',
    seenOn: SEEN,
  },
  {
    id: 'interes-convenio',
    label: 'Tasas de interés mensual por facilidades (art. 33 CT, convenios), 2026',
    publisher: 'DGI',
    url: 'https://www.gub.uy/direccion-general-impositiva/datos-y-estadisticas/datos/tasas-interes-mensual-facilidades-art-33o-ct-convenios',
    seenOn: SEEN,
  },
  {
    id: 'convenio',
    label: 'Requisitos para solicitar un convenio IRPF-IASS',
    publisher: 'DGI',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/requisitos-para-realizar-tramite-solicitud-convenio-irpf-iass',
    seenOn: SEEN,
  },
  {
    id: 'ct-32',
    label: 'Código Tributario art. 32: facilidades de pago hasta 72 meses (Ley 20.446)',
    publisher: 'IMPO',
    url: 'https://www.impo.com.uy/bases/codigo-tributario/14306-1974/32',
    seenOn: SEEN,
  },
  {
    id: 'contravencion',
    label: 'Contravención por presentar la declaración jurada fuera de plazo (Res. 097/026)',
    publisher: 'DGI',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/contravencion-presentacion-declaracion-jurada-fuera-plazo-0',
    seenOn: SEEN,
  },
  {
    id: 'calculadora-recargos',
    label:
      'Consulta de multas y recargos: cálculo oficial por impuesto, vencimiento y fecha de pago',
    publisher: 'DGI',
    url: 'https://servicios.dgi.gub.uy/RecargosDGI/servlet/hcontrecmul',
    seenOn: SEEN,
  },
  {
    id: 'whatsapp-dgi',
    label: 'DGI contacta por WhatsApp (091 221 344) a quienes no declararon el multi ingreso 2025',
    publisher: 'DGI',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/noticias/contribuyentes-irpf-acciones-orientadas-fortalecer-cumplimiento-tributario',
    seenOn: SEEN,
  },
  {
    id: 'ct-77',
    label: 'Código Tributario art. 77: caducidad del crédito del contribuyente a los 4 años',
    publisher: 'IMPO',
    url: 'https://www.impo.com.uy/bases/codigo-tributario/14306-1974/77',
    seenOn: SEEN,
  },
  {
    id: 'ct-35',
    label: 'Código Tributario art. 35: compensación de oficio de créditos con deudas',
    publisher: 'IMPO',
    url: 'https://www.impo.com.uy/bases/codigo-tributario/14306-1974/35',
    seenOn: SEEN,
  },
  {
    id: 'ct-38',
    label: 'Código Tributario art. 38: prescripción a los 5 años, 10 sin declaraciones',
    publisher: 'IMPO',
    url: 'https://www.impo.com.uy/bases/codigo-tributario/14306-1974/38',
    seenOn: SEEN,
  },
  {
    id: 'omisos',
    label: 'Guía para deudores y omisos: declaraciones pendientes precargadas por año',
    publisher: 'DGI',
    url: 'https://www.gub.uy/direccion-general-impositiva/comunicacion/publicaciones/usted-tiene-pendiente-presentacion-declaraciones-juradas-0',
    seenOn: SEEN,
  },
  {
    id: 'app-1102',
    label: 'Aplicación Formulario 1102, versiones por ejercicio (2008 a 2025)',
    publisher: 'DGI',
    url: 'https://www.gub.uy/direccion-general-impositiva/politicas-y-gestion/aplicacion-formulario-1102',
    seenOn: SEEN,
  },
])

export function irpfSource(id: string): IrpfSource {
  const found = IRPF_CASOS_SOURCES.find(s => s.id === id)
  if (!found) throw new Error(`fuente desconocida: ${id}`)
  return found
}

// ---------------------------------------------------------------------------
// Caso 1: cuánto te retienen por mes (2026)
// ---------------------------------------------------------------------------

/** BPC vigente desde el 1.º de enero de 2026 (Decreto 11/026). */
export const BPC_2026 = 6864

/** BPC 2025 (Decreto 05/025): rige el ejercicio que se declara en la campaña 2026. */
export const BPC_2025 = 6576

/** Mínimo no imponible mensual: 7 BPC nominales. Por debajo no hay retención. */
export const IRPF_MNI_BPC_MONTHLY = 7
export const IRPF_MNI_MONTHLY_2026 = IRPF_MNI_BPC_MONTHLY * BPC_2026

/** Mínimo no imponible anual: 84 BPC. El 2025 es el que publica DGI para la campaña 2026. */
export const IRPF_MNI_BPC_ANNUAL = 84
export const IRPF_MNI_ANNUAL_2025 = IRPF_MNI_BPC_ANNUAL * BPC_2025
export const IRPF_MNI_ANNUAL_2026 = IRPF_MNI_BPC_ANNUAL * BPC_2026

export interface IrpfBracket {
  /** Desde cuántas BPC (inclusive). */
  fromBpc: number
  /** Hasta cuántas BPC, o null en la franja abierta. */
  toBpc: number | null
  /** Desde cuántos pesos. */
  from: number
  /** Hasta cuántos pesos, o null en la franja abierta. */
  to: number | null
  /** Tasa marginal, en porcentaje. */
  rate: number
}

/** Franjas mensuales en BPC (Decreto 148/007 art. 63; planilla oficial de DGI). */
const MONTHLY_EDGES_BPC: readonly (readonly [number, number | null, number])[] = [
  [0, 7, 0],
  [7, 10, 10],
  [10, 15, 15],
  [15, 30, 24],
  [30, 50, 25],
  [50, 75, 27],
  [75, 115, 31],
  [115, null, 36],
]

/** Franjas anuales en BPC: las mensuales × 12. */
const ANNUAL_EDGES_BPC: readonly (readonly [number, number | null, number])[] = [
  [0, 84, 0],
  [84, 120, 10],
  [120, 180, 15],
  [180, 360, 24],
  [360, 600, 25],
  [600, 900, 27],
  [900, 1380, 31],
  [1380, null, 36],
]

function bracketsFor(
  edges: readonly (readonly [number, number | null, number])[],
  bpc: number
): readonly IrpfBracket[] {
  return Object.freeze(
    edges.map(([fromBpc, toBpc, rate]) => ({
      fromBpc,
      toBpc,
      from: fromBpc * bpc,
      to: toBpc === null ? null : toBpc * bpc,
      rate,
    }))
  )
}

/** Escala mensual 2026 en pesos: la que aplica el empleador cada mes. */
export const IRPF_MONTHLY_BRACKETS_2026 = bracketsFor(MONTHLY_EDGES_BPC, BPC_2026)

/** Escala anual 2025: la del ejercicio que se declara en la campaña 2026. */
export const IRPF_ANNUAL_BRACKETS_2025 = bracketsFor(ANNUAL_EDGES_BPC, BPC_2025)

/** Escala anual 2026: la que regirá la declaración que se presenta en 2027. */
export const IRPF_ANNUAL_BRACKETS_2026 = bracketsFor(ANNUAL_EDGES_BPC, BPC_2026)

/**
 * La tasa que se aplica a la SUMA de deducciones (T.O. 2023 Título 7 art. 49): 14 % si los
 * ingresos nominales no superan 15 BPC mensuales (180 anuales), 8 % si los superan. No es una
 * deducción de la base: es un crédito contra el impuesto.
 */
export const IRPF_DEDUCTION_RATE = Object.freeze({
  lowPct: 14,
  highPct: 8,
  thresholdBpcMonthly: 15,
  thresholdMonthly2026: 15 * BPC_2026,
  thresholdBpcAnnual: 180,
  thresholdAnnual2026: 180 * BPC_2026,
})

/**
 * La trampa del 6 % (Decreto 148/007 art. 63): si la renta del mes supera 10 BPC, la renta
 * computable gravada por aportes se incrementa 6 % ANTES de aplicar la escala.
 */
export const IRPF_SURCHARGE = Object.freeze({
  aboveBpc: 10,
  above2026: 10 * BPC_2026,
  pct: 6,
})

/** Deducción por hijo menor a cargo: 20 BPC anuales (40 con discapacidad), Ley 20.124. */
export const IRPF_CHILD_DEDUCTION_BPC = 20
export const IRPF_DISABLED_CHILD_DEDUCTION_BPC = 40
export const IRPF_CHILD_DEDUCTION_ANNUAL_2026 = IRPF_CHILD_DEDUCTION_BPC * BPC_2026
export const IRPF_CHILD_DEDUCTION_MONTHLY_2026 = IRPF_CHILD_DEDUCTION_ANNUAL_2026 / 12
export const IRPF_DISABLED_CHILD_DEDUCTION_MONTHLY_2026 =
  (IRPF_DISABLED_CHILD_DEDUCTION_BPC * BPC_2026) / 12

/** Tope de la deducción por cuotas hipotecarias: 36 BPC anuales, vivienda de hasta UI 1.000.000. */
export const IRPF_MORTGAGE_DEDUCTION_BPC = 36
export const IRPF_MORTGAGE_HOME_CAP_UI = 1_000_000

/** Aportes personales que el simulador de DGI usa como deducción proporcional. */
export const IRPF_CONTRIBUTION_RATES = Object.freeze({
  jubilatorioPct: 15,
  /** Sin cónyuge y sin hijos, por encima de 2,5 BPC. Con hijos 6 %, con cónyuge 6,5 % / 8 %. */
  fonasaBasePct: 4.5,
  fonasaWithChildrenPct: 6,
  fonasaWithSpousePct: 6.5,
  fonasaWithSpouseAndChildrenPct: 8,
  frlPct: 0.1,
})

export interface IrpfDeduction {
  id: string
  label: string
  detail: string
}

/** Lo que resta, en el orden en que aparece en el recibo. */
export const IRPF_DEDUCTIONS: readonly IrpfDeduction[] = Object.freeze([
  {
    id: 'jubilatorio',
    label: 'Aportes jubilatorios',
    detail:
      'El 15 % del nominal que va a la seguridad social. Es la deducción más grande y la aplica el empleador solo.',
  },
  {
    id: 'fonasa',
    label: 'Aporte al FONASA',
    detail:
      '4,5 % sin cónyuge ni hijos; 6 % con hijos; 6,5 % con cónyuge; 8 % con cónyuge e hijos (BPS, Ley 18.131). También lo aplica el empleador solo.',
  },
  {
    id: 'frl',
    label: 'Fondo de Reconversión Laboral',
    detail: '0,1 % del nominal.',
  },
  {
    id: 'hijos',
    label: 'Hijos menores a cargo',
    detail:
      '20 BPC anuales por hijo ($ 137.280 en 2026, $ 11.440 por mes), 40 BPC con discapacidad ($ 22.880 por mes). Se reparte entre padre y madre o va entero a uno. Sólo la aplica el empleador si la informaste en el formulario 3100.',
  },
  {
    id: 'solidaridad',
    label: 'Fondo de Solidaridad y aportes a cajas profesionales',
    detail:
      'Se deducen si los declarás en el 3100. BPS publica los valores mensuales por categoría.',
  },
  {
    id: 'hipoteca',
    label: 'Cuotas hipotecarias',
    detail:
      'Hasta 36 BPC anuales, si la vivienda no superó UI 1.000.000. Entra por la declaración anual, no por la retención.',
  },
])

/** El crédito por alquiler NO baja la retención del mes: se cobra en la declaración jurada. */
export const IRPF_RENTAL_CREDIT_NOTE =
  'Si alquilás tu vivienda permanente, el 8 % del alquiler no te lo descuenta el empleador cada mes: es un crédito contra el impuesto anual y sólo entra presentando la declaración jurada (formulario 1102 o 1103), identificando al arrendador.'

/** Aguinaldo y salario vacacional se gravan aparte, a la tasa marginal máxima del contribuyente. */
export const IRPF_AGUINALDO_RULE =
  'El aguinaldo y el salario vacacional legales no entran en la escala del mes: DGI los grava aparte, a la tasa marginal máxima que ya pagás por tu sueldo. Por eso el mes del aguinaldo "duele" más: todo el aguinaldo tributa a tu tasa más alta, sin pasar por las franjas de abajo.'

/** Formulario 3100: lo que le decís al empleador para que retenga bien. */
export const IRPF_FORM_3100_RULE =
  'El formulario 3100 se presenta ante el empleador al empezar y ante cada cambio. Sirve para tres cosas: informar deducciones (hijos, Fondo de Solidaridad, caja profesional), avisar que tenés otro ingreso simultáneo que sumado supera 7 BPC (para que no te aplique el mínimo no imponible dos veces) y pedir la reducción del 5 % por núcleo familiar o la exclusión de retenciones. Sin 3100 el empleador retiene sin ninguna deducción por hijos: las recuperás en la declaración anual, pero a costa de esperar.'

/** Exclusión del régimen de retenciones 2026 (Decreto 32/026): quién puede pedir que no le retengan. */
export const IRPF_EXCLUSION_2026 = Object.freeze({
  monthly: 68_300,
  annual: 819_600,
  rule: 'Si tus ingresos como dependiente no superan $ 68.300 al mes ni $ 819.600 al año, no optaste por núcleo familiar y no facturás servicios personales, podés pedir con el 3100 que no te retengan. Rige desde el mes siguiente. Si un mes superás el tope mensual, ese mes te retienen igual.',
})

/**
 * Un ejemplo de retención mensual con los parámetros del simulador de DGI. NO es una cifra
 * oficial: DGI no publica "sueldo → retención". Se reproduce la aritmética del simulador
 * (hoja Parámetros, febrero 2026) y se publica diciendo que es cálculo propio.
 */
export interface WithholdingEstimate {
  /** Sueldo nominal del mes, sin aguinaldo ni salario vacacional. */
  nominal: number
  /** Renta computable: el nominal, más 6 % si supera 10 BPC. */
  computable: number
  /** Impuesto según la escala mensual sobre la renta computable. */
  tax: number
  /** Suma de deducciones (aportes + hijos declarados). */
  deductionsBase: number
  /** Tasa aplicada a la suma de deducciones (14 % u 8 %). */
  deductionRatePct: number
  /** Crédito por deducciones. */
  deductionsCredit: number
  /** Retención del mes: impuesto − crédito, nunca menos de cero. */
  withholding: number
}

export interface WithholdingOptions {
  /** Tasa de FONASA que corresponde a tu situación familiar (ver IRPF_CONTRIBUTION_RATES). */
  fonasaPct?: number
  /** Hijos menores a cargo informados en el 3100 (cada uno deduce 1/12 de 20 BPC). */
  children?: number
  /** BPC a usar; por defecto la de 2026. */
  bpc?: number
}

export function estimateMonthlyWithholding(
  nominal: number,
  {
    fonasaPct = IRPF_CONTRIBUTION_RATES.fonasaBasePct,
    children = 0,
    bpc = BPC_2026,
  }: WithholdingOptions = {}
): WithholdingEstimate {
  const safe = Math.max(0, nominal)
  const computable =
    safe > IRPF_SURCHARGE.aboveBpc * bpc ? round(safe * (1 + IRPF_SURCHARGE.pct / 100)) : safe
  const tax = progressiveTax(computable, irpfBracketsUyu(bpc)).total
  const contributionPct =
    IRPF_CONTRIBUTION_RATES.jubilatorioPct + fonasaPct + IRPF_CONTRIBUTION_RATES.frlPct
  const childDeduction = (children * IRPF_CHILD_DEDUCTION_BPC * bpc) / 12
  const deductionsBase = round((safe * contributionPct) / 100 + childDeduction)
  const deductionRatePct =
    safe <= IRPF_DEDUCTION_RATE.thresholdBpcMonthly * bpc
      ? IRPF_DEDUCTION_RATE.lowPct
      : IRPF_DEDUCTION_RATE.highPct
  const deductionsCredit = round((deductionsBase * deductionRatePct) / 100)
  const withholding = Math.max(0, round(tax - deductionsCredit))
  return {
    nominal: safe,
    computable,
    tax,
    deductionsBase,
    deductionRatePct,
    deductionsCredit,
    withholding,
  }
}

export interface IrpfExample {
  id: string
  label: string
  nominal: number
  options: WithholdingOptions
}

/** Los ejemplos que publica la página. Cada uno se calcula en vivo con `estimateMonthlyWithholding`. */
export const IRPF_EXAMPLES: readonly IrpfExample[] = Object.freeze([
  {
    id: 'sesenta',
    label: '$ 60.000 nominales, un empleador, sin hijos',
    nominal: 60_000,
    options: {},
  },
  {
    id: 'ochenta',
    label: '$ 80.000 nominales, un empleador, sin hijos',
    nominal: 80_000,
    options: {},
  },
  {
    id: 'ochenta-hijo',
    label:
      '$ 80.000 nominales, un hijo a cargo declarado entero en el 3100 (20 BPC a este padre, FONASA 6 %)',
    nominal: 80_000,
    options: { fonasaPct: IRPF_CONTRIBUTION_RATES.fonasaWithChildrenPct, children: 1 },
  },
])

export const IRPF_EXAMPLE_DISCLAIMER =
  'Cálculo propio con los parámetros del simulador mensual de DGI (BPC $ 6.864, aportes 15 % + FONASA + 0,1 %, tasa de deducciones 14 % u 8 %, más 6 % sobre la renta si supera 10 BPC). DGI no publica una tabla sueldo → retención: antes de discutir un recibo, corré su simulador con tus datos.'

// ---------------------------------------------------------------------------
// Caso 2: la declaración sale negativa (crédito → devolución)
// ---------------------------------------------------------------------------

/** El signo, explicado sin ambigüedad. */
export const IRPF_NEGATIVE_MEANING =
  'En la declaración en línea, la primera línea del formulario ya dice si tenés saldo a pagar o crédito a cobrar. Un resultado negativo es crédito: te retuvieron más de lo que correspondía y DGI te lo devuelve, después de sus controles. En el recibo mensual, en cambio, "negativo" sólo significa retención cero: el empleador nunca te paga IRPF.'

/** Por qué al año siguiente da a favor o en contra: el ajuste de diciembre. */
export const IRPF_DECEMBER_ADJUSTMENT =
  'Al 31 de diciembre el empleador recalcula el año entero. Si da a pagar, lo retiene en el recibo de diciembre; si da a favor, el crédito se lo comunica a DGI y DGI te lo devuelve. Con un solo empleador todo el año la retención es definitiva y no hay nada que declarar. Con dos empleadores, sin ingresos en diciembre o con la reducción del 5 % por núcleo familiar, el ajuste no se puede hacer en el recibo y hay que declarar.'

/** Devoluciones automáticas 2026: sin trámite, sólo para el caso simple. */
export const IRPF_AUTO_REFUNDS_2026 = Object.freeze({
  consultFrom: '2026-06-10',
  bankFrom: '2026-06-15',
  networksFrom: '2026-06-16',
  who: 'Sólo quien tuvo un único empleador en el año y estaba trabajando en diciembre. No corresponde a quien optó por la reducción del 5 % por núcleo familiar.',
  excludes:
    'No incluye el crédito por alquiler ni las cuotas hipotecarias: esos sólo entran presentando la declaración jurada.',
})

export interface RefundCalendarRow {
  /** Presentada hasta esta fecha (ISO). */
  filedBy: string
  /** Se cobra en banco a partir de (ISO). */
  bank: string
  /** Se cobra en redes de cobranza a partir de (ISO). */
  networks: string
}

/** La tabla oficial de DGI para la campaña 2026, fila por fila. */
export const IRPF_REFUND_CALENDAR_2026: readonly RefundCalendarRow[] = Object.freeze([
  { filedBy: '2026-07-10', bank: '2026-07-20', networks: '2026-07-28' },
  { filedBy: '2026-07-17', bank: '2026-07-24', networks: '2026-07-28' },
  { filedBy: '2026-08-07', bank: '2026-08-14', networks: '2026-08-28' },
  { filedBy: '2026-08-14', bank: '2026-08-26', networks: '2026-08-28' },
  { filedBy: '2026-09-04', bank: '2026-09-16', networks: '2026-09-28' },
  { filedBy: '2026-09-18', bank: '2026-09-25', networks: '2026-09-28' },
  { filedBy: '2026-10-09', bank: '2026-10-16', networks: '2026-10-28' },
  { filedBy: '2026-10-16', bank: '2026-10-26', networks: '2026-10-28' },
  { filedBy: '2026-11-07', bank: '2026-11-16', networks: '2026-11-30' },
  { filedBy: '2026-11-13', bank: '2026-11-25', networks: '2026-11-30' },
  { filedBy: '2026-12-04', bank: '2026-12-15', networks: '2026-12-28' },
  { filedBy: '2026-12-18', bank: '2026-12-24', networks: '2026-12-28' },
])

/** La primera fila de la tabla cuyo corte todavía no pasó. Null cuando la tabla se agotó. */
export function nextRefundWindow(
  todayIso: string,
  rows: readonly RefundCalendarRow[] = IRPF_REFUND_CALENDAR_2026
): RefundCalendarRow | null {
  return rows.find(r => r.filedBy >= todayIso) ?? null
}

/** La regla del día 15 es la simplificación oficial; la tabla manda. */
export const IRPF_REFUND_RULE_CAVEAT =
  'Es la regla general que publica DGI. Los cortes exactos de 2026 están en la tabla: en setiembre, por ejemplo, el corte es el 18 y no el 15, y el banco paga antes que Abitab o Redpagos.'

export const IRPF_REFUND_HOW =
  'Se cobra en Abitab o Redpagos con la cédula, o por depósito si le comunicaste a tu banco la opción de cobrar por esa vía antes de presentar la declaración. DGI avisa por SMS cuando está disponible.'

export const IRPF_REFUND_OBSERVATIONS =
  'Si los controles de DGI encuentran algo, la consulta de devoluciones lo muestra como "con observaciones". Se resuelve en Servicios en Línea, Devoluciones, Trámite devolución con observaciones, que dice qué formularios, años y documentos faltan.'

/** WhatsApp de consultas de DGI publicado en la guía de devoluciones. */
export const IRPF_REFUND_WHATSAPP = '098 134 400'

/** Compensación de oficio (Código Tributario art. 35): una deuda de otro año traba la devolución. */
export const IRPF_COMPENSATION_RULE =
  'Si debés IRPF de otro año, DGI compensa de oficio: usa tu crédito para cancelar la deuda más antigua no prescripta, y la devolución queda trabada hasta que se salde. Es el caso típico de quien cambió de trabajo, quedó con saldo a pagar sin saberlo y años después declara el crédito por alquiler.'

// ---------------------------------------------------------------------------
// Caso 3: debo IRPF (saldo a pagar)
// ---------------------------------------------------------------------------

export interface IrpfInstalment {
  n: number
  due: string
}

/** Saldo del ejercicio 2025: 5 cuotas iguales (Resolución DGI 2284/025, ordinal 16). */
export const IRPF_INSTALMENTS_2025: readonly IrpfInstalment[] = Object.freeze([
  { n: 1, due: '2026-08-31' },
  { n: 2, due: '2026-09-30' },
  { n: 3, due: '2026-10-30' },
  { n: 4, due: '2026-11-30' },
  { n: 5, due: '2026-12-30' },
])

export interface IrpfPaymentCode {
  code: string
  use: string
}

export const IRPF_PAYMENT_CODES: readonly IrpfPaymentCode[] = Object.freeze([
  {
    code: '109',
    use: 'IRPF rentas de trabajo (categoría II), saldo de la declaración individual.',
  },
  { code: '117', use: 'IRPF rentas de trabajo, declaración por núcleo familiar.' },
  { code: '101', use: 'IRPF rentas de capital (categoría I).' },
])

/** El boleto de pago, el mes cargo y cómo se paga. */
export const IRPF_HOW_TO_PAY =
  'La propia declaración en línea genera los boletos 2908 con el código del impuesto y el mes cargo 12 del ejercicio declarado. Va un boleto por cada cuota. Se paga en Abitab o Redpagos con la cédula, en la banca en línea o con certificados de crédito electrónicos.'

export interface MonthlyRate {
  /** Mes de 2026, en minúsculas y grafía uruguaya. */
  month: string
  /** Tasa mensual en porcentaje, o null si DGI todavía no la publicó. */
  pct: number | null
}

/** Recargo por mora (art. 94 CT), tasa mensual publicada por DGI para 2026. */
export const IRPF_MORA_RATES_2026: readonly MonthlyRate[] = Object.freeze([
  { month: 'enero', pct: 1.0 },
  { month: 'febrero', pct: 0.9 },
  { month: 'marzo', pct: 0.9 },
  { month: 'abril', pct: 0.9 },
  { month: 'mayo', pct: 0.8 },
  { month: 'junio', pct: 0.8 },
  { month: 'julio', pct: 0.8 },
  { month: 'agosto', pct: 0.8 },
  { month: 'setiembre', pct: 0.8 },
  { month: 'octubre', pct: null },
  { month: 'noviembre', pct: null },
  { month: 'diciembre', pct: null },
])

/** Interés por facilidades (art. 33 CT), tasa mensual publicada por DGI para 2026. */
export const IRPF_CONVENIO_RATES_2026: readonly MonthlyRate[] = Object.freeze([
  { month: 'enero', pct: 0.8 },
  { month: 'febrero', pct: 0.8 },
  { month: 'marzo', pct: 0.8 },
  { month: 'abril', pct: 0.8 },
  { month: 'mayo', pct: 0.7 },
  { month: 'junio', pct: 0.7 },
  { month: 'julio', pct: 0.7 },
  { month: 'agosto', pct: 0.7 },
  { month: 'setiembre', pct: 0.7 },
  { month: 'octubre', pct: null },
  { month: 'noviembre', pct: null },
  { month: 'diciembre', pct: null },
])

/** La última tasa publicada, con su mes. */
export function latestPublishedRate(rows: readonly MonthlyRate[]): MonthlyRate | null {
  const published = rows.filter(r => r.pct !== null)
  return published.length ? published[published.length - 1]! : null
}

/** Convenio de facilidades IRPF-IASS. */
export const IRPF_CONVENIO = Object.freeze({
  form: '2/015',
  minUpfrontPct: 10,
  maxMonths: 72,
  where: 'Servicios en línea, Trámites, Convenios, IRPF-IASS',
  rule: 'Se pide con el formulario 2/015 firmado y sin enmiendas, la cédula y una entrega inicial de al menos el 10 % de los impuestos adeudados. El plazo máximo legal es de 72 meses (Código Tributario art. 32, redacción de la Ley 20.446). Pedirlo dentro del plazo deja la multa por mora en 10 %, y el interés de facilidades es más bajo que el recargo por mora.',
})

/** Multa fija por presentar la declaración fuera de plazo, aparte de la mora sobre el saldo. */
export const IRPF_LATE_FILING_FINE = Object.freeze({
  amount: 910,
  cap: 2_730,
  rule: 'Presentar la declaración jurada fuera de plazo tiene además una multa por contravención de $ 910 por declaración (Resolución DGI 097/026), con tope de $ 2.730 sólo para contribuyentes sin actividad que presentan varias en el mismo acto. Ni la guía de omisos ni la de vencimientos la mencionan.',
})

/** Número oficial desde el que DGI escribe a los multi ingreso 2025 sin declarar. */
export const IRPF_DGI_WHATSAPP_OFFICIAL = '091 221 344'

export const IRPF_DGI_WHATSAPP_RULE =
  'DGI escribe por WhatsApp desde el 091 221 344 a quienes tuvieron más de un empleador en 2025 y no declararon. No manda enlaces ni pide claves: si el mensaje trae un link o te pide la contraseña de Identidad Digital, no es DGI.'

// ---------------------------------------------------------------------------
// Caso 4: años anteriores, las dos cifras que deciden
// ---------------------------------------------------------------------------

/** Caducidad del crédito del contribuyente contra el Estado (Código Tributario art. 77). */
export const IRPF_CREDIT_CADUCITY_YEARS = 4

/** Prescripción de la deuda (Código Tributario art. 38). */
export const IRPF_DEBT_PRESCRIPTION_YEARS = 5
export const IRPF_DEBT_PRESCRIPTION_YEARS_EXTENDED = 10

/** Versiones de la aplicación 1102 disponibles por ejercicio. */
export const IRPF_FORM_1102_YEARS = Object.freeze({ from: 2008, to: 2025 })

export const IRPF_PAST_YEARS_FIGURES =
  'Una devolución que nunca cobraste caduca a los 4 años desde que fue exigible, y una gestión formal tuya suspende ese plazo. Una deuda de IRPF prescribe a los 5 años desde el fin del año civil, 10 si nunca presentaste la declaración, y sólo si vos pedís la prescripción: DGI no la aplica sola. En Reddit circulan los dos plazos al revés (4 para la deuda, 5 para el crédito); el Código Tributario dice lo contrario.'

// ---------------------------------------------------------------------------
// FAQ: las consultas tal como las escribe la gente
// ---------------------------------------------------------------------------

export interface IrpfCasoFaq {
  question: string
  short: string
  answer: string
}

export const IRPF_CASOS_FAQ: readonly IrpfCasoFaq[] = Object.freeze([
  {
    question: '¿Cuánto IRPF me tienen que quitar por mes?',
    short: 'Nada hasta $ 48.048 nominales. Arriba, la escala mensual menos el 14 % de tus aportes.',
    answer:
      'En 2026 la BPC vale $ 6.864, así que hasta 7 BPC nominales ($ 48.048) no hay retención. Por encima, el empleador aplica la escala mensual (10 % entre $ 48.048 y $ 68.640, 15 % hasta $ 102.960, 24 % hasta $ 205.920 y así hasta 36 %) y le resta el 14 % de tus aportes jubilatorios, FONASA, FRL e hijos declarados (8 % si ganás más de $ 102.960). Si superás 10 BPC ($ 68.640), la renta gravada se aumenta 6 % antes de aplicar la escala. Con $ 80.000 nominales y sin hijos da unos $ 2.288 por mes; con $ 60.000 da cero. Son cálculos propios con los parámetros del simulador de DGI: el número exacto lo da el simulador con tus datos.',
  },
  {
    question: '¿Por qué en el mes del aguinaldo me descuentan más IRPF?',
    short: 'El aguinaldo va aparte, a tu tasa marginal máxima.',
    answer:
      'Porque el aguinaldo y el salario vacacional legales no entran en la escala del mes: DGI los grava por separado a la tasa marginal máxima que ya pagás por tu sueldo. Si ese es el único mes en que te retienen, el ajuste de diciembre del empleador o la declaración anual pueden devolverlo.',
  },
  {
    question: '¿Qué pasa si el IRPF sale negativo?',
    short:
      'En la declaración, negativo es crédito: te lo devuelven. En el recibo, es retención cero.',
    answer:
      'En la declaración en línea o el simulador anual, un resultado negativo significa que te retuvieron más de lo que correspondía: es crédito a tu favor y DGI lo devuelve por banco o por Abitab y Redpagos según su calendario, después de los controles y con aviso por SMS. En el recibo mensual, en cambio, un negativo sólo quiere decir retención cero: el empleador nunca te paga IRPF. Si debés IRPF de otro año, DGI compensa de oficio y la devolución queda trabada hasta cancelar esa deuda.',
  },
  {
    question: '¿Qué pasa si debo IRPF?',
    short:
      '5 cuotas desde el 31/8/2026; vencido, multa de 5, 10 o 20 % más recargo mensual (0,80 % en setiembre de 2026).',
    answer:
      'Si la declaración da saldo a pagar, generás los boletos 2908 (código 109, mes cargo 12/2025) desde la propia declaración y podés pagar en hasta 5 cuotas iguales: 31 de agosto, 30 de setiembre, 30 de octubre, 30 de noviembre y 30 de diciembre de 2026. Si ya pasó el 31 de agosto sin declarar ni pagar, corre la multa por mora (5 % dentro de los 5 días hábiles, 10 % hasta 90 días, 20 % después) más un recargo mensual que en setiembre de 2026 es 0,80 %, y una multa de $ 910 por presentar fuera de plazo. Si no podés pagar todo, DGI da convenio: formulario 2/015, entrega inicial mínima del 10 % y hasta 72 meses, con interés de 0,70 % mensual en setiembre de 2026.',
  },
  {
    question: '¿Puedo cobrar IRPF de años anteriores?',
    short: 'Sí, si el crédito no caducó: 4 años desde que fue exigible.',
    answer:
      'Sí. Una devolución no cobrada se consulta en Servicios en línea, Devoluciones; si figura con observaciones, iniciá el trámite de devolución con observaciones. El crédito contra el Estado caduca a los 4 años desde que fue exigible (Código Tributario art. 77) y una gestión formal tuya suspende ese plazo. Si lo que falta es la declaración, en Servicios en línea, Declaraciones, Declaraciones IRPF están las precargadas de cada año pendiente y la aplicación 1102 se descarga por ejercicio de 2008 a 2025; puede dar crédito o saldo a pagar con multa y recargos. La deuda prescribe a los 5 años (10 si nunca declaraste) y sólo si vos la pedís.',
  },
])
