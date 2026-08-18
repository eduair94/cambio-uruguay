// app/utils/electricVehicleTax.ts
//
// IMESI (Impuesto Específico Interno) a los vehículos categoría F eléctricos e
// híbridos en Uruguay: la matriz nueva que rige desde el 1/1/2027 (Decreto
// 147/026) comparada con la que rige hoy (Decreto 390/021), y una función pura
// para resolver, a partir del valor EN ADUANA y la propulsión, qué tasa toca
// hoy y cuál va a tocar en 2027.
//
// EVERY NUMBER HERE IS SOURCED. Verificado contra fuente primaria el 2026-08-18:
//   - Decreto 147/026 (promulgado 30/06/2026, publicado 03/07/2026, Diario
//     Oficial Nº 31.948, carillas 224-225). El texto de IMPO NO transcribe las
//     tasas (los literales a/b/c aparecen con la celda vacía): las tasas de
//     este módulo fueron leídas de la IMAGEN del Diario Oficial, no del HTML.
//     https://www.impo.com.uy/bases/decretos/147-2026
//     https://www.impo.com.uy/diariooficial/2026/07/03/224
//   - Decreto 390/021 (Diario Oficial Nº 30.825 del 07/12/2021, carilla 6) —
//     la tabla vigente hoy, que el 147/026 sustituye desde el 1/1/2027.
//     https://www.impo.com.uy/bases/decretos/390-2021
//     https://www.impo.com.uy/diariooficial/2021/12/07/6  (la imagen con la tabla)
//   - Decreto 96/990 art. 35 — definiciones de vehículo eléctrico e híbrido,
//     con la redacción de subcategorías dada por el Decreto 390/021 y la del
//     literal c) (mild hybrid) dada por el Decreto 276/023 de 11/09/2023.
//     https://www.impo.com.uy/bases/decretos/96-1990
//   - Numeral 11) del art. 1 del Título 11 del TEXTO ORDENADO 2023 (no el de
//     1996, que arrastra la redacción vieja sin "valor en aduana"): la
//     facultad de graduar el IMESI por valor en aduana viene del art. 661 de
//     la Ley 20.446 de 16/12/2025 (Presupuesto 2025-2029).
//     https://www.impo.com.uy/bases/todgi/11-2023
//
// WHAT WE DELIBERATELY DO NOT PUBLISH:
//   - Una tabla "modelo de auto -> precio final": el valor en aduana por
//     modelo NO es público (no hay canal público para consultarlo), así que
//     cualquier tabla de ese tipo sería una invención con apariencia oficial.
//   - El "factor 2" / "doble IMESI" que circula en el mercado: la base
//     imponible del numeral 11) es el precio REAL de venta al distribuidor
//     (Decreto 520/007 art. 1), no un precio ficto duplicado. Ese factor no
//     existe como regla jurídica y no se publica como si existiera.
//   - Una fecha de corte para unidades importadas en 2026 con primera
//     enajenación en 2027: el Decreto 147/026 no tiene artículo transitorio y
//     no hay norma publicada que lo resuelva. Se documenta como agujero, no
//     como respuesta.

/** Fecha en la que se verificó cada dato de este módulo contra fuente primaria. */
export const LAST_RESEARCHED = '2026-08-18'

/**
 * Umbral de valor en aduana que separa el literal a) del b). El decreto dice
 * "no supere los US$ 19.000", así que exactamente 19.000 SÍ entra en el tramo
 * bajo (desigualdad no estricta de este lado).
 */
export const CUSTOMS_VALUE_THRESHOLD_LOW_USD = 19_000

/**
 * Umbral de valor en aduana que separa el literal b) del c). El decreto dice
 * "superior a US$ 19.000 y no exceda los US$ 27.000": el límite inferior del
 * tramo b) es estrictamente mayor (19.000 exacto queda en el tramo a), y el
 * límite superior es no excluyente (27.000 exacto queda en el tramo b).
 */
export const CUSTOMS_VALUE_THRESHOLD_HIGH_USD = 27_000

/** Tramo de valor en aduana del Decreto 147/026: literales a), b) y c) del art. 1. */
export type CustomsBracket = 'a' | 'b' | 'c'

/**
 * Subcategoría de vehículo eléctrico híbrido, Decreto 96/990 art. 35 num. iv).
 * OJO: usa las mismas letras a/b/c que `CustomsBracket`, pero son dos cosas
 * distintas — una es tramo de valor, la otra es tipo de híbrido. No mezclar.
 */
export type HybridSubcategory = 'a' | 'b' | 'c'

/** Tipo de propulsión que cubre esta matriz (categoría F, pasajeros). */
export type Propulsion = 'electric' | 'hybrid'

/** Fila de cilindrada del motor térmico, categoría F. */
export type EngineRow = 'F1' | 'F2' | 'F3' | 'F4' | 'F5' | 'F6'

export const ENGINE_ROWS: readonly EngineRow[] = Object.freeze(['F1', 'F2', 'F3', 'F4', 'F5', 'F6'])

export interface EngineRowRange {
  row: EngineRow
  label: string
  minCc: number
  /** null en F6, que no tiene techo ("más de 3.000 cc"). */
  maxCc: number | null
}

/**
 * Rangos de cilindrada de cada fila F1-F6, tal como los describe el dossier
 * leído de la matriz del Diario Oficial. El decreto no explicita el operador
 * de desigualdad en los bordes de cilindrada (sólo lo hace para el valor en
 * aduana); por consistencia con esa regla se aplica el mismo criterio: el
 * límite inferior de cada tramo es excluyente y el superior es incluyente.
 */
export const ENGINE_ROW_RANGES: readonly EngineRowRange[] = Object.freeze([
  { row: 'F1', label: 'hasta 1.000 cc', minCc: 0, maxCc: 1_000 },
  { row: 'F2', label: '1.000 a 1.500 cc', minCc: 1_000, maxCc: 1_500 },
  { row: 'F3', label: '1.500 a 2.000 cc', minCc: 1_500, maxCc: 2_000 },
  { row: 'F4', label: '2.000 a 2.500 cc', minCc: 2_000, maxCc: 2_500 },
  { row: 'F5', label: '2.500 a 3.000 cc', minCc: 2_500, maxCc: 3_000 },
  { row: 'F6', label: 'más de 3.000 cc', minCc: 3_000, maxCc: null },
])

/** Resuelve la fila F1-F6 que corresponde a una cilindrada dada, en cc. */
export function resolveEngineRow(engineCc: number): EngineRow {
  const cc = Number.isFinite(engineCc) ? Math.max(0, engineCc) : 0
  for (const range of ENGINE_ROW_RANGES) {
    if (range.maxCc === null || cc <= range.maxCc) return range.row
  }
  return 'F6'
}

/**
 * Resuelve el tramo de valor en aduana (literal a/b/c del Decreto 147/026).
 * Ver los comentarios de los dos umbrales para el porqué de cada desigualdad.
 */
export function resolveCustomsBracket(customsValueUsd: number): CustomsBracket {
  const value = Number.isFinite(customsValueUsd) ? Math.max(0, customsValueUsd) : 0
  if (value <= CUSTOMS_VALUE_THRESHOLD_LOW_USD) return 'a'
  if (value <= CUSTOMS_VALUE_THRESHOLD_HIGH_USD) return 'b'
  return 'c'
}

type EngineRowRates = Record<EngineRow, number>
type HybridRates = Record<HybridSubcategory, EngineRowRates>

interface Decree147Bracket {
  /** Tasa fija para eléctricos puros en este tramo: no tienen cilindrada. */
  electric: number
  hybrid: HybridRates
}

/**
 * LA MATRIZ COMPLETA del Decreto 147/026, vigente desde el 1/1/2027. Leída de
 * la imagen del Diario Oficial Nº 31.948, carillas 224-225 (columnas III y IV,
 * fila F para eléctricos, filas F1-F6 para híbridos según subcategoría).
 */
export const DECREE_147_2026_MATRIX: Record<CustomsBracket, Decree147Bracket> = Object.freeze({
  a: Object.freeze({
    electric: 0,
    hybrid: Object.freeze({
      a: Object.freeze({ F1: 2, F2: 2, F3: 2, F4: 2, F5: 34.5, F6: 34.5 }),
      b: Object.freeze({ F1: 3.45, F2: 3.45, F3: 3.45, F4: 3.45, F5: 34.5, F6: 34.5 }),
      c: Object.freeze({ F1: 7, F2: 7, F3: 14, F4: 34.5, F5: 34.5, F6: 34.5 }),
    }),
  }),
  b: Object.freeze({
    electric: 5,
    hybrid: Object.freeze({
      a: Object.freeze({ F1: 7, F2: 7, F3: 7, F4: 7, F5: 34.5, F6: 34.5 }),
      b: Object.freeze({ F1: 8.45, F2: 8.45, F3: 8.45, F4: 8.45, F5: 34.5, F6: 34.5 }),
      c: Object.freeze({ F1: 12, F2: 12, F3: 19, F4: 34.5, F5: 34.5, F6: 34.5 }),
    }),
  }),
  c: Object.freeze({
    electric: 9,
    hybrid: Object.freeze({
      a: Object.freeze({ F1: 11, F2: 11, F3: 11, F4: 11, F5: 34.5, F6: 34.5 }),
      b: Object.freeze({ F1: 12.45, F2: 12.45, F3: 12.45, F4: 12.45, F5: 34.5, F6: 34.5 }),
      c: Object.freeze({ F1: 16, F2: 19, F3: 23, F4: 34.5, F5: 34.5, F6: 34.5 }),
    }),
  }),
}) as Record<CustomsBracket, Decree147Bracket>

/**
 * LO VIGENTE HOY (hasta el 31/12/2026), Decreto 390/021. A diferencia de la
 * matriz 2027, esta tabla NO distingue por valor en aduana: la misma tasa
 * aplica sin importar cuánto valga el vehículo.
 */
export const DECREE_390_2021_CURRENT_RATES = Object.freeze({
  /** Eléctrico puro: 0%, sin importar el valor en aduana. */
  electric: 0,
  hybrid: Object.freeze({
    a: Object.freeze({ F1: 2, F2: 2, F3: 2, F4: 2, F5: 34.5, F6: 34.5 }),
    b: Object.freeze({ F1: 3.45, F2: 3.45, F3: 3.45, F4: 3.45, F5: 34.5, F6: 34.5 }),
    c: Object.freeze({ F1: 7, F2: 7, F3: 14, F4: 34.5, F5: 34.5, F6: 34.5 }),
  }) as HybridRates,
  /** De referencia, para dimensionar: nafta y diésel no cambian con este decreto. */
  fuelReference: Object.freeze({
    nafta: Object.freeze({
      F1: 23,
      F2: 28.75,
      F3: 34.5,
      F4: 40.25,
      F5: 40.25,
      F6: 46,
    }) as EngineRowRates,
    /** El decreto fija 115% en las seis filas F1-F6 para diésel. */
    dieselFlatPct: 115,
  }),
})

/** Definición textual de cada subcategoría de híbrido, Decreto 96/990 art. 35 num. iv). */
export interface HybridSubcategoryDefinition {
  id: HybridSubcategory
  label: string
  description: string
}

export const HYBRID_SUBCATEGORY_DEFINITIONS: readonly HybridSubcategoryDefinition[] = Object.freeze(
  [
    {
      id: 'a',
      label: 'Con recarga exterior (enchufable / PHEV)',
      description:
        'El dispositivo de almacenamiento de energía "puede ser cargado desde una fuente externa".',
    },
    {
      id: 'b',
      label: 'Sin recarga exterior (híbrido común / HEV)',
      description:
        'El dispositivo de almacenamiento "no puede ser cargado desde una fuente externa".',
    },
    {
      id: 'c',
      label: 'Mild hybrid o híbrido suave',
      description:
        'No tiene la posibilidad de impulsarse en modo eléctrico puro o exclusivamente por medio de un motor eléctrico. El decreto aclara expresamente que los vehículos que sólo tienen sistema start/stop NO se consideran mild hybrid.',
    },
  ]
)

export interface ResolveVehicleTaxInput {
  /** Valor en aduana en dólares, no precio de venta al público. */
  customsValueUsd: number
  propulsion: Propulsion
  /** Obligatorio cuando `propulsion` es 'hybrid'. Ignorado para eléctricos puros. */
  hybridSubcategory?: HybridSubcategory
  /** Cilindrada del motor térmico en cc. Obligatoria para híbridos; un eléctrico puro no tiene. */
  engineCc?: number
}

export interface ResolveVehicleTaxResult {
  customsValueUsd: number
  propulsion: Propulsion
  hybridSubcategory: HybridSubcategory | null
  /** null para eléctricos puros: no tienen cilindrada ni fila F1-F6. */
  engineCc: number | null
  engineRow: EngineRow | null
  /** Tramo de valor en aduana (a/b/c) del Decreto 147/026 que se aplicó. */
  customsBracket: CustomsBracket
  /** Tasa de IMESI que va a aplicar desde el 1/1/2027. */
  rate2027Pct: number
  /** Tasa de IMESI vigente hoy, Decreto 390/021. */
  rateTodayPct: number
  /** rate2027Pct - rateTodayPct, en puntos porcentuales. Puede ser 0. */
  diffPct: number
}

function round2(value: number): number {
  return Math.round(value * 100) / 100
}

/**
 * Resuelve, para un vehículo dado, la tasa de IMESI 2027 vs. la vigente hoy.
 *
 * Pura y sin efectos: no accede a fecha del sistema ni a estado externo, así
 * que la calculadora de la página puede llamarla en cada cambio de input.
 *
 * Para híbridos, `hybridSubcategory` y `engineCc` son obligatorios: sin la
 * subcategoría no hay forma de saber qué columna de la matriz usar (las tasas
 * cambian mucho entre a/b/c), y sin cilindrada no hay fila F1-F6. Se lanza un
 * error explícito antes que inventar un valor por defecto.
 */
export function resolveVehicleTax(input: ResolveVehicleTaxInput): ResolveVehicleTaxResult {
  const customsValueUsd = Number.isFinite(input.customsValueUsd)
    ? Math.max(0, input.customsValueUsd)
    : 0
  const customsBracket = resolveCustomsBracket(customsValueUsd)

  if (input.propulsion === 'electric') {
    const rate2027Pct = DECREE_147_2026_MATRIX[customsBracket].electric
    const rateTodayPct = DECREE_390_2021_CURRENT_RATES.electric
    return {
      customsValueUsd,
      propulsion: 'electric',
      hybridSubcategory: null,
      engineCc: null,
      engineRow: null,
      customsBracket,
      rate2027Pct,
      rateTodayPct,
      diffPct: round2(rate2027Pct - rateTodayPct),
    }
  }

  if (!input.hybridSubcategory) {
    throw new TypeError(
      'resolveVehicleTax: hybridSubcategory es obligatorio cuando propulsion es "hybrid"'
    )
  }
  if (!Number.isFinite(input.engineCc)) {
    throw new TypeError('resolveVehicleTax: engineCc es obligatorio cuando propulsion es "hybrid"')
  }

  const engineCc = Math.max(0, input.engineCc as number)
  const engineRow = resolveEngineRow(engineCc)
  const hybridSubcategory = input.hybridSubcategory

  const rate2027Pct = DECREE_147_2026_MATRIX[customsBracket].hybrid[hybridSubcategory][engineRow]
  const rateTodayPct = DECREE_390_2021_CURRENT_RATES.hybrid[hybridSubcategory][engineRow]

  return {
    customsValueUsd,
    propulsion: 'hybrid',
    hybridSubcategory,
    engineCc,
    engineRow,
    customsBracket,
    rate2027Pct,
    rateTodayPct,
    diffPct: round2(rate2027Pct - rateTodayPct),
  }
}

export interface ElectricVehicleTaxSource {
  label: string
  url: string
}

/** Fuentes primarias detrás de cada cifra de este módulo, en orden de cita. */
export const ELECTRIC_VEHICLE_TAX_SOURCES: readonly ElectricVehicleTaxSource[] = Object.freeze([
  {
    label:
      'Decreto 147/026 — modificación de las tasas a vehículos categoría F eléctricos o híbridos desde el 1/1/2027 (IMPO)',
    url: 'https://www.impo.com.uy/bases/decretos/147-2026',
  },
  {
    label:
      'Diario Oficial Nº 31.948, 03/07/2026, carilla 224 — imagen con la matriz de tasas del Decreto 147/026 (el HTML de IMPO no las transcribe)',
    url: 'https://www.impo.com.uy/diariooficial/2026/07/03/224',
  },
  {
    label:
      'Decreto 390/021 — tabla de tasas vigente hasta el 31/12/2026 (el HTML de IMPO tampoco transcribe su art. 1: la tabla se leyó de la imagen del Diario Oficial Nº 30.825, 07/12/2021, carilla 6)',
    url: 'https://www.impo.com.uy/bases/decretos/390-2021',
  },
  {
    label:
      'Decreto 96/990, art. 35 — definiciones de vehículo eléctrico e híbrido y sus subcategorías (con las redacciones dadas por el Decreto 390/021 y, para el literal c) mild hybrid, por el Decreto 276/023 de 11/09/2023)',
    url: 'https://www.impo.com.uy/bases/decretos/96-1990',
  },
  {
    label:
      'Texto Ordenado 2023 (no el de 1996, que conserva la redacción vieja), Título 11, art. 1 numeral 11) — facultad del Poder Ejecutivo de graduar el IMESI según el valor en aduana',
    url: 'https://www.impo.com.uy/bases/todgi/11-2023',
  },
  {
    label:
      'Ley 20.446 de 16/12/2025 (Presupuesto Nacional 2025-2029), art. 661 — origen de esa facultad',
    url: 'https://www.impo.com.uy/bases/leyes/20446-2025/661',
  },
  {
    label:
      'Decreto 520/007, arts. 1, 4 y 5 — base imponible del IMESI (precio real al distribuidor, no ficto) y alícuota del anticipo en la importación',
    url: 'https://www.impo.com.uy/bases/decretos/520-2007',
  },
])
