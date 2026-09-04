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
]
