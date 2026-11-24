// app/utils/employerCost.ts
// Datos de /cuanto-cuesta-un-empleado-uruguay: lo que le cuesta a una empresa tener a alguien en
// planilla, del otro lado del mostrador de la calculadora de sueldo líquido.
//
// POR QUÉ EXISTE: el sitio contesta hace mucho la pregunta del trabajador —del nominal al líquido,
// con sus aportes personales (`utils/payroll.ts`)— y no contestaba la del que paga. La frase
// «aporte patronal» aparecía suelta en tres páginas (`/contractor-en-uruguay` la pone como una
// línea de su tabla, `/que-empresa-abrir-uruguay` la nombra en una respuesta sobre el monotributo)
// y en ninguna estaba el número ni de dónde sale. Es la mitad que falta de la misma cuenta: quien
// negocia una tarifa como contractor y quien va a tomar a su primer empleado necesitan el mismo
// dato, y hoy tienen que armarlo sumando cuatro páginas del BPS.
//
// LA REGLA DE LA CASA, aplicada acá: ninguna tasa se escribe sin su fuente primaria, y lo que no
// tiene una tasa publicada NO se publica con un número inventado. Por eso esta página da un total
// PARCIAL y dice qué le falta (`EMPLOYER_NOT_INCLUDED`), que es la lección de PRECIOS.md: un total
// baja por faltarle ítems, así que el que falta se nombra en la misma tarjeta.
//
// FUENTES PRIMARIAS, verificadas el 2026-11-22 (ver EMPLOYER_COST_SOURCES para las URLs):
//   - BPS, «Tasas» — aporte jubilatorio: 15 % personal y 7,5 % patronal (patronal desde el 1/7/07)
//     para Industria y Comercio, Trabajo Doméstico y Civil.
//   - BPS, «Tasas de aportes Fonasa» — «Los aportes patronales se componen de una tasa del 5 %»,
//     más el Complemento de Cuota Mutual (CCM) donde corresponda.
//   - Ley 19.689 (29/10/2018), art. 17, y BPS, Comunicado 01/2019 — desde el 1/1/2019 el Fondo de
//     Reconversión Laboral es 0,10 % personal y 0,10 % patronal para los dependientes de la
//     actividad privada (antes 0,125 %).
//   - Ley 19.690 (29/10/2018), art. 10, y BPS, Comunicado 07/2019 — contribución especial de
//     seguridad social de 0,025 %: «desde 01/01/2019 corresponde aplicar la tasa de 0,025% de
//     carácter patronal sobre las remuneraciones de los trabajadores dependientes de la actividad
//     privada, cualquiera sea el ámbito de afiliación del empleador».
//   - Decreto 2/008, art. 4 — el aguinaldo está excluido del aporte PATRONAL a FONASA. Ya estaba
//     verificado y citado en `utils/payroll.ts`; acá decide la única asimetría de la cuenta anual.
//   - Ley 16.074, arts. 1 y 2 — el seguro de accidentes de trabajo es obligatorio y todo patrono
//     es civilmente responsable. NO publicamos su prima: no encontramos una tasa única publicada.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA:
//   - La prima del seguro del BSE (se cotiza por actividad, no es un porcentaje del sueldo).
//   - El Complemento de Cuota Mutual: el BPS lo nombra «donde corresponda» y no publica un importe
//     único.
//   - El salario vacacional en el total: depende del líquido de esa persona y no de su nominal
//     (`utils/salarioVacacional.ts`), así que se nombra como faltante y se enlaza su simulador.
//   - Cualquier afirmación sobre el tope de cotización del lado PATRONAL. El tope que el sitio ya
//     aplica ($ 288.836, `PAYROLL_UY.jubilatorioTope`) está verificado para el aporte PERSONAL; la
//     página del BPS que lo publica no dice si alcanza al patronal, así que los ejemplos se quedan
//     muy por debajo y la página lo advierte en vez de suponerlo.

/** Fecha en que cada tasa de este módulo se contrastó con su fuente. */
export const EMPLOYER_COST_VERIFIED_AT = '2026-11-22'

export interface EmployerCostSource {
  label: string
  url: string
}

export const EMPLOYER_COST_SOURCES: readonly EmployerCostSource[] = Object.freeze([
  {
    label: 'BPS — Tasas (aporte jubilatorio: 15 % personal, 7,5 % patronal desde el 1/7/07)',
    url: 'https://www.bps.gub.uy/835/tasas.html',
  },
  {
    label: 'BPS — Tasas de aportes Fonasa (aporte patronal del 5 %, más CCM donde corresponda)',
    url: 'https://www.bps.gub.uy/10314/tasas-fonasa.html',
  },
  {
    label: 'Ley 19.689, art. 17 — modifica la tasa del Fondo de Reconversión Laboral',
    url: 'https://www.impo.com.uy/bases/leyes/19689-2018/17',
  },
  {
    label: 'BPS — Comunicado 01/2019: FRL 0,10 % personal y 0,10 % patronal desde el 1/1/2019',
    url: 'https://www.bps.gub.uy/bps/file/15598/1/2019---comunicado-01---fondo-de-reconversion-laboral.pdf',
  },
  {
    label:
      'Ley 19.690, art. 10 — contribución especial de 0,025 % para el Fondo de Garantía de Créditos Laborales',
    url: 'https://www.impo.com.uy/bases/leyes/19690-2018/10',
  },
  {
    label: 'BPS — Comunicado 07/2019: el 0,025 % es «de carácter patronal» desde el 1/1/2019',
    url: 'https://www.bps.gub.uy/15661/2019---comunicado-07---fondo-de-garantia-de-creditos-laborales.html',
  },
  {
    label: 'Decreto 2/008, art. 4 — el aguinaldo queda fuera del aporte patronal a FONASA',
    url: 'https://www.impo.com.uy/bases/decretos/2-2008/4',
  },
  {
    label: 'Ley 16.074, art. 1 — el seguro de accidentes de trabajo es obligatorio',
    url: 'https://www.impo.com.uy/bases/leyes/16074-1989/1',
  },
])

/** Una tasa patronal, con su norma y desde cuándo rige. */
export interface EmployerRate {
  id: string
  label: string
  /** Porcentaje sobre las partidas que constituyen materia gravada. */
  pct: number
  /**
   * Cómo lo escribe su fuente, para imprimirlo igual.
   *
   * No sale de formatear `pct`: el FRL lo publica el BPS como «0,10 %» y un formateador que recorte
   * ceros lo imprimiría «0,1 %», mientras que uno con tres decimales fijos convertiría el 7,5 % en
   * «7,500 %». Las cuatro tasas tienen cantidades de decimales distintas y ninguna regla las cubre.
   */
  display: string
  /** Desde cuándo rige esa tasa, cuando la fuente lo dice. */
  from?: string
  /** Si la tasa alcanza también al aguinaldo. FONASA patronal no (Decreto 2/008, art. 4). */
  onAguinaldo: boolean
  /** Qué financia, en una línea. */
  what: string
}

/**
 * Las cuatro contribuciones especiales de seguridad social que paga el empleador de un dependiente
 * de la actividad privada, sobre el nominal.
 *
 * El orden es el del peso, que también es el de la norma más vieja a la más nueva.
 */
export const EMPLOYER_CESS: readonly EmployerRate[] = Object.freeze([
  {
    id: 'jubilatorio',
    label: 'Aporte jubilatorio patronal',
    pct: 7.5,
    display: '7,5 %',
    from: '1/7/2007',
    onAguinaldo: true,
    what: 'La jubilación: va al BPS y, con la afiliación mixta, a la AFAP de la persona.',
  },
  {
    id: 'fonasa',
    label: 'FONASA patronal',
    pct: 5,
    display: '5 %',
    onAguinaldo: false,
    what: 'La cobertura de salud del Seguro Nacional de Salud. No se aplica sobre el aguinaldo.',
  },
  {
    id: 'frl',
    label: 'Fondo de Reconversión Laboral',
    pct: 0.1,
    display: '0,10 %',
    from: '1/1/2019',
    onAguinaldo: true,
    what: 'La capacitación de quien queda sin trabajo. Hasta el 31/12/2018 era 0,125 %, y la misma ley faculta al Poder Ejecutivo a volver a subirla hasta ese 0,125 %.',
  },
  {
    id: 'garantia',
    label: 'Fondo de Garantía de Créditos Laborales',
    pct: 0.025,
    display: '0,025 %',
    from: '1/1/2019',
    onAguinaldo: true,
    what: 'Cubre los créditos laborales cuando el empleador cae en insolvencia. No tiene aporte personal.',
  },
])

/** Suma de las cuatro tasas: 12,625 %. La cuenta es nuestra; las cuatro tasas son del BPS. */
export const EMPLOYER_CESS_TOTAL_PCT = roundPct(
  EMPLOYER_CESS.reduce((total, rate) => total + rate.pct, 0)
)

/** Cómo se escribe el total en la página. Mismo motivo que `display` de cada tasa. */
export const EMPLOYER_CESS_TOTAL_DISPLAY = '12,625 %'

/** Lo mismo sobre el aguinaldo, donde FONASA patronal no entra: 7,625 %. */
export const EMPLOYER_CESS_AGUINALDO_PCT = roundPct(
  EMPLOYER_CESS.filter(rate => rate.onAguinaldo).reduce((total, rate) => total + rate.pct, 0)
)

/** Cómo se escribe el total del aguinaldo en la página. */
export const EMPLOYER_CESS_AGUINALDO_DISPLAY = '7,625 %'

/** Redondeo a centésimos para los PESOS, el mismo criterio que `utils/payroll.ts`. */
function round(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Redondeo a milésimos para los PORCENTAJES, y hace falta: la tasa más chica tiene tres decimales
 * (0,025 %), así que la suma de las cuatro es 12,625 y a centésimos quedaba en 12,62 — el número
 * que la página publica como total se habría separado de sus propias cuatro filas.
 */
function roundPct(value: number): number {
  return Math.round(value * 1000) / 1000
}

export interface EmployerCostLine {
  id: string
  label: string
  pct: number
  amount: number
}

export interface EmployerMonthlyCost {
  nominal: number
  lines: EmployerCostLine[]
  /** Total de aportes patronales del mes. */
  cess: number
  /** Nominal + aportes patronales. */
  total: number
  /** Cuánto más que el nominal, en porcentaje. Es `EMPLOYER_CESS_TOTAL_PCT` salvo redondeo. */
  overNominalPct: number
}

/**
 * El costo de UN mes: el nominal más las cuatro contribuciones patronales.
 *
 * No modela el tope de cotización (ver el encabezado), ni la prima del BSE, ni el CCM. Un nominal
 * no positivo devuelve todo en cero en vez de un número negativo sin sentido.
 */
export function employerMonthlyCost(nominal: number): EmployerMonthlyCost {
  const base = Number.isFinite(nominal) && nominal > 0 ? nominal : 0
  const lines = EMPLOYER_CESS.map(rate => ({
    id: rate.id,
    label: rate.label,
    pct: rate.pct,
    amount: round((base * rate.pct) / 100),
  }))
  const cess = round(lines.reduce((total, line) => total + line.amount, 0))
  return {
    nominal: round(base),
    lines,
    cess,
    total: round(base + cess),
    overNominalPct: base > 0 ? roundPct((cess / base) * 100) : 0,
  }
}

export interface EmployerAnnualCost {
  nominal: number
  /** Doce meses de sueldo con sus aportes. */
  salaries: number
  /** Un aguinaldo, que para un sueldo parejo es un nominal. */
  aguinaldo: number
  /** Los aportes del aguinaldo, sin FONASA patronal. */
  aguinaldoCess: number
  /** Suma de todo lo anterior. PARCIAL: ver `EMPLOYER_NOT_INCLUDED`. */
  total: number
  /** Cuántos nominales son, para leerlo sin la cifra. */
  nominalesEquivalentes: number
}

/**
 * El costo de un AÑO con un sueldo parejo: doce meses más el aguinaldo.
 *
 * El aguinaldo es, por definición, la doceava parte de lo que la persona cobró en el año (lo
 * desarrolla `/guias/como-se-calcula-el-aguinaldo-uruguay`), así que con un sueldo que no se mueve
 * equivale a un nominal. Es un supuesto, no un dato: la página lo dice.
 *
 * Es un total PARCIAL a propósito. Le falta el salario vacacional, la prima del BSE y el CCM, y
 * cada uno está nombrado en `EMPLOYER_NOT_INCLUDED` con el motivo por el que no se le pone número.
 */
export function employerAnnualCost(nominal: number): EmployerAnnualCost {
  const month = employerMonthlyCost(nominal)
  const aguinaldoCess = round((month.nominal * EMPLOYER_CESS_AGUINALDO_PCT) / 100)
  const salaries = round(month.total * 12)
  const total = round(salaries + month.nominal + aguinaldoCess)
  return {
    nominal: month.nominal,
    salaries,
    aguinaldo: month.nominal,
    aguinaldoCess,
    total,
    nominalesEquivalentes: month.nominal > 0 ? round(total / month.nominal) : 0,
  }
}

/**
 * Los nominales de los ejemplos de la página.
 *
 * Son valores redondos elegidos por nosotros para que la cuenta se pueda seguir a mano, no cifras
 * de mercado: no afirman cuánto se paga en ningún rubro. Y los tres quedan muy por debajo del tope
 * de cotización verificado para el aporte personal, por el motivo del encabezado.
 */
export const EMPLOYER_COST_EXAMPLES: readonly number[] = Object.freeze([30000, 60000, 120000])

export interface EmployerMissingItem {
  label: string
  /** Por qué no lleva número. */
  why: string
  /** La página del sitio que lo desarrolla, si existe. */
  to?: string
}

/**
 * Lo que el total NO incluye, con el motivo. Se publica al lado del total y no en una nota al pie:
 * un total parcial que no dice qué le falta se lee como completo.
 */
export const EMPLOYER_NOT_INCLUDED: readonly EmployerMissingItem[] = Object.freeze([
  {
    label: 'La prima del seguro de accidentes de trabajo',
    why: 'Es obligatoria (Ley 16.074, art. 1) y todo patrono responde civilmente (art. 2), pero no encontramos una tasa única publicada: la cotiza el Banco de Seguros del Estado y no es un porcentaje del sueldo igual para toda actividad. Por eso no va con un número.',
  },
  {
    label: 'El Complemento de Cuota Mutual (CCM)',
    why: 'El BPS lo suma al 5 % patronal de FONASA «donde corresponda», sin publicar un importe único. Depende del prestador y de la cuota, no del nominal.',
  },
  {
    label: 'El salario vacacional',
    why: 'La suma para el mejor goce de la licencia es como mínimo el 100 % del jornal líquido de vacaciones, y el líquido depende de los aportes y del IRPF de esa persona, no de su nominal. Está libre de aportes a la seguridad social, así que no lleva el 12,625 %.',
    to: '/salario-vacacional-uruguay',
  },
  {
    label: 'La indemnización por despido',
    why: 'No es un costo del mes: es una contingencia. Un mes de sueldo por año trabajado para el mensual, con su propio tope, y un régimen distinto en jornales.',
    to: '/indemnizacion-por-despido-uruguay',
  },
  {
    label: 'Todo lo que no es sueldo',
    why: 'Horas extra, nocturnidad, presentismo, antigüedad y las partidas del laudo de cada grupo son materia gravada y por lo tanto suman el 12,625 %, pero no están en esta cuenta porque no salen del nominal.',
    to: '/horas-extras-uruguay',
  },
])
