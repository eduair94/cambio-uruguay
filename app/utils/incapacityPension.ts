// app/utils/incapacityPension.ts
// Lo que paga el BPS a quien se incapacita trabajando: el subsidio transitorio por incapacidad
// parcial y la jubilación por incapacidad total.
//
// POR QUÉ EXISTE. El sitio tiene el racimo del BPS casi entero —cuándo me puedo jubilar, la fecha
// de cobro, el suplemento solidario, la pensión a la vejez, la pensión por sobrevivencia,
// reconocer años trabajados, desvincularse de la AFAP, el IASS, los certificados— y la palabra
// «incapacidad» no aparecía en NINGUNA entrada de `siteNav.ts` ni de `searchIndex.ts`. La
// prestación que se pide justo cuando se deja de poder trabajar no tenía página. Lo que el sitio
// ya cubría es lo de al lado y no es esto: `/accidente-de-trabajo-uruguay` es la renta del BSE por
// un accidente laboral, la guía del subsidio por enfermedad es la licencia médica que se cobra
// mientras dura, y la pensión por invalidez NO CONTRIBUTIVA vive en `/pension-a-la-vejez-uruguay`
// porque el BPS la liquida en la misma fila de su tabla de montos.
//
// LAS CUATRO COSAS QUE SE LEEN MAL, Y LAS CUATRO ESTÁN EN LA NORMA O EN LA FICHA OFICIAL:
//
//  1. NO ES UNA VÍA PARA JUBILARSE ANTES. La causal por incapacidad «opera exclusivamente en
//     aquellos casos en que la persona afiliada no reúna los requisitos de edad y tiempo de
//     servicios necesarios para configurar otra causal jubilatoria» (Ley 20.130, art. 41), y el
//     subsidio transitorio corre «hasta que los reúnan» (art. 49, num. 1). La ficha del BPS lo
//     pone como primer requisito. Quien ya tiene causal común no entra por acá.
//  2. EL RÉGIMEN NO LO DECIDE TU AÑO DE NACIMIENTO, LO DECIDE LA FECHA EN QUE PEDÍS LA COBERTURA.
//     Para la jubilación normal la Ley 20.130 parte el mundo por año de nacimiento (art. 35); para
//     estas dos prestaciones dice lo contrario: «El régimen aplicable se determinará en función de
//     la fecha en que sea solicitada la cobertura cualquiera fuera la oportunidad de ingreso al
//     mercado de trabajo» (art. 6, num. 3). La ficha del BPS lo traduce a una sola línea: alcanza
//     a los afiliados de cualquier régimen que soliciten amparo después del 1/8/2023.
//  3. EL SUELDO BÁSICO JUBILATORIO NO SE CALCULA IGUAL QUE EN UNA JUBILACIÓN COMÚN. La común
//     promedia «los veinte años de mayores asignaciones computables» (art. 44, num. 1); en la
//     jubilación por incapacidad total se toma «el promedio actualizado del período computable
//     efectivamente registrado en la historia laboral» (art. 44, num. 6). A quien se incapacita a
//     los 30 no se le exige un promedio de veinte años que no pudo tener.
//  4. SÓLO UNA DE LAS DOS TIENE PISO ESCRITO. El art. 50 le pone al subsidio transitorio un «monto
//     mínimo igual a la prestación no contributiva por invalidez y vejez (artículo 170)»; el
//     art. 48, que fija la jubilación por incapacidad total, no escribe ninguno —nombra el
//     suplemento solidario, que es otra prestación y se pide aparte—.
//
// LO QUE DELIBERADAMENTE NO SE PUBLICA (ver `INCAPACITY_UNPUBLISHED`): el 65 % del sueldo básico
// del régimen viejo, el baremo, cuánto demora el BPS, un piso para la jubilación por incapacidad
// total y cuánto va a cobrar una persona concreta.
//
// FUENTES, cotejadas el 2026-10-13 contra bps.gub.uy e impo.com.uy (lista en INCAPACITY_SOURCES).
//
// MÓDULO PURO (sin Vue/Nuxt) para que vitest-node lo cargue con imports relativos.

import { PENSION_VEJEZ_INVALIDEZ_2026 } from './bpsFigures2026'

/** Fecha en la que se cotejó todo este archivo contra las fuentes oficiales. */
export const INCAPACITY_VERIFIED_AT = '2026-10-13'

/** La ruta de la página, en un solo lugar. */
export const INCAPACITY_PATH = '/jubilacion-por-incapacidad-uruguay'

/**
 * El día desde el que rige el capítulo de incapacidad de la Ley 20.130.
 *
 * La ley se publicó el 10/05/2023 y su regla de principio es «el primer día del tercer mes
 * siguiente al de su publicación» (art. 6, num. 1), al que el num. 3 remite para estas dos
 * prestaciones. La ficha del BPS lo dice con esta misma fecha.
 */
export const INCAPACITY_REGIME_START = '2023-08-01'

export interface IncapacitySource {
  readonly id: string
  readonly label: string
  readonly url: string
  /** La fecha que la propia fuente muestra como última actualización, cuando la muestra. */
  readonly updatedAt?: string
}

const BPS_TOTAL = 'https://www.bps.gub.uy/3501/jubilacion-por-incapacidad-total.html'
const BPS_PARCIAL = 'https://www.bps.gub.uy/9780/subsidio-transitorio-por-incapacidad-parcial.html'
const BPS_EVALUACION = 'https://www.bps.gub.uy/11446/evaluacion-de-incapacidad.html'
const BPS_MONTOS = 'https://www.bps.gub.uy/6182/'
const LEY_20130 = 'https://www.impo.com.uy/bases/leyes/20130-2023'
const LEY_16713 = 'https://www.impo.com.uy/bases/leyes/16713-1995'
const DL_14407 = 'https://www.impo.com.uy/bases/decretos-ley/14407-1975'

export const INCAPACITY_SOURCES: readonly IncapacitySource[] = Object.freeze([
  {
    id: 'bps-total',
    label: 'BPS — Jubilación por incapacidad total',
    url: BPS_TOTAL,
    updatedAt: '2025-09-02',
  },
  {
    id: 'bps-parcial',
    label: 'BPS — Subsidio transitorio por incapacidad parcial',
    url: BPS_PARCIAL,
    updatedAt: '2026-04-13',
  },
  {
    id: 'bps-evaluacion',
    label: 'BPS — Evaluación de incapacidad (el trámite médico previo)',
    url: BPS_EVALUACION,
    updatedAt: '2025-12-29',
  },
  {
    id: 'bps-montos',
    label: 'BPS — Montos y aumentos de pasividades',
    url: BPS_MONTOS,
    updatedAt: '2026-02-09',
  },
  { id: 'ley-20130', label: 'Ley 20.130, de 2 de mayo de 2023', url: LEY_20130 },
  { id: 'ley-16713', label: 'Ley 16.713, de 3 de setiembre de 1995', url: LEY_16713 },
  {
    id: 'dl-14407',
    label: 'Decreto-Ley 14.407, art. 17 (los 180 días prejubilatorios)',
    url: DL_14407,
  },
])

/** Las dos prestaciones, una al lado de la otra: es la comparación que la página existe para dar. */
export interface IncapacityBenefit {
  readonly id: 'parcial' | 'total'
  readonly label: string
  /** Qué grado de incapacidad hay que tener dictaminado. */
  readonly degree: string
  /** Cuánto dura. */
  readonly duration: string
  /** Cómo se calcula el monto, sin inventar el resultado. */
  readonly amount: string
  /** El piso legal, cuando la norma escribe uno. */
  readonly floor: string | null
  readonly sourceId: string
}

export const INCAPACITY_BENEFITS: readonly IncapacityBenefit[] = Object.freeze([
  {
    id: 'parcial',
    label: 'Subsidio transitorio por incapacidad parcial',
    degree:
      'Incapacidad absoluta y permanente para el empleo o la profesión habitual, dictaminada por los servicios médicos del BPS. Es una prestación de actividad, no una pasividad.',
    duration:
      'Hasta 3 años, contados desde la fecha de la incapacidad o desde que vence la cobertura del subsidio por enfermedad, o hasta que se reúnan los requisitos de edad y servicios de otra causal jubilatoria. Antes de que termine hay un nuevo dictamen.',
    amount:
      'Sueldo básico jubilatorio por la tasa de adquisición de derechos que habría correspondido si la persona hubiera seguido en actividad con densidad completa hasta configurar causal, considerando una edad mínima de 65 años (Ley 20.130, arts. 44 a 46 y 50).',
    floor:
      'Sí: el mismo monto que la prestación no contributiva por invalidez y vejez (Ley 20.130, art. 50).',
    sourceId: 'bps-parcial',
  },
  {
    id: 'total',
    label: 'Jubilación por incapacidad total',
    degree:
      'Incapacidad absoluta y permanente para todo trabajo, dictaminada por los servicios médicos del BPS.',
    duration:
      'Vitalicia, sujeta a controles de incompatibilidad. El BPS la declara incompatible con cualquier actividad.',
    amount:
      'La misma construcción que el subsidio, con la tasa del art. 46 según la edad proyectada y un mínimo de 65 años (Ley 20.130, art. 48). Si los años a computar no llegan a los mínimos del art. 35, se usa la tasa de los 70 años con 15 años de servicios.',
    floor: null,
    sourceId: 'bps-total',
  },
])

/**
 * El piso del subsidio transitorio, en pesos.
 *
 * El art. 50 no escribe un importe: manda al monto de la prestación no contributiva por invalidez y
 * vejez (art. 170), cuyo valor inicial era de $ 13.838 en 2023 y se ajusta por el artículo 67 de la
 * Constitución. El valor corriente lo publica el BPS en su tabla de montos, en la fila «Pensión
 * vejez e invalidez», que es la MISMA constante que ya usa `/pension-a-la-vejez-uruguay`: por eso
 * se importa de `bpsFigures2026` y no se vuelve a escribir acá.
 */
export const INCAPACITY_SUBSIDY_FLOOR = PENSION_VEJEZ_INVALIDEZ_2026

/** El monto inicial que la propia ley le puso a esa prestación, con su año. */
export const INCAPACITY_FLOOR_LAW_AMOUNT = 13_838
export const INCAPACITY_FLOOR_LAW_YEAR = 2023

/** El plazo máximo del subsidio transitorio, en años (Ley 20.130, art. 49, num. 2). */
export const INCAPACITY_SUBSIDY_MAX_YEARS = 3

/**
 * La tasa de adquisición de derechos del art. 46, lit. B), en los dos únicos puntos que esta
 * página necesita: los 65 años que el art. 48 manda considerar como mínimo, y los 70 de la regla
 * de respaldo para quien no llega a los mínimos de servicios del art. 35.
 */
export const INCAPACITY_RATE_AT_65_PCT = 1.5
export const INCAPACITY_RATE_AT_70_PCT = 1.96
/** Los años de servicios de esa misma regla de respaldo. */
export const INCAPACITY_FALLBACK_YEARS = 15

/**
 * El porcentaje del sueldo básico jubilatorio que sale de la regla de respaldo del art. 48.
 *
 * Es la multiplicación de los dos números que el propio artículo nombra (la tasa de los 70 años
 * por quince años de servicios), no una cifra que publique el BPS: la página la presenta como la
 * cuenta que es.
 */
export const incapacityFallbackShare = (): number =>
  Math.round(INCAPACITY_RATE_AT_70_PCT * INCAPACITY_FALLBACK_YEARS * 100) / 100

/** Los mínimos de actividad, que son el requisito que más se pregunta. */
export interface IncapacityServiceRule {
  readonly id: string
  readonly label: string
  readonly detail: string
  /** A cuál de las dos prestaciones se le aplica. */
  readonly appliesTo: 'ambas' | 'total'
}

export const INCAPACITY_SERVICE_RULES: readonly IncapacityServiceRule[] = Object.freeze([
  {
    id: 'hasta-25',
    label: 'Hasta 25 años de edad: 6 meses de actividad',
    detail:
      'El mínimo baja a seis meses para los trabajadores de hasta 25 años, en las dos prestaciones.',
    appliesTo: 'ambas',
  },
  {
    id: 'mas-de-25',
    label: 'Más de 25 años de edad: 2 años de actividad',
    detail: 'Es el caso general: dos años de servicios reconocidos en la historia laboral.',
    appliesTo: 'ambas',
  },
  {
    id: 'laboral',
    label: 'Si la incapacidad vino del trabajo: ningún mínimo',
    detail:
      'Cuando la incapacidad sobreviene por causa o en ocasión del trabajo no se exige un mínimo de años de actividad, cualquiera sea el tiempo trabajado.',
    appliesTo: 'ambas',
  },
  {
    id: 'despues-del-cese',
    label: 'Si la incapacidad llegó después del cese: 10 años',
    detail:
      'Diez años de actividad, que deben ser su única pasividad, y hay que probar residencia en el país desde la fecha del cese. Esta puerta es sólo de la jubilación por incapacidad total.',
    appliesTo: 'total',
  },
])

/**
 * El mínimo de actividad que le toca a una edad, en meses.
 *
 * Devuelve `null` ante una edad que no se puede leer: no se adivina el requisito de un dato que no
 * es un número entero no negativo.
 */
export function incapacityServiceMonthsForAge(age: number): number | null {
  if (!Number.isInteger(age) || age < 0) return null
  return age <= 25 ? 6 : 24
}

/** Los complementos que se suman al monto, con su porcentaje y su condición. */
export interface IncapacityComplement {
  readonly id: string
  readonly percent: number
  readonly label: string
  readonly appliesTo: 'ambas' | 'total'
}

export const INCAPACITY_COMPLEMENTS: readonly IncapacityComplement[] = Object.freeze([
  {
    id: 'hijos',
    percent: 20,
    label: 'Con uno o más hijos a cargo que cumplan alguna de las condiciones de edad o estudio.',
    appliesTo: 'ambas',
  },
  {
    id: 'dependencia-severa',
    percent: 25,
    label:
      'Si la persona titular está en situación de dependencia severa. Es un complemento de la jubilación por incapacidad total.',
    appliesTo: 'total',
  },
])

/** Las condiciones de los hijos que habilitan el complemento del 20 %, como las publica el BPS. */
export const INCAPACITY_CHILD_CONDITIONS: readonly string[] = Object.freeze([
  'Menor de 18 años de edad.',
  'Entre 18 y 21 años, sin medios de vida propios y suficientes.',
  'Mayor de 21 años, absolutamente incapacitado y sin medios de vida propios y suficientes.',
  'Entre 21 y 23 años, cursando estudios terciarios de manera habitual y sin medios de vida propios y suficientes.',
])

/** Lo que pide el trámite de evaluación de incapacidad, que es el primer paso de los dos. */
export const INCAPACITY_EVALUATION_DOCS: readonly string[] = Object.freeze([
  'Historia clínica de los últimos dos años, o de los últimos tres para el subsidio transitorio por incapacidad parcial. No se le exige a quien fue declarado incapaz judicialmente ni a los pacientes de Crenadecer del BPS.',
  'Consentimiento informado, que lo entrega el BPS, completo y firmado.',
  'Cédula de identidad vigente y en buen estado del titular y del apoderado, si lo hubiera.',
  'Formulario de solicitud de prestación, que también se consigue en la sucursal más cercana.',
])

/**
 * El plazo de la revisión, que es el único plazo que el BPS publica en todo el trámite.
 *
 * Se cuenta hacia atrás desde el vencimiento de la prestación, así que es un plazo que se pierde
 * por no mirar el calendario.
 */
export const INCAPACITY_REVIEW_LEAD_DAYS = 180

/** Los 180 días prejubilatorios del Decreto-Ley 14.407, art. 17. */
export const INCAPACITY_PREJUBILATORIO = Object.freeze({
  days: 180,
  /** Tope de la cuota mensual con la que se descuenta el saldo deudor del adelanto. */
  maxMonthlyDeductionPct: 10,
})

/** Qué pasa con el control médico una vez que la prestación está en curso. */
export const INCAPACITY_CONTROLS: readonly string[] = Object.freeze([
  'El BPS fija cuándo se hace el examen definitivo y si hay que presentarse a exámenes médicos periódicos.',
  'La ausencia no justificada a esos exámenes suspende la prestación de inmediato.',
  'La prestación también deja de servirse si en un examen se constata que la incapacidad cesó.',
  'Si dentro de los tres años la incapacidad pasa a ser absoluta y permanente para todo trabajo, el subsidio se convierte en jubilación por incapacidad total.',
])

/** Lo que esta página no publica, y por qué. Cada línea es una abstención deliberada. */
export interface IncapacityUnpublished {
  readonly id: string
  readonly what: string
  readonly why: string
}

export const INCAPACITY_UNPUBLISHED: readonly IncapacityUnpublished[] = Object.freeze([
  {
    id: 'sesenta-y-cinco-por-ciento',
    what: 'El «65 % del sueldo básico jubilatorio» que circula en todos los resúmenes.',
    why: 'Es la tasa del régimen anterior a la Ley 20.130. La ficha del BPS de hoy describe otra cosa: una tasa de adquisición de derechos proyectada. Publicar el 65 % sería publicar una cifra vieja como vigente.',
  },
  {
    id: 'baremo',
    what: 'El porcentaje de baremo con el que los médicos del BPS miden la incapacidad.',
    why: 'La ficha del trámite de evaluación no publica ningún baremo, tabla ni criterio, y el porcentaje que circula es el de otra prestación y de otro organismo.',
  },
  {
    id: 'demora',
    what: 'Cuánto demora el BPS en resolver.',
    why: 'Ninguna de las dos fichas publica un plazo de resolución. El único plazo publicado es el de la revisión, y va al revés: se pide desde 180 días antes del vencimiento.',
  },
  {
    id: 'piso-de-la-total',
    what: 'Un piso en pesos para la jubilación por incapacidad total.',
    why: 'El art. 50 le escribe un mínimo al subsidio transitorio; el art. 48 no le escribe ninguno a la jubilación. La tabla del BPS trae un mínimo de pasividades y un mínimo inicial para las causales de la Ley 16.713, pero no dice cómo se aplican a esta causal, así que acá no se los presenta como su piso.',
  },
  {
    id: 'cuanto-cobro',
    what: 'Cuánto va a cobrar una persona concreta.',
    why: 'El monto sale del sueldo básico jubilatorio de su propia historia laboral y de los años que el BPS le proyecte. Se publica la fórmula y de qué es el porcentaje, no un resultado.',
  },
])

export interface IncapacityFaq {
  readonly id: string
  readonly question: string
  readonly answer: string
}

export const INCAPACITY_FAQ: readonly IncapacityFaq[] = Object.freeze([
  {
    id: 'cuanto-dura',
    question: '¿Cuánto dura el subsidio transitorio por incapacidad parcial?',
    answer:
      'Hasta tres años, contados desde la fecha de la incapacidad o desde que vence la cobertura del subsidio por enfermedad, o hasta que se reúnan los requisitos de edad y servicios de otra causal jubilatoria (Ley 20.130, art. 49). Antes de que termine, el BPS hace un nuevo dictamen: si la incapacidad pasó a ser total y no hay otra causal, la prestación se convierte en jubilación por incapacidad total.',
  },
  {
    id: 'minimo',
    question: '¿Hay un mínimo de cuánto se puede cobrar?',
    answer:
      'El subsidio transitorio tiene un piso escrito en la ley: no puede ser menor que la prestación no contributiva por invalidez y vejez (Ley 20.130, art. 50), que el BPS publica en su tabla de montos en $ 18.575 para 2026. La jubilación por incapacidad total no tiene un mínimo escrito en su artículo; lo que la ley nombra al lado es el suplemento solidario, que es otra prestación y se pide aparte.',
  },
  {
    id: 'cuantos-anos-de-aportes',
    question: '¿Cuántos años de aportes piden?',
    answer:
      'Dos años de actividad si tenés más de 25, y seis meses si tenés hasta 25. Si la incapacidad vino por causa o en ocasión del trabajo no se exige ningún mínimo. Y si llegó después del cese, la jubilación por incapacidad total pide diez años de actividad, que sea tu única pasividad y que pruebes residencia en el país desde el cese.',
  },
  {
    id: 'ya-tengo-causal',
    question: '¿Sirve para jubilarme antes si ya tengo los años?',
    answer:
      'No. La causal por incapacidad opera exclusivamente cuando la persona no reúne los requisitos de edad y tiempo de servicios para configurar otra causal jubilatoria (Ley 20.130, art. 41), y el subsidio transitorio se paga hasta que esos requisitos se reúnan. Es el primer requisito que pone la ficha del BPS.',
  },
  {
    id: 'que-regimen',
    question: '¿Me rige la ley vieja o la Ley 20.130?',
    answer:
      'En estas dos prestaciones el régimen lo decide la fecha en que pedís la cobertura, no tu año de nacimiento: la Ley 20.130 lo dice en su artículo 6, numeral 3, y la ficha del BPS alcanza a los afiliados de cualquier régimen que soliciten amparo después del 1/8/2023. Es al revés que en la jubilación común, donde el año de nacimiento parte la tabla.',
  },
  {
    id: 'bse',
    question: '¿Se puede cobrar junto con la renta del Banco de Seguros?',
    answer:
      'Sí. Las rentas por incapacidad permanente o muerte de la Ley 16.074 —las del seguro de accidentes de trabajo— son íntegramente compatibles con las jubilaciones y pensiones que pagan las entidades de seguridad social (Ley 20.130, art. 41, último inciso).',
  },
  {
    id: 'mientras-se-resuelve',
    question: '¿Qué cobro mientras el BPS resuelve?',
    answer:
      'Si la Junta Médica del Servicio de Certificaciones Médicas de ASSE te declara imposibilitado para tu empleo, ASSE sigue pagando el subsidio por enfermedad por hasta 180 días contados desde ese dictamen, con carácter de adelanto: después se descuenta de la primera liquidación y el saldo se cobra en cuotas que no pueden pasar del 10 % del beneficio (Decreto-Ley 14.407, art. 17). Dentro de esos 180 días te tienen que examinar los servicios médicos del BPS, y si los dos dictámenes no coinciden decide un tribunal médico de ASSE, BPS y MSP.',
  },
])
