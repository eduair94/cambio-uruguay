// La ficha que ya no está: qué se le ofrece a quien llega a /alquileres/<key> cuando el aviso salió
// del índice. Sigue siendo un 404 con "noindex, follow" (devolver 200 la volvería un soft-404); lo
// que cambia es que deja de ser un callejón.
//
// Medido en GA4 (Uruguay, 11/10 a 7/11/2026): 119 de 931 vistas de fichas (12,8 %) cayeron en "Esta
// ficha ya no está en el índice vigente" — 62 desde Google, 34 desde asistentes de IA, 22 directas —
// y esa página no enlazaba ninguna otra vivienda ni la página del barrio. Un aviso que se va vivió
// una mediana de unas dos semanas, y los buscadores lo siguen mandando después.
//
// Este módulo es puro: lo usan la API (`server/utils/rentalGone.ts`) y la página. La API arma los
// datos y la página los lee de su error con `rentalGoneFromError`.
import { slugifyDepartment } from './departments'
import { RENTAL_DEPARTMENTS, type RentalPropertyType, type RentalPublicProperty } from './rentals'

/** Cuántas viviendas parecidas lista la ficha caída: las mismas seis que una ficha viva. */
export const RENTAL_GONE_SIMILAR_LIMIT = 6
/**
 * La API: cinco minutos en el borde. Un 404 lanzado con `createError` no puede llevarla, porque el
 * manejador de errores de Nitro le pone `cache-control: no-cache` a todo 404
 * (nitropack/dist/runtime/internal/error/prod.mjs), así que la API responde el 404 ella misma.
 */
export const RENTAL_GONE_CACHE_CONTROL = 'public, max-age=0, s-maxage=300'
/**
 * Un 404 SIN alternativas — una clave que no puede ser una vivienda, nada que ofrecer, o una
 * lectura de alternativas que falló — se guarda treinta segundos y no cinco minutos: si fue un
 * tropiezo pasajero de Mongo, el callejón no queda en el borde para todos los que lleguen después.
 */
export const RENTAL_GONE_BARE_CACHE_CONTROL = 'public, max-age=0, s-maxage=30'
/**
 * El documento HTML: lo mismo, más `must-revalidate`, que es obligatorio en todo HTML del sitio
 * (nombra `_nuxt/<hash>.js` que cada deploy renombra; docs/app/LOADING_INCIDENT_2026-09-06.md).
 */
export const RENTAL_GONE_PAGE_CACHE_CONTROL = 'public, max-age=0, must-revalidate, s-maxage=300'
export const RENTAL_GONE_PAGE_BARE_CACHE_CONTROL = 'public, max-age=0, must-revalidate, s-maxage=30'
/** La ficha viva: un minuto en el borde. */
export const RENTAL_FICHA_PAGE_CACHE_CONTROL = 'public, max-age=0, must-revalidate, s-maxage=60'
/** Un 503 nunca se guarda: es la respuesta de un problema, no de la ficha. */
export const RENTAL_FICHA_ERROR_CACHE_CONTROL = 'no-store, max-age=0'

/**
 * El `cache-control` del documento de /alquileres/<key>: viva, un minuto; caída con algo que
 * ofrecer, cinco; caída sin nada (ver RENTAL_GONE_BARE_CACHE_CONTROL), treinta segundos; 503, nunca.
 */
export function rentalFichaCacheControl(state: {
  /** La lectura de la ficha terminó en error (404 o 503). */
  failed: boolean
  status: 404 | 503
  /** El 404 trae datos de la ficha caída (`rentalGoneFromError` no es null). */
  alternatives: boolean
}): string {
  if (!state.failed) return RENTAL_FICHA_PAGE_CACHE_CONTROL
  if (state.status !== 404) return RENTAL_FICHA_ERROR_CACHE_CONTROL
  return state.alternatives ? RENTAL_GONE_PAGE_CACHE_CONTROL : RENTAL_GONE_PAGE_BARE_CACHE_CONTROL
}

export interface RentalGoneSummary {
  department: string | null
  neighborhood: string | null
  propertyType: RentalPropertyType | null
  bedrooms: number | null
  /** El último día que la vimos (YYYY-MM-DD); null si la fila ya se podó. */
  lastSeen: string | null
}

export interface RentalGoneLink {
  path: string
  label: string
}

export interface RentalGoneData {
  gone: RentalGoneSummary
  /** Una vivienda viva que parece ser la misma, todavía publicada en otro portal o con otra clave. */
  lookalike: RentalPublicProperty | null
  similar: RentalPublicProperty[]
  /** La página de su barrio, sólo si es indexable (la misma regla que la ficha viva). */
  barrioLink: RentalGoneLink | null
}

const PROPERTY_TYPES: readonly RentalPropertyType[] = [
  'apartamento',
  'casa',
  'habitacion',
  'local',
  'oficina',
  'garaje',
  'terreno',
  'otro',
]
const BARRIO_PATH = /^\/alquiler\/([a-z0-9-]+)\/([a-z0-9-]+)$/

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null
const text = (value: unknown, max: number): string | null =>
  typeof value === 'string' && value.trim() && value.length <= max ? value.trim() : null

const DEPARTMENT_SLUGS = RENTAL_DEPARTMENTS.map(name => ({ name, slug: slugifyDepartment(name) }))
  // "rio-negro" antes que un hipotético "rio": gana el prefijo más largo.
  .sort((a, b) => b.slug.length - a.slug.length)
const DEPARTMENT_BY_SLUG = new Map(DEPARTMENT_SLUGS.map(item => [item.slug, item.name]))

function summary(value: unknown): RentalGoneSummary | null {
  const row = record(value)
  if (!row) return null
  const bedrooms =
    typeof row.bedrooms === 'number' &&
    Number.isInteger(row.bedrooms) &&
    row.bedrooms >= 0 &&
    row.bedrooms <= 20
      ? row.bedrooms
      : null
  const lastSeen =
    typeof row.lastSeen === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(row.lastSeen)
      ? row.lastSeen
      : null
  return {
    department: text(row.department, 60),
    neighborhood: text(row.neighborhood, 80),
    propertyType: PROPERTY_TYPES.includes(row.propertyType as RentalPropertyType)
      ? (row.propertyType as RentalPropertyType)
      : null,
    bedrooms,
    lastSeen,
  }
}

function property(value: unknown): RentalPublicProperty | null {
  const row = record(value)
  return row && typeof row.key === 'string' && row.key && Array.isArray(row.offers)
    ? (row as unknown as RentalPublicProperty)
    : null
}

function link(value: unknown): RentalGoneLink | null {
  const row = record(value)
  const path = typeof row?.path === 'string' && BARRIO_PATH.test(row.path) ? row.path : null
  const label = text(row?.label, 80)
  return path && label ? { path, label } : null
}

/**
 * Los datos de la ficha caída, desde el error que vio la página. Dos formas posibles: el error con
 * los datos en `data` (un `createError` directo) y el de `$fetch`, cuyo `data` es el cuerpo JSON
 * del 404, con los datos en `data.data`. Cualquier otra cosa, o un 503, es null.
 */
export function rentalGoneFromError(error: unknown): RentalGoneData | null {
  const outer = record(record(error)?.data)
  if (!outer) return null
  const payload = record(outer.gone) ? outer : record(outer.data)
  const gone = summary(payload?.gone)
  if (!payload || !gone) return null
  const similar = Array.isArray(payload.similar)
    ? payload.similar
        .map(property)
        .filter((row): row is RentalPublicProperty => row !== null)
        .slice(0, RENTAL_GONE_SIMILAR_LIMIT)
    : []
  return {
    gone,
    lookalike: property(payload.lookalike),
    similar,
    barrioLink: link(payload.barrioLink),
  }
}

/** El departamento de una clave (`montevideo-pocitos-…`, `san-jose-…`), o null. */
export function rentalGoneDepartmentFromKey(key: string): string | null {
  return DEPARTMENT_SLUGS.find(item => key.startsWith(`${item.slug}-`))?.name ?? null
}

/**
 * La página de barrio de una clave que ya no tiene fila: la clave se arma como
 * `<departamento>-<barrio>-<calle>-<hash>` (classes/rentals/dedupe.ts `propertyKey`), así que gana
 * el barrio cuyo `<departamento>-<barrio>` es el prefijo más largo. Facebook arma
 * `<departamento>-<tipo>-<hash>`: ahí no hay barrio y queda el departamento.
 *
 * El prefijo más largo se busca entre TODOS los barrios conocidos (`known`: los del relevamiento
 * de precios y los 62 del INE, `<departamento>-<barrio>`), no sólo entre los que tienen página: si
 * no, `montevideo-cerro-norte-…` caía en "Cerro" y `montevideo-malvin-norte-…` en "Malvín", que
 * para el INE son otros barrios. Sólo se enlaza cuando el más largo es el de una página indexable;
 * si no, null y la ficha ofrece el departamento.
 */
export function rentalGoneBarrioFromKey(
  key: string,
  links: Iterable<RentalGoneLink>,
  known: Iterable<string> = []
): (RentalGoneLink & { department: string }) | null {
  const names = (prefix: string) => key === prefix || key.startsWith(`${prefix}-`)
  let best: (RentalGoneLink & { department: string }) | null = null
  let bestLength = 0
  for (const item of links) {
    const match = BARRIO_PATH.exec(item.path)
    if (!match) continue
    const prefix = `${match[1]}-${match[2]}`
    const department = DEPARTMENT_BY_SLUG.get(match[1]!)
    if (!department || !names(prefix)) continue
    if (prefix.length > bestLength) {
      best = { path: item.path, label: item.label, department }
      bestLength = prefix.length
    }
  }
  if (!best) return null
  for (const prefix of known) if (prefix.length > bestLength && names(prefix)) return null
  return best
}

/**
 * "Ver alquileres en Pocitos": el directorio con lo que se fue — departamento, el barrio sólo si
 * tiene página indexable (su nombre es el de esa página, nunca la grafía cruda del aviso), tipo y
 * dormitorios con la misma regla que las filas de la página del barrio (`bedroomsExact`, y "4 o
 * más" abierto). Sin departamento no hay a dónde mandar.
 */
export function rentalGoneDirectoryLink(
  gone: RentalGoneSummary,
  barrioLink: RentalGoneLink | null
): RentalGoneLink | null {
  if (!gone.department) return null
  const params = new URLSearchParams({ department: gone.department })
  if (barrioLink) params.set('neighborhood', barrioLink.label)
  if (gone.propertyType) params.set('type', gone.propertyType)
  if (gone.bedrooms !== null) {
    if (gone.bedrooms >= 4) params.set('bedrooms', '4')
    else {
      params.set('bedrooms', String(gone.bedrooms))
      if (gone.bedrooms > 0) params.set('bedroomsExact', '1')
    }
  }
  return {
    path: `/alquileres-uruguay?${params.toString()}`,
    label: barrioLink?.label ?? gone.department,
  }
}
