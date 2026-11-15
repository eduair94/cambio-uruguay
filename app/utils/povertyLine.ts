// app/utils/povertyLine.ts
// Datos y aritmética de /linea-de-pobreza-uruguay: la línea de pobreza y la de indigencia que
// publica el INE con la Encuesta Continua de Hogares.
//
// POR QUÉ EXISTE: el sitio ya contestaba «¿se puede vivir con X?» desde el lado del gasto
// (/vivir-con-25000-pesos-uruguay, /vivir-con-el-salario-minimo-uruguay, los precios del SIPC en
// /precios-de-supermercado-uruguay) y no tenía ninguna página con la vara oficial del ingreso. La
// cifra circula siempre como UN número —el del hogar de tres personas que alquila en Montevideo—
// y por eso se lee como un umbral de sueldo, que no es.
//
// LO QUE ESTA PÁGINA CONTESTA Y NADIE MÁS: la línea de pobreza no es un número, son doce. Depende
// del tamaño del hogar, de la región y —la dimensión que casi nunca se nombra— de si el hogar
// ALQUILA. Para una persona sola en Montevideo la línea de junio de 2026 es $ 25.195 si alquila y
// $ 15.572 si no: una diferencia de $ 9.623 en la misma ciudad y con la misma gente. El motivo
// está en la metodología del INE y no en un recargo arbitrario: la canasta básica no alimentaria
// «no incluye el valor locativo en ningún caso, pero sí incluye el alquiler para los hogares
// inquilinos». O sea que el hogar propietario no computa lo que valdría su vivienda, y el
// inquilino sí computa lo que paga. Por eso dos hogares idénticos tienen líneas distintas, y por
// eso un «la línea de pobreza es $ 58.893» sin decir «tres personas, Montevideo, alquilando» no
// alcanza para que nadie sepa si le toca.
//
// LO QUE NO ES: no es un requisito de ningún beneficio. El BPS y el Mides resuelven la pensión a
// la vejez, la asignación familiar o la tarjeta Uruguay Social con sus propios criterios de
// carencia de recursos, que no son esta línea. Acá sólo está la vara con la que el INE MIDE la
// pobreza del país.
//
// DE DÓNDE SALEN LAS CIFRAS: del informe «Estimación de la pobreza por el método del ingreso,
// primer semestre 2026» del INE (cuadros 2 y 3) y del comunicado de Presidencia del 07/10/2026 que
// publicó la incidencia del semestre. Las dos URLs están en `POVERTY_LINE_SOURCES` y se imprimen
// en la página: ninguna cifra de este archivo se calcula ni se estima acá.
//
// CUÁNDO ENVEJECE: el INE publica el semestre siguiente a mediados de año. Cuando salga, hay que
// agregar el mes nuevo a `POVERTY_LINES` / `INDIGENCE_BASKET_2026`, mover `POVERTY_INCIDENCE` y
// actualizar el título y la descripción literales de la página — que es justo lo que
// `povertyLine.test.ts` exige, para que el snippet no se despegue del cuadro.

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

/** Ruta canónica de la página, para que el canonical y el breadcrumb no se escriban dos veces. */
export const POVERTY_LINE_PATH = '/linea-de-pobreza-uruguay'

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
 * Cuadro 3, canasta básica alimentaria (línea de indigencia) de un hogar UNIPERSONAL, 2026. El INE
 * publica esta serie por mes y sólo para el hogar de una persona: para un hogar más grande la
 * línea de indigencia se arma con la misma metodología de adulto equivalente del informe, que no
 * se reproduce acá porque el informe no publica sus coeficientes mes a mes.
 */
export const INDIGENCE_BASKET_2026: readonly IndigenceBasketMonth[] = [
  { month: 'Enero', montevideo: 6605, interior: 5677 },
  { month: 'Febrero', montevideo: 6666, interior: 5735 },
  { month: 'Marzo', montevideo: 6675, interior: 5732 },
  { month: 'Abril', montevideo: 6678, interior: 5740 },
  { month: 'Mayo', montevideo: 6699, interior: 5736 },
  { month: 'Junio', montevideo: 6736, interior: 5775 },
]

/** La incidencia medida, con su margen de error, tal como la publica el informe. */
export interface IncidenceReading {
  /** Personas bajo la línea, en porcentaje. */
  people: number
  /** Margen de error de `people`, en puntos porcentuales. */
  peopleMargin?: number
  /** Hogares bajo la línea, en porcentaje. */
  households: number
  /** Margen de error de `households`, en puntos porcentuales. */
  householdsMargin?: number
}

/** Pobreza: primer semestre de 2026 contra el mismo semestre de 2025. */
export const POVERTY_INCIDENCE = {
  period: 'primer semestre de 2026',
  previousPeriod: 'primer semestre de 2025',
  current: { people: 14.8, peopleMargin: 1.0, households: 11.6, householdsMargin: 0.7 },
  previous: { people: 17.7, households: 13.9 },
} as const satisfies {
  period: string
  previousPeriod: string
  current: IncidenceReading
  previous: IncidenceReading
}

/** Indigencia: mismo par de semestres. */
export const INDIGENCE_INCIDENCE = {
  period: 'primer semestre de 2026',
  previousPeriod: 'primer semestre de 2025',
  current: { people: 1.2, households: 1.0 },
  previous: { people: 1.8, households: 1.4 },
} as const satisfies {
  period: string
  previousPeriod: string
  current: IncidenceReading
  previous: IncidenceReading
}

/** Las fuentes oficiales, impresas en la página. */
export const POVERTY_LINE_SOURCES = [
  {
    label:
      'INE — «Estimación de la pobreza por el método del ingreso», primer semestre 2026 (cuadros 2 y 3)',
    url: 'https://www5.ine.gub.uy/documents/Demograf%C3%ADayEESS/HTML/ECH/Pobreza/2026/Informe%20Pobreza_Monetaria_%20primer%20semestre%202026.html',
  },
  {
    label: 'Presidencia — «La pobreza bajó 2,9 puntos porcentuales en un año» (07/10/2026)',
    url: 'https://www.gub.uy/presidencia/comunicacion/noticias/pobreza-indigencia-primer-semestre-2026',
  },
  {
    label: 'INE — Línea de pobreza: series y metodología',
    url: 'https://www.ine.gub.uy/linea-de-pobreza',
  },
] as const

/** La fila del cuadro para un tamaño de hogar, o `undefined` si el informe no lo publica. */
export function povertyLineFor(size: number): PovertyLineRow | undefined {
  return POVERTY_LINES.find(row => row.size === size)
}

/**
 * Cuánto más alta es la línea del hogar inquilino que la del propietario del mismo tamaño y
 * región. No es «el alquiler»: es la diferencia que deja la metodología al computar el alquiler
 * del inquilino y no computar el valor locativo del propietario.
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

/** El último mes de la serie de indigencia, que es el que la página destaca. */
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
