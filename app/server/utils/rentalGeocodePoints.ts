import { Agent } from 'undici'

/**
 * IDE Uruguay nombra las direcciones del país mejor que nadie —calle, portal,
 * localidad y departamento oficiales— pero desde algún momento devuelve
 * `lat: 0, lng: 0` en TODA fila de calle, portal y esquina: sólo las localidades
 * y los puntos de interés traen coordenadas. Medido el 2026-09-09 contra
 * `candidates`, en las seis formas de consulta que usa el buscador —libre, con
 * departamento, con localidad y departamento, y con "Y" o "ESQ" para las
 * esquinas—: cero filas ubicables. Un fixture del 2026-09-07 guarda una esquina
 * con coordenadas, asi que el servicio cambió, no nosotros.
 *
 * Como el validador de puntos descarta 0,0 —y tiene que seguir haciéndolo: un
 * punto inventado manda al visitante a otro lado—, el buscador quedó devolviendo
 * cero resultados para cualquier dirección con número. Acá se le pide la
 * coordenada a Photon (OpenStreetMap), que sí las tiene: 18 de 20 direcciones
 * uruguayas medidas resolvieron al primer intento, incluidas las del interior.
 *
 * Photon NO decide qué direcciones existen: eso lo sigue diciendo IDE. Sólo
 * ubica una fila que IDE ya devolvió, y se acepta el punto únicamente si el
 * nombre de la calle coincide con el de la fila. Sin coincidencia no hay punto,
 * y sin punto la fila se descarta como hasta ahora.
 */
const PHOTON_ENDPOINT = 'https://photon.komoot.io/api/'

// Uruguay entero, con margen. Un punto de afuera nunca es una dirección de acá.
const URUGUAY_BOUNDS = { minLat: -35.1, maxLat: -30.0, minLng: -58.6, maxLng: -53.0 }

const photonDispatcher = new Agent({
  connections: 4,
  pipelining: 1,
  keepAliveTimeout: 4000,
  keepAliveMaxTimeout: 10000,
})

export interface RentalGeocodePointRow {
  address: string
  street: string | null
  /** Portal oficial de IDE. Si existe, el punto tiene que ser el de ESE numero. */
  portal: number | null
  locality: string | null
  department: string | null
}

const fold = (value: string) =>
  value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

/** "AVENIDA 18 DE JULIO 1234" y "18 de Julio" son la misma calle; "Italia" y "Italia Norte" no. */
function sameStreet(native: string, found: string): boolean {
  const a = fold(native).replace(
    /^(avenida|avda|av|bulevar|blvd|camino|calle|ruta|dr|doctor|general|gral)\s+/g,
    ''
  )
  const b = fold(found).replace(
    /^(avenida|avda|av|bulevar|blvd|camino|calle|ruta|dr|doctor|general|gral)\s+/g,
    ''
  )
  if (!a || !b) return false
  const words = (value: string) => new Set(value.split(' ').filter(word => word.length > 2))
  const one = words(a)
  const other = words(b)
  if (!one.size || !other.size) return a === b
  const shared = [...one].filter(word => other.has(word)).length
  return shared >= Math.min(one.size, other.size)
}

interface PhotonFeature {
  geometry?: { coordinates?: unknown }
  properties?: Record<string, unknown>
}

function pointFrom(
  feature: PhotonFeature,
  row: RentalGeocodePointRow
): { lat: number; lng: number } | null {
  const properties = feature.properties ?? {}
  if (properties.countrycode !== 'UY') return null
  const coordinates = feature.geometry?.coordinates
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null
  const [lng, lat] = coordinates
  if (
    typeof lat !== 'number' ||
    typeof lng !== 'number' ||
    !Number.isFinite(lat) ||
    !Number.isFinite(lng)
  )
    return null
  if (lat < URUGUAY_BOUNDS.minLat || lat > URUGUAY_BOUNDS.maxLat) return null
  if (lng < URUGUAY_BOUNDS.minLng || lng > URUGUAY_BOUNDS.maxLng) return null
  // El portal manda. Sin esta comprobacion, "SARANDI 690" caia en un edificio
  // LLAMADO "Sarandi 690" que esta en otra calle, a 2,5 km del portal real: la
  // busqueda quedaba peor que sin resultado, porque el punto parece bueno.
  if (row.portal !== null) {
    const housenumber = typeof properties.housenumber === 'string' ? properties.housenumber : null
    if (!housenumber) return null
    const digits = housenumber.match(/\d+/g)
    if (!digits || !digits.includes(String(row.portal))) return null
  }
  // Y la calle es la calle: el nombre propio de un local no alcanza.
  if (row.street) {
    const streetName = typeof properties.street === 'string' ? properties.street : null
    const ownName =
      properties.osm_key === 'highway' && typeof properties.name === 'string'
        ? properties.name
        : null
    const found = [streetName, ownName].filter((value): value is string => Boolean(value))
    if (!found.some(value => sameStreet(row.street!, value))) return null
  }
  // Misma localidad o mismo departamento: hay calles homonimas en todo el pais.
  const place = [properties.city, properties.county, properties.state, properties.district]
    .filter((value): value is string => typeof value === 'string')
    .map(fold)
  const expected = [row.locality, row.department]
    .filter((value): value is string => Boolean(value))
    .map(fold)
  if (expected.length && place.length && !expected.some(value => place.includes(value))) return null
  return { lat, lng }
}

/** Las direcciones no se mudan: lo resuelto se guarda por un dia. */
const cache = new Map<string, { until: number; value: { lat: number; lng: number } | null }>()

async function askPhoton(
  row: RentalGeocodePointRow,
  signal: AbortSignal
): Promise<{ lat: number; lng: number } | null> {
  const url = new URL(PHOTON_ENDPOINT)
  url.search = new URLSearchParams({
    q: row.address,
    limit: '3',
    // Sesgo hacia el centro del pais; el filtro por pais y por calle es el que decide.
    lat: '-34.6',
    lon: '-56.0',
  }).toString()
  const response = await fetch(url, {
    dispatcher: photonDispatcher,
    signal,
    redirect: 'error',
    headers: {
      Accept: 'application/json',
      'User-Agent': 'CambioUruguay/1.0 (+https://cambio-uruguay.com)',
    },
  } as RequestInit)
  if (!response.ok) {
    await response.body?.cancel().catch(() => undefined)
    return null
  }
  const raw: unknown = await response.json()
  if (!raw || typeof raw !== 'object') return null
  const features = (raw as { features?: unknown }).features
  if (!Array.isArray(features)) return null
  for (const feature of features.slice(0, 3)) {
    if (!feature || typeof feature !== 'object') continue
    const point = pointFrom(feature as PhotonFeature, row)
    if (point) return point
  }
  return null
}

/**
 * Completa las coordenadas que IDE no da. Devuelve filas nuevas: nunca muta la
 * respuesta del origen. Una fila que no se puede ubicar vuelve sin punto y el
 * llamador la descarta, que es exactamente lo que pasaba antes de este paso.
 */
export async function resolveRentalGeocodePoints(
  rows: RentalGeocodePointRow[],
  now: () => number = Date.now,
  ask: typeof askPhoton = askPhoton
): Promise<Array<{ lat: number; lng: number } | null>> {
  if (!rows.length) return []
  // Presupuesto propio: el buscador ya tiene su plazo, y esto es un extra.
  const signal = AbortSignal.timeout(3500)
  const time = now()
  for (const [key, entry] of cache) if (entry.until <= time) cache.delete(key)
  return Promise.all(
    rows.slice(0, 5).map(async row => {
      const key = fold(row.address)
      const cached = cache.get(key)
      if (cached) return cached.value
      let value: { lat: number; lng: number } | null = null
      try {
        value = await ask(row, signal)
      } catch {
        // Photon caido o lento: la fila queda sin punto y se descarta. Nada se inventa.
        return null
      }
      if (cache.size >= 512) cache.delete(cache.keys().next().value!)
      cache.set(key, { value, until: now() + (value ? 24 * 60 * 60_000 : 10 * 60_000) })
      return value
    })
  )
}
