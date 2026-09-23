// Lo que /api/transporte/comparador le sirve a la página, proyectado desde el documento que deja el
// job `currency-transporte` en `transportsnapshots`.
//
// FUNCIÓN PURA Y CON TEST PROPIO, por la lección de la canasta medida que ya está escrita en
// `server/utils/lifePlanRates.ts`: una proyección inline que deja un campo afuera no falla, no avisa,
// y la sección simplemente no aparece.
//
// POR QUÉ LA MATRIZ NO VIAJA ENTERA: son 68 zonas × 68 × 4 modos ≈ 18.500 filas de rutas más 4.600
// de ómnibus. Mandarlas todas serían cientos de kilobytes en el payload de hidratación de una página
// que sólo mira UN par por vez. Por eso el endpoint acepta el par y devuelve los tiempos de ese par;
// las zonas (68 filas cortas) sí viajan enteras, porque son los dos selectores de la página.
//
// LA FORMA VACÍA ES UNA RESPUESTA VÁLIDA, no un error. Si Mongo no contesta o el job todavía no
// corrió, la página tiene que seguir sirviendo: el visitante escribe los kilómetros a mano y la
// comparación se hace igual con los precios horneados. Lo que NO se hace nunca es inventar el precio
// de un vehículo: `vehiclePriceUyu` queda vacío y el modelo publica esos modos como "sin datos".
import { UTE_IVA_RATE, UTE_TARIFFS } from '../../utils/householdBills'
import type { TransportMode, TransportPrices, TransportTiming } from '../../utils/transportModel'

/** Los cuatro modos que el job rutea, en el orden en que su índice viaja aplanado en `routes`. */
export const TRANSPORT_ROUTABLE_MODES = ['auto', 'moto', 'bici', 'pie'] as const
export type TransportRoutableMode = (typeof TRANSPORT_ROUTABLE_MODES)[number]

export interface TransportZoneOption {
  slug: string
  name: string
  department: string
  kind: 'ine' | 'localidad'
}

export interface TransportPairTiming {
  from: TransportZoneOption
  to: TransportZoneOption
  timing: Partial<Record<TransportMode, TransportTiming>>
  /** Los modos de este par sin ruta relevada. Se declaran; no se estiman en silencio. */
  missing: TransportMode[]
  /** Las líneas de ómnibus que sirven el par, para poder mostrar de dónde salió el tiempo. */
  transitLines: string[]
}

export interface TransportPriceSource {
  id: string
  label: string
  asOf: string | null
}

export interface TransportComparadorCoverage {
  zones: number
  routedPairs: number
  transitPairs: number
  matrixBuiltAt: string | null
  router: string | null
  transitAgeDays: number | null
  notes: string[]
}

export interface TransportComparadorResponse {
  /** `false` = todavía no relevamos rutas (el job no corrió, o la base no contestó). */
  surveyed: boolean
  /** Por qué no hay relevamiento, en español y listo para imprimir al lado del selector. */
  notice: string | null
  builtAt: string | null
  prices: TransportPrices
  /** `true` cuando `prices` es la tabla horneada y no lo que midió el job de hoy. */
  pricesAreBaseline: boolean
  priceSources: TransportPriceSource[]
  zones: TransportZoneOption[]
  pair: TransportPairTiming | null
  coverage: TransportComparadorCoverage | null
  attribution: { label: string; url: string }[]
}

// ---------------------------------------------------------------------------------------------
// El baseline horneado: las tres cifras públicas que no dependen de ningún catálogo del sitio
// ---------------------------------------------------------------------------------------------

/**
 * El kWh marginal, del MISMO pliego que publica `/tarifas-de-ute` (`UTE_TARIFFS`), para que no haya
 * dos precios de la electricidad en el sitio. Escalón 101-600 de la Residencial Simple con IVA: lo
 * que importa es el ÚLTIMO kWh de la factura, no el promedio — un hogar que ya consume más de 100
 * kWh al mes paga a ese precio cada kWh que le agregue el monopatín.
 */
function baselineKwhUyu(): number {
  const simple = UTE_TARIFFS.find(tariff => tariff.id === 'simple')
  const bracket = simple?.brackets?.find(step => step.upTo === 600)
  if (!bracket) return 0
  return Math.round(bracket.pricePerKwh * (1 + UTE_IVA_RATE) * 100) / 100
}

/**
 * Lo que la página usa cuando no hay snapshot.
 *
 * Cada número tiene fecha, fuente y URL, y la página los imprime como "horneado" y no como medido:
 * una cifra vieja se publica CON su etiqueta, nunca se sustituye en silencio (la regla ya está
 * escrita en `server/utils/costsMerge.ts`).
 *
 * `vehiclePriceUyu` va VACÍO a propósito, y es la decisión más importante de este archivo: el precio
 * de un monopatín, de una moto o de un auto usado sale de los catálogos vivos del sitio, y hornear
 * uno haría que la página siguiera dando un veredicto cuando en realidad no tiene con qué. Sin
 * precio, el modelo publica ese modo como "sin datos" y no calcula nada.
 */
export const TRANSPORT_BASELINE_PRICE_SOURCES: readonly TransportPriceSource[] = [
  {
    id: 'boleto',
    label:
      'Intendencia de Montevideo — tarifas del transporte colectivo urbano (boleto de 1 hora, con tarjeta STM)',
    asOf: '2026-01-05',
  },
  {
    id: 'combustible',
    label: 'ANCAP — tabla de precios vigente desde el 1/9/2026',
    asOf: '2026-09-01',
  },
  {
    id: 'energia',
    label: 'UTE — pliego tarifario, Residencial Simple, escalón 101-600 kWh, con IVA',
    asOf: '2026-01-01',
  },
]

export function transportBaselinePrices(): TransportPrices {
  return {
    // El modelo no usa el dólar en ninguna cuenta: los precios de vehículo llegan del snapshot ya
    // convertidos a pesos. Publicar acá una cotización horneada sería una cifra vieja que nadie mira.
    usdUyu: 0,
    busFareUyu: 52,
    // Regla del STM, no un supuesto: dentro de la hora el segundo ómnibus no se paga.
    busTransferWindowMin: 60,
    busMonthlyPassUyu: null,
    naftaSuper95PerLitreUyu: 88.67,
    gasoilPerLitreUyu: 58.68,
    kwhUyu: baselineKwhUyu(),
    vehiclePriceUyu: {},
    financingTea: null,
    usuryCapTea: null,
  }
}

const BASELINE_NOTICE =
  'Todavía no pudimos leer el relevamiento de rutas y precios: la comparación corre igual con los kilómetros que escribas y con las tarifas públicas de la tabla de abajo, pero los precios de los vehículos salen de nuestros catálogos y hoy no están.'

export function transportEmptyComparador(
  notice: string = BASELINE_NOTICE
): TransportComparadorResponse {
  return {
    surveyed: false,
    notice,
    builtAt: null,
    prices: transportBaselinePrices(),
    pricesAreBaseline: true,
    priceSources: [...TRANSPORT_BASELINE_PRICE_SOURCES],
    zones: [],
    pair: null,
    coverage: null,
    attribution: [],
  }
}

// ---------------------------------------------------------------------------------------------
// Proyección del documento
// ---------------------------------------------------------------------------------------------

/** El documento tal como lo deja el job. Todo opcional: se valida acá, no se confía. */
export interface TransportSnapshotRaw {
  builtAt?: unknown
  prices?: Record<string, unknown> | null
  zones?: unknown
  routes?: unknown
  transit?: unknown
  coverage?: Record<string, unknown> | null
}

function isoOf(value: unknown): string | null {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value.toISOString()
  if (typeof value === 'string' && value.trim()) {
    const parsed = new Date(value)
    return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
  }
  return null
}

function num(value: unknown): number | null {
  const parsed = typeof value === 'string' ? Number(value) : value
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null
}

export function transportProjectZones(raw: unknown): TransportZoneOption[] {
  if (!Array.isArray(raw)) return []
  const out: TransportZoneOption[] = []
  for (const row of raw) {
    const zone = row as Record<string, unknown> | null
    const slug = typeof zone?.slug === 'string' ? zone.slug : ''
    const name = typeof zone?.name === 'string' ? zone.name : ''
    if (!slug || !name) continue
    out.push({
      slug,
      name,
      department: typeof zone?.department === 'string' ? zone.department : '',
      kind: zone?.kind === 'localidad' ? 'localidad' : 'ine',
    })
  }
  return out
}

/**
 * Los precios del snapshot, campo por campo y con el tipo del modelo.
 *
 * No se hace `doc.prices as TransportPrices`: el documento lo escribe otro paquete, con su propio
 * build, y un campo que se renombre allá tiene que aparecer acá como "falta", no como `undefined`
 * colándose adentro de una multiplicación.
 */
export function transportProjectPrices(raw: Record<string, unknown> | null | undefined): {
  prices: TransportPrices
  usable: boolean
} {
  const baseline = transportBaselinePrices()
  if (!raw) return { prices: baseline, usable: false }

  const fare = num(raw.busFareUyu)
  const nafta = num(raw.naftaSuper95PerLitreUyu)
  const vehicles = (raw.vehiclePriceUyu ?? {}) as Record<string, unknown>
  const vehiclePriceUyu: TransportPrices['vehiclePriceUyu'] = {}
  for (const [mode, value] of Object.entries(vehicles)) {
    const row = value as Record<string, unknown> | null
    // `medianUyu` es el nombre VIEJO del mismo campo. Se lee mientras pueda haber un snapshot escrito
    // por el job anterior: entre el deploy del app y la siguiente corrida del job hay una ventana en
    // la que la base tiene la forma vieja, y sin este respaldo la página mostraría "sin datos" para
    // TODOS los modos justo después de desplegar un renombrado. Se puede sacar cuando el job haya
    // corrido (diario, 16:39 UTC).
    const reference = num(row?.referenceUyu) ?? num((row as Record<string, unknown>)?.medianUyu)
    if (!reference || reference <= 0) continue
    vehiclePriceUyu[mode as TransportMode] = {
      referenceUyu: reference,
      p25Uyu: num(row?.p25Uyu),
      p75Uyu: num(row?.p75Uyu),
      condition: row?.condition === 'nuevo' ? 'nuevo' : 'usado',
      offers: num(row?.offers) ?? 0,
      asOf: typeof row?.asOf === 'string' ? row.asOf : null,
      measuredAnnualDepreciation: num(row?.measuredAnnualDepreciation),
      source: typeof row?.source === 'string' ? row.source : 'catálogo del sitio',
    }
  }

  // Sin boleto no hay contra qué comparar, y sin nafta el auto y la moto no tienen energía: por
  // debajo de eso el snapshot no sirve y se prefiere el baseline fechado antes que un cero.
  const usable = !!fare && fare > 0 && !!nafta && nafta > 0
  return {
    prices: {
      usdUyu: num(raw.usdUyu) ?? 0,
      busFareUyu: fare && fare > 0 ? fare : baseline.busFareUyu,
      busTransferWindowMin: num(raw.busTransferWindowMin) ?? baseline.busTransferWindowMin,
      busMonthlyPassUyu: num(raw.busMonthlyPassUyu),
      naftaSuper95PerLitreUyu: nafta && nafta > 0 ? nafta : baseline.naftaSuper95PerLitreUyu,
      gasoilPerLitreUyu: num(raw.gasoilPerLitreUyu) ?? baseline.gasoilPerLitreUyu,
      kwhUyu: num(raw.kwhUyu) ?? baseline.kwhUyu,
      vehiclePriceUyu,
      financingTea: num(raw.financingTea),
      usuryCapTea: num(raw.usuryCapTea),
    },
    usable,
  }
}

function projectPriceSources(
  raw: Record<string, unknown> | null | undefined
): TransportPriceSource[] {
  const sources = (raw?.sources ?? null) as Record<string, unknown> | null
  if (!sources || typeof sources !== 'object') return [...TRANSPORT_BASELINE_PRICE_SOURCES]
  const out: TransportPriceSource[] = []
  for (const [id, value] of Object.entries(sources)) {
    const row = value as Record<string, unknown> | null
    const label = typeof row?.label === 'string' ? row.label : ''
    if (!label) continue
    out.push({ id, label, asOf: typeof row?.asOf === 'string' ? row.asOf : null })
  }
  return out.length ? out : [...TRANSPORT_BASELINE_PRICE_SOURCES]
}

/**
 * Los tiempos y los kilómetros de UN par de zonas.
 *
 * TRES DECISIONES QUE LA PÁGINA TIENE QUE CONTAR, no esconder:
 *
 *  - **La moto se rutea como auto.** Ningún ruteador público modela lo que de verdad la hace más
 *    rápida en ciudad. Publicar la ruta del auto y decirlo es honesto; descontarle minutos por
 *    suposición sería decidir el resultado de la comparación con un número inventado.
 *  - **El monopatín hereda los KILÓMETROS de la bicicleta pero no sus minutos**: circula por la misma
 *    red y a otra velocidad, así que se le pasa la distancia medida con `routeMinutes: 0` y el modelo
 *    le aplica su propia velocidad de crucero declarada.
 *  - **El ómnibus ya trae caminata y espera adentro** (salen de los horarios del STM), por eso sus
 *    `accessMinutes` curados son cero: sumarle algo acá sería contar dos veces lo mismo.
 */
export function transportProjectPair(
  raw: TransportSnapshotRaw,
  zones: TransportZoneOption[],
  fromSlug: string,
  toSlug: string
): TransportPairTiming | null {
  const fromIndex = zones.findIndex(zone => zone.slug === fromSlug)
  const toIndex = zones.findIndex(zone => zone.slug === toSlug)
  if (fromIndex < 0 || toIndex < 0) return null

  const timing: Partial<Record<TransportMode, TransportTiming>> = {}
  const routes = Array.isArray(raw.routes) ? (raw.routes as unknown[]) : []
  for (const row of routes) {
    if (!Array.isArray(row) || row.length < 5) continue
    const [from, to, modeIndex, meters, seconds] = row as number[]
    if (from !== fromIndex || to !== toIndex) continue
    const mode = TRANSPORT_ROUTABLE_MODES[modeIndex as number]
    if (!mode || !meters || !seconds || meters <= 0 || seconds <= 0) continue
    timing[mode] = {
      routeMinutes: Math.round((seconds / 60) * 10) / 10,
      routeKm: Math.round((meters / 1000) * 100) / 100,
    }
  }

  if (timing.bici) {
    timing.monopatin = { routeMinutes: 0, routeKm: timing.bici.routeKm }
  }

  let transitLines: string[] = []
  const transit = Array.isArray(raw.transit) ? (raw.transit as unknown[]) : []
  for (const row of transit) {
    const pair = row as Record<string, unknown> | null
    if (num(pair?.from) !== fromIndex || num(pair?.to) !== toIndex) continue
    const walk = num(pair?.walkMinutes) ?? 0
    const wait = num(pair?.waitMinutes) ?? 0
    const inVehicle = num(pair?.inVehicleMinutes) ?? 0
    const total = walk + wait + inVehicle
    if (total <= 0) continue
    timing.omnibus = {
      routeMinutes: Math.round(total * 10) / 10,
      routeKm: Math.round(((num(pair?.meters) ?? 0) / 1000) * 100) / 100,
      transit: {
        walkMinutes: Math.round(walk * 10) / 10,
        waitMinutes: Math.round(wait * 10) / 10,
        inVehicleMinutes: Math.round(inVehicle * 10) / 10,
        transfers: num(pair?.transfers) ?? 0,
      },
    }
    transitLines = Array.isArray(pair?.lines)
      ? (pair.lines as unknown[]).filter((line): line is string => typeof line === 'string')
      : []
    break
  }

  const wanted: TransportMode[] = ['omnibus', 'pie', 'monopatin', 'bici', 'moto', 'auto']
  return {
    from: zones[fromIndex]!,
    to: zones[toIndex]!,
    timing,
    missing: wanted.filter(mode => !timing[mode]),
    transitLines,
  }
}

function projectCoverage(
  raw: Record<string, unknown> | null | undefined
): TransportComparadorCoverage | null {
  if (!raw) return null
  return {
    zones: num(raw.zones) ?? 0,
    routedPairs: num(raw.routedPairs) ?? 0,
    transitPairs: num(raw.transitPairs) ?? 0,
    matrixBuiltAt: isoOf(raw.matrixBuiltAt),
    router: typeof raw.router === 'string' ? raw.router : null,
    transitAgeDays: num(raw.transitAgeDays),
    notes: Array.isArray(raw.notes)
      ? (raw.notes as unknown[]).filter((note): note is string => typeof note === 'string')
      : [],
  }
}

/**
 * La atribución que la página está obligada a mostrar cuando los tiempos salieron de OSRM: los datos
 * son de OpenStreetMap (ODbL) y el servicio de ruteo es donado por FOSSGIS. No es un pie de página
 * opcional, es la condición de uso.
 */
export const TRANSPORT_ROUTER_ATTRIBUTION: Record<string, { label: string; url: string }> = {
  'osrm-fossgis': {
    label:
      'Rutas calculadas con OSRM sobre datos de OpenStreetMap (ODbL), servicio de FOSSGIS e.V.',
    url: 'https://routing.openstreetmap.de/',
  },
  'valhalla-local': {
    label: 'Rutas calculadas con Valhalla sobre datos de OpenStreetMap (ODbL)',
    url: 'https://www.openstreetmap.org/copyright',
  },
}

const STM_ATTRIBUTION = {
  label: 'Horarios y recorridos del STM — Intendencia de Montevideo, Catálogo de Datos Abiertos',
  url: 'https://catalogodatos.gub.uy/dataset/horarios-de-omnibus-urbanos-por-parada-stm',
}

export function transportProjectComparador(
  raw: TransportSnapshotRaw | null | undefined,
  pair?: { from: string; to: string } | null
): TransportComparadorResponse {
  if (!raw) return transportEmptyComparador()

  const zones = transportProjectZones(raw.zones)
  const { prices, usable } = transportProjectPrices(raw.prices)
  const coverage = projectCoverage(raw.coverage)
  const routed = Array.isArray(raw.routes) ? raw.routes.length : 0

  // Un documento sin zonas ni rutas existe pero no sirve para elegir barrio: se declara como no
  // relevado en vez de ofrecer dos selectores vacíos.
  const surveyed = zones.length > 0 && routed > 0

  const attribution: { label: string; url: string }[] = []
  const routerKey = coverage?.router ?? ''
  if (TRANSPORT_ROUTER_ATTRIBUTION[routerKey])
    attribution.push(TRANSPORT_ROUTER_ATTRIBUTION[routerKey]!)
  if (Array.isArray(raw.transit) && raw.transit.length) attribution.push(STM_ATTRIBUTION)

  return {
    surveyed,
    notice: surveyed
      ? usable
        ? null
        : 'Los precios de esta corrida vinieron incompletos: abajo van las tarifas públicas horneadas, con su fecha.'
      : 'Todavía no relevamos rutas: elegí los kilómetros a mano y la comparación se hace igual.',
    builtAt: isoOf(raw.builtAt),
    prices,
    pricesAreBaseline: !usable,
    priceSources: usable ? projectPriceSources(raw.prices) : [...TRANSPORT_BASELINE_PRICE_SOURCES],
    zones,
    pair: pair?.from && pair?.to ? transportProjectPair(raw, zones, pair.from, pair.to) : null,
    coverage,
    attribution,
  }
}
