// Pensión a la vejez e invalidez (BPS), prestación no contributiva. Verificado el 2026-09-16
// contra https://www.bps.gub.uy/20540/pension-por-vejez.html,
// https://www.bps.gub.uy/20545/pension-por-invalidez.html,
// https://www.bps.gub.uy/6182/montos-y-aumentos-de-pasividades.html,
// https://www.bps.gub.uy/21159/asistencia-a-la-vejez.html y
// https://www.bps.gub.uy/23862/ajuste-definitivo-de-jubilaciones-y-pensiones-para-2026.html.
//
// SON DOS PRESTACIONES, NO UNA. El BPS las liquida en la misma fila de montos ("Pensión vejez e
// invalidez: $ 18.575") y por eso es fácil tratarlas como si fueran la misma, pero la vía por
// VEJEZ pide 70 años (65 con 7 años de cuidados) y la vía por INVALIDEZ no tiene edad mínima: la
// abre un dictamen médico del BPS. Publicar sólo la regla de edad de la vejez le dice a alguien
// de 45 años con una incapacidad total que tiene que esperar 25 años, que es exactamente al revés.
//
// Esta página NO es una calculadora: la carencia de recursos la evalúa el BPS caso por caso, con
// TODOS los ingresos del solicitante y de su núcleo familiar. Lo que sigue son las reglas que el
// BPS publica, no una estimación del monto que le tocaría a alguien.
import {
  AJUSTE_PASIVIDADES_2026_PCT,
  BPS_FIGURES_2026_UPDATED_AT,
  PENSION_VEJEZ_INVALIDEZ_2026,
} from './bpsFigures2026'
import type { FaqItem } from './faqAnswers'

export const PENSION_VERIFIED_AT = '2026-09-16'

// Las tres cifras del BPS de 2026 viven una sola vez en `bpsFigures2026.ts`: el BPS las reajusta
// todos los marzos y tenerlas copiadas en tres módulos es cómo una página se queda vieja sola.
/** "Pensión vejez e invalidez", BPS — Montos y aumentos de pasividades. */
export const AMOUNT_2026 = PENSION_VEJEZ_INVALIDEZ_2026
/** Fecha de "última actualización" que declara esa misma página. */
export const AMOUNT_UPDATED_AT = BPS_FIGURES_2026_UPDATED_AT
/** Ajuste general de jubilaciones y pensiones 2026 (BPS), pagado en marzo con retroactivo a enero. */
export const ADJUSTMENT_2026_PCT = AJUSTE_PASIVIDADES_2026_PCT

export interface AgeRequirement {
  /** Edad general para acceder a la pensión por vejez. */
  base: number
  /** Edad reducida para quien acredita cuidados. */
  caregiverFrom: number
  /** Años mínimos de dedicación al cuidado directo y no remunerado que exige la excepción. */
  caregiverYears: number
}

export const AGE_REQUIREMENT: AgeRequirement = {
  base: 70,
  caregiverFrom: 65,
  caregiverYears: 7,
}

export const CAREGIVER_DETAIL =
  'La excepción de los 65 años exige al menos 7 años dedicados al cuidado directo y no remunerado de hijos, hermanos, cónyuge o concubino, o padres, en todos los casos con discapacidad severa.'

export const RESIDENCY_RULE =
  'Residir en el país al menos 10 de los últimos 20 años. También califican los uruguayos que viven en Argentina o Brasil, a menos de 5 km de la frontera.'

export interface MeansTestRule {
  id: string
  title: string
  detail: string
}

/**
 * Las tres reglas de carencia de recursos de la VÍA POR VEJEZ, tal como las publica el BPS.
 * Ninguna se traduce a una fórmula en esta página a propósito: el BPS las evalúa con la
 * declaración jurada y la documentación de cada caso, no con una cuenta que un usuario pueda
 * reproducir solo. La vía por invalidez trata el ingreso propio distinto (ver `INVALIDITY_MEANS_TEST`).
 */
export const MEANS_TEST: readonly MeansTestRule[] = [
  {
    id: 'ingreso-propio',
    title: 'Tus propios ingresos',
    detail:
      'El BPS descuenta el 50 % de tus ingresos propios del monto de la pensión. Si esos ingresos superan el equivalente a dos pensiones a la vejez, se pierde el derecho a cobrarla.',
  },
  {
    id: 'nucleo-conviviente',
    title: 'Familiares obligados que conviven con vos',
    detail:
      'Si tenés familiares obligados a darte alimentos que conviven con vos, sus ingresos líquidos promedio deben ser menores a 4 BPC por persona; el excedente sobre ese límite se descuenta al 33 %.',
  },
  {
    id: 'familiares-no-convivientes',
    title: 'Familiares obligados que no conviven con vos',
    detail:
      'Los familiares obligados a darte alimentos que no conviven con vos tienen umbrales de ingresos de entre 10 y 13 BPC, según su estado civil y si tienen personas a cargo.',
  },
]

export const INCOMPATIBILITIES =
  'No podés configurar causal jubilatoria en el BPS ni en ningún otro organismo previsional: la pensión a la vejez es el piso para quien no tiene ninguna otra jubilación o pensión contributiva.'

// ---------------------------------------------------------------------------
// La otra vía: pensión por invalidez
// ---------------------------------------------------------------------------

/**
 * La pensión por invalidez es una PRESTACIÓN APARTE de la pensión a la vejez, con su propia ficha
 * en el BPS (https://www.bps.gub.uy/20545/pension-por-invalidez.html), y lo único que comparten
 * es el monto: el BPS las liquida en la misma fila, "Pensión vejez e invalidez".
 *
 * Lo que NO comparte es el requisito de edad. Acá no hay ninguno: lo que abre el derecho es un
 * dictamen médico del BPS sobre la incapacidad, no cumplir 70 años. Todo lo de abajo sale de esa
 * ficha; lo que la ficha no dice (cómo funciona la junta médica por dentro, si la prestación es
 * vitalicia) no se afirma acá: se remite al BPS.
 */
export const INVALIDITY_NAME = 'Pensión por invalidez'

/** El monto es el mismo: el BPS publica una sola fila "Pensión vejez e invalidez". */
export const INVALIDITY_AMOUNT_2026 = PENSION_VEJEZ_INVALIDEZ_2026

/** El hecho que corrige el error: la vía por invalidez NO tiene edad mínima. */
export const INVALIDITY_HAS_MIN_AGE = false

export const INVALIDITY_AGE_RULE =
  'La pensión por invalidez no tiene edad mínima. No hay que esperar a los 70 ni a los 65: lo que abre el derecho es la incapacidad total dictaminada por el BPS, a cualquier edad. Es la diferencia de fondo con la pensión a la vejez, que sí es una prestación por edad.'

export const INVALIDITY_EVALUATION =
  'Quien decide es el BPS, con una evaluación médica que determina el grado de incapacidad (el trámite se llama "Evaluación de incapacidad"). Ni un certificado de tu médico ni esta página reemplazan ese dictamen, y el BPS no publica el detalle de cómo trabaja esa junta: eso se pregunta en el BPS.'

export const INVALIDITY_RESIDENCY_RULE =
  'La misma que la vía por vejez: residir en el país al menos 10 de los últimos 20 años. Los menores de edad están exceptuados de ese requisito.'

export const INVALIDITY_MEANS_TEST =
  'Con discapacidad severa, el BPS NO pide prueba de carencia de recursos: el dictamen médico de incapacidad severa alcanza (Resolución de Directorio 32-30/2006). Por la vía de incapacidad común sí se evalúa la carencia de recursos, y el ingreso propio se trata distinto que en la pensión a la vejez: se descuenta el 33 % de lo que exceda el equivalente a tres pensiones, en lugar del 50 % desde el primer peso. Los umbrales del núcleo conviviente (4 BPC por persona) y de los familiares obligados no convivientes (10 a 13 BPC) son los mismos.'

export const INVALIDITY_LAPSE_RULE =
  'Igual que la pensión a la vejez: si no la cobrás durante tres meses consecutivos, la prestación se suspende.'

/** Las dos vías de acceso que distingue la ficha del BPS, y en qué se diferencian. */
export const INVALIDITY_ROUTES: readonly MeansTestRule[] = [
  {
    id: 'discapacidad-severa',
    title: 'Discapacidad severa',
    detail:
      'Con dictamen médico de incapacidad severa, el BPS otorga la pensión sin prueba de carencia de recursos, por la Resolución de Directorio 32-30/2006. Es la única vía en la que tus ingresos no entran en la decisión.',
  },
  {
    id: 'incapacidad-comun',
    title: 'Incapacidad común',
    detail:
      'Para el resto de las situaciones de incapacidad total, además del dictamen médico hay que acreditar carencia de recursos, con la misma lógica de declaración jurada y documentación que la vía por vejez.',
  },
]

/** La ficha del BPS de esta prestación: lo que esta página no dice, lo dice ahí. */
export const INVALIDITY_URL = 'https://www.bps.gub.uy/20545/pension-por-invalidez.html'

/** El trámite de evaluación médica del que depende todo lo anterior. */
export const INVALIDITY_EVALUATION_URL = 'https://www.bps.gub.uy/11446/'

export const LAPSE_RULE =
  'Si no cobrás la pensión durante tres meses consecutivos, los recibos caducan. Para volver a percibirla hay que acreditar en BPS la existencia y la permanencia en el país.'

export interface ComparisonRow {
  id: string
  name: string
  managedBy: string
  who: string
}

/** "No la confundas con…": la pensión a la vejez del BPS no es lo mismo que la asistencia a la
 * vejez del MIDES ni que una jubilación. Es, según el dossier, la confusión más común del tema. */
export const VS_OTHERS: readonly ComparisonRow[] = [
  {
    id: 'pension-vejez',
    name: 'Pensión a la vejez e invalidez',
    managedBy: 'BPS',
    who: 'No contributiva, para quien no tiene jubilación. Son dos vías con el mismo monto: por VEJEZ, para mayores de 70 años (65 con 7 años de cuidados); por INVALIDEZ, sin edad mínima, con incapacidad total dictaminada por el BPS. Las dos miran la carencia de recursos, salvo la discapacidad severa, que está exceptuada.',
  },
  {
    id: 'asistencia-vejez',
    name: 'Asistencia a la vejez',
    managedBy: 'MIDES',
    who: 'Programa de transferencia monetaria para personas de 65 a 69 años en situación de pobreza extrema o indigencia; cubre el tramo de edad anterior a la pensión del BPS.',
  },
  {
    id: 'jubilacion',
    name: 'Jubilación',
    managedBy: 'BPS',
    who: 'Contributiva: depende de los años de trabajo y edad aportados, no de una carencia de recursos.',
  },
]

export const APPLY_URL = 'https://www.bps.gub.uy/11430/'

export const PENSION_FAQ: readonly FaqItem[] = [
  {
    id: 'que-es',
    question: '¿Qué es la pensión a la vejez del BPS?',
    answer:
      'Es una prestación no contributiva del BPS para personas mayores que no tienen jubilación ni otra pasividad y no cuentan con recursos suficientes para vivir. En 2026 el monto es de $ 18.575 por mes.',
  },
  {
    id: 'a-quien-corresponde',
    question: '¿A quién le corresponde?',
    answer:
      'Por la vía de la vejez, a mayores de 70 años (o de 65 con al menos 7 años de cuidado directo y no remunerado de familiares con discapacidad severa) que residieron en el país al menos 10 de los últimos 20 años, no tienen jubilación y cumplen la carencia de recursos que evalúa el BPS. Por la vía de la invalidez no hay edad mínima: corresponde a quien tiene una incapacidad total dictaminada por el BPS, con el mismo requisito de residencia.',
  },
  {
    id: 'invalidez-edad',
    question: '¿Hay una edad mínima para la pensión por invalidez?',
    answer:
      'No. La pensión por invalidez es una prestación aparte de la pensión a la vejez y no pide ninguna edad: lo que abre el derecho es la incapacidad total dictaminada por el BPS, a cualquier edad. La regla de los 70 años (o 65 con cuidados) es de la pensión a la vejez, no de esta. Las dos cobran el mismo monto porque el BPS las publica en la misma fila, "Pensión vejez e invalidez".',
  },
  {
    id: 'invalidez-quien-decide',
    question: '¿Quién decide si tengo derecho a la pensión por invalidez?',
    answer:
      'El BPS, con una evaluación médica que determina el grado de incapacidad; el trámite se llama "Evaluación de incapacidad". Ni un certificado de tu médico ni esta página reemplazan ese dictamen. El detalle del proceso está en la ficha de la pensión por invalidez del BPS.',
  },
  {
    id: 'invalidez-carencia',
    question: 'Con discapacidad severa, ¿también miran mis ingresos?',
    answer:
      'No. Con dictamen médico de incapacidad severa el BPS otorga la pensión por invalidez sin prueba de carencia de recursos, por la Resolución de Directorio 32-30/2006. Por la vía de incapacidad común sí se evalúa la carencia de recursos, y ahí el ingreso propio se descuenta al 33 % sobre lo que exceda el equivalente a tres pensiones, en lugar del 50 % desde el primer peso que rige en la pensión a la vejez.',
  },
  {
    id: 'cuanto-es',
    question: '¿Cuánto es la pensión a la vejez en 2026?',
    answer:
      'El monto es de $ 18.575 por mes, según la tabla de montos y aumentos de pasividades del BPS actualizada al 9 de febrero de 2026, con el ajuste general de pasividades de 5,97 % para 2026.',
  },
  {
    id: 'otros-ingresos',
    question: '¿Qué pasa si tengo otros ingresos?',
    answer:
      'El BPS te descuenta el 50 % de tus ingresos propios del monto de la pensión, y hay umbrales aparte para los ingresos de tu núcleo familiar conviviente y de tus familiares obligados que no conviven con vos. Si tus ingresos propios superan dos pensiones a la vejez, perdés el derecho a cobrarla.',
  },
  {
    id: 'tengo-jubilacion',
    question: '¿Puedo cobrarla si ya tengo una jubilación?',
    answer:
      'No. La pensión a la vejez exige no configurar causal jubilatoria en el BPS ni en ningún otro organismo previsional: es un beneficio para quien no tiene ninguna otra pasividad, no un complemento de una jubilación existente.',
  },
  {
    id: 'es-lo-mismo-mides',
    question: '¿Es lo mismo que la asistencia a la vejez del MIDES?',
    answer:
      'No. La asistencia a la vejez es un programa del MIDES, distinto de esta pensión, para personas de 65 a 69 años en situación de pobreza extrema o indigencia. La pensión a la vejez del BPS es otra prestación, con otro organismo y otro requisito de edad.',
  },
  {
    id: 'como-se-pide',
    question: '¿Cómo se pide?',
    answer:
      'El trámite se inicia en el BPS, que evalúa la edad, la residencia y la carencia de recursos con la documentación de cada caso. El BPS publica el trámite en su sitio; esta página no reemplaza esa evaluación ni estima un resultado.',
  },
  {
    id: 'no-cobro-tres-meses',
    question: '¿Qué pasa si no la cobro durante tres meses?',
    answer:
      'Los recibos caducan. Para volver a percibir la prestación hay que acreditar ante el BPS la existencia y la permanencia en el país.',
  },
]

export const PENSION_SOURCES: readonly { label: string; url: string }[] = [
  {
    label: 'BPS — Pensión por vejez',
    url: 'https://www.bps.gub.uy/20540/pension-por-vejez.html',
  },
  {
    label: 'BPS — Pensión por invalidez',
    url: INVALIDITY_URL,
  },
  {
    label: 'BPS — Evaluación de incapacidad (trámite)',
    url: INVALIDITY_EVALUATION_URL,
  },
  {
    label: 'BPS — Montos y aumentos de pasividades 2026',
    url: 'https://www.bps.gub.uy/6182/montos-y-aumentos-de-pasividades.html',
  },
  {
    label: 'BPS — Asistencia a la vejez (MIDES)',
    url: 'https://www.bps.gub.uy/21159/asistencia-a-la-vejez.html',
  },
  {
    label: 'BPS — Ajuste definitivo de jubilaciones y pensiones para 2026',
    url: 'https://www.bps.gub.uy/23862/ajuste-definitivo-de-jubilaciones-y-pensiones-para-2026.html',
  },
]
