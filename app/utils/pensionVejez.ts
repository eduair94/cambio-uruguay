// Pensión a la vejez e invalidez (BPS), prestación no contributiva. Verificado el 2026-09-16
// contra https://www.bps.gub.uy/20540/pension-por-vejez.html,
// https://www.bps.gub.uy/6182/montos-y-aumentos-de-pasividades.html,
// https://www.bps.gub.uy/21159/asistencia-a-la-vejez.html y
// https://www.bps.gub.uy/23862/ajuste-definitivo-de-jubilaciones-y-pensiones-para-2026.html.
//
// Esta página NO es una calculadora: la carencia de recursos la evalúa el BPS caso por caso, con
// TODOS los ingresos del solicitante y de su núcleo familiar. Lo que sigue son las reglas que el
// BPS publica, no una estimación del monto que le tocaría a alguien.
import type { FaqItem } from './faqAnswers'

export const PENSION_VERIFIED_AT = '2026-09-16'

/** "Pensión vejez e invalidez", BPS — Montos y aumentos de pasividades. */
export const AMOUNT_2026 = 18575
/** Fecha de "última actualización" que declara esa misma página. */
export const AMOUNT_UPDATED_AT = '2026-02-09'
/** Ajuste general de jubilaciones y pensiones 2026 (BPS), pagado en marzo con retroactivo a enero. */
export const ADJUSTMENT_2026_PCT = 5.97

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
 * Las tres reglas de carencia de recursos que publica el BPS. Ninguna se traduce a una fórmula en
 * esta página a propósito: el BPS las evalúa con la declaración jurada y la documentación de cada
 * caso, no con una cuenta que un usuario pueda reproducir solo.
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
    who: 'No contributiva, para mayores de 70 años (65 con 7 años de cuidados) sin jubilación, sujeta a carencia de recursos.',
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
      'A mayores de 70 años (o de 65 con al menos 7 años de cuidado directo y no remunerado de familiares con discapacidad severa) que residieron en el país al menos 10 de los últimos 20 años, no tienen jubilación y cumplen la carencia de recursos que evalúa el BPS.',
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
