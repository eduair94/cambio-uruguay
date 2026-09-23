import { describe, expect, it } from 'vitest'
import {
  TRANSPORT_DEFAULT_SCENARIO,
  transportBreakevenMonth,
  transportCompare,
  transportCumulativeCost,
  transportDoorToDoorMinutes,
  transportInstalment,
  transportRainDisplacedShare,
  transportResidual,
  transportTripsPerMonth,
  type TransportAssumptions,
  type TransportCompareInput,
  type TransportFigure,
  type TransportMode,
  type TransportModeAssumptions,
  type TransportPrices,
  type TransportScenario,
} from '../../utils/transportModel'

// Fixtures deliberadamente REDONDOS: los tests miden la aritmética del modelo, no las cifras
// uruguayas del día. Las cifras reales viven en `transportAssumptions.ts` y tienen su propio test,
// que verifica que cada una traiga fecha y fuente — no su valor.
const figure = (value: number): TransportFigure => ({
  value,
  asOf: '2026-01-01',
  source: 'fixture',
  sourceUrl: 'https://example.test',
})

function modeAssumptions(
  mode: TransportMode,
  overrides: Partial<TransportModeAssumptions> = {}
): TransportModeAssumptions {
  return {
    mode,
    label: mode,
    equipmentUyu: figure(0),
    paperworkUyu: figure(0),
    insuranceUyu: null,
    roadTaxUyu: null,
    roadTaxRateOfPrice: null,
    fixedMaintenanceUyu: figure(0),
    maintenancePerKmUyu: figure(0),
    energyKind: 'ninguna',
    consumptionPer100Km: figure(0),
    annualDepreciation: figure(0),
    rainFallbackShare: figure(0),
    theftAnnualProbability: figure(0),
    theftRecoveryShare: figure(0),
    accessMinutes: figure(0),
    cruiseSpeedKmh: figure(20),
    storageMonthlyUyu: figure(0),
    fatalities: figure(1),
    fatalityPer100kVehicles: null,
    ...overrides,
  }
}

function assumptions(overrides: Partial<Record<TransportMode, Partial<TransportModeAssumptions>>> = {}): TransportAssumptions {
  const modes: TransportMode[] = ['omnibus', 'pie', 'monopatin', 'bici', 'moto', 'auto']
  const byMode = Object.fromEntries(
    modes.map(mode => [mode, modeAssumptions(mode, overrides[mode] ?? {})])
  ) as Record<TransportMode, TransportModeAssumptions>
  return {
    global: {
      rainDaysPerYear: figure(0),
      parkingPerHourUyu: figure(50),
      parkingSearchMinutes: figure(5),
    },
    byMode,
  }
}

function prices(overrides: Partial<TransportPrices> = {}): TransportPrices {
  return {
    usdUyu: 40,
    busFareUyu: 50,
    busTransferWindowMin: 60,
    busMonthlyPassUyu: null,
    naftaSuper95PerLitreUyu: 80,
    gasoilPerLitreUyu: 60,
    kwhUyu: 10,
    vehiclePriceUyu: {},
    financingTea: null,
    usuryCapTea: null,
    ...overrides,
  }
}

function scenario(overrides: Partial<TransportScenario> = {}): TransportScenario {
  return { ...TRANSPORT_DEFAULT_SCENARIO, ...overrides }
}

function input(overrides: Partial<TransportCompareInput> = {}): TransportCompareInput {
  return {
    scenario: scenario(),
    prices: prices(),
    assumptions: assumptions(),
    timing: {},
    ...overrides,
  }
}

describe('transportTripsPerMonth', () => {
  it('cuenta viajes de un sentido, no días', () => {
    // 5 días × 2 viajes × 52/12 semanas = 43,33 viajes de un sentido por mes.
    expect(transportTripsPerMonth(scenario())).toBeCloseTo(43.33, 1)
  })

  it('cuatro viajes por día es volver a almorzar, el doble de boletos', () => {
    expect(transportTripsPerMonth(scenario({ tripsPerDay: 4 }))).toBeCloseTo(86.67, 1)
  })

  it('acota entradas imposibles en vez de propagarlas', () => {
    expect(transportTripsPerMonth(scenario({ daysPerWeek: 99 }))).toBeCloseTo(7 * 2 * (52 / 12), 1)
    expect(transportTripsPerMonth(scenario({ daysPerWeek: Number.NaN }))).toBe(0)
  })
})

describe('transportInstalment', () => {
  it('sin tasa reparte el capital', () => {
    expect(transportInstalment(12000, 0, 12)).toBe(1000)
    expect(transportInstalment(12000, null, 12)).toBe(1000)
  })

  it('usa la tasa mensual EQUIVALENTE, no la TEA dividida por doce', () => {
    // Con TEA 100 % la mensual equivalente es 5,946 %, no 8,333 %. Dividir sobreestima la cuota.
    const equivalent = transportInstalment(100000, 1, 12)
    const naiveMonthly = 1 / 12
    const naive = (100000 * naiveMonthly) / (1 - (1 + naiveMonthly) ** -12)
    expect(equivalent).toBeLessThan(naive)
    expect(equivalent).toBeCloseTo(11892.6, 0)
  })

  it('devuelve cero cuando no hay nada que financiar', () => {
    expect(transportInstalment(0, 0.5, 12)).toBe(0)
    expect(transportInstalment(1000, 0.5, 0)).toBe(0)
  })
})

describe('transportRainDisplacedShare', () => {
  it('es cero cuando la lluvia está apagada', () => {
    const base = input({
      scenario: scenario({ includeRain: false }),
      assumptions: assumptions({ bici: { rainFallbackShare: figure(1) } }),
    })
    base.assumptions.global.rainDaysPerYear = figure(100)
    expect(transportRainDisplacedShare('bici', base)).toBe(0)
  })

  it('desplaza la fracción declarada de los días de lluvia', () => {
    const base = input({ assumptions: assumptions({ bici: { rainFallbackShare: figure(0.5) } }) })
    base.assumptions.global.rainDaysPerYear = figure(73) // 20 % del año
    expect(transportRainDisplacedShare('bici', base)).toBeCloseTo(0.1, 5)
  })
})

describe('transportDoorToDoorMinutes', () => {
  it('prefiere la ruta medida sobre la velocidad de crucero', () => {
    const base = input({ timing: { bici: { routeMinutes: 25, routeKm: 6 } } })
    expect(transportDoorToDoorMinutes('bici', base)).toBe(25)
  })

  it('cae a la velocidad de crucero cuando no hay ruta', () => {
    const base = input({
      scenario: scenario({ distanceKm: 10 }),
      assumptions: assumptions({ bici: { cruiseSpeedKmh: figure(20) } }),
    })
    expect(transportDoorToDoorMinutes('bici', base)).toBe(30)
  })

  it('suma la penalización del modo y la búsqueda de estacionamiento sólo al auto tarifado', () => {
    const base = input({
      scenario: scenario({ parkingPaid: true, distanceKm: 10 }),
      assumptions: assumptions({
        auto: { cruiseSpeedKmh: figure(30), accessMinutes: figure(3) },
        moto: { cruiseSpeedKmh: figure(30), accessMinutes: figure(3) },
      }),
    })
    // 10 km a 30 km/h = 20 min, + 3 de acceso, + 5 de buscar lugar = 28 para el auto.
    expect(transportDoorToDoorMinutes('auto', base)).toBe(28)
    // La moto no busca lugar.
    expect(transportDoorToDoorMinutes('moto', base)).toBe(23)
  })
})

describe('transportResidual', () => {
  it('descuenta el valor al ritmo de la caída anual', () => {
    const base = input({
      prices: prices({
        vehiclePriceUyu: {
          auto: {
            referenceUyu: 400000,
            p25Uyu: null,
            p75Uyu: null,
            condition: 'usado',
            offers: 50,
            asOf: '2026-09-01',
            measuredAnnualDepreciation: null,
            source: 'fixture',
          },
        },
      }),
      assumptions: assumptions({ auto: { annualDepreciation: figure(0.1) } }),
    })
    // 400.000 × 0,9 = 360.000 de valor, menos el 12 % que se pierde al venderlo = 316.800.
    expect(transportResidual('auto', base, 12)).toBe(316800)
    expect(transportResidual('auto', base, 24)).toBe(285120)
  })

  it('la caída MEDIDA sobre el catálogo le gana al supuesto curado', () => {
    const base = input({
      prices: prices({
        vehiclePriceUyu: {
          auto: {
            referenceUyu: 400000,
            p25Uyu: null,
            p75Uyu: null,
            condition: 'usado',
            offers: 50,
            asOf: '2026-09-01',
            measuredAnnualDepreciation: 0.2,
            source: 'fixture',
          },
        },
      }),
      assumptions: assumptions({ auto: { annualDepreciation: figure(0.1) } }),
    })
    expect(transportResidual('auto', base, 12)).toBe(281600)
  })

  it('es cero si ya lo tenía o si la depreciación está apagada', () => {
    const owned = input({ scenario: scenario({ alreadyOwned: true }) })
    expect(transportResidual('auto', owned, 12)).toBe(0)
    const off = input({ scenario: scenario({ includeDepreciation: false }) })
    expect(transportResidual('auto', off, 12)).toBe(0)
  })
})

describe('transportCumulativeCost', () => {
  it('el ómnibus es una recta: no hay inversión ni reventa', () => {
    const base = input()
    const { modes } = transportCompare(base)
    const bus = modes.find(mode => mode.mode === 'omnibus')!
    expect(bus.available).toBe(true)
    // 43,33 viajes × $50 = $2.167 por mes, sin nada adelante.
    expect(bus.cumulativeUyu[0]).toBeCloseTo(2167, -1)
    expect(bus.cumulativeUyu[11]).toBeCloseTo(26000, -2)
  })

  it('resta el valor de reventa, así que comprar no cuesta el precio entero', () => {
    const base = input({
      scenario: scenario({ financing: 'contado' }),
      prices: prices({
        vehiclePriceUyu: {
          monopatin: {
            referenceUyu: 24000,
            p25Uyu: null,
            p75Uyu: null,
            condition: 'nuevo',
            offers: 10,
            asOf: '2026-09-01',
            measuredAnnualDepreciation: null,
            source: 'fixture',
          },
        },
      }),
      assumptions: assumptions({ monopatin: { annualDepreciation: figure(0.25) } }),
    })
    const breakdown = {
      upfrontUyu: 24000,
      financedUyu: 0,
      monthlyInstalmentUyu: 0,
      financeCostUyu: 0,
      monthly: {
        insurance: 0,
        roadTax: 0,
        fixedMaintenance: 0,
        storage: 0,
        energy: 0,
        kmMaintenance: 0,
        parking: 0,
        rainFallbackFare: 0,
        theftRisk: 0,
        fare: 0,
      },
      monthlyRecurringUyu: 0,
    }
    const series = transportCumulativeCost('monopatin', base, breakdown, 12)
    // Al año: pagó 24.000 y lo que tiene se vende a 24.000 × 0,75 × 0,88 = 15.840 → costó 8.160.
    expect(series[11]).toBe(8160)
  })

  it('la fricción de reventa se puede declarar por modo', () => {
    const base = input({
      prices: prices({
        vehiclePriceUyu: {
          monopatin: {
            referenceUyu: 100000,
            p25Uyu: null,
            p75Uyu: null,
            condition: 'nuevo',
            offers: 10,
            asOf: '2026-09-01',
            measuredAnnualDepreciation: null,
            source: 'fixture',
          },
        },
      }),
      assumptions: assumptions({
        monopatin: { annualDepreciation: figure(0), resaleFriction: figure(0.5) },
      }),
    })
    // Sin depreciación por tiempo, pero la mitad se pierde en el acto de vender.
    expect(transportResidual('monopatin', base, 12)).toBe(50000)
  })
})

describe('transportCashOut', () => {
  const monopatin = {
    referenceUyu: 24000,
    p25Uyu: null,
    p75Uyu: null,
    condition: 'nuevo' as const,
    offers: 10,
    asOf: '2026-09-01',
    measuredAnnualDepreciation: null,
    source: 'fixture',
  }

  it('la plata puesta nunca baja, aunque el costo neto sí', () => {
    const base = input({
      scenario: scenario({ financing: 'contado' }),
      prices: prices({ vehiclePriceUyu: { monopatin } }),
    })
    const result = transportCompare(base).modes.find(mode => mode.mode === 'monopatin')!
    expect(result.cashOutUyu[0]).toBeGreaterThanOrEqual(24000)
    for (let index = 1; index < 12; index += 1) {
      expect(result.cashOutUyu[index]!).toBeGreaterThanOrEqual(result.cashOutUyu[index - 1]!)
    }
  })

  it('el equilibrio en plata puesta llega DESPUÉS que el equilibrio neto de reventa', () => {
    const base = input({
      scenario: scenario({ financing: 'contado' }),
      prices: prices({ vehiclePriceUyu: { monopatin } }),
      assumptions: assumptions({ monopatin: { annualDepreciation: figure(0.25) } }),
    })
    const result = transportCompare(base).modes.find(mode => mode.mode === 'monopatin')!
    expect(result.breakevenMonths).not.toBeNull()
    expect(result.cashBreakevenMonths).not.toBeNull()
    expect(result.cashBreakevenMonths!).toBeGreaterThan(result.breakevenMonths!)
  })
})

describe('transportBreakevenMonth', () => {
  it('encuentra el primer cruce, no el primer acercamiento', () => {
    // Mes 2 la curva todavía está arriba (90 > 85); recién el mes 3 queda por debajo.
    expect(transportBreakevenMonth([100, 90, 80], [50, 85, 120])).toBe(3)
  })

  it('devuelve null cuando nunca cruza', () => {
    expect(transportBreakevenMonth([100, 200, 300], [10, 20, 30])).toBe(null)
  })
})

describe('transportCompare', () => {
  const monopatinPrices = prices({
    vehiclePriceUyu: {
      monopatin: {
        referenceUyu: 24000,
        p25Uyu: 18000,
        p75Uyu: 32000,
        condition: 'nuevo',
        offers: 12,
        asOf: '2026-09-01',
        measuredAnnualDepreciation: null,
        source: 'movilidaditems',
      },
    },
  })

  it('un modo barato contra el ómnibus tiene punto de equilibrio', () => {
    const base = input({
      scenario: scenario({ financing: 'contado' }),
      prices: monopatinPrices,
      assumptions: assumptions({ monopatin: { annualDepreciation: figure(0.25) } }),
    })
    const result = transportCompare(base)
    const monopatin = result.modes.find(mode => mode.mode === 'monopatin')!
    expect(monopatin.available).toBe(true)
    expect(monopatin.breakevenMonths).not.toBeNull()
    expect(monopatin.breakevenMonths!).toBeLessThan(24)
    expect(monopatin.pricePerHourSavedUyu).toBeNull()
  })

  it('un modo caro sin equilibrio publica el precio de la hora ahorrada', () => {
    const base = input({
      scenario: scenario({ financing: 'contado', distanceKm: 10 }),
      prices: prices({
        vehiclePriceUyu: {
          auto: {
            referenceUyu: 600000,
            p25Uyu: null,
            p75Uyu: null,
            condition: 'usado',
            offers: 200,
            asOf: '2026-09-01',
            measuredAnnualDepreciation: null,
            source: 'carcatalog',
          },
        },
      }),
      assumptions: assumptions({
        auto: {
          annualDepreciation: figure(0.12),
          energyKind: 'nafta',
          consumptionPer100Km: figure(9),
          cruiseSpeedKmh: figure(30),
          insuranceUyu: figure(20000),
          roadTaxUyu: figure(15000),
        },
        omnibus: { cruiseSpeedKmh: figure(12) },
      }),
    })
    const result = transportCompare(base)
    const auto = result.modes.find(mode => mode.mode === 'auto')!
    expect(auto.breakevenMonths).toBeNull()
    expect(auto.hoursPerYearVsBus).toBeGreaterThan(0)
    expect(auto.pricePerHourSavedUyu).toBeGreaterThan(0)
  })

  it('más caro y más lento no compensa nada, y lo dice', () => {
    // Un auto caro en un trayecto donde el ómnibus vuela: no hay equilibrio y encima tarda más.
    const base = input({
      scenario: scenario({ financing: 'contado' }),
      prices: prices({
        vehiclePriceUyu: {
          auto: {
            referenceUyu: 900000,
            p25Uyu: null,
            p75Uyu: null,
            condition: 'usado',
            offers: 100,
            asOf: '2026-09-01',
            measuredAnnualDepreciation: null,
            source: 'carcatalog',
          },
        },
      }),
      assumptions: assumptions({
        auto: { cruiseSpeedKmh: figure(8), annualDepreciation: figure(0.15) },
        omnibus: { cruiseSpeedKmh: figure(30) },
      }),
    })
    const result = transportCompare(base)
    const auto = result.modes.find(mode => mode.mode === 'auto')!
    expect(auto.hoursPerYearVsBus).toBeLessThan(0)
    expect(auto.breakevenMonths).toBeNull()
    expect(auto.pricePerHourSavedUyu).toBeNull()
    expect(auto.warnings.join(' ')).toContain('no hay nada que compensar')
  })

  it('un modo sin precios relevados no se inventa una cuenta', () => {
    const result = transportCompare(input())
    const moto = result.modes.find(mode => mode.mode === 'moto')!
    expect(moto.available).toBe(false)
    expect(moto.unavailableReason).toContain('Todavía no relevamos precios')
    expect(moto.monthlyAverageUyu).toBe(0)
  })

  it('si ya lo tiene, la comparación es marginal: sin inversión, sin seguro, sin patente', () => {
    const base = input({
      scenario: scenario({ alreadyOwned: true }),
      prices: monopatinPrices,
      assumptions: assumptions({
        monopatin: { insuranceUyu: figure(12000), roadTaxUyu: figure(6000), storageMonthlyUyu: figure(1000) },
      }),
    })
    const result = transportCompare(base)
    const monopatin = result.modes.find(mode => mode.mode === 'monopatin')!
    expect(monopatin.breakdown.upfrontUyu).toBe(0)
    expect(monopatin.breakdown.monthly.insurance).toBe(0)
    expect(monopatin.breakdown.monthly.roadTax).toBe(0)
    expect(monopatin.breakdown.monthly.storage).toBe(0)
  })

  it('el abono mensual reemplaza al boleto cuando sale menos', () => {
    const base = input({
      scenario: scenario({ tripsPerDay: 4 }),
      prices: prices({ busMonthlyPassUyu: 2000 }),
    })
    const result = transportCompare(base)
    const bus = result.modes.find(mode => mode.mode === 'omnibus')!
    expect(bus.breakdown.monthly.fare).toBe(2000)
    expect(bus.warnings.join(' ')).toContain('abono mensual')
  })

  it('la lluvia se cobra como boleto y no como kilómetros del vehículo', () => {
    const dry = input({
      scenario: scenario({ includeRain: false, financing: 'contado' }),
      prices: monopatinPrices,
    })
    const wet = input({
      scenario: scenario({ includeRain: true, financing: 'contado' }),
      prices: monopatinPrices,
      assumptions: assumptions({ monopatin: { rainFallbackShare: figure(1) } }),
    })
    wet.assumptions.global.rainDaysPerYear = figure(73)
    const dryResult = transportCompare(dry).modes.find(mode => mode.mode === 'monopatin')!
    const wetResult = transportCompare(wet).modes.find(mode => mode.mode === 'monopatin')!
    expect(dryResult.breakdown.monthly.rainFallbackFare).toBe(0)
    expect(wetResult.breakdown.monthly.rainFallbackFare).toBeGreaterThan(0)
    expect(wetResult.monthlyAverageUyu).toBeGreaterThan(dryResult.monthlyAverageUyu)
  })

  it('el riesgo de robo entra como costo esperado y se puede apagar', () => {
    const on = input({
      prices: monopatinPrices,
      assumptions: assumptions({
        monopatin: { theftAnnualProbability: figure(0.1), theftRecoveryShare: figure(0) },
      }),
    })
    const off = input({
      scenario: scenario({ includeTheftRisk: false }),
      prices: monopatinPrices,
      assumptions: assumptions({
        monopatin: { theftAnnualProbability: figure(0.1), theftRecoveryShare: figure(0) },
      }),
    })
    const onResult = transportCompare(on).modes.find(mode => mode.mode === 'monopatin')!
    const offResult = transportCompare(off).modes.find(mode => mode.mode === 'monopatin')!
    // 24.000 × 10 % / 12 = 200 por mes.
    expect(onResult.breakdown.monthly.theftRisk).toBe(200)
    expect(offResult.breakdown.monthly.theftRisk).toBe(0)
  })

  it('el valor del tiempo sólo aparece con un sueldo declarado', () => {
    const withoutWage = transportCompare(
      input({ prices: monopatinPrices, assumptions: assumptions({ omnibus: { cruiseSpeedKmh: figure(10) }, monopatin: { cruiseSpeedKmh: figure(20) } }) })
    ).modes.find(mode => mode.mode === 'monopatin')!
    expect(withoutWage.timeValueMonthlyUyu).toBeNull()

    const withWage = transportCompare(
      input({
        scenario: scenario({ wageHourlyUyu: 300 }),
        prices: monopatinPrices,
        assumptions: assumptions({ omnibus: { cruiseSpeedKmh: figure(10) }, monopatin: { cruiseSpeedKmh: figure(20) } }),
      })
    ).modes.find(mode => mode.mode === 'monopatin')!
    expect(withWage.timeValueMonthlyUyu).toBeGreaterThan(0)
    expect(withWage.netOfTimeMonthlyUyu).toBeLessThan(withWage.monthlyAverageUyu)
  })

  it('sin boleto no hay veredicto, y la página lo declara', () => {
    const result = transportCompare(input({ prices: prices({ busFareUyu: 0 }) }))
    expect(result.warnings.join(' ')).toContain('Sin el precio del boleto')
  })

  it('financiar cuesta más que pagar al contado, y la diferencia se publica', () => {
    const cash = transportCompare(
      input({ scenario: scenario({ financing: 'contado' }), prices: { ...monopatinPrices, financingTea: 0.8 } })
    ).modes.find(mode => mode.mode === 'monopatin')!
    const credit = transportCompare(
      input({ scenario: scenario({ financing: 'cuotas', financingMonths: 24 }), prices: { ...monopatinPrices, financingTea: 0.8 } })
    ).modes.find(mode => mode.mode === 'monopatin')!
    expect(credit.breakdown.financeCostUyu).toBeGreaterThan(0)
    expect(credit.totalHorizonUyu).toBeGreaterThan(cash.totalHorizonUyu)
  })
})
