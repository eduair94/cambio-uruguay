// Qué filtros usa la gente en los directorios. Hasta acá cambiar un filtro no mandaba ningún
// evento, así que el sitio no podía saber si alguien filtra por garantía o por kilómetros.
//
// Viaja el NOMBRE del filtro y si se puso o se sacó, nunca su VALOR: un valor puede ser una
// dirección, un precio o texto libre que escribió el visitante, y GA4 no es lugar para eso.

export type FilterDirectory = 'alquileres' | 'ventas' | 'autos' | 'motos'

/**
 * Lo que no es un filtro: paginación, orden y vista. Además el punto de referencia de alquileres
 * (`refLat`/`refLng`/`refLabel`): sirve para ordenar por distancia, no filtra, y el cliente lo
 * recupera de la sesión después de hidratar, sin que nadie toque nada.
 */
export const IGNORED_FILTER_KEYS = [
  'page',
  'perPage',
  'orden',
  'sort',
  'view',
  'vista',
  'refLat',
  'refLng',
  'refLabel',
] as const

export type FilterChange = { filter: string; action: 'set' | 'clear' }

function isEmpty(value: unknown): boolean {
  return (
    value === undefined ||
    value === null ||
    value === '' ||
    (Array.isArray(value) && value.length === 0)
  )
}

/** JSON con las claves ordenadas, para que dos objetos iguales comparen iguales. */
function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    const entries = Object.keys(record)
      .sort()
      .map(key => `${JSON.stringify(key)}:${stableStringify(record[key])}`)
    return `{${entries.join(',')}}`
  }
  return JSON.stringify(value) ?? 'undefined'
}

/** Los filtros que cambiaron entre dos estados, por nombre y ordenados. Un valor vacío es ausencia. */
export function filterChanges(
  prev: Record<string, unknown>,
  next: Record<string, unknown>,
  ignore: readonly string[] = IGNORED_FILTER_KEYS
): FilterChange[] {
  const keys = new Set([...Object.keys(prev ?? {}), ...Object.keys(next ?? {})])
  const changes: FilterChange[] = []
  for (const filter of keys) {
    if (ignore.includes(filter)) continue
    const before = prev?.[filter]
    const after = next?.[filter]
    const had = !isEmpty(before)
    const has = !isEmpty(after)
    if (!had && !has) continue
    if (had && !has) changes.push({ filter, action: 'clear' })
    else if (!had || stableStringify(before) !== stableStringify(after))
      changes.push({ filter, action: 'set' })
  }
  return changes.sort((a, b) => (a.filter < b.filter ? -1 : a.filter > b.filter ? 1 : 0))
}

/** Un evento `directory_filter` por filtro cambiado, con el nombre y nunca el valor. */
export function trackFilterChanges(
  track: (event: string, params?: Record<string, unknown>) => void,
  directory: FilterDirectory,
  prev: Record<string, unknown>,
  next: Record<string, unknown>
): void {
  for (const { filter, action } of filterChanges(prev, next)) {
    track('directory_filter', { directory, filter, action })
  }
}
