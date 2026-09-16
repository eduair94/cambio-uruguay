// ¿Cuándo me puedo jubilar en Uruguay? — las causales jubilatorias del BPS.
//
// Todo lo que hay acá está copiado de las páginas del BPS y de la Ley 20.130, y
// cada tabla lleva su URL al lado en `RETIREMENT_SOURCES`. No hay ninguna cifra
// calculada por nosotros: la reforma tiene una escala por generación y una
// segunda escala por años de trabajo, y redondear cualquiera de las dos cambia
// la respuesta en años de la vida de alguien.
//
// La línea que parte todo es el 1/1/1973. Quien nació ANTES sigue en el régimen
// anterior (60 años y 30 de trabajo) y la reforma no lo alcanza; quien nació ese
// día o después entra al nuevo sistema, con la edad subiendo un año por
// generación hasta los 65. Esa frontera es el dato que más se busca y el que más
// se confunde, porque "la jubilación pasó a los 65" se publicó como si aplicara
// a todo el mundo desde ya.
//
// Módulo PURO: sin imports de Vue/Nuxt, para que vitest lo cargue en node.

/** La fecha de nacimiento a partir de la cual rige el nuevo sistema previsional común. */
export const NEW_SYSTEM_FIRST_BIRTH_YEAR = 1973

/**
 * El año en que el BPS empieza a otorgar jubilaciones de causal normal por el
 * nuevo sistema. Antes de eso la tabla existe pero todavía no se aplica a nadie.
 */
export const NEW_SYSTEM_FIRST_GRANT_YEAR = 2033

/** Una fila de "edad mínima según el año en que naciste". */
export interface AgeByCohort {
  /** Etiqueta tal como la publica el BPS ('1973', '1977 en adelante'). */
  cohort: string
  /** Primer año de nacimiento que cae en la fila. */
  fromYear: number
  /** Último año de nacimiento de la fila, o `null` si es abierta hacia adelante. */
  toYear: number | null
  /** Edad mínima, en años. */
  age: number
  /** Años de trabajo computados que exige la fila. */
  years: number
}

/**
 * Causal normal del nuevo sistema: 30 años de trabajo y la edad de tu generación.
 * Fuente: BPS, "Jubilación normal por el Nuevo Sistema Previsional Común".
 */
export const NEW_SYSTEM_NORMAL: readonly AgeByCohort[] = [
  { cohort: '1973', fromYear: 1973, toYear: 1973, age: 61, years: 30 },
  { cohort: '1974', fromYear: 1974, toYear: 1974, age: 62, years: 30 },
  { cohort: '1975', fromYear: 1975, toYear: 1975, age: 63, years: 30 },
  { cohort: '1976', fromYear: 1976, toYear: 1976, age: 64, years: 30 },
  { cohort: '1977 en adelante', fromYear: 1977, toYear: null, age: 65, years: 30 },
]

/** Una fila de "si no llegás a 30 años de trabajo, esperás más edad". */
export interface AgeYearsRow {
  age: number
  years: number
}

/**
 * La escala para quien no reúne 30 años de trabajo. El BPS la publica igual para
 * el nuevo sistema y para la jubilación por edad avanzada del régimen anterior.
 */
export const REDUCED_SERVICE_SCALE: readonly AgeYearsRow[] = [
  { age: 65, years: 25 },
  { age: 66, years: 23 },
  { age: 67, years: 21 },
  { age: 68, years: 19 },
  { age: 69, years: 17 },
  { age: 70, years: 15 },
]

/** Causal común del régimen anterior, para nacidos antes del 1/1/1973. */
export const PREVIOUS_SYSTEM_NORMAL: AgeYearsRow = { age: 60, years: 30 }

/**
 * Jubilación anticipada por extensa carrera laboral, tal como la publica el BPS.
 * Para 1976 en adelante la página lista DOS combinaciones (63 con 38 años, 64 con
 * 35), y van las dos: quedarse con una sola sería inventar cuál rige.
 */
export const EXTENDED_CAREER: readonly AgeByCohort[] = [
  { cohort: '1973', fromYear: 1973, toYear: 1973, age: 60, years: 40 },
  { cohort: '1974', fromYear: 1974, toYear: 1974, age: 61, years: 40 },
  { cohort: '1975', fromYear: 1975, toYear: 1975, age: 62, years: 40 },
  { cohort: '1976 en adelante', fromYear: 1976, toYear: null, age: 63, years: 38 },
  { cohort: '1976 en adelante', fromYear: 1976, toYear: null, age: 64, years: 35 },
]

/**
 * Jubilación anticipada por puestos de trabajo particularmente exigentes
 * (construcción y actividad rural).
 */
export const DEMANDING_WORK = {
  age: 60,
  years: 30,
  /** Años del total que tienen que ser en los puestos amparados. */
  yearsInRole: 20,
  /** De esos, cuántos tienen que caer en los últimos diez años de vida laboral. */
  yearsInLastDecade: 5,
  lastDecade: 10,
} as const

/** Qué régimen le toca a quien nació en `birthYear`. */
export type RetirementRegime = 'previous' | 'new'

export interface RetirementAnswer {
  regime: RetirementRegime
  /** Edad mínima con la carrera completa (30 años de trabajo). */
  age: number
  /** Años de trabajo que pide esa edad. */
  years: number
  /** El primer año calendario en que esa persona alcanza la edad. */
  reachesAgeInYear: number
}

/**
 * La respuesta a "nací en X, ¿cuándo me puedo jubilar?", con 30 años de trabajo.
 *
 * `reachesAgeInYear` es `birthYear + age` y no la fecha exacta: sin el día de
 * nacimiento no se puede decir más que el año, y decir un mes sería inventarlo.
 */
export function retirementFor(birthYear: number): RetirementAnswer {
  if (birthYear < NEW_SYSTEM_FIRST_BIRTH_YEAR) {
    return {
      regime: 'previous',
      age: PREVIOUS_SYSTEM_NORMAL.age,
      years: PREVIOUS_SYSTEM_NORMAL.years,
      reachesAgeInYear: birthYear + PREVIOUS_SYSTEM_NORMAL.age,
    }
  }
  const row =
    NEW_SYSTEM_NORMAL.find(
      entry => birthYear >= entry.fromYear && (entry.toYear === null || birthYear <= entry.toYear)
    ) ?? NEW_SYSTEM_NORMAL[NEW_SYSTEM_NORMAL.length - 1]
  return {
    regime: 'new',
    age: row.age,
    years: row.years,
    reachesAgeInYear: birthYear + row.age,
  }
}

/** Una fuente oficial citada en la página. */
export interface RetirementSource {
  label: string
  url: string
}

export const RETIREMENT_SOURCES: readonly RetirementSource[] = [
  {
    label: 'Ley N.º 20.130 — Seguridad social (texto en IMPO)',
    url: 'https://www.impo.com.uy/bases/leyes/20130-2023',
  },
  {
    label: 'BPS — Jubilación normal por el Nuevo Sistema Previsional Común',
    url: 'https://www.bps.gub.uy/20533/jubilacion-normal-por-el-nuevo-sistema-previsional-comun.html',
  },
  {
    label: 'BPS — Jubilación común y por edad avanzada (régimen jubilatorio anterior)',
    url: 'https://www.bps.gub.uy/3499/jubilacion-comun-y-por-edad-avanzada-regimen-jubilatorio-anterior.html',
  },
  {
    label: 'BPS — Jubilación anticipada por extensa carrera laboral',
    url: 'https://www.bps.gub.uy/20535/jubilacion-anticipada-por-extensa-carrera-laboral.html',
  },
  {
    label: 'BPS — Jubilación anticipada por puestos de trabajo particularmente exigentes',
    url: 'https://www.bps.gub.uy/20534/jubilacion-anticipada-por-desempeno-de-puestos-de-trabajo-particularmente-exigentes.html',
  },
  {
    label: 'BPS — Montos y aumentos de pasividades',
    url: 'https://www.bps.gub.uy/6182/montos-y-aumentos-de-pasividades.html',
  },
  {
    label: 'BPS — Jubilación por incapacidad total',
    url: 'https://www.bps.gub.uy/3501/jubilacion-por-incapacidad-total.html',
  },
  {
    label: 'BPS — Subsidio transitorio por incapacidad parcial',
    url: 'https://www.bps.gub.uy/9780/subsidio-transitorio-por-incapacidad-parcial.html',
  },
  {
    label: 'BPS — Mi jubilación estimada',
    url: 'https://www.bps.gub.uy/21674/mi-jubilacion-estimada.html',
  },
  {
    label: 'BPS — Suplemento solidario',
    url: 'https://www.bps.gub.uy/20541/suplemento-solidario.html',
  },
]

// ---------------------------------------------------------------------------
// Montos 2026: mínima, máxima y las tres figuras de incapacidad
// ---------------------------------------------------------------------------
//
// Todo lo de acá abajo son cifras publicadas por el BPS en "Montos y aumentos
// de pasividades" y en las fichas de cada prestación, verificadas contra esas
// páginas el 2026-09-16. Lo que el BPS no confirma con una cita textual (el
// tope del sueldo básico jubilatorio de $288.288, la renovación "180 días
// antes" de otras prestaciones, o una tasa de reemplazo del 65/66 % para la
// incapacidad total) NO está acá: no se publica un número que no se pudo citar.

/** Una fila de "cuánto es la jubilación mínima o máxima", en pesos por mes. */
export interface AmountRow {
  label: string
  amount: number
}

export const RETIREMENT_MIN_GENERAL_2026 = 20935
export const RETIREMENT_MIN_AGE_60_2026 = 10795
export const RETIREMENT_MIN_AGE_70_2026 = 23749
export const RETIREMENT_MAX_INTERGENERATIONAL_2026 = 79430
export const RETIREMENT_MAX_TRANSITION_2026 = 117460
export const RETIREMENT_ACCUMULATION_CAP_TRANSITION_2026 = 166080

/** Ajuste de pasividades de 2026, en porcentaje. Se paga desde marzo con retroactividad a enero. */
export const RETIREMENT_ADJUSTMENT_2026_PCT = 5.97

/**
 * Mínima y máxima 2026. Hay DOS topes máximos porque el régimen de
 * solidaridad intergeneracional y el régimen de transición (Ley 16.713)
 * publican cifras distintas, y el tope de acumulación de pasividades es
 * exclusivo del régimen de transición.
 * Fuente: BPS, "Montos y aumentos de pasividades".
 */
export const RETIREMENT_AMOUNTS_2026: readonly AmountRow[] = [
  { label: 'Mínima general', amount: RETIREMENT_MIN_GENERAL_2026 },
  { label: 'Mínima inicial, jubilación a los 60 años', amount: RETIREMENT_MIN_AGE_60_2026 },
  {
    label: 'Mínima inicial, jubilación a los 70 años o más',
    amount: RETIREMENT_MIN_AGE_70_2026,
  },
  {
    label: 'Máxima, régimen de solidaridad intergeneracional',
    amount: RETIREMENT_MAX_INTERGENERATIONAL_2026,
  },
  { label: 'Máxima, régimen de transición', amount: RETIREMENT_MAX_TRANSITION_2026 },
  {
    label: 'Tope por acumulación de pasividades (régimen de transición)',
    amount: RETIREMENT_ACCUMULATION_CAP_TRANSITION_2026,
  },
]

/** Una de las dos figuras contributivas del BPS para quien no puede seguir trabajando por salud. */
export interface DisabilityBenefit {
  id: string
  name: string
  eligibility: string
  duration: string
  amountNote: string
}

/**
 * Jubilación por incapacidad total y subsidio transitorio por incapacidad
 * parcial: las dos figuras CONTRIBUTIVAS del BPS para quien no puede seguir
 * trabajando por salud. La pensión por invalidez es una tercera figura, no
 * contributiva, que vive en `/pension-a-la-vejez-uruguay` y no se repite acá.
 * Fuentes: BPS 3501 y BPS 9780.
 */
export const DISABILITY_BENEFITS: readonly DisabilityBenefit[] = [
  {
    id: 'total',
    name: 'Jubilación por incapacidad total',
    eligibility:
      'Incapacidad total y permanente para todo trabajo, dictaminada por el BPS mediante junta médica, con actividad previa (6 meses a 2 años según la edad, o sin mínimo si la incapacidad es a causa del trabajo).',
    duration: 'Vitalicia, sujeta a controles de compatibilidad.',
    amountNote:
      'Se calcula proyectando los años de trabajo hasta un mínimo de 65 años y aplicando la tasa de adquisición de derechos del art. 46 de la ley.',
  },
  {
    id: 'partial',
    name: 'Subsidio transitorio por incapacidad parcial',
    eligibility: 'Incapacidad parcial dictaminada por el BPS, con los mismos mínimos de actividad.',
    duration:
      'Tres años, o hasta cumplir la edad y los años de trabajo para configurar causal jubilatoria, lo que ocurra antes. Si al vencer se confirma incapacidad total y no hay otra causal, pasa a ser jubilación por incapacidad total.',
    amountNote:
      'Se calcula según los artículos 44 a 46 de la Ley 20.130, con un adicional del 20 % para quienes tienen hijos a cargo.',
  },
]

/**
 * Nota corta sobre la pensión por invalidez, para que las tres figuras se vean
 * con la misma forma (quién califica / quién evalúa / monto) a simple vista.
 * No es una `DisabilityBenefit`: es no contributiva y no comparte régimen con
 * las dos de arriba, así que no entra en `DISABILITY_BENEFITS`. El detalle
 * completo vive en `/pension-a-la-vejez-uruguay`; acá sólo lo necesario para
 * distinguirla.
 * Fuente: BPS 20545 (Pensión por invalidez) y BPS 6182 (mismo monto que la
 * pensión a la vejez).
 */
export interface InvalidityPensionNote {
  name: string
  eligibility: string
  evaluator: string
  amountNote: string
}

export const INVALIDITY_PENSION_NOTE: InvalidityPensionNote = {
  name: 'Pensión por invalidez',
  eligibility: 'No contributiva: no pide años de trabajo aportados.',
  evaluator:
    'El BPS, con dictamen médico de incapacidad severa o, sin discapacidad severa, con prueba de carencia de recursos.',
  amountNote: 'El mismo monto que la pensión a la vejez.',
}

/** Una pregunta frecuente de la página, con su respuesta para el FAQPage. */
export interface RetirementFaqItem {
  question: string
  answer: string
}

export const RETIREMENT_FAQ: readonly RetirementFaqItem[] = [
  {
    question: '¿Cuál es la jubilación mínima en 2026?',
    answer:
      'La jubilación mínima general es de $ 20.935 por mes en 2026. Si te jubilás a los 60 años, el mínimo inicial es $ 10.795; si te jubilás a los 70 años o más, $ 23.749. También hay tope máximo, y es distinto según el régimen: $ 79.430 en el régimen de solidaridad intergeneracional y $ 117.460 en el régimen de transición, con un tope aparte de $ 166.080 para quien acumula más de una pasividad en el régimen de transición. El ajuste de pasividades de 2026 fue del 5,97 %.',
  },
  {
    question: '¿Qué diferencia hay entre jubilación por incapacidad y pensión por invalidez?',
    answer:
      'La jubilación por incapacidad total es contributiva y vitalicia: la cobra quien tiene actividad aportada al BPS y queda con incapacidad total y permanente para cualquier trabajo. La pensión por invalidez es no contributiva: no exige aportes previos, pero sí probar carencia de recursos (salvo discapacidad severa), y paga el mismo monto que la pensión a la vejez. Si la incapacidad es parcial y no total, corresponde el subsidio transitorio por incapacidad parcial, que dura hasta tres años o hasta que se configure otra causal jubilatoria.',
  },
]
