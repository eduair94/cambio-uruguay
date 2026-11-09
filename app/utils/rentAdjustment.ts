/**
 * El Coeficiente de Reajuste de Alquileres (CRA) que el Poder Ejecutivo publica todos los meses.
 *
 * POR QUÉ ESTA PÁGINA EXISTE. El reajuste anual del alquiler no es un porcentaje que el propietario
 * elige: el art. 15 del Decreto-Ley 14.219 manda multiplicar el alquiler por la MENOR de dos
 * variaciones de doce meses —la del Índice de Precios del Consumo y la de la Unidad Reajustable de
 * Alquileres— y obliga al Poder Ejecutivo a publicar los valores y el coeficiente en el Diario
 * Oficial. Ese coeficiente sale en un decreto por mes, cada uno con su número, y nadie publica la
 * serie en un lugar donde se pueda leer: hay que ir decreto por decreto.
 *
 * NINGUNA CIFRA DE ACÁ SE CALCULA. Cada fila es el art. 4 de su propio decreto, leído en
 * impo.com.uy, con la URL al lado. El coeficiente NO se deriva de la UR ni del IPC que el sitio ya
 * publica: la URA es un promedio de tres meses de UR (art. 14) y el coeficiente es el menor de dos
 * cocientes, así que reconstruirlo acá sería inventar un número que el decreto ya dice.
 *
 * Módulo PURO: sin imports de Vue ni de Nuxt, para que `vitest` en entorno node lo cargue.
 */

/** Un mes de la serie: el coeficiente que rige para los alquileres que se actualizan en ese mes. */
export interface RentAdjustmentMonth {
  /** El mes en que se actualiza el alquiler, `YYYY-MM`. */
  readonly month: string
  /** Cómo se nombra ese mes en la página. */
  readonly label: string
  /** El coeficiente del art. 4 del decreto, tal cual lo publica. */
  readonly coefficient: number
  /** El decreto que lo fija, como lo numera IMPO. */
  readonly decree: string
  /** La ficha del decreto en IMPO, que es la fuente de la fila. */
  readonly decreeUrl: string
  /**
   * La fecha de publicación en el Diario Oficial, cuando se leyó en la ficha del decreto.
   *
   * Está sólo en las dos filas donde se verificó, y es el dato que sostiene lo que la página dice
   * sobre el desfasaje: el coeficiente de enero se publicó el 5 de febrero.
   */
  readonly publishedAt?: string
}

/**
 * Los diez meses de 2026 con coeficiente publicado, del más nuevo al más viejo.
 *
 * Cada uno leído en su decreto el 2026-11-09. La serie empieza en enero de 2026 y no antes porque
 * eso es lo que la tabla oficial de valores de IMPO muestra del año en curso; hacia atrás los
 * decretos existen y se pueden sumar sin cambiar nada de esta estructura.
 */
export const RENT_ADJUSTMENT_MONTHS: readonly RentAdjustmentMonth[] = [
  {
    month: '2026-10',
    label: 'octubre de 2026',
    coefficient: 1.0468,
    decree: '256/026',
    decreeUrl: 'https://www.impo.com.uy/bases/decretos/256-2026',
  },
  {
    month: '2026-09',
    label: 'setiembre de 2026',
    coefficient: 1.0455,
    decree: '229/026',
    decreeUrl: 'https://www.impo.com.uy/bases/decretos/229-2026',
  },
  {
    month: '2026-08',
    label: 'agosto de 2026',
    coefficient: 1.0427,
    decree: '195/026',
    decreeUrl: 'https://www.impo.com.uy/bases/decretos/195-2026',
    publishedAt: '2026-08-27',
  },
  {
    month: '2026-07',
    label: 'julio de 2026',
    coefficient: 1.0425,
    decree: '187/026',
    decreeUrl: 'https://www.impo.com.uy/bases/decretos/187-2026',
  },
  {
    month: '2026-06',
    label: 'junio de 2026',
    coefficient: 1.0377,
    decree: '139/026',
    decreeUrl: 'https://www.impo.com.uy/bases/decretos/139-2026',
  },
  {
    month: '2026-05',
    label: 'mayo de 2026',
    coefficient: 1.0316,
    decree: '108/026',
    decreeUrl: 'https://www.impo.com.uy/bases/decretos/108-2026',
  },
  {
    month: '2026-04',
    label: 'abril de 2026',
    coefficient: 1.0294,
    decree: '91/026',
    decreeUrl: 'https://www.impo.com.uy/bases/decretos/91-2026',
  },
  {
    month: '2026-03',
    label: 'marzo de 2026',
    coefficient: 1.0311,
    decree: '71/026',
    decreeUrl: 'https://www.impo.com.uy/bases/decretos/71-2026',
  },
  {
    month: '2026-02',
    label: 'febrero de 2026',
    coefficient: 1.0346,
    decree: '52/026',
    decreeUrl: 'https://www.impo.com.uy/bases/decretos/52-2026',
  },
  {
    month: '2026-01',
    label: 'enero de 2026',
    coefficient: 1.0365,
    decree: '23/026',
    decreeUrl: 'https://www.impo.com.uy/bases/decretos/23-2026',
    publishedAt: '2026-02-05',
  },
]

/** El día en que se leyó cada decreto de la serie. Lo imprime la página, nunca `new Date()`. */
export const RENT_ADJUSTMENT_VERIFIED_AT = '2026-11-09'

export const RENT_ADJUSTMENT_PATH = '/coeficiente-de-reajuste-de-alquileres-uruguay'

/** El último mes con coeficiente publicado. La serie está ordenada, así que es el primero. */
export const LATEST_RENT_ADJUSTMENT = RENT_ADJUSTMENT_MONTHS[0]!

/**
 * El aumento que implica un coeficiente, en por ciento y con dos decimales.
 *
 * Dos decimales porque el coeficiente trae cuatro: 1,0468 es 4,68 % exacto, no un redondeo. Se
 * redondea al centésimo de punto para que 1,0294 no imprima «2,9399999999999995 %».
 */
export function rentAdjustmentPercent(coefficient: number): number {
  return Math.round((coefficient - 1) * 10000) / 100
}

/** El por ciento con la coma uruguaya, listo para el texto: `4,68 %`. */
export function formatRentAdjustmentPercent(coefficient: number): string {
  return `${rentAdjustmentPercent(coefficient).toLocaleString('es-UY', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })} %`
}

/** El coeficiente con la coma uruguaya y sus cuatro decimales: `1,0468`. */
export function formatRentAdjustmentCoefficient(coefficient: number): string {
  return coefficient.toLocaleString('es-UY', {
    minimumFractionDigits: 4,
    maximumFractionDigits: 4,
  })
}

/**
 * El alquiler reajustado: el alquiler de hoy por el coeficiente, redondeado al peso.
 *
 * Al peso y no al centésimo porque es lo que se paga, y porque el decreto no dice nada sobre
 * redondeo: publicar centésimos sería precisión inventada. Un monto no positivo devuelve `null`,
 * que es lo que la página dibuja como «falta el alquiler» en vez de un cero.
 */
export function adjustedRent(rent: number, coefficient: number): number | null {
  if (!Number.isFinite(rent) || rent <= 0) return null
  return Math.round(rent * coefficient)
}

/** El mes de la serie con ese `YYYY-MM`, o `null`. */
export function rentAdjustmentFor(month: string): RentAdjustmentMonth | null {
  return RENT_ADJUSTMENT_MONTHS.find(entry => entry.month === month) ?? null
}
