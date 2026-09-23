import { describe, expect, it } from 'vitest'
import {
  TRANSPORT_BASELINE_PRICE_SOURCES,
  transportBaselinePrices,
  transportEmptyComparador,
  transportProjectComparador,
  transportProjectPair,
  transportProjectPrices,
  transportProjectZones,
  type TransportSnapshotRaw,
} from '../../server/utils/transportSnapshot'

// La proyección es la pieza que falla EN SILENCIO: un campo que se renombra del otro lado del
// monorepo no rompe nada, simplemente deja la sección vacía y la página dice "sin datos" para
// siempre. Es la misma lección que ya está escrita en `server/utils/lifePlanRates.ts`, por eso acá
// hay un documento de juguete con la forma exacta que escribe `sync_transporte.ts`.
//
// Las cuatro zonas y los pares son inventados y redondos a propósito: lo que se mide es el
// desempaquetado, no las distancias de Montevideo.

const DOC: TransportSnapshotRaw = {
  builtAt: '2026-09-22T04:52:00.000Z',
  prices: {
    usdUyu: 40.2,
    busFareUyu: 52,
    busTransferWindowMin: 60,
    busMonthlyPassUyu: null,
    naftaSuper95PerLitreUyu: 88.67,
    gasoilPerLitreUyu: 58.68,
    kwhUyu: 10.31,
    vehiclePriceUyu: {
      auto: {
        referenceUyu: 400000,
        p25Uyu: 300000,
        p75Uyu: 620000,
        condition: 'usado',
        offers: 1800,
        asOf: '2026-09-21',
        measuredAnnualDepreciation: 0.11,
        source: 'carcatalog',
      },
      // Un modo con precio en cero no es un precio: no puede llegar al modelo.
      moto: { referenceUyu: 0, condition: 'usado', offers: 0, source: 'motocatalog' },
    },
    financingTea: 0.45,
    usuryCapTea: 0.62,
    sources: {
      boleto: { label: 'Intendencia de Montevideo — boleto STM', asOf: '2026-01-05' },
      combustible: { label: 'ANCAP — tabla de precios vigente', asOf: '2026-09-01' },
    },
  },
  zones: [
    {
      slug: 'pocitos',
      name: 'Pocitos',
      department: 'Montevideo',
      lat: -34.91,
      lon: -56.15,
      kind: 'ine',
    },
    {
      slug: 'centro',
      name: 'Centro',
      department: 'Montevideo',
      lat: -34.9,
      lon: -56.19,
      kind: 'ine',
    },
    {
      slug: 'ciudad-de-la-costa',
      name: 'Ciudad de la Costa',
      department: 'Canelones',
      lat: -34.81,
      lon: -55.95,
      kind: 'localidad',
    },
  ],
  // `[from, to, modeIndex, meters, seconds]`, con el orden auto · moto · bici · pie.
  routes: [
    [0, 1, 0, 5500, 900],
    [0, 1, 2, 5130, 1560],
    [0, 1, 3, 4850, 3900],
    [1, 0, 0, 5400, 880],
  ],
  transit: [
    {
      from: 0,
      to: 1,
      walkMinutes: 9,
      waitMinutes: 6,
      inVehicleMinutes: 21,
      transfers: 0,
      lines: ['121', '183'],
      meters: 6800,
    },
  ],
  coverage: {
    zones: 3,
    routedPairs: 4,
    transitPairs: 1,
    matrixBuiltAt: '2026-09-20T05:10:00.000Z',
    router: 'osrm-fossgis',
    transitAgeDays: 2,
    notes: ['No se pudo rutear: moto.'],
  },
}

describe('las zonas', () => {
  it('proyecta sólo filas con slug y nombre', () => {
    const zones = transportProjectZones([
      ...(DOC.zones as unknown[]),
      { slug: '', name: 'sin slug' },
      null,
    ])
    expect(zones).toHaveLength(3)
    expect(zones[2]!.kind).toBe('localidad')
  })

  it('un documento sin zonas no rompe: devuelve una lista vacía', () => {
    expect(transportProjectZones(undefined)).toEqual([])
    expect(transportProjectZones('unas zonas')).toEqual([])
  })
})

describe('los precios', () => {
  it('lee campo por campo y descarta un precio de vehículo en cero', () => {
    // Un cero no es un precio: si pasara, el modelo publicaría una moto gratis con punto de
    // equilibrio en el mes 1.
    const { prices, usable } = transportProjectPrices(DOC.prices)
    expect(usable).toBe(true)
    expect(prices.busFareUyu).toBe(52)
    expect(prices.vehiclePriceUyu.auto?.measuredAnnualDepreciation).toBe(0.11)
    expect(prices.vehiclePriceUyu.moto).toBeUndefined()
  })

  it('sin boleto o sin nafta el snapshot no sirve y manda la tabla horneada', () => {
    const { prices, usable } = transportProjectPrices({ ...DOC.prices, busFareUyu: 0 })
    expect(usable).toBe(false)
    expect(prices.busFareUyu).toBe(transportBaselinePrices().busFareUyu)
  })

  it('la tabla horneada no trae NINGÚN precio de vehículo', () => {
    // Es la decisión más importante del archivo: hornear el precio de un auto haría que la página
    // siguiera dando un veredicto cuando en realidad no tiene con qué.
    const baseline = transportBaselinePrices()
    expect(baseline.vehiclePriceUyu).toEqual({})
    expect(baseline.busFareUyu).toBeGreaterThan(0)
    expect(baseline.kwhUyu).toBeGreaterThan(0)
  })

  it('cada fuente horneada dice quién la publica y desde cuándo', () => {
    for (const source of TRANSPORT_BASELINE_PRICE_SOURCES) {
      expect(source.label.length).toBeGreaterThan(10)
      expect(source.asOf).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    }
  })
})

describe('el par de zonas', () => {
  const zones = transportProjectZones(DOC.zones)

  it('desempaqueta la matriz aplanada al modo que corresponde', () => {
    const pair = transportProjectPair(DOC, zones, 'pocitos', 'centro')!
    expect(pair.from.name).toBe('Pocitos')
    expect(pair.timing.auto).toEqual({ routeMinutes: 15, routeKm: 5.5 })
    expect(pair.timing.pie).toEqual({ routeMinutes: 65, routeKm: 4.85 })
  })

  it('el monopatín hereda los KILÓMETROS de la bici pero no sus minutos', () => {
    // Circula por la misma red y a otra velocidad: `routeMinutes: 0` deja que el modelo aplique la
    // velocidad de crucero declarada del monopatín en vez de regalarle la de un ciclista.
    const pair = transportProjectPair(DOC, zones, 'pocitos', 'centro')!
    expect(pair.timing.monopatin).toEqual({ routeMinutes: 0, routeKm: pair.timing.bici!.routeKm })
    expect(pair.timing.bici!.routeMinutes).toBeGreaterThan(0)
  })

  it('el ómnibus suma caminata, espera y vehículo, y guarda las líneas', () => {
    const pair = transportProjectPair(DOC, zones, 'pocitos', 'centro')!
    expect(pair.timing.omnibus!.routeMinutes).toBe(36)
    expect(pair.timing.omnibus!.transit).toEqual({
      walkMinutes: 9,
      waitMinutes: 6,
      inVehicleMinutes: 21,
      transfers: 0,
    })
    expect(pair.transitLines).toEqual(['121', '183'])
  })

  it('declara qué modos no tienen ruta relevada en vez de estimarlos callado', () => {
    const pair = transportProjectPair(DOC, zones, 'pocitos', 'centro')!
    expect(pair.missing).toEqual(['moto'])

    const sinNada = transportProjectPair(DOC, zones, 'centro', 'ciudad-de-la-costa')!
    expect(sinNada.timing).toEqual({})
    expect(sinNada.missing).toHaveLength(6)
  })

  it('un slug que no existe devuelve null, no el par equivocado', () => {
    expect(transportProjectPair(DOC, zones, 'pocitos', 'saladito')).toBeNull()
  })

  it('el par inverso es otro par: la matriz no se asume simétrica', () => {
    const vuelta = transportProjectPair(DOC, zones, 'centro', 'pocitos')!
    expect(vuelta.timing.auto).toEqual({ routeMinutes: 14.7, routeKm: 5.4 })
  })
})

describe('la respuesta completa', () => {
  it('sirve zonas y precios, y el par sólo cuando se pidió', () => {
    const response = transportProjectComparador(DOC, { from: 'pocitos', to: 'centro' })
    expect(response.surveyed).toBe(true)
    expect(response.notice).toBeNull()
    expect(response.zones).toHaveLength(3)
    expect(response.pair?.to.slug).toBe('centro')
    expect(response.pricesAreBaseline).toBe(false)
    expect(response.coverage?.router).toBe('osrm-fossgis')
  })

  it('nunca manda la matriz entera al navegador', () => {
    // Son 68 zonas × 68 × 4 modos: mandarlas serían cientos de kilobytes en el payload de
    // hidratación de una página que mira UN par por vez.
    const response = transportProjectComparador(DOC, { from: 'pocitos', to: 'centro' })
    expect(Object.keys(response)).not.toContain('routes')
    expect(Object.keys(response)).not.toContain('transit')
    expect(JSON.stringify(response)).not.toContain('"routes"')
  })

  it('publica la atribución de OSM y del STM, que no es opcional', () => {
    const response = transportProjectComparador(DOC, null)
    const labels = response.attribution.map(entry => entry.label).join(' ')
    expect(labels).toMatch(/OpenStreetMap/)
    expect(labels).toMatch(/FOSSGIS/)
    expect(labels).toMatch(/STM/)
  })

  it('un documento sin rutas se declara como no relevado', () => {
    const response = transportProjectComparador({ ...DOC, routes: [] })
    expect(response.surveyed).toBe(false)
    expect(response.notice).toMatch(/kilómetros a mano/)
    // Y aun así sirve los precios: la página funciona con el visitante escribiendo los km.
    expect(response.prices.busFareUyu).toBeGreaterThan(0)
  })

  it('sin documento devuelve una forma vacía VÁLIDA, no un error', () => {
    const empty = transportEmptyComparador()
    expect(empty.surveyed).toBe(false)
    expect(empty.zones).toEqual([])
    expect(empty.pair).toBeNull()
    expect(empty.prices.vehiclePriceUyu).toEqual({})
    expect(empty.notice).toBeTruthy()
    expect(transportProjectComparador(null).surveyed).toBe(false)
  })
})

describe('compatibilidad con el snapshot viejo', () => {
  it('lee `medianUyu` mientras la base todavía tenga la forma anterior', () => {
    // Entre el deploy del app y la siguiente corrida del job hay una ventana con la forma vieja en
    // la base. Sin este respaldo, la página mostraría "sin datos" para TODOS los modos justo después
    // de desplegar el renombrado — que es la peor forma de fallar: parece que no hay mercado.
    const doc = {
      slug: 'current',
      builtAt: '2026-09-23T02:51:59.413Z',
      prices: {
        busFareUyu: 52,
        naftaSuper95PerLitreUyu: 75,
        vehiclePriceUyu: {
          auto: {
            medianUyu: 391463,
            p25Uyu: 391463,
            p75Uyu: 700000,
            condition: 'usado',
            offers: 18528,
          },
        },
      },
      zones: [],
      routes: [],
      transit: [],
      coverage: {},
    }
    const projected = transportProjectComparador(doc as never, null)
    expect(projected.prices.vehiclePriceUyu.auto?.referenceUyu).toBe(391463)
  })
})
