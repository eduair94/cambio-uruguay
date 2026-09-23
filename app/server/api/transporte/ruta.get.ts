// La ÚNICA consulta que `/conviene-auto-moto-o-omnibus-uruguay` hace a un servicio externo en el
// momento: el visitante escribió dos direcciones exactas y quiere los kilómetros y los minutos de
// ESE trayecto, no los del centroide de su barrio.
//
// Es una excepción declarada a la regla del repo ("lo que procesa la base se calcula en un job y se
// guarda"): el camino por defecto de la página —elegir barrio, o escribir los kilómetros— no llama a
// nadie. Por eso acá hay tres guardas que la matriz del job no necesita:
//
//   1. **Caché por par de coordenadas REDONDEADAS a 3 decimales (~110 m).** Dos personas de la misma
//      cuadra comparten la respuesta, y una que aprieta "calcular" cuatro veces gasta una sola ruta.
//   2. **Límite por IP**, además del que ya tiene el geocodificador por su cuenta.
//   3. **Una llamada por perfil y en serie**, con un hueco entre ellas: OSRM de FOSSGIS es un
//      servicio DONADO. La moto va en la misma llamada que el auto porque se rutea igual.
//
// ATRIBUCIÓN OBLIGATORIA, y por eso viaja en la respuesta y no sólo en el pie de la página: los datos
// son de OpenStreetMap bajo ODbL y el ruteo lo dona FOSSGIS e.V.
//
// LO QUE NO SE HACE: no se guarda la dirección, no se loguea y no entra en la caché de borde
// (`no-store`). Es dato del visitante.
import { lookupRentalGeocode, RentalGeocodeError } from '../../utils/rentalGeocode'
import { TRANSPORT_ROUTER_ATTRIBUTION } from '../../utils/transportSnapshot'
import type { TransportMode, TransportTiming } from '../../../utils/transportModel'

export interface TransportRutaPoint {
  label: string
  lat: number
  lon: number
}

export interface TransportRutaResponse {
  ok: boolean
  /** Qué falló, en español y listo para imprimir. `null` cuando salió bien. */
  reason: string | null
  from: TransportRutaPoint | null
  to: TransportRutaPoint | null
  timing: Partial<Record<TransportMode, TransportTiming>>
  /** Los modos que el ruteador no resolvió. Se declaran; la página no los estima en silencio. */
  missing: TransportMode[]
  attribution: { label: string; url: string }[]
}

const OSRM_URL = process.env.TRANSPORT_OSRM_URL || 'https://routing.openstreetmap.de'
const OSRM_GAP_MS = 400
const TIMEOUT_MS = 8000
const UA =
  'CambioUruguayBot/1.0 (+https://cambio-uruguay.com/conviene-auto-moto-o-omnibus-uruguay; transport cost comparator)'

/**
 * Los tres perfiles que hay que pedir, y a qué modos alimenta cada uno.
 *
 * `routed-car` sirve al auto Y a la moto: ningún ruteador público modela lo que de verdad hace a una
 * moto más rápida en ciudad, así que se publica la ruta del auto y la página lo dice. Descontarle
 * minutos por suposición sería decidir el resultado de la comparación con un número inventado.
 *
 * `routed-bike` sirve a la bici y le presta los KILÓMETROS al monopatín, que circula por la misma
 * red pero a otra velocidad: se le pasa la distancia con `routeMinutes: 0` y el modelo le aplica su
 * propia velocidad de crucero declarada.
 *
 * `router.project-osrm.org` NO se usa nunca: acepta `/bike/` y `/foot/`, contesta 200 y devuelve el
 * resultado de AUTO en los seis perfiles (medido 22/9/2026). Un "a pie" a 41,9 km/h no se nota en un
 * test, se nota en producción.
 */
const PROFILES: { profile: string; modes: TransportMode[] }[] = [
  { profile: 'routed-car', modes: ['auto', 'moto'] },
  { profile: 'routed-bike', modes: ['bici'] },
  { profile: 'routed-foot', modes: ['pie'] },
]

const ROUTED_MODES: TransportMode[] = ['auto', 'moto', 'bici', 'monopatin', 'pie']

// Estado por proceso, igual que el geocodificador de alquileres: la app es pm2 cluster ×2, así que
// estos topes son por instancia y por eso van holgados — su trabajo es frenar un bucle, no repartir
// cuota con precisión.
const routeCache = new Map<
  string,
  { until: number; value: Partial<Record<TransportMode, TransportTiming>> }
>()
const clients = new Map<string, { until: number; count: number }>()
let lastCallAt = 0

const sleep = (ms: number): Promise<void> => new Promise(resolve => setTimeout(resolve, ms))

/** ~110 m de lado: dos direcciones de la misma cuadra comparten la ruta y el servicio donado. */
function roundCoordinate(value: number): number {
  return Math.round(value * 1000) / 1000
}

function overLimit(key: string, now: number): boolean {
  for (const [id, window] of clients) if (window.until <= now) clients.delete(id)
  const window = clients.get(key)
  if (window && window.count >= 30) return true
  if (!window && clients.size >= 2048) return true
  clients.set(key, { count: (window?.count ?? 0) + 1, until: window?.until ?? now + 300_000 })
  return false
}

async function osrmLeg(
  profile: string,
  from: TransportRutaPoint,
  to: TransportRutaPoint
): Promise<{ meters: number; seconds: number } | null> {
  const elapsed = Date.now() - lastCallAt
  if (elapsed < OSRM_GAP_MS) await sleep(OSRM_GAP_MS - elapsed)
  lastCallAt = Date.now()

  const coordinates = `${from.lon.toFixed(6)},${from.lat.toFixed(6)};${to.lon.toFixed(6)},${to.lat.toFixed(6)}`
  const url = `${OSRM_URL}/${profile}/route/v1/driving/${coordinates}?overview=false&alternatives=false&steps=false`
  const signal = AbortSignal.timeout(TIMEOUT_MS)
  try {
    const response = await fetch(url, {
      signal,
      redirect: 'error',
      headers: { accept: 'application/json', 'user-agent': UA },
    })
    if (!response.ok) {
      await response.body?.cancel().catch(() => undefined)
      return null
    }
    const json = (await response.json()) as {
      code?: string
      routes?: { distance?: number; duration?: number }[]
    }
    if (json?.code !== 'Ok') return null
    const leg = json.routes?.[0]
    const meters = Number(leg?.distance)
    const seconds = Number(leg?.duration)
    if (!Number.isFinite(meters) || !Number.isFinite(seconds) || meters <= 0 || seconds <= 0)
      return null
    return { meters, seconds }
  } catch {
    return null
  }
}

function emptyResponse(reason: string): TransportRutaResponse {
  return {
    ok: false,
    reason,
    from: null,
    to: null,
    timing: {},
    missing: [...ROUTED_MODES],
    attribution: [],
  }
}

async function geocodeOne(text: string, clientKey: string): Promise<TransportRutaPoint | null> {
  const found = await lookupRentalGeocode({ q: text }, clientKey)
  const item = found.items[0]
  if (!item) return null
  return { label: item.label, lat: item.lat, lon: item.lng }
}

export default defineEventHandler(async (event): Promise<TransportRutaResponse> => {
  // Las direcciones son dato del visitante: no van a la caché compartida ni a los registros.
  setResponseHeader(event, 'cache-control', 'no-store')

  const query = getQuery(event)
  const desde = typeof query.desde === 'string' ? query.desde.trim() : ''
  const hasta = typeof query.hasta === 'string' ? query.hasta.trim() : ''
  if (desde.length < 4 || hasta.length < 4 || desde.length > 180 || hasta.length > 180) {
    return emptyResponse('Escribí las dos direcciones completas para calcular el trayecto.')
  }

  const clientKey = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const now = Date.now()
  if (overLimit(clientKey, now)) {
    setResponseHeader(event, 'retry-after', '300')
    return emptyResponse(
      'Demasiadas consultas de dirección seguidas. Probá en unos minutos, o elegí los barrios de la lista.'
    )
  }

  let from: TransportRutaPoint | null
  let to: TransportRutaPoint | null
  try {
    // En paralelo: el geocodificador ya tiene su propio tope por IP y por proceso.
    ;[from, to] = await Promise.all([geocodeOne(desde, clientKey), geocodeOne(hasta, clientKey)])
  } catch (error) {
    const limited = error instanceof RentalGeocodeError && error.statusCode === 429
    return emptyResponse(
      limited
        ? 'Demasiadas búsquedas de dirección seguidas. Probá en unos minutos.'
        : 'No pudimos ubicar las direcciones ahora mismo. Elegí los barrios de la lista o escribí los kilómetros a mano.'
    )
  }
  if (!from || !to) {
    return emptyResponse(
      'No encontramos una de las dos direcciones. Probá con calle y número, o con una esquina.'
    )
  }

  const cacheKey = [
    roundCoordinate(from.lat),
    roundCoordinate(from.lon),
    roundCoordinate(to.lat),
    roundCoordinate(to.lon),
  ].join(',')
  const cached = routeCache.get(cacheKey)
  let timing: Partial<Record<TransportMode, TransportTiming>>

  if (cached && cached.until > now) {
    timing = cached.value
  } else {
    timing = {}
    for (const { profile, modes } of PROFILES) {
      const leg = await osrmLeg(profile, from, to)
      if (!leg) continue
      const value: TransportTiming = {
        routeMinutes: Math.round((leg.seconds / 60) * 10) / 10,
        routeKm: Math.round((leg.meters / 1000) * 100) / 100,
      }
      for (const mode of modes) timing[mode] = { ...value }
      // El monopatín hereda los kilómetros de la bicicleta y NO sus minutos: `routeMinutes: 0` deja
      // que el modelo aplique la velocidad de crucero declarada del monopatín.
      if (profile === 'routed-bike') timing.monopatin = { routeMinutes: 0, routeKm: value.routeKm }
    }
    if (Object.keys(timing).length) {
      if (routeCache.size >= 512) routeCache.delete(routeCache.keys().next().value!)
      routeCache.set(cacheKey, { value: timing, until: Date.now() + 24 * 60 * 60_000 })
    }
  }

  const missing = ROUTED_MODES.filter(mode => !timing[mode])
  if (missing.length === ROUTED_MODES.length) {
    return {
      ...emptyResponse(
        'El ruteador no contestó. Elegí los barrios de la lista o escribí los kilómetros a mano: la comparación se hace igual.'
      ),
      from,
      to,
    }
  }

  return {
    ok: true,
    // El ómnibus NO sale de acá y la página lo dice: su tiempo se arma con los horarios del STM, que
    // son por parada y no por dirección. Una dirección exacta mejora los otros cinco modos.
    reason: null,
    from,
    to,
    timing,
    missing,
    attribution: [TRANSPORT_ROUTER_ATTRIBUTION['osrm-fossgis']!],
  }
})
