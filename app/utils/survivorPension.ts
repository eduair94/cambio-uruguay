// app/utils/survivorPension.ts
// La pensión por sobrevivencia del BPS: la que cobran la viuda, el viudo, la concubina, los hijos
// o los padres de quien fallece.
//
// POR QUÉ EXISTE. El sitio tiene el racimo del BPS entero —cuándo me puedo jubilar, la fecha de
// cobro, el suplemento solidario, la pensión a la vejez, reconocer años trabajados, desvincularse
// de la AFAP, el IASS, los certificados— y le faltaba justamente la prestación que se pide en el
// peor momento y con menos tiempo para leer. La pensión a la vejez (que el sitio ya cubre) es el
// piso de quien NO generó jubilación; ésta es otra cosa: la genera el trabajo del que falleció.
//
// EL ÁNGULO: LA FECHA DE FALLECIMIENTO PARTE EL TEMA EN DOS Y CASI NADIE LO DICE. Desde el
// 1/8/2023 rige la Ley 20.130, que DEROGÓ los artículos 25 y 26 de la Ley 16.713 (Ley 20.130,
// art. 74). Lo que sigue vigente para una pensión generada hasta el 31/7/2023 es el régimen que
// estaba en pie el día de la causal (Ley 20.130, art. 53), así que las dos tablas conviven y el
// BPS las publica en DOS páginas distintas. Una respuesta que no empieza preguntando la fecha del
// fallecimiento está contestando la mitad de las veces el régimen equivocado.
//
// LAS TRES COSAS QUE ESTA PÁGINA CONTESTA Y QUE SE LEEN MAL:
//
//  1. EL PLAZO LO DECIDE LA EDAD QUE TENÍA EL BENEFICIARIO EL DÍA DEL FALLECIMIENTO, no la que
//     tiene hoy ni la que tenga cuando hace el trámite. Lo dice literal el Decreto 229/023,
//     art. 17: «a la fecha de fallecimiento del causante». Cumplir 40 después no convierte una
//     pensión de 5 años en vitalicia.
//  2. LOS 40 JUSTOS. La tabla del propio BPS dice «mayores de 40 años de edad», que leída al pie
//     de la letra deja afuera a quien tiene 40 exactos y lo manda al tramo de 5 años. El decreto
//     dice «40 (cuarenta) o más años de edad», o sea que los 40 justos son vitalicios. Se publica
//     la norma y se avisa de la diferencia: es una redacción del resumen, no una regla distinta.
//  3. LA VITALICIA NO ES SÓLO POR EDAD. El mismo art. 17, inciso 2.º, la da a cualquier edad si
//     la persona estaba total y absolutamente incapacitada al momento del fallecimiento, o si en
//     el núcleo familiar hay hijos absolutamente incapacitados sin medios de sustentación. Es el
//     dato que no aparece en ninguna tabla de plazos y le cambia el resultado a quien más lo
//     necesita.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA:
//   - CUÁNTO VA A COBRAR UNA PERSONA. El haber base es un porcentaje del «sueldo básico de
//     pensión», que es la jubilación que percibía el causante o la que le hubiera correspondido
//     (Decreto 229/023, art. 24). Esa cifra es de la historia laboral de otra persona y esta
//     página no la tiene; se publica el porcentaje y de qué es el porcentaje, no un resultado.
//   - EL ABATIMIENTO DEL ART. 26 DEL DECRETO. Existe —la asignación se recorta cuando los otros
//     ingresos pasan cierto monto— pero el umbral nominal del texto es de 2023 y el BPS no lo
//     publica actualizado en su tabla de montos. Se nombra la regla sin número.
//   - EL INCREMENTO POR NÚCLEO FAMILIAR DEL RÉGIMEN ANTERIOR. El BPS dice que existe y no publica
//     su porcentaje en la página del régimen viejo. Se dice que existe, no cuánto es.
//
// FUENTES, cotejadas el 2026-10-11 contra bps.gub.uy e impo.com.uy (lista en SURVIVOR_SOURCES).
//
// MÓDULO PURO (sin Vue/Nuxt) para que vitest-node lo cargue con imports relativos.

/** Fecha en la que se cotejó todo este archivo contra las fuentes oficiales. */
export const SURVIVOR_VERIFIED_AT = '2026-10-11'

/**
 * El día desde el que rige la Ley 20.130. Una pensión se rige por el régimen vigente a la fecha
 * del fallecimiento, desaparición o ausencia (Ley 20.130, art. 53).
 */
export const SURVIVOR_REGIME_CUTOFF = '2023-08-01'

/** Último día del régimen anterior, el que el BPS publica en su otra página. */
export const SURVIVOR_PREVIOUS_REGIME_END = '2023-07-31'

export interface SurvivorSource {
  readonly id: string
  readonly label: string
  readonly url: string
  /** La fecha que la propia fuente muestra como última actualización, cuando la muestra. */
  readonly updatedAt?: string
}

const BPS_NEW =
  'https://www.bps.gub.uy/20538/pension-por-sobrevivencia-generada-desde-el-1_8_2023.html'
const BPS_OLD =
  'https://www.bps.gub.uy/3506/pension-por-sobrevivencia-generada-hasta-el-31_7_2023.html'
const BPS_MONTOS = 'https://www.bps.gub.uy/6182/'
const DECRETO_229 = 'https://www.impo.com.uy/bases/decretos/229-2023'
const LEY_20130 = 'https://www.impo.com.uy/bases/leyes/20130-2023'
const LEY_16713_ART_26 = 'https://www.impo.com.uy/bases/leyes/16713-1995/26'

export const SURVIVOR_SOURCES: readonly SurvivorSource[] = Object.freeze([
  {
    id: 'bps-nueva',
    label: 'BPS — Pensión por sobrevivencia generada desde el 1/8/2023',
    url: BPS_NEW,
    updatedAt: '2025-12-03',
  },
  {
    id: 'bps-anterior',
    label: 'BPS — Pensión por sobrevivencia generada hasta el 31/7/2023',
    url: BPS_OLD,
    updatedAt: '2025-09-02',
  },
  {
    id: 'bps-montos',
    label: 'BPS — Montos y aumentos de pasividades',
    url: BPS_MONTOS,
    updatedAt: '2026-02-09',
  },
  {
    id: 'decreto-229',
    label: 'Decreto 229/023, reglamentación del capítulo de pensiones de sobrevivencia',
    url: DECRETO_229,
  },
  { id: 'ley-20130', label: 'Ley 20.130, de 2 de mayo de 2023', url: LEY_20130 },
  {
    id: 'ley-16713-26',
    label: 'Ley 16.713, art. 26 (derogado por la Ley 20.130, art. 74)',
    url: LEY_16713_ART_26,
  },
])

/** Los tramos de plazo de la pensión de viudez y equiparadas, por edad al fallecimiento. */
export interface SurvivorTerm {
  readonly id: string
  /** Edad mínima del tramo, al día del fallecimiento del causante. */
  readonly fromAge: number
  /** Edad máxima del tramo, o `null` si no tiene techo. */
  readonly toAge: number | null
  /** Cuántos años se sirve, o `null` si es vitalicia. */
  readonly years: number | null
  readonly label: string
}

/**
 * Decreto 229/023, art. 17, literales A), B) y C).
 *
 * El orden es de menor a mayor edad porque así se lee la pregunta («tenía 28, ¿cuánto cobro?»), no
 * el del decreto, que arranca por los vitalicios.
 */
export const SURVIVOR_TERMS: readonly SurvivorTerm[] = Object.freeze([
  { id: 'menor-30', fromAge: 0, toAge: 29, years: 2, label: '2 años' },
  { id: '30-39', fromAge: 30, toAge: 39, years: 5, label: '5 años' },
  { id: '40-o-mas', fromAge: 40, toAge: null, years: null, label: 'Durante toda su vida' },
])

/**
 * El plazo que le corresponde a una edad al día del fallecimiento.
 *
 * Devuelve `null` para una edad que no es un número entero no negativo: no se adivina el tramo de
 * un dato que no se puede leer.
 */
export function survivorTermForAge(age: number): SurvivorTerm | null {
  if (!Number.isInteger(age) || age < 0) return null
  return (
    SURVIVOR_TERMS.find(
      term => age >= term.fromAge && (term.toAge === null || age <= term.toAge)
    ) ?? null
  )
}

/** Los casos en que la pensión de viudez es vitalicia sin mirar la edad (art. 17, inciso 2.º). */
export const SURVIVOR_LIFELONG_CASES: readonly string[] = Object.freeze([
  'La persona beneficiaria estaba total y absolutamente incapacitada para todo trabajo. La incapacidad se evalúa al momento del fallecimiento del causante, no después.',
  'En el núcleo familiar hay hijos del causante o de la persona beneficiaria absolutamente incapacitados para todo trabajo y sin medios suficientes para su congrua sustentación.',
  'El fallecimiento fue en acto de servicio o en ocasión de este, en el ámbito del Servicio de Retiros y Pensiones de las Fuerzas Armadas o de la Dirección Nacional de Asistencia y Seguridad Social Policial.',
])

/** El período de amparo de los demás beneficiarios, tal como lo publica el BPS. */
export interface SurvivorPeriodRow {
  readonly id: string
  readonly beneficiary: string
  readonly period: string
}

export const SURVIVOR_OTHER_PERIODS: readonly SurvivorPeriodRow[] = Object.freeze([
  {
    id: 'hijos',
    beneficiary: 'Hijos menores de 21 años de edad',
    period:
      'Hasta el cumplimiento de 21 años, o hasta los 23 años en caso de cursar estudios terciarios de manera habitual',
  },
  {
    id: 'hijos-incapacidad',
    beneficiary: 'Hijos con incapacidad',
    period:
      'Durante toda su vida, salvo que recupere la capacidad antes de cumplir 45 años de edad',
  },
  {
    id: 'padres-incapacidad',
    beneficiary: 'Padres o madres con incapacidad',
    period:
      'Durante toda su vida, salvo que recupere la capacidad antes de cumplir 45 años de edad',
  },
])

/** Los porcentajes del sueldo básico de pensión (Decreto 229/023, art. 25). */
export interface SurvivorShare {
  readonly id: string
  readonly percent: number
  readonly when: string
}

export const SURVIVOR_SHARES: readonly SurvivorShare[] = Object.freeze([
  {
    id: 'solo-viudas-o-hijos',
    percent: 66,
    when: 'Si cobran exclusivamente personas viudas, concubinos o hijos del causante.',
  },
  {
    id: 'concurrencia',
    percent: 75,
    when: 'Si concurren personas viudas, concubinas, divorciadas o padres junto con hijos del causante.',
  },
  {
    id: 'solo-divorciadas-o-padres',
    percent: 50,
    when: 'Si cobran exclusivamente personas divorciadas o los padres del causante.',
  },
])

/**
 * El mínimo de las pensiones por sobrevivencia del año, de la tabla de montos del BPS.
 *
 * Va con sus exclusiones porque sin ellas el número dice otra cosa: no es un piso universal.
 */
export const SURVIVOR_MINIMUM_YEAR = 2026
export const SURVIVOR_MINIMUM_AMOUNT = 20_935
export const SURVIVOR_MINIMUM_EXCLUSIONS =
  'Se excluyen los pensionistas que integren hogares cuyos ingresos promedio por todo concepto superen 3,05 BPC y los pensionistas menores de 65 años.'

/** Los topes de ingresos del beneficiario, régimen desde el 1/8/2023 (tabla de montos del BPS). */
export interface SurvivorIncomeCap {
  readonly id: string
  readonly label: string
  readonly amount: number
}

export const SURVIVOR_INCOME_CAPS: readonly SurvivorIncomeCap[] = Object.freeze([
  {
    id: 'viudas-derecho-directo',
    label: 'Personas viudas, para generar derechos directos',
    amount: 20_672,
  },
  {
    id: 'viudo-interdependencia',
    label: 'Viudo o concubino acreditando interdependencia económica',
    amount: 201_346,
  },
  { id: 'padres-carencia', label: 'Padres, para considerar carencia', amount: 18_574 },
])

/**
 * El tope de la viuda o concubina que acredita interdependencia económica, que el BPS publica
 * POR FECHA DE FALLECIMIENTO y no por año en curso: el tramo lo fija el día de la causal.
 */
export interface SurvivorWidowCap {
  readonly from: string
  readonly to: string
  readonly amount: number
}

export const SURVIVOR_WIDOW_CAPS: readonly SurvivorWidowCap[] = Object.freeze([
  { from: '2023-08-01', to: '2023-12-31', amount: 236_113 },
  { from: '2024-01-01', to: '2024-07-31', amount: 256_607 },
  { from: '2024-08-01', to: '2024-12-31', amount: 248_850 },
  { from: '2025-01-01', to: '2025-07-31', amount: 264_104 },
  { from: '2025-08-01', to: '2025-12-31', amount: 255_870 },
  { from: '2026-01-01', to: '2026-07-31', amount: 271_146 },
  { from: '2026-08-01', to: '2026-12-31', amount: 262_421 },
])

/** El último tramo publicado de esa serie. */
export const survivorLatestWidowCap = (): SurvivorWidowCap =>
  SURVIVOR_WIDOW_CAPS[SURVIVOR_WIDOW_CAPS.length - 1]!

/** Las condiciones, con la fuente que pide cada una. */
export interface SurvivorRequirement {
  readonly id: string
  readonly label: string
  readonly detail: string
  readonly sourceId: string
}

export const SURVIVOR_REQUIREMENTS: readonly SurvivorRequirement[] = Object.freeze([
  {
    id: 'matrimonio',
    label: 'Matrimonio: 2 años de vínculo si no hay hijos en común',
    detail:
      'Con hijos en común con el causante no se exige antigüedad del vínculo. Sin hijos en común, deben haber estado vinculados por al menos 2 años.',
    sourceId: 'bps-nueva',
  },
  {
    id: 'concubinato',
    label: 'Concubinato: 5 años de vínculo',
    detail:
      'El plazo del concubinato no tiene la excepción por hijos en común que tiene el matrimonio: el BPS pide por lo menos 5 años de vínculo.',
    sourceId: 'bps-nueva',
  },
  {
    id: 'divorcio',
    label: 'Divorcio: pensión alimenticia congrua y 2 años de vínculo',
    detail:
      'La persona divorciada genera derecho si tiene pensión alimenticia congrua; sin hijos en común con el causante, también se le piden 2 años de vínculo.',
    sourceId: 'bps-nueva',
  },
  {
    id: 'servicios-causante',
    label: 'El causante: 2 años de servicios, o 6 meses si tenía menos de 25',
    detail:
      'Son 2 años de servicios como mínimo, o los 6 meses inmediatos previos al fallecimiento si el causante era menor de 25 años. Para la pensión de los padres el mínimo sube a 3 años.',
    sourceId: 'bps-nueva',
  },
  {
    id: 'accidente-laboral',
    label: 'Si murió por o en ocasión del trabajo, no se exige mínimo de servicios',
    detail:
      'El requisito de años de servicios del causante no se aplica cuando el fallecimiento fue por motivo o en ocasión del trabajo.',
    sourceId: 'bps-nueva',
  },
  {
    id: 'carencia',
    label: 'El beneficiario: carencia, dependencia o interdependencia económica',
    detail:
      'En todos los casos hay que probarla, y lo que se mira son los ingresos nominales de los últimos 12 meses contra los topes que el BPS publica y actualiza.',
    sourceId: 'bps-montos',
  },
])

/** Plazos y pérdida del derecho. */
export interface SurvivorDeadline {
  readonly id: string
  readonly label: string
  readonly detail: string
}

export const SURVIVOR_DEADLINES: readonly SurvivorDeadline[] = Object.freeze([
  {
    id: 'retroactividad',
    label: '180 días para que la pensión sea retroactiva',
    detail:
      'Si el trámite se inicia dentro de los 180 días del fallecimiento o la desaparición, el pago corre desde esa fecha. Después, desde la fecha de la solicitud: los meses del medio no se recuperan.',
  },
  {
    id: 'sin-plazo',
    label: 'No hay plazo para solicitarla',
    detail:
      'El derecho no caduca por dejar pasar el tiempo. Lo que se pierde al pasar los 180 días es la retroactividad, no la pensión.',
  },
  {
    id: 'cuatro-anos',
    label: 'Cuatro años por encima del tope cierran la puerta',
    detail:
      'Las personas viudas que superen el tope de ingresos por más de 4 años desde el fallecimiento, la desaparición o la suspensión por mejora de fortuna no tienen derecho a iniciar ni a reanudar el cobro.',
  },
  {
    id: 'suspension',
    label: 'Se suspende por mejora de fortuna y se puede reanudar',
    detail:
      'Si los ingresos de los últimos 12 meses pasan el tope, el cobro se suspende o se modifica; se puede reanudar si hay empeoramiento de la fortuna dentro de los 4 años siguientes.',
  },
])

export interface SurvivorFaq {
  readonly id: string
  readonly question: string
  readonly answer: string
}

export const SURVIVOR_FAQ: readonly SurvivorFaq[] = Object.freeze([
  {
    id: 'vitalicia',
    question: '¿La pensión por sobrevivencia es para toda la vida?',
    answer:
      'Depende de la edad que tenía la persona el día del fallecimiento: con 40 o más años es vitalicia, entre 30 y 39 se sirve 5 años y con menos de 30, 2 años (Decreto 229/023, art. 17). También es vitalicia a cualquier edad si la persona estaba absolutamente incapacitada para todo trabajo o si en el núcleo familiar hay hijos incapacitados sin medios de sustentación.',
  },
  {
    id: 'cumplir-40',
    question: '¿Cumplir 40 años después del fallecimiento la convierte en vitalicia?',
    answer:
      'No. El decreto fija el tramo por la edad «a la fecha de fallecimiento del causante», así que cumplir 40 más adelante no cambia el plazo que ya quedó determinado.',
  },
  {
    id: 'cuanto-se-cobra',
    question: '¿Cuánto se cobra de pensión por sobrevivencia?',
    answer:
      'El haber base es el 66 % del sueldo básico de pensión si cobran sólo personas viudas, concubinos o hijos; el 75 % si concurren con hijos del causante; y el 50 % si cobran sólo personas divorciadas o los padres (Decreto 229/023, art. 25). El sueldo básico de pensión es la jubilación que percibía el causante o la que le hubiera correspondido, así que el monto depende de su historia laboral.',
  },
  {
    id: 'minimo',
    question: '¿Hay un mínimo?',
    answer:
      'El BPS publica un mínimo de pensiones por sobrevivencia de $ 20.935 para 2026, y excluye de ese mínimo a los pensionistas menores de 65 años y a quienes integren hogares cuyos ingresos promedio superen 3,05 BPC.',
  },
  {
    id: 'antes-de-agosto-2023',
    question: '¿Qué pasa si el fallecimiento fue antes de agosto de 2023?',
    answer:
      'Rige el régimen anterior, no la Ley 20.130: el BPS lo publica en una página aparte y el período de amparo sigue el art. 26 de la Ley 16.713, que la Ley 20.130 derogó para las causales nuevas pero que gobierna las generadas hasta el 31/7/2023.',
  },
  {
    id: 'hijos',
    question: '¿Hasta cuándo cobran los hijos?',
    answer:
      'Hasta los 21 años, y hasta los 23 si al cumplir 21 (o al fallecimiento, si fuera posterior) acreditan que cursan estudios terciarios de manera habitual y no tienen ingresos o éstos son menores al valor de dos pensiones por vejez. Para mantenerla hay que presentar constancia anual de haber aprobado al menos dos materias.',
  },
])
