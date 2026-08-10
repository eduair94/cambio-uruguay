// app/utils/contractorUruguay.ts
// Datos de /contractor-en-uruguay: qué perdés al no estar en planilla y sobre qué base construís
// tu jubilación cuando facturás en vez de cobrar sueldo.
//
// POR QUÉ EXISTE: al ampliar la auditoría de 5 a 82 subs uruguayos apareció r/CharruaDevs con
// 3.358 hilos — un sub entero de gente bien paga preguntando por plata, que el corpus anterior no
// tenía. La palabra «contractor» daba CERO en todo `app/`, y es exactamente como se identifica esa
// comunidad. Los hilos testigo: «Para los contractors: ¿piensan en su jubilación?» (106
// comentarios), «¿Qué prefieren, contractor o empleado?» (57) y «¿Cobrar en Wise?» (52).
//
// LO QUE YA HABÍA: la guía `trabajar-para-el-exterior-desde-uruguay` cubre bien lo tributario
// (unipersonal, Literal E, IVA de exportación de servicios, IRAE, aportes). No dice «contractor»,
// no compara contra ser empleado y no toca la jubilación como pregunta propia. Esta página no la
// reemplaza: la complementa y enlaza.
//
// EL ERROR QUE ESTE MÓDULO EXISTE PARA EVITAR: creer que un contractor aporta sobre una ficta baja
// por más que facture mucho, y que por eso su jubilación va a ser mínima. NO es así. La ficta es
// un PISO: el aporte se calcula sobre el MAYOR entre la categoría ficta, los ingresos reales
// percibidos y el mayor sueldo pagado a empleados. Publicar lo contrario habría sido cómodo y
// falso justo para el lector de esta página.
//
// FUENTES PRIMARIAS, verificadas el 2026-08-10:
//   - BPS, «Aporte jubilatorio» (la base: el mayor de los tres; mínimos en BFC)
//     https://www.bps.gub.uy/10305/aporte-jubilatorio.html
//   - BPS, «Tasas» (15 % personal y 7,5 % patronal en Industria y Comercio)
//     https://www.bps.gub.uy/835/tasas.html
//   - BPS, «Aportación de monotributo»
//     https://www.bps.gub.uy/10444/aportacion-de-monotributo.html

/** Fecha en que cada regla y tasa se contrastó con BPS. */
export const CONTRACTOR_VERIFIED_AT = '2026-08-10'

export interface ContractorSource {
  label: string
  url: string
}

export const CONTRACTOR_SOURCES: readonly ContractorSource[] = Object.freeze([
  {
    label: 'BPS — Aporte jubilatorio (base de cálculo y mínimos en BFC)',
    url: 'https://www.bps.gub.uy/10305/aporte-jubilatorio.html',
  },
  { label: 'BPS — Tasas de aportación', url: 'https://www.bps.gub.uy/835/tasas.html' },
  {
    label: 'BPS — Aportación de monotributo',
    url: 'https://www.bps.gub.uy/10444/aportacion-de-monotributo.html',
  },
])

// ---------------------------------------------------------------------------
// Sobre qué base aportás
// ---------------------------------------------------------------------------

/** Aporte personal (montepío), en porcentaje. */
export const CONTRACTOR_APORTE_PERSONAL_PCT = 15

/** Aporte patronal desde el 1/7/07, en porcentaje. */
export const CONTRACTOR_APORTE_PATRONAL_PCT = 7.5

/** Mínimo de la categoría ficta, en BFC, para una unipersonal SIN empleados. */
export const CONTRACTOR_FICTA_MIN_BFC_SIN_EMPLEADOS = 11

/** Mínimo de la categoría ficta, en BFC, cuando la unipersonal TIENE empleados. */
export const CONTRACTOR_FICTA_MIN_BFC_CON_EMPLEADOS = 15

/**
 * La regla que deshace el malentendido. Textual del criterio de BPS: el aporte se calcula sobre
 * el mayor de tres importes, y la ficta es sólo el piso.
 */
export const CONTRACTOR_BASE_RULE =
  'El aporte jubilatorio del titular de una unipersonal se calcula sobre el MAYOR de tres importes: la categoría ficta (con un mínimo de 11 BFC sin empleados, o 15 BFC si tenés empleados), los ingresos reales percibidos, y el mayor sueldo que le pagues a un empleado. La ficta es un piso, no un techo: si facturás por encima de ella, aportás sobre lo que realmente percibís.'

/** El corolario, que es lo que la gente quiere saber. */
export const CONTRACTOR_JUBILACION_TAKEAWAY =
  'Por eso la respuesta a «¿los contractors tienen jubilación?» no es sí ni no: tu jubilación se construye sobre lo que declarás y aportás. Si declarás el mínimo, tu jubilación se parecerá al mínimo. Si aportás sobre lo que realmente facturás, se parecerá a eso. No hay una fatalidad del régimen: hay una decisión, y tiene costo hoy y efecto a treinta años.'

// ---------------------------------------------------------------------------
// Qué perdés al no estar en planilla
// ---------------------------------------------------------------------------

export interface LostBenefit {
  label: string
  /** Qué es y cuánto vale, cuando el sitio ya lo tiene documentado. */
  detail: string
  /** Ruta interna que lo desarrolla, si existe. */
  to?: string
}

/**
 * Todo esto es parte del paquete de un dependiente y no viene con la facturación. No es un
 * argumento contra ser contractor: es lo que hay que sumarle a la tarifa para comparar de verdad
 * contra un sueldo.
 */
export const CONTRACTOR_LOST_BENEFITS: readonly LostBenefit[] = Object.freeze([
  {
    label: 'Aguinaldo',
    detail: 'Un sueldo más por año, pagado en dos etapas.',
    to: '/guias/como-se-calcula-el-aguinaldo-uruguay',
  },
  {
    label: 'Licencia y salario vacacional',
    detail: 'Descanso pago más una suma extra para el mejor goce de esa licencia.',
    to: '/guias/licencia-y-salario-vacacional-uruguay',
  },
  {
    label: 'Indemnización por despido',
    detail:
      'El dependiente la tiene; el contrato de servicios se termina y no hay nada que cobrar.',
    to: '/guias/despido-y-liquidacion-uruguay',
  },
  {
    label: 'Seguro de paro',
    detail: 'Si se te cae el cliente no hay subsidio por desempleo: no cotizaste como dependiente.',
    to: '/seguro-de-paro-uruguay',
  },
  {
    label: 'Cobertura por accidente de trabajo',
    detail: 'La del Banco de Seguros del Estado va con la relación de dependencia.',
  },
  {
    label: 'Aportes que hace el empleador',
    detail:
      'Como contractor, la parte patronal la ponés vos: sos las dos puntas de la misma relación.',
  },
])

// ---------------------------------------------------------------------------
// La cuenta para comparar
// ---------------------------------------------------------------------------

export interface ContractorCompareInput {
  /** Lo que facturás por mes, en pesos. */
  monthlyBilling: number
  /** Sueldo NOMINAL mensual de la oferta en relación de dependencia, en pesos. */
  employeeNominal: number
}

export interface ContractorCompareResult {
  /** Lo que factura al año el contractor, sin aguinaldo porque no existe. */
  contractorAnnual: number
  /** Lo que cobra al año el dependiente, contando el aguinaldo como un sueldo más. */
  employeeAnnual: number
  /** Cuántos sueldos anuales equivale la facturación. */
  contractorMonthsEquivalent: number
  /** Diferencia anual a favor del contractor (negativa si pierde). */
  annualGap: number
  /** Facturación mensual que iguala al dependiente contando el aguinaldo. */
  breakEvenBilling: number
}

/** Sueldos que cobra un dependiente en el año: doce más el aguinaldo. */
export const CONTRACTOR_EMPLOYEE_MONTHS_PER_YEAR = 13

/**
 * Comparación deliberadamente PARCIAL y honesta sobre su límite: sólo pone en la misma unidad la
 * facturación anual contra el nominal anual con aguinaldo. No estima impuestos ni aportes de cada
 * lado, porque dependen del régimen elegido, de las deducciones y del giro — el sitio ya tiene
 * calculadoras para eso y la página enlaza a ellas.
 *
 * El aporte real de esta cuenta es el `breakEvenBilling`: cuánto tenés que facturar para empatar
 * al sueldo ANTES de descontar nada. Casi nadie lo tiene presente y es el piso de la negociación.
 */
export function compareContractorVsEmployee(
  input: ContractorCompareInput
): ContractorCompareResult {
  const billing = Math.max(0, input.monthlyBilling || 0)
  const nominal = Math.max(0, input.employeeNominal || 0)

  const contractorAnnual = billing * 12
  const employeeAnnual = nominal * CONTRACTOR_EMPLOYEE_MONTHS_PER_YEAR
  const round2 = (n: number) => Math.round(n * 100) / 100

  return {
    contractorAnnual: Math.round(contractorAnnual),
    employeeAnnual: Math.round(employeeAnnual),
    contractorMonthsEquivalent: nominal > 0 ? round2(contractorAnnual / nominal) : 0,
    annualGap: Math.round(contractorAnnual - employeeAnnual),
    breakEvenBilling: Math.round((nominal * CONTRACTOR_EMPLOYEE_MONTHS_PER_YEAR) / 12),
  }
}

export interface ContractorFaq {
  question: string
  short: string
  answer: string
}

export const CONTRACTOR_FAQ: readonly ContractorFaq[] = Object.freeze([
  {
    question: 'Siendo contractor, ¿voy a tener jubilación?',
    short: 'Sí, pero se construye sobre lo que declarás y aportás, no sobre lo que facturás.',
    answer:
      'El aporte jubilatorio del titular de una unipersonal se calcula sobre el mayor entre la categoría ficta (mínimo 11 BFC sin empleados, 15 con empleados), los ingresos reales percibidos y el mayor sueldo pagado a un empleado. O sea: la ficta es un piso, no un techo. Si aportás por el mínimo, tu jubilación va a parecerse al mínimo; si aportás sobre lo que realmente percibís, se va a parecer a eso. La creencia de que «el contractor no tiene jubilación» mezcla el régimen con una decisión personal.',
  },
  {
    question: '¿Cuánto tengo que facturar para igualar un sueldo?',
    short: 'Como mínimo, el nominal por trece dividido doce — y eso es antes de impuestos.',
    answer:
      'Un dependiente cobra trece sueldos al año contando el aguinaldo, así que facturar exactamente el nominal ya te deja por debajo. Ese es sólo el primer piso: encima hay que sumarle la licencia y el salario vacacional, la indemnización por despido que no vas a tener, el seguro de paro que no te cubre y la parte patronal de los aportes, que como contractor la ponés vos. La comparación de esta página hace el primer tramo de esa cuenta; el resto depende de tu régimen y lo calculan las herramientas del sitio.',
  },
  {
    question: '¿Qué pierdo exactamente al no estar en planilla?',
    short:
      'Aguinaldo, licencia, salario vacacional, despido, seguro de paro y cobertura de accidente.',
    answer:
      'Todo eso es parte del paquete de un dependiente y no viene con la facturación. No es un argumento contra ser contractor —muchas veces la tarifa compensa de sobra— pero es lo que hay que sumarle a la tarifa para comparar en serio. La cobertura por accidente de trabajo del Banco de Seguros también va con la relación de dependencia.',
  },
  {
    question: '¿Me conviene monotributo?',
    short: 'Sólo si tus ingresos caben en su tope, que es bajo para una tarifa de exterior.',
    answer:
      'El monotributo tiene un aporte de monto fijo, lo que lo hace muy simple, pero tiene un tope de ingresos. Una tarifa de contractor para el exterior suele superarlo, y ahí el camino es la unipersonal. Cuál te corresponde según tus números lo resuelve nuestro recomendador de qué empresa abrir.',
  },
  {
    question: '¿Y los impuestos y el IVA de exportación de servicios?',
    short: 'Eso está en la guía de trabajar para el exterior, que cubre el lado tributario.',
    answer:
      'Facturar al exterior tiene su propio tratamiento: la exportación de servicios, el IRAE, el Literal E y los aportes. Esa parte ya está desarrollada en la guía de trabajar para el exterior desde Uruguay, y esta página no la repite: se enfoca en la comparación contra el sueldo y en la jubilación, que eran las dos preguntas sin responder.',
  },
])
