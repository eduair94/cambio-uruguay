// El Fondo de Solidaridad: cuánto aporta cada egresado y desde cuándo.
//
// Catálogo puro (sin imports de Vue/Nuxt) para `/fondo-de-solidaridad-uruguay`.
//
// REGLA DE ESTE ARCHIVO, la misma que `tolls.ts` y `dgiCertificate.ts`: cada cifra sale del texto
// vigente de la norma, con su cita y su URL, o no se publica. Acá eso tuvo dos consecuencias
// concretas y conviene dejarlas escritas, porque las dos son la diferencia entre una página
// correcta y una que repite lo que dice el resto de internet:
//
//   1. LA ESCALA QUE CIRCULA ESTÁ DEROGADA. El art. 3 ORIGINAL de la Ley 16.524 y el art. 3 de la
//      Ley 17.451 fijan el aporte en SALARIOS MÍNIMOS NACIONALES (5/3, uno y medio) y con un
//      umbral de 4 salarios mínimos. Esa es la versión que devuelven los buscadores y la que
//      todavía citan los resúmenes. No es la que rige: el art. 271 de la Ley 19.535 (2017) le dio
//      nueva redacción al art. 3 de la Ley 16.524 —que ya venía modificado por el art. 754 de la
//      Ley 19.355— y la escala pasó a estar en BPC (0,5 / 1 / 2) con un umbral de 8 BPC. Publicar
//      la vieja habría dado un número mal por un factor grande, con fuente y todo.
//
//   2. EL ADICIONAL NO LLEVA CIFRA ACÁ, A PROPÓSITO. El adicional del art. 542 de la Ley 17.296
//      viene bajando por el art. 493 de la Ley 20.075: 25 % desde 2024 y otro 25 % desde 2025,
//      y ese mismo artículo deja el 50 % restante a la Ley de Presupuesto Nacional 2025-2029
//      "para los ejercicios 2026 y 2027". O sea que el monto del año en curso depende de una norma
//      posterior que este archivo no pudo leer, y el portal del propio Fondo responde con un
//      desafío de Cloudflare. Entonces se publica la MECÁNICA y la cadena de normas, con sus
//      citas, y el monto se manda a buscar a la fuente. Un número inventado acá sería justo el
//      dato por el que alguien entra.
//
// POR QUÉ ESTA PÁGINA. El Fondo de Solidaridad aparecía en nueve archivos del sitio (la
// calculadora de sueldo líquido, las deducciones del IRPF, los gastos del hogar) SIEMPRE como un
// descuento que hay que meter en otra cuenta, y en ninguno como la pregunta propia: quién lo paga,
// cuánto y hasta cuándo. Y el ángulo que el sitio puede dar y la norma no es el peso: la escala
// está en BPC, el sitio tiene la BPC del año auditada, así que puede publicar el aporte en pesos.

import { URUGUAY } from './calculators'

/** Fecha en que se verificaron contra la fuente todas las cifras de este archivo. */
export const SOLIDARITY_VERIFIED_AT = '2026-09-30'

/**
 * La BPC con la que se convierten los aportes a pesos.
 *
 * Se toma de `URUGUAY.bpc` y NO se copia el número: es el mismo valor que usan el IRPF y la
 * calculadora de sueldo líquido, así que el 1° de enero se actualiza en un solo lugar. Un literal
 * acá sería la segunda copia que se olvida de mover.
 */
export const SOLIDARITY_BPC_UYU = URUGUAY.bpc

/** Ingresos mensuales, en BPC, por encima de los cuales nace la obligación (art. 3, Ley 16.524). */
export const SOLIDARITY_INCOME_THRESHOLD_BPC = 8

/** Primer año, contado desde el egreso, en que se empieza a aportar. */
export const SOLIDARITY_FIRST_YEAR = 5

/** Año, contado desde el egreso, a partir del cual el aporte sube de tramo. */
export const SOLIDARITY_STEP_UP_YEAR = 10

/** Años de carrera desde los cuales corre la escala alta. */
export const SOLIDARITY_LONG_CAREER_YEARS = 4

/** Tope de años de aportación (literal B del art. 3). */
export const SOLIDARITY_MAX_CONTRIBUTION_YEARS = 25

export interface SolidaritySource {
  readonly label: string
  readonly url: string
}

/**
 * Las fuentes, todas primarias y todas del texto VIGENTE.
 *
 * La primera es la que manda: el art. 3 de la Ley 16.524 en su redacción consolidada, que es donde
 * está la escala que rige. Las dos siguientes son la cadena que la dejó así, y están para que se
 * pueda comprobar que la versión en salarios mínimos que circula por internet quedó atrás.
 */
export const SOLIDARITY_SOURCES: readonly SolidaritySource[] = Object.freeze([
  {
    label: 'Ley 16.524, art. 3 (texto vigente): quiénes aportan, el umbral de 8 BPC y la escala',
    url: 'https://impo.com.uy/bases/leyes/16524-1994/3',
  },
  {
    label: 'Ley 19.535, art. 271: la redacción que hoy tiene el art. 3 de la Ley 16.524',
    url: 'https://impo.com.uy/bases/leyes-originales/19535-2017/271',
  },
  {
    label: 'Ley 16.524: creación del Fondo de Solidaridad como persona pública no estatal',
    url: 'https://impo.com.uy/bases/leyes/16524-1994',
  },
  {
    label: 'Ley 20.075, art. 493: la baja del adicional (25 % desde 2024 y 25 % más desde 2025)',
    url: 'https://www.impo.com.uy/bases/leyes/20075-2022/493',
  },
  {
    label: 'Ley 17.856: la BPC sustituye al salario mínimo nacional como unidad de cuenta',
    url: 'https://www.impo.com.uy/bases/leyes/17856-2004',
  },
  {
    label: 'BPC 2026: $ 6.864 desde el 1° de enero (valor de referencia del Estado)',
    url: 'https://cambio-uruguay.com/indicadores/bpc',
  },
])

export interface SolidarityBracket {
  readonly id: string
  /** Etiqueta del tramo de carrera. */
  readonly career: string
  /** Etiqueta del tramo de años desde el egreso. */
  readonly window: string
  /** El aporte anual, en BPC. */
  readonly bpc: number
}

/**
 * La escala completa, en el orden del art. 3: primero por largo de la carrera y después por años
 * desde el egreso. Cuatro filas, que son las cuatro que la norma distingue.
 */
export const SOLIDARITY_BRACKETS: readonly SolidarityBracket[] = Object.freeze([
  {
    id: 'corta-5-9',
    career: 'Carrera de menos de 4 años',
    window: 'Entre los 5 y los 9 años del egreso',
    bpc: 0.5,
  },
  {
    id: 'corta-10',
    career: 'Carrera de menos de 4 años',
    window: 'Desde los 10 años del egreso',
    bpc: 1,
  },
  {
    id: 'larga-5-9',
    career: 'Carrera de 4 años o más',
    window: 'Entre los 5 y los 9 años del egreso',
    bpc: 1,
  },
  {
    id: 'larga-10',
    career: 'Carrera de 4 años o más',
    window: 'Desde los 10 años del egreso',
    bpc: 2,
  },
])

/** Las cuatro causas por las que se deja de aportar (literales A a D del art. 3). */
export const SOLIDARITY_END_CAUSES: readonly string[] = Object.freeze([
  'Acceder a una jubilación y cesar en la actividad que da origen al aporte.',
  'Cumplir veinticinco años desde que se empezó a aportar.',
  'Una incapacidad irreversible para trabajar.',
  'Cumplir setenta años de edad.',
])

export type SolidarityVerdict =
  | {
      readonly status: 'aporta'
      readonly bpc: number
      readonly uyu: number
      readonly bracket: string
    }
  | { readonly status: 'todavia-no' }
  | { readonly status: 'cesa-por-tope' }

/**
 * Cuánto aporta, al año, un egresado con esta carrera y estos años desde el egreso.
 *
 * Devuelve un veredicto y no un número, porque «cero» tiene dos motivos distintos que la página
 * necesita distinguir: todavía no llegó el quinto año, o ya se cumplió el tope de 25 años. Un 0
 * pelado los confundiría y la página diría «no aportás» en los dos casos.
 *
 * El tope se cuenta desde el comienzo LEGAL de la aportación (el quinto año), que es el único
 * comienzo que esta función conoce: quien empezó más tarde termina más tarde, y eso lo dice la
 * página al lado del resultado en vez de fingir que acá se puede saber.
 *
 * El umbral de ingresos NO entra: es una condición sobre el ingreso del contribuyente, no sobre la
 * carrera, y la página la pregunta aparte.
 */
export function solidarityContribution(
  careerYears: number,
  yearsSinceGraduation: number,
  bpcUyu: number = SOLIDARITY_BPC_UYU
): SolidarityVerdict {
  if (!Number.isFinite(careerYears) || !Number.isFinite(yearsSinceGraduation)) {
    return { status: 'todavia-no' }
  }
  if (yearsSinceGraduation < SOLIDARITY_FIRST_YEAR) return { status: 'todavia-no' }
  if (yearsSinceGraduation >= SOLIDARITY_FIRST_YEAR + SOLIDARITY_MAX_CONTRIBUTION_YEARS) {
    return { status: 'cesa-por-tope' }
  }

  const longCareer = careerYears >= SOLIDARITY_LONG_CAREER_YEARS
  const steppedUp = yearsSinceGraduation >= SOLIDARITY_STEP_UP_YEAR
  const bpc = longCareer ? (steppedUp ? 2 : 1) : steppedUp ? 1 : 0.5
  const id = `${longCareer ? 'larga' : 'corta'}-${steppedUp ? '10' : '5-9'}`
  const bracket = SOLIDARITY_BRACKETS.find(row => row.id === id)!

  return {
    status: 'aporta',
    bpc,
    uyu: Math.round(bpc * bpcUyu * 100) / 100,
    bracket: `${bracket.career} · ${bracket.window}`,
  }
}

/** El umbral de ingresos mensuales, en pesos, por encima del cual nace la obligación. */
export function solidarityIncomeThresholdUyu(bpcUyu: number = SOLIDARITY_BPC_UYU): number {
  return Math.round(SOLIDARITY_INCOME_THRESHOLD_BPC * bpcUyu * 100) / 100
}

/** Un monto en BPC, pasado a pesos. */
export function solidarityBpcToUyu(bpc: number, bpcUyu: number = SOLIDARITY_BPC_UYU): number {
  return Math.round(bpc * bpcUyu * 100) / 100
}

export interface SolidarityFaqItem {
  readonly question: string
  readonly answer: string
}

/**
 * Las preguntas, con la respuesta primero. Ninguna afirma un monto del adicional: la única
 * respuesta honesta que este archivo puede dar sobre eso es la cadena de normas y a dónde ir.
 */
export const SOLIDARITY_FAQ: readonly SolidarityFaqItem[] = Object.freeze([
  {
    question: '¿Desde cuándo se empieza a pagar el Fondo de Solidaridad?',
    answer:
      'Desde que se cumple el quinto año del egreso, y sólo si los ingresos mensuales superan las 8 BPC. Antes del quinto año no se aporta, aunque ya se esté trabajando en la profesión.',
  },
  {
    question: '¿Cuánto se paga por año?',
    answer:
      'Media BPC si la carrera duraba menos de 4 años y 1 BPC si duraba 4 o más, entre los años 5 y 9 del egreso. A partir de los 10 años pasa a 1 BPC y 2 BPC respectivamente. Es un aporte anual, no mensual.',
  },
  {
    question: '¿Qué pasa si gano menos de 8 BPC por mes?',
    answer:
      'No nace la obligación de aportar, pero la norma remite a la reglamentación para los requisitos con que se justifica ese nivel de ingresos: no alcanza con no pagar, hay que declararlo ante el Fondo.',
  },
  {
    question: '¿Hasta cuándo se aporta?',
    answer:
      'Hasta que pase lo primero de estas cuatro cosas: jubilarse y cesar en la actividad, cumplir 25 años aportando, una incapacidad irreversible para trabajar, o cumplir 70 años de edad.',
  },
  {
    question: '¿Los egresados de UTU y de UTEC también aportan?',
    answer:
      'Sí. El art. 3 alcanza a los egresados de la Universidad de la República, del nivel terciario del Consejo de Educación Técnico-Profesional y de la Universidad Tecnológica, con la misma escala.',
  },
])

/** Un monto en pesos con la separación de miles uruguaya y sin decimales. */
function money(value: number): string {
  return value.toLocaleString('es-UY', { maximumFractionDigits: 0 })
}

/**
 * La descripción del snippet, armada desde la escala y la BPC en vez de escrita a mano.
 *
 * Va acá y no como literal en el `.vue` por una razón medible: los tres montos que la hacen
 * concreta —el umbral y los dos aportes de la carrera larga— salen de la BPC, que cambia el 1° de
 * enero. Un literal quedaría desactualizado cada enero sin que nada falle, y el modo de fallar
 * sería el peor: el SERP publicando un número viejo con toda la confianza del mundo.
 *
 * `solidaritySeoDescription.length` está medido en el test contra los 155 caracteres que Google
 * publica, y con una BPC de cinco dígitos, que es el peor caso plausible: un snippet que sólo
 * entra mientras la BPC tenga cuatro dígitos no es un snippet que entre.
 */
export function solidaritySeoDescription(bpcUyu: number = SOLIDARITY_BPC_UYU): string {
  const threshold = money(solidarityIncomeThresholdUyu(bpcUyu))
  const early = money(solidarityBpcToUyu(1, bpcUyu))
  const late = money(solidarityBpcToUyu(2, bpcUyu))
  return (
    `Se paga desde el quinto año del egreso y con más de $ ${threshold} al mes: ` +
    `$ ${early} al año la carrera de 4 años o más, y $ ${late} desde el año 10.`
  )
}
