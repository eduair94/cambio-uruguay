import { describe, expect, it } from 'vitest'
import { TRANSPORT_ASSUMPTIONS } from '../../utils/transportAssumptions'
import {
  TRANSPORT_DEFAULT_SCENARIO,
  transportCompare,
  type TransportCompareInput,
  type TransportMode,
  type TransportPrices,
  type TransportScenario,
  type TransportTiming,
} from '../../utils/transportModel'
import {
  TRANSPORT_VIEW_CAVEATS,
  TRANSPORT_VIEW_EDITABLE_FIELDS,
  TRANSPORT_VIEW_EDITED_SOURCE,
  transportViewApplyOverrides,
  transportViewChart,
  transportViewDate,
  transportViewFigureCaption,
  transportViewHoursPerYear,
  transportViewMinutes,
  transportViewMonthlyRows,
  transportViewSafetyRows,
  transportViewSortModes,
  transportViewDirectory,
  transportViewVerdict,
} from '../../utils/transportView'

// El fixture usa los supuestos REALES del sitio y precios de vehículo inventados a propósito: lo que
// se prueba acá es la presentación, no las cifras uruguayas del día (ésas tienen su propio test, que
// les exige fecha y fuente). Los precios son redondos para que las cuentas se puedan seguir a mano.
//
// Cifras públicas usadas en el fixture, con su vigencia: boleto STM $52 (IM, 5/1/2026), súper 95
// $88,67 (ANCAP, 1/9/2026), kWh $10,31 (UTE Residencial Simple escalón 101-600 con IVA, 1/1/2026).

const PRICES: TransportPrices = {
  usdUyu: 40,
  busFareUyu: 52,
  busTransferWindowMin: 60,
  busMonthlyPassUyu: null,
  naftaSuper95PerLitreUyu: 88.67,
  gasoilPerLitreUyu: 58.68,
  kwhUyu: 10.31,
  vehiclePriceUyu: {
    monopatin: {
      referenceUyu: 25000,
      p25Uyu: 18000,
      p75Uyu: 38000,
      condition: 'nuevo',
      offers: 42,
      asOf: '2026-09-20',
      measuredAnnualDepreciation: null,
      source: 'movilidaditems',
    },
    auto: {
      referenceUyu: 400000,
      p25Uyu: 300000,
      p75Uyu: 620000,
      condition: 'usado',
      offers: 1800,
      asOf: '2026-09-21',
      measuredAnnualDepreciation: null,
      source: 'carcatalog',
    },
  },
  financingTea: 0.45,
  usuryCapTea: null,
}

/** Por defecto el auto es MÁS RÁPIDO que el ómnibus: es el caso que dispara la segunda rama. */
const TIMING_AUTO_RAPIDO: Partial<Record<TransportMode, TransportTiming>> = {
  omnibus: { routeMinutes: 45, routeKm: 8.2 },
  auto: { routeMinutes: 20, routeKm: 7.1 },
  bici: { routeMinutes: 26, routeKm: 6.8 },
  monopatin: { routeMinutes: 0, routeKm: 6.8 },
  pie: { routeMinutes: 95, routeKm: 6.6 },
}

function input(
  scenario: Partial<TransportScenario> = {},
  timing = TIMING_AUTO_RAPIDO
): TransportCompareInput {
  return {
    scenario: { ...TRANSPORT_DEFAULT_SCENARIO, financing: 'contado', ...scenario },
    prices: PRICES,
    assumptions: TRANSPORT_ASSUMPTIONS,
    timing,
  }
}

const scenarioOf = (over: Partial<TransportScenario> = {}): TransportScenario => ({
  ...TRANSPORT_DEFAULT_SCENARIO,
  financing: 'contado',
  ...over,
})

const modeOf = (result: ReturnType<typeof transportCompare>, mode: TransportMode) =>
  result.modes.find(row => row.mode === mode)!

describe('el desglose suma lo que dice el titular', () => {
  // ESTA ES LA PRUEBA QUE JUSTIFICA QUE EXISTA `transportView.ts`. El desglose visible es el único
  // lugar donde una página de calculadora puede mentir sin que falle nada: basta con que las filas
  // que se imprimen no sumen el total que está arriba y nadie se entera. Acá se exige que sumen.
  it.each(['omnibus', 'monopatin', 'auto'] as const)('%s', mode => {
    const scenario = scenarioOf()
    const result = transportCompare(input())
    const row = modeOf(result, mode)
    const rows = transportViewMonthlyRows(row, scenario)
    const parts = rows.filter(entry => entry.kind !== 'total')
    const sum = parts.reduce((total, entry) => total + entry.value, 0)
    // La tolerancia no es laxitud: cada línea del modelo viene redondeada al peso, así que la suma
    // de las partes puede separarse del total en menos de un peso por línea. Un renglón olvidado
    // vale cientos y no entra en esta ventana.
    expect(Math.abs(sum - row.monthlyAverageUyu)).toBeLessThanOrEqual(parts.length)
    expect(rows.at(-1)!.kind).toBe('total')
    expect(rows.at(-1)!.value).toBe(row.monthlyAverageUyu)
  })

  it('el valor de reventa se muestra como plata que VUELVE, con signo negativo', () => {
    const scenario = scenarioOf()
    const rows = transportViewMonthlyRows(modeOf(transportCompare(input()), 'auto'), scenario)
    const residual = rows.find(row => row.id === 'residual')
    expect(residual).toBeDefined()
    expect(residual!.value).toBeLessThan(0)
  })

  it('financiado, la cuota aparece como fila propia y dice cuánto son intereses', () => {
    const scenario = scenarioOf({ financing: 'cuotas', financingMonths: 24 })
    const result = transportCompare(input({ financing: 'cuotas', financingMonths: 24 }))
    const rows = transportViewMonthlyRows(modeOf(result, 'auto'), scenario)
    const cuota = rows.find(row => row.id === 'cuota')
    expect(cuota).toBeDefined()
    expect(cuota!.hint).toMatch(/intereses/)
    // Al contado no hay cuota que mostrar: la plata entera está en la fila de contado.
    expect(rows.find(row => row.id === 'contado')).toBeUndefined()
  })

  it('un modo sin datos no devuelve ninguna fila', () => {
    // La moto no tiene precio relevado en el fixture: sin precio no hay desglose, y una fila en cero
    // lo haría parecer gratis.
    const rows = transportViewMonthlyRows(modeOf(transportCompare(input()), 'moto'), scenarioOf())
    expect(rows).toEqual([])
  })

  it('no inventa filas: lo que vale cero no se imprime', () => {
    const rows = transportViewMonthlyRows(
      modeOf(transportCompare(input()), 'omnibus'),
      scenarioOf()
    )
    expect(rows.every(row => row.value !== 0)).toBe(true)
    expect(rows.some(row => row.id === 'fare')).toBe(true)
    expect(rows.some(row => row.id === 'insurance')).toBe(false)
  })
})

describe('el veredicto y sus dos ramas', () => {
  it('rama 1: hay punto de equilibrio y se publica en meses', () => {
    const scenario = scenarioOf()
    const verdict = transportViewVerdict(modeOf(transportCompare(input()), 'monopatin'), scenario)
    expect(verdict.tone).toBe('success')
    expect(verdict.headline).toMatch(/Se paga en \d+ mes/)
    expect(verdict.figure).toMatch(/mes/)
  })

  it('rama 1 con el equilibrio fuera del horizonte avisa en vez de festejar', () => {
    const scenario = scenarioOf({ horizonMonths: 6, daysPerWeek: 1 })
    const result = transportCompare(input({ horizonMonths: 6, daysPerWeek: 1 }))
    const row = modeOf(result, 'monopatin')
    const verdict = transportViewVerdict(row, scenario)
    if (row.breakevenMonths != null && row.breakevenMonths > 6) {
      expect(verdict.tone).toBe('warning')
      expect(verdict.headline).toMatch(/recién a los/)
    }
  })

  it('rama 2: no hay equilibrio nunca, y la respuesta es cuánto sale la hora ganada', () => {
    // Es la cifra más importante de la página: un auto no se "paga" jamás contra el ómnibus, así que
    // decir "no conviene" sería esconder lo único que sí compra, que es tiempo.
    const scenario = scenarioOf()
    const row = modeOf(transportCompare(input()), 'auto')
    expect(row.breakevenMonths).toBeNull()
    expect(row.pricePerHourSavedUyu).not.toBeNull()
    const verdict = transportViewVerdict(row, scenario)
    expect(verdict.tone).toBe('warning')
    expect(verdict.headline).toMatch(/No se paga nunca/)
    expect(verdict.detail).toMatch(/la hora/)
    expect(verdict.figure).toMatch(/la hora$/)
  })

  it('más caro Y más lento se dice sin vueltas y no calcula ninguna de las dos', () => {
    const timing: Partial<Record<TransportMode, TransportTiming>> = {
      ...TIMING_AUTO_RAPIDO,
      auto: { routeMinutes: 90, routeKm: 7.1 },
    }
    const row = modeOf(transportCompare(input({}, timing)), 'auto')
    const verdict = transportViewVerdict(row, scenarioOf())
    expect(verdict.tone).toBe('error')
    expect(verdict.headline).toBe('Más caro y más lento')
    expect(verdict.figure).toBeNull()
  })

  it('un modo sin datos dice qué le falta, no un cero', () => {
    const verdict = transportViewVerdict(modeOf(transportCompare(input()), 'moto'), scenarioOf())
    expect(verdict.headline).toBe('Sin datos')
    expect(verdict.figure).toBeNull()
    expect(verdict.detail).toMatch(/relevamos precios/)
  })

  it('el ómnibus se presenta como referencia y no como ganador', () => {
    const verdict = transportViewVerdict(modeOf(transportCompare(input()), 'omnibus'), scenarioOf())
    expect(verdict.headline).toBe('Es la referencia')
    expect(verdict.tone).toBe('info')
  })
})

describe('el veredicto cuando el modo es más lento', () => {
  it('caminar es más BARATO y más lento, no más caro: son dos veredictos distintos', () => {
    // Medido en producción el 23/9/2026: caminar salía `$ 0` por mes y la página lo rotulaba
    // «Más caro y más lento», porque sin el costo de la referencia lo único que se miraba era el
    // tiempo. Es el defecto que este test fija.
    const row = modeOf(transportCompare(input()), 'pie')
    const verdict = transportViewVerdict(row, scenarioOf(), 2253)
    expect(verdict.headline).toBe('Más barato, pero más lento')
    expect(verdict.tone).not.toBe('error')
  })

  it('un modo más caro Y más lento sigue diciéndose sin vueltas', () => {
    const row = modeOf(transportCompare(input()), 'pie')
    const caro = { ...row, monthlyAverageUyu: 9999 }
    expect(transportViewVerdict(caro, scenarioOf(), 2253).headline).toBe('Más caro y más lento')
  })

  it('sin la referencia no inventa: se queda con el veredicto conservador', () => {
    const row = modeOf(transportCompare(input()), 'pie')
    expect(transportViewVerdict(row, scenarioOf()).headline).toBe('Más caro y más lento')
  })
})

describe('el enlace al catálogo de cada modo', () => {
  it('dice cuántos avisos hay del otro lado, que es lo que decide el clic', () => {
    const link = transportViewDirectory('auto', 18528)
    expect(link?.to).toBe('/autos-usados-uruguay')
    expect(link?.cta).toBe('Ver los 18.528 avisos')
    // El nombre accesible se entiende leído fuera de su fila, que es como lo lee un lector de
    // pantalla cuando salta de enlace en enlace.
    expect(link?.aria).toBe('Ver los 18.528 avisos de autos usados')
  })

  it('sin avisos relevados el enlace sigue valiendo: el directorio explica por qué no hay', () => {
    const link = transportViewDirectory('moto', null)
    expect(link?.to).toBe('/motos-usadas-uruguay')
    expect(link?.cta).toBe('Ver el directorio')
    expect(link?.aria).toBe('Ver el directorio de motos usadas')
  })

  it('un solo aviso no dice «los 1 avisos»', () => {
    expect(transportViewDirectory('bici', 1)?.cta).toBe('Ver el aviso')
  })

  it('el ómnibus y caminar no tienen catálogo, y eso no es un olvido', () => {
    expect(transportViewDirectory('omnibus', 999)).toBeNull()
    expect(transportViewDirectory('pie', 999)).toBeNull()
  })

  it('los cuatro modos que se compran tienen el suyo', () => {
    for (const mode of ['monopatin', 'bici', 'moto', 'auto'] as const) {
      expect(transportViewDirectory(mode, 10)?.to).toMatch(/^\/[a-z-]+$/)
    }
  })
})

describe('el orden de la comparativa', () => {
  it('la referencia va primero, después de más barato a más caro, y sin datos al final', () => {
    const sorted = transportViewSortModes(transportCompare(input()))
    expect(sorted[0]!.mode).toBe('omnibus')
    expect(sorted.at(-1)!.mode).toBe('moto')
    expect(sorted.at(-1)!.available).toBe(false)

    const withData = sorted.filter(row => row.available && row.mode !== 'omnibus')
    const costs = withData.map(row => row.monthlyAverageUyu)
    expect([...costs].sort((a, b) => a - b)).toEqual(costs)
  })

  it('el modo sin datos no entra en la escala de precios', () => {
    // Un cero lo pondría primero y lo haría ganar por comparación contra nada.
    const sorted = transportViewSortModes(transportCompare(input()))
    const sinDatos = sorted.filter(row => !row.available)
    expect(sinDatos.length).toBeGreaterThan(0)
    expect(sorted.findIndex(row => !row.available)).toBeGreaterThan(
      sorted.filter(row => row.available).length - 1
    )
  })
})

describe('el gráfico del costo acumulado', () => {
  it('trae una serie por modo con datos y la del ómnibus más gruesa', () => {
    const result = transportCompare(input())
    const chart = transportViewChart(result, 36)!
    expect(chart).not.toBeNull()
    expect(chart.labels).toHaveLength(36)
    expect(chart.labels[0]).toBe('1')
    expect(chart.datasets.length).toBe(result.modes.filter(row => row.available).length)
    const bus = chart.datasets.find(row => row.label === 'Ómnibus')!
    expect(bus.borderWidth).toBeGreaterThan(
      chart.datasets.find(row => row.label === 'Auto usado')!.borderWidth
    )
  })

  it('con un horizonte largo muestrea en vez de dibujar 120 puntos', () => {
    const chart = transportViewChart(transportCompare(input({ horizonMonths: 120 })), 120)!
    expect(chart.labels.length).toBeLessThanOrEqual(49)
    expect(chart.labels.at(-1)).toBe('120')
  })

  it('sin al menos dos modos comparables no dibuja nada', () => {
    const solo = transportCompare({
      ...input(),
      prices: { ...PRICES, busFareUyu: 52, vehiclePriceUyu: {} },
      scenario: { ...scenarioOf(), daysPerWeek: 5 },
    })
    // Quedan ómnibus y a pie: dos series. Con una sola, la función devuelve null.
    const chart = transportViewChart({ ...solo, modes: solo.modes.slice(0, 1) }, 36)
    expect(chart).toBeNull()
  })
})

describe('formato', () => {
  it('los minutos se leen como los dice la gente', () => {
    expect(transportViewMinutes(42)).toBe('42 min')
    expect(transportViewMinutes(82)).toBe('1 h 22 min')
    expect(transportViewMinutes(120)).toBe('2 h')
    expect(transportViewMinutes(0)).toBe('sin datos')
    expect(transportViewMinutes(null)).toBe('sin datos')
  })

  it('las horas al año dicen si se ganan o se pierden', () => {
    expect(transportViewHoursPerYear(190)).toMatch(/que ganás/)
    expect(transportViewHoursPerYear(-42)).toMatch(/que perdés/)
    expect(transportViewHoursPerYear(0)).toBe('mismo tiempo que el ómnibus')
  })

  it('las fechas se escriben como en Uruguay y no se corren un día', () => {
    // `es-UY` rinde "setiembre"; `es` a secas rinde "septiembre". Y sin `timeZone: UTC` el servidor
    // imprime un día y el navegador el anterior, que además rompe la hidratación.
    expect(transportViewDate('2026-09-01')).toBe('1 de setiembre de 2026')
    expect(transportViewDate(null)).toBe('sin fecha')
    expect(transportViewDate('no es una fecha')).toBe('sin fecha')
  })

  it('la fuente de una cifra se imprime con su fecha al lado', () => {
    const caption = transportViewFigureCaption(TRANSPORT_ASSUMPTIONS.global.rainDaysPerYear)
    expect(caption).toMatch(/INUMET/)
    expect(caption).toMatch(/2025/)
    expect(transportViewFigureCaption(null)).toBe('sin fuente declarada')
  })
})

describe('lo que la página está obligada a decir', () => {
  it('las seis advertencias siguen declaradas', () => {
    // Cada una tapa un agujero concreto por el que la comparación se volvería falsa. Si alguien
    // borra una, la página pasa a afirmar algo que no midió y esto lo dice.
    const ids = TRANSPORT_VIEW_CAVEATS.map(caveat => caveat.id)
    expect(ids).toContain('moto-ruteada-como-auto')
    expect(ids).toContain('lluvia-nacional')
    expect(ids).toContain('soa-promedio')
    expect(ids).toContain('patente-moto')
    expect(ids).toContain('siniestralidad-no-se-monetiza')
    expect(ids).toContain('barrio-es-un-centroide')
    for (const caveat of TRANSPORT_VIEW_CAVEATS) expect(caveat.text.length).toBeGreaterThan(60)
  })

  it('la siniestralidad se publica en fallecidos y tasa, nunca en pesos', () => {
    // Sale de los SUPUESTOS y no del resultado: la moto y la bici no tienen precio relevado en este
    // fixture y aun así tienen que aparecer. Si esta tabla dependiera del catálogo, un catálogo
    // caído borraría justo la fila que más importa.
    const rows = transportViewSafetyRows(TRANSPORT_ASSUMPTIONS)
    expect(rows.length).toBeGreaterThan(2)
    // Ninguna fila lleva un campo en plata: ponerle precio a la vida para que cierre la cuenta de la
    // moto es indefendible, y una cifra inventada ahí contamina todo lo demás.
    for (const row of rows) {
      expect(Object.keys(row)).toEqual(['mode', 'label', 'fatalities', 'per100k', 'note'])
    }
    expect(rows[0]!.mode).toBe('moto')
  })

  it('un modo sin parque publicado declara que no hay tasa, en vez de omitir la fila', () => {
    const bici = transportViewSafetyRows(TRANSPORT_ASSUMPTIONS).find(row => row.mode === 'bici')!
    expect(bici.per100k).toBeNull()
    expect(bici.fatalities).toBeGreaterThan(0)
    expect(bici.note).toMatch(/Sin parque vehicular publicado/)
  })
})

describe('los supuestos se pueden cambiar en pantalla', () => {
  it('un valor puesto por el visitante entra en la cuenta y cambia de fuente', () => {
    const editado = transportViewApplyOverrides(TRANSPORT_ASSUMPTIONS, {
      'auto.consumptionPer100Km': 14,
    })
    expect(editado.byMode.auto.consumptionPer100Km.value).toBe(14)
    expect(editado.byMode.auto.consumptionPer100Km.source).toBe(TRANSPORT_VIEW_EDITED_SOURCE)
    // El resultado tiene que moverse de verdad: si el override no llegara al modelo, la página
    // mostraría controles que no hacen nada y nadie lo notaría.
    const base = modeOf(transportCompare(input()), 'auto').monthlyAverageUyu
    const conMas = modeOf(
      transportCompare({ ...input(), assumptions: editado }),
      'auto'
    ).monthlyAverageUyu
    expect(conMas).toBeGreaterThan(base)
  })

  it('no toca el objeto original: el visitante edita su copia', () => {
    const original = TRANSPORT_ASSUMPTIONS.global.rainDaysPerYear.value
    transportViewApplyOverrides(TRANSPORT_ASSUMPTIONS, { 'global.rainDaysPerYear': 120 })
    expect(TRANSPORT_ASSUMPTIONS.global.rainDaysPerYear.value).toBe(original)
  })

  it('no se puede inventar una patente de moto desde el formulario', () => {
    // `roadTaxUyu` de la moto es `null` porque no existe tabla nacional para menos de 500 cc. Si un
    // override pudiera completarlo, la página pasaría a publicar una patente de moto con la forma
    // de un dato nuestro.
    const editado = transportViewApplyOverrides(TRANSPORT_ASSUMPTIONS, { 'moto.roadTaxUyu': 9000 })
    expect(editado.byMode.moto.roadTaxUyu).toBeNull()
  })

  it('un campo vacío o negativo no pisa la cifra publicada', () => {
    const editado = transportViewApplyOverrides(TRANSPORT_ASSUMPTIONS, {
      'auto.insuranceUyu': Number.NaN,
      'auto.fixedMaintenanceUyu': -1,
    })
    expect(editado.byMode.auto.insuranceUyu!.value).toBe(
      TRANSPORT_ASSUMPTIONS.byMode.auto.insuranceUyu!.value
    )
    expect(editado.byMode.auto.fixedMaintenanceUyu.value).toBe(
      TRANSPORT_ASSUMPTIONS.byMode.auto.fixedMaintenanceUyu.value
    )
  })

  it('el formulario ofrece todos los campos que el modelo usa para un vehículo', () => {
    // Un supuesto que el modelo usa y el formulario no ofrece es un supuesto que el visitante no
    // puede discutir, y eso no se ve mirando la página: se ve contando la lista.
    const ofrecidos = new Set(TRANSPORT_VIEW_EDITABLE_FIELDS.map(entry => entry.field as string))
    const usados = Object.keys(TRANSPORT_ASSUMPTIONS.byMode.auto).filter(key => {
      const value = (TRANSPORT_ASSUMPTIONS.byMode.auto as Record<string, unknown>)[key]
      return !!value && typeof value === 'object' && 'value' in (value as object)
    })
    const faltantes = usados.filter(
      key => !ofrecidos.has(key) && !['fatalities', 'fatalityPer100kVehicles'].includes(key)
    )
    expect(faltantes).toEqual([])
  })
})
