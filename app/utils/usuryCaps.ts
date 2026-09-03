// Un solo tope de usura para todo el sitio.
//
// POR QUÉ EXISTE ESTE ARCHIVO. El 2026-09-03 el sitio publicaba DOS topes distintos al mismo
// tiempo y los dos decían "vigente": `/ley-de-usura-uruguay` mostraba 133,49 % —el vigente, leído
// del PDF del BCU esa misma mañana— mientras `/prestamos-p2p-uruguay`, `/mejores-prestamos-uruguay`
// y parte de `/adelanto-de-efectivo-tarjeta-de-credito` mostraban 130,93 %, que es el trimestre
// anterior congelado en el código.
//
// No es un descuido puntual: el BCU republica la tabla TODOS LOS MESES sobre una ventana trimestral
// móvil, así que cualquier número escrito a mano en una página envejece en semanas. La grilla viva
// ya existía (`/api/bcu-rates`, que alimenta pm2 `currency-bcu-rates` y prueba la aritmética de la
// Ley 18.212 dos veces); lo que faltaba era que las OTRAS páginas la leyeran.
//
// Lo que este archivo NO hace: inventar las filas que la grilla no trae. El parser del BCU almacena
// seis filas —consumo en pesos y en dólares, por tramo y por plazo— y no las de autorización de
// descuento ni retención de haberes. Esas dos siguen siendo una lectura fechada a mano, y salen
// marcadas como tales en vez de mezclarse con las vivas bajo la misma palabra "vigente".
import type { BcuCapRow } from './cashAdvance'

/** Qué fila de la grilla del BCU corresponde a cada segmento publicado. */
export type UsuryGridKey =
  | 'menor10kUI|corto|UYU'
  | 'menor10kUI|largo|UYU'
  | 'mayor10kUI|corto|UYU'
  | 'mayor10kUI|largo|UYU'
  | 'menor10kUI|corto|USD'
  | 'menor10kUI|largo|USD'

export function usuryGridKey(row: BcuCapRow): UsuryGridKey {
  return `${row.bracket}|${row.cortoPlazo ? 'corto' : 'largo'}|${row.currency}` as UsuryGridKey
}

export interface UsuryCapRow {
  segment: string
  currency: 'UYU' | 'USD'
  meanPct: number
  capPct: number
  note?: string
  /** La fila que le corresponde en la grilla del BCU; ausente = no se refresca sola. */
  grid?: UsuryGridKey
  /** `true` cuando el número que se está mostrando salió de la grilla viva de hoy. */
  live?: boolean
}

/** Las tasas del BCU llegan como fracción (0,8447); acá se publican como porcentaje (84,47). */
const PERCENT_PER_UNIT = 100

/**
 * Piso y techo de una tasa de consumo anual, en porcentaje.
 *
 * Es la misma guarda de magnitud que corre el proxy, repetida acá por el mismo motivo: la prueba
 * aritmética de la ley (tope = media × 1,55) se cumple igual en fracción que en porcentaje, así que
 * un error de unidad la pasa entera y llega a la pantalla como "8447 %".
 */
const PERCENT_BAND: readonly [number, number] = [2, 500]

function usable(row: BcuCapRow): boolean {
  const mean = row.media * PERCENT_PER_UNIT
  const cap = row.tope * PERCENT_PER_UNIT
  if (!Number.isFinite(mean) || !Number.isFinite(cap)) return false
  return (
    mean >= PERCENT_BAND[0] &&
    mean <= PERCENT_BAND[1] &&
    cap >= PERCENT_BAND[0] &&
    cap <= PERCENT_BAND[1]
  )
}

/**
 * La tabla publicada, con las filas que el BCU refresca reemplazadas por las de hoy.
 *
 * Una fila sólo se reemplaza si la grilla la trae Y pasa la banda de magnitud. Si falta o no cierra,
 * queda la lectura de base: es preferible un número viejo y fechado que ninguno, y la página dice
 * cuál está mostrando.
 */
export function mergeUsuryCaps(
  baseline: readonly UsuryCapRow[],
  live: readonly BcuCapRow[] | null | undefined
): UsuryCapRow[] {
  const byKey = new Map<UsuryGridKey, BcuCapRow>()
  for (const row of live || []) {
    if (usable(row)) byKey.set(usuryGridKey(row), row)
  }
  return baseline.map(row => {
    const fresh = row.grid ? byKey.get(row.grid) : undefined
    if (!fresh) return { ...row, live: false }
    return {
      ...row,
      meanPct: fresh.media * PERCENT_PER_UNIT,
      capPct: fresh.tope * PERCENT_PER_UNIT,
      live: true,
    }
  })
}

/** El tope de una fila concreta, en porcentaje. `null` si esa fila no está. */
export function usuryCapOf(rows: readonly UsuryCapRow[], grid: UsuryGridKey): number | null {
  const row = rows.find(item => item.grid === grid)
  return row ? row.capPct : null
}

/** `133,49 %` a partir de 133.4915. Dos decimales, coma decimal, como lo imprime el BCU. */
export function usuryPct(value: number): string {
  return `${value.toLocaleString('es-UY', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`
}
