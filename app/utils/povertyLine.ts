// app/utils/povertyLine.ts
// Datos y aritmética de la guía /guias/linea-de-pobreza-uruguay (`utils/guidesPobreza.ts`): la
// línea de pobreza y la de indigencia que publica el INE con la Encuesta Continua de Hogares.
//
// POR QUÉ EXISTE: el sitio ya contestaba «¿se puede vivir con X?» desde el lado del gasto
// (/vivir-con-25000-pesos-uruguay, /vivir-con-el-salario-minimo-uruguay, los precios del SIPC en
// /precios-de-supermercado-uruguay) y nombraba la línea del INE de pasada, pero ninguna página la
// explicaba. La cifra circula siempre como UN número —el del hogar de tres personas que alquila en
// Montevideo— y por eso se lee como un umbral de sueldo, que no es.
//
// LO QUE ESTA GUÍA CONTESTA: la línea de pobreza no es un número. Depende del tamaño del hogar, de
// la región y —la dimensión que casi nunca se nombra— de si el hogar ALQUILA. Para una persona sola
// en Montevideo la línea de junio de 2026 es $ 25.195 si alquila y $ 15.572 si no. El motivo está
// en la metodología del INE: la canasta básica no alimentaria «no incluye el valor locativo en
// ningún caso, pero sí incluye el alquiler para los hogares inquilinos». Ese alquiler es un RUBRO
// FIJO de la canasta (cuadro 3: la no alimentaria del inquilino menos la del no inquilino), el
// mismo para todos los inquilinos del mismo tamaño y región, y NO el alquiler que paga cada hogar.
//
// LO QUE NO ES: no es un sueldo mínimo. La norma que la guía cita como requisito que la usa es el
// Monotributo Social Mides (Ley 18.874, art. 1), con la cita textual en `POVERTY_LINE_LEGAL`. La asignación familiar del Plan de Equidad (Ley 18.227, art. 2) no la
// nombra. Nada de esto se generaliza a «ningún beneficio»: eso no lo dice ninguna fuente.
//
// DE DÓNDE SALEN LAS CIFRAS: del informe «Estimación de la pobreza por el método del ingreso,
// primer semestre 2026» del INE (cuadros 1, 2 y 3), del informe del primer semestre de 2025 (la
// comparación interanual y sus márgenes), de la nota metodológica 2017 del INE (la fórmula por
// tamaño de hogar) y del comunicado de Presidencia del 07/10/2026. Todas las URLs están en
// `POVERTY_LINE_SOURCES` y se imprimen en la guía. Las únicas cuentas propias son restas entre
// celdas y `estimatePovertyLine`, que aplica la fórmula publicada a los componentes del cuadro 3.
//
// CUÁNDO ENVEJECE: el informe del primer semestre de 2026 se difundió en octubre (Presidencia,
// 07/10/2026). Cuando salga el siguiente, hay que cargar su cuadro 2 en `POVERTY_LINES`, su cuadro
// 3 en `INDIGENCE_BASKET` y `BASKET_COMPONENTS`, y mover `POVERTY_INCIDENCE` /
// `INDIGENCE_INCIDENCE`. El título y la descripción de la guía se arman desde estas constantes, y
// `povertyLine.test.ts` exige que sigan diciendo las cifras del cuadro.

/** Una fila del cuadro 2 del INE: la línea mensual en pesos, por región y tenencia. */
export interface PovertyLineRow {
  /** Integrantes del hogar. */
  size: number
  /** Montevideo, hogar inquilino. */
  montevideoTenant: number
  /** Montevideo, hogar no inquilino. */
  montevideoOwner: number
  /** Interior, hogar inquilino. */
  interiorTenant: number
  /** Interior, hogar no inquilino. */
  interiorOwner: number
}

/** El mes al que corresponde el cuadro 2 publicado. */
export const POVERTY_LINE_MONTH = 'junio de 2026'

/** Cuadro 2, «Línea de pobreza», total país, pesos uruguayos, junio de 2026. */
export const POVERTY_LINES: readonly PovertyLineRow[] = [
  {
    size: 1,
    montevideoTenant: 25195,
    montevideoOwner: 15572,
    interiorTenant: 20257,
    interiorOwner: 13540,
  },
  {
    size: 2,
    montevideoTenant: 42659,
    montevideoOwner: 29961,
    interiorTenant: 33339,
    interiorOwner: 25070,
  },
  {
    size: 3,
    montevideoTenant: 58893,
    montevideoOwner: 43959,
    interiorTenant: 45364,
    interiorOwner: 36026,
  },
]

/** Un mes del cuadro 3: la canasta básica alimentaria, que ES la línea de indigencia. */
export interface IndigenceBasketMonth {
  month: string
  montevideo: number
  interior: number
}

/**
 * Cuadro 3, canasta básica alimentaria (línea de indigencia) de un hogar UNIPERSONAL, primer
 * semestre de 2026. Para un hogar de n integrantes, la nota metodológica define la línea de
 * indigencia como esta canasta per cápita multiplicada por n (`INDIGENCE_PER_CAPITA_QUOTE`).
 */
export const INDIGENCE_BASKET_2026: readonly IndigenceBasketMonth[] = [
  { month: 'Enero', montevideo: 6605, interior: 5677 },
  { month: 'Febrero', montevideo: 6666, interior: 5735 },
  { month: 'Marzo', montevideo: 6675, interior: 5732 },
  { month: 'Abril', montevideo: 6678, interior: 5740 },
  { month: 'Mayo', montevideo: 6699, interior: 5736 },
  { month: 'Junio', montevideo: 6736, interior: 5775 },
]

/** Los tres componentes de un hogar unipersonal en una región, según el cuadro 3. */
export interface BasketComponents {
  /** CBA (LI): canasta básica alimentaria. */
  food: number
  /** CBNA inquilinos: canasta básica no alimentaria del hogar inquilino. */
  nonFoodTenant: number
  /** CBNA no inquilinos: la misma canasta sin el rubro de alquiler. */
  nonFoodOwner: number
}

/**
 * Cuadro 3, fila de junio de 2026: los componentes del hogar unipersonal con los que el INE arma
 * las líneas de todos los tamaños. El informe aclara que «la suma de los parciales puede no
 * coincidir con el total debido a redondeos en las cifras».
 */
export const BASKET_COMPONENTS: {
  readonly month: string
  readonly montevideo: BasketComponents
  readonly interior: BasketComponents
} = {
  month: 'junio de 2026',
  montevideo: { food: 6736, nonFoodTenant: 18459, nonFoodOwner: 8836 },
  interior: { food: 5775, nonFoodTenant: 14482, nonFoodOwner: 7765 },
}

/**
 * Los parámetros de escala de la nota metodológica del INE (metodología 2017): la canasta no
 * alimentaria sin alquiler escala con n^0,9 en Montevideo y n^0,8 en el interior, y el alquiler con
 * n^0,4 y n^0,3. Textual: «CBNA del hogar inquilino, Montevideo … × n^0.9 + ALQ(1) × n^0.4» y
 * «CBNA del hogar inquilino, Interior … × n^0.8 + ALQ(1) × n^0.3».
 */
export const SCALE_EXPONENTS = {
  montevideo: { nonFood: 0.9, rent: 0.4 },
  interior: { nonFood: 0.8, rent: 0.3 },
} as const

/** Nota metodológica: la línea de indigencia de un hogar es la canasta per cápita por n. */
export const INDIGENCE_PER_CAPITA_QUOTE =
  'la LI para cada hogar queda definida como el valor de la CBA per cápita multiplicado por la cantidad de integrantes del mismo (n)'

/** Informe 2026, notas metodológicas: por qué el hogar inquilino tiene otra línea. */
export const RENT_QUOTE =
  'no incluye el valor locativo en ningún caso, pero sí incluye el alquiler para los hogares inquilinos'

/** Informe 2026, notas metodológicas: el ingreso con el que se compara tampoco lo incluye. */
export const INCOME_QUOTE = 'no incluye el valor locativo ni las cuotas imputadas por FONASA'

/** La incidencia medida, con su margen de error al 95 %, tal como la publica el informe. */
export interface IncidenceReading {
  /** Personas bajo la línea, en porcentaje. */
  people: number
  /** Margen de error al 95 % de `people`, en puntos porcentuales. */
  peopleMargin: number
  /** Hogares bajo la línea, en porcentaje. */
  households: number
  /** Margen de error al 95 % de `households`, en puntos porcentuales. */
  householdsMargin: number
}

/**
 * Pobreza: primer semestre de 2026 (cuadro 1 del informe 2026) contra el mismo semestre de 2025
 * (cuadro 1 del informe 2025, «Margen error al 95% 2025-S1»).
 */
export const POVERTY_INCIDENCE = {
  period: 'primer semestre de 2026',
  previousPeriod: 'primer semestre de 2025',
  current: { people: 14.8, peopleMargin: 1.0, households: 11.6, householdsMargin: 0.7 },
  previous: { people: 17.7, peopleMargin: 1.0, households: 13.9, householdsMargin: 0.8 },
} as const satisfies {
  period: string
  previousPeriod: string
  current: IncidenceReading
  previous: IncidenceReading
}

/** Indigencia: mismo par de semestres y mismas fuentes. */
export const INDIGENCE_INCIDENCE = {
  period: 'primer semestre de 2026',
  previousPeriod: 'primer semestre de 2025',
  current: { people: 1.2, peopleMargin: 0.3, households: 1.0, householdsMargin: 0.2 },
  previous: { people: 1.8, peopleMargin: 0.4, households: 1.4, householdsMargin: 0.2 },
} as const satisfies {
  period: string
  previousPeriod: string
  current: IncidenceReading
  previous: IncidenceReading
}

const IMPO_18874 = 'https://www.impo.com.uy/bases/leyes/18874-2011'
const IMPO_18227 = 'https://www.impo.com.uy/bases/leyes/18227-2007'

/** Las dos normas que la guía cita sobre beneficios, con su texto literal de IMPO. */
export const POVERTY_LINE_LEGAL = {
  monotributoSocial: {
    law: 'Ley 18.874, art. 1',
    url: IMPO_18874,
    quote:
      'integren hogares que se encuentren por debajo de la línea de pobreza que determina el Instituto Nacional de Estadística, o integrantes de hogares en situación de vulnerabilidad socioeconómica',
  },
  asignacionFamiliar: {
    law: 'Ley 18.227, art. 2',
    url: IMPO_18227,
    quote:
      'conforme a criterios estadísticos, teniéndose en cuenta, entre otros, los siguientes factores: ingresos del hogar, condiciones habitacionales y del entorno, composición del hogar, características de sus integrantes y situación sanitaria',
  },
} as const

/** Las fuentes oficiales, impresas en la guía. */
export const POVERTY_LINE_SOURCES = [
  {
    label:
      'INE — «Estimación de la pobreza por el método del ingreso», primer semestre 2026 (cuadros 1, 2 y 3)',
    url: 'https://www5.ine.gub.uy/documents/Demograf%C3%ADayEESS/HTML/ECH/Pobreza/2026/Informe%20Pobreza_Monetaria_%20primer%20semestre%202026.html',
  },
  {
    label: 'INE — «Estimación de la pobreza por el método del ingreso», primer semestre 2025',
    url: 'https://www5.ine.gub.uy/documents/Demograf%C3%ADayEESS/HTML/ECH/Pobreza/2025/Informe%20pobreza%20primer%20semestre%202025.html',
  },
  {
    label: 'INE — «¿Cómo se mide la pobreza y la indigencia monetaria?» (metodología 2017)',
    url: 'https://www5.ine.gub.uy/documents/Demograf%C3%ADayEESS/PDF/ECH/Pobreza/Nota%20conceptual%20Pobreza%20Met%202017.pdf',
  },
  {
    label:
      'Presidencia — «La pobreza bajó 2,9 puntos porcentuales en un año y la indigencia se redujo 33%» (07/10/2026)',
    url: 'https://www.gub.uy/presidencia/comunicacion/noticias/pobreza-indigencia-primer-semestre-2026',
  },
  {
    label: 'IMPO — Ley 18.874, art. 1 (Monotributo Social Mides)',
    url: IMPO_18874,
  },
  {
    label: 'IMPO — Ley 18.227, art. 2 (asignaciones familiares del Plan de Equidad)',
    url: IMPO_18227,
  },
] as const

/** La fila del cuadro para un tamaño de hogar, o `undefined` si el informe no lo publica. */
export function povertyLineFor(size: number): PovertyLineRow | undefined {
  return POVERTY_LINES.find(row => row.size === size)
}

/**
 * El rubro de alquiler de la canasta de un hogar unipersonal: la no alimentaria del inquilino menos
 * la del no inquilino (cuadro 3). Es un monto fijo por región, no el alquiler que paga cada hogar.
 */
export function rentItem(region: 'montevideo' | 'interior'): number {
  const c = BASKET_COMPONENTS[region]
  return c.nonFoodTenant - c.nonFoodOwner
}

/**
 * La línea de pobreza de un hogar de `size` integrantes con la fórmula de la nota metodológica:
 * CBA × n + CBNA sin alquiler × n^a + (si alquila) alquiler × n^b, con los componentes de junio del
 * cuadro 3. Para 1 a 3 integrantes reproduce el cuadro 2 a pocos pesos (los componentes vienen
 * redondeados); para 4 o más es una cuenta propia con el método del INE, no una cifra publicada.
 */
export function estimatePovertyLine(
  size: number,
  region: 'montevideo' | 'interior',
  tenure: 'tenant' | 'owner'
): number {
  const c = BASKET_COMPONENTS[region]
  const e = SCALE_EXPONENTS[region]
  const rent = tenure === 'tenant' ? rentItem(region) * size ** e.rent : 0
  return Math.round(c.food * size + c.nonFoodOwner * size ** e.nonFood + rent)
}

/** Una fila estimada con `estimatePovertyLine`, con la misma forma que las del cuadro 2. */
export function estimatedRow(size: number): PovertyLineRow {
  return {
    size,
    montevideoTenant: estimatePovertyLine(size, 'montevideo', 'tenant'),
    montevideoOwner: estimatePovertyLine(size, 'montevideo', 'owner'),
    interiorTenant: estimatePovertyLine(size, 'interior', 'tenant'),
    interiorOwner: estimatePovertyLine(size, 'interior', 'owner'),
  }
}

/** Tamaños que la guía calcula con la fórmula porque el cuadro 2 no los publica. */
export const ESTIMATED_SIZES = [4, 5] as const

/**
 * La mayor diferencia, en pesos, entre la fórmula y las doce celdas que el INE sí publica. La guía
 * la imprime al lado de las filas calculadas para que se vea cuánto se aparta la cuenta propia.
 */
export function maxFormulaDeviation(): number {
  let max = 0
  for (const row of POVERTY_LINES) {
    const est = estimatedRow(row.size)
    for (const key of [
      'montevideoTenant',
      'montevideoOwner',
      'interiorTenant',
      'interiorOwner',
    ] as const)
      max = Math.max(max, Math.abs(est[key] - row[key]))
  }
  return max
}

/**
 * Cuánto más alta es la línea del hogar inquilino que la del no inquilino del mismo tamaño y
 * región. Es el rubro de alquiler de la canasta, escalado por el tamaño del hogar.
 */
export function tenureGap(row: PovertyLineRow, region: 'montevideo' | 'interior'): number {
  return region === 'montevideo'
    ? row.montevideoTenant - row.montevideoOwner
    : row.interiorTenant - row.interiorOwner
}

/** Cuánto más alta es la línea de Montevideo que la del interior, para la misma tenencia. */
export function regionGap(row: PovertyLineRow, tenure: 'tenant' | 'owner'): number {
  return tenure === 'tenant'
    ? row.montevideoTenant - row.interiorTenant
    : row.montevideoOwner - row.interiorOwner
}

/** El último mes de la serie de indigencia, que es el que la guía destaca. */
export function latestIndigenceBasket(): IndigenceBasketMonth {
  return INDIGENCE_BASKET_2026[INDIGENCE_BASKET_2026.length - 1]!
}

/** Puntos porcentuales que bajó (positivo) o subió (negativo) una incidencia entre semestres. */
export function incidenceChange(
  reading: { current: IncidenceReading; previous: IncidenceReading },
  dimension: 'people' | 'households'
): number {
  return Math.round((reading.previous[dimension] - reading.current[dimension]) * 10) / 10
}

/** Formato de pesos uruguayos sin decimales, el mismo que usa el resto del sitio. */
export function formatPesos(value: number): string {
  return `$ ${value.toLocaleString('es-UY', { maximumFractionDigits: 0 })}`
}
