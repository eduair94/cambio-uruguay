import { describe, expect, it } from 'vitest'
import {
  SITE_ASSUMPTION,
  TRANSPORT_ASSUMPTIONS,
  TRANSPORT_CONTEXT_FIGURES,
  transportAllFigures,
} from '../../utils/transportAssumptions'

// Este archivo NO verifica valores: verifica que cada cifra se pueda AUDITAR.
//
// Por qué, y de dónde sale: el repo ya publicó la BPC de 2024 durante meses porque el guardarraíl
// medía plausibilidad y no actualidad — un número viejo pasa cualquier banda. Lo único que permite
// darse cuenta es que la cifra lleve su fecha y su fuente pegadas, y lo único que garantiza que las
// lleve TODAS es un test que las recorra todas. Revisar los valores es trabajo de una persona una
// vez por año; que ninguno viaje anónimo es trabajo de CI.

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

describe('toda cifra curada se puede auditar', () => {
  const figures = transportAllFigures()

  it('recorre las tres tablas y no una', () => {
    // Guarda de la guarda: si `transportAllFigures()` deja de aplanar una tabla, los `it.each` de
    // abajo pasan igual porque recorren menos filas. Esto lo dice.
    const paths = figures.map(entry => entry.path)
    expect(paths.some(path => path.startsWith('global.'))).toBe(true)
    expect(paths.some(path => path.startsWith('auto.'))).toBe(true)
    expect(paths.some(path => path.startsWith('context.'))).toBe(true)
    expect(figures.length).toBeGreaterThan(60)
  })

  it.each(figures.map(entry => [entry.path, entry.figure] as const))(
    '%s tiene fecha ISO de vigencia',
    (_path, figure) => {
      expect(figure.asOf).toMatch(ISO_DATE)
      // Una fecha que el parser no entiende es tan inauditable como no tenerla.
      expect(Number.isNaN(new Date(`${figure.asOf}T00:00:00.000Z`).getTime())).toBe(false)
    }
  )

  it.each(figures.map(entry => [entry.path, entry.figure] as const))(
    '%s dice quién lo publica y enlaza dónde',
    (_path, figure) => {
      expect(figure.source.trim().length).toBeGreaterThan(3)
      expect(figure.sourceUrl).toMatch(/^https:\/\//)
    }
  )

  it('ninguna cifra queda fechada en el futuro', () => {
    // Una fecha de vigencia posterior a hoy no es un dato: es un error de tipeo que nadie mira.
    const today = new Date().toISOString().slice(0, 10)
    const ahead = figures.filter(entry => entry.figure.asOf > today).map(entry => entry.path)
    expect(ahead).toEqual([])
  })

  it('un supuesto sin fuente oficial se declara como tal y explica qué asume', () => {
    // La diferencia entre "cifra oficial" y "supuesto del sitio" es lo que decide si el visitante
    // puede discutirla. Un supuesto anónimo se lee como dato.
    const assumed = figures.filter(entry => entry.figure.source === SITE_ASSUMPTION)
    expect(assumed.length).toBeGreaterThan(10)
    for (const entry of assumed) {
      expect(entry.figure.note?.trim().length ?? 0).toBeGreaterThan(10)
    }
  })
})

describe('las abstenciones que la página tiene que respetar', () => {
  it('la moto no declara patente: no existe tabla nacional para menos de 500 cc', () => {
    // El Texto Ordenado del SUCIVE 2026 manda ese segmento a "la patente de 2025 ajustada por IPC",
    // que fija la intendencia del primer empadronamiento. Un rango publicado acá sería inventado.
    expect(TRANSPORT_ASSUMPTIONS.byMode.moto.roadTaxUyu).toBeNull()
    expect(TRANSPORT_ASSUMPTIONS.byMode.moto.roadTaxRateOfPrice).toBeNull()
  })

  it('el auto sí declara las dos patas de la patente, porque la norma las fija', () => {
    expect(TRANSPORT_ASSUMPTIONS.byMode.auto.roadTaxUyu?.value).toBeGreaterThan(0)
    expect(TRANSPORT_ASSUMPTIONS.byMode.auto.roadTaxRateOfPrice?.value).toBeCloseTo(0.045, 5)
  })

  it('bici y monopatín publican fallecidos pero no tasa: nadie publica ese parque', () => {
    expect(TRANSPORT_ASSUMPTIONS.byMode.bici.fatalityPer100kVehicles).toBeNull()
    expect(TRANSPORT_ASSUMPTIONS.byMode.monopatin.fatalityPer100kVehicles).toBeNull()
    expect(TRANSPORT_ASSUMPTIONS.byMode.monopatin.fatalities).toBeNull()
  })

  it('la tasa por vehículo dice que es un cruce propio y con qué denominador', () => {
    // Entre el parque "activo" del MIEM y el crudo del SUCIVE hay casi un factor dos: la misma
    // división da dos resultados y por eso el denominador viaja escrito en la propia cifra.
    for (const mode of ['moto', 'auto'] as const) {
      const cross = TRANSPORT_ASSUMPTIONS.byMode[mode].fatalityPer100kVehicles
      expect(cross).not.toBeNull()
      expect(cross!.note).toMatch(/[Cc]ruce propio/)
      expect(cross!.note).toMatch(/MIEM/)
    }
  })

  it('el SOA se publica como promedio del BCU y no como tarifa', () => {
    for (const mode of ['moto', 'auto'] as const) {
      const soa = TRANSPORT_ASSUMPTIONS.byMode[mode].insuranceUyu
      expect(soa).not.toBeNull()
      expect(soa!.source).toMatch(/BCU/)
      expect(soa!.note).toMatch(/no es una tarifa|promedio del mercado/i)
    }
  })

  it('los días de lluvia dicen que son de todo el país', () => {
    const rain = TRANSPORT_ASSUMPTIONS.global.rainDaysPerYear
    expect(rain.source).toMatch(/INUMET/)
    expect(rain.note).toMatch(/país|nacional/i)
  })

  it('el ómnibus no suma acceso aparte: la caminata y la espera ya están en su tiempo', () => {
    // Sumarle minutos acá sería contar dos veces lo mismo y hacerlo perder contra todo.
    expect(TRANSPORT_ASSUMPTIONS.byMode.omnibus.accessMinutes.value).toBe(0)
    expect(TRANSPORT_ASSUMPTIONS.byMode.pie.accessMinutes.value).toBe(0)
  })

  it('el contexto que la página muestra al lado también está fechado', () => {
    expect(TRANSPORT_CONTEXT_FIGURES.licenciaPrimeraVez.asOf).toMatch(ISO_DATE)
    expect(TRANSPORT_CONTEXT_FIGURES.hurtoVehiculos.sourceUrl).toMatch(/^https:\/\//)
  })
})
