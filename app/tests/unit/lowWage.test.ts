import { describe, expect, it } from 'vitest'
import { computePayroll } from '../../utils/payroll'
import {
  BOARD_CENSUS,
  BOARD_EXAMPLES,
  BOARD_HOURS,
  DESCANSO_INTERMEDIO,
  HORA_EXTRA,
  JORNADA_LIMITES,
  LOWWAGE_FAQ,
  LOWWAGE_SOURCES,
  MECANISMOS,
  QUE_HACER,
  SEMANAS_POR_MES,
  SMN_2026,
  SMN_HORA,
  SMN_VIGENTE,
  alquilerNuevoRegion,
  diasLicenciaEstudio,
  esJornadaCompleta,
  jornadaBreakdown,
  smnCheck,
  survivalCheck,
} from '../../utils/lowWage'

const jornada = (over: Partial<Parameters<typeof jornadaBreakdown>[0]> = {}) =>
  jornadaBreakdown({
    entrada: 9,
    salida: 18,
    corteMin: 60,
    diasPorSemana: 5,
    rama: 'comercio',
    nominal: 30000,
    ...over,
  })

describe('el piso legal', () => {
  it('publica los dos tramos del SMN 2026 y el de julio es el vigente', () => {
    expect(SMN_2026.enero).toBe(24572)
    expect(SMN_2026.julio).toBe(25383)
    expect(SMN_VIGENTE).toBe(SMN_2026.julio)
    expect(SMN_2026.julio).toBeGreaterThan(SMN_2026.enero)
  })

  it('deriva la hora del divisor 200 que fija el propio decreto', () => {
    expect(SMN_HORA).toBeCloseTo(126.915, 3)
    expect(SMN_2026.julio / SMN_2026.divisorJornal).toBeCloseTo(1015.32, 2)
  })

  it('mantiene el doble límite y los recargos de la Ley 15.996', () => {
    expect(JORNADA_LIMITES.diario).toBe(8)
    expect(JORNADA_LIMITES.semanalComercio).toBe(44)
    expect(JORNADA_LIMITES.semanalIndustria).toBe(48)
    expect(HORA_EXTRA.recargoHabilPct).toBe(100)
    expect(HORA_EXTRA.recargoDescansoPct).toBe(150)
    expect(HORA_EXTRA.topeSemanal).toBe(8)
  })
})

describe('jornadaBreakdown — la ventana de nueve horas', () => {
  it('con una hora de corte no pago son 8 trabajadas y no hay extras', () => {
    const r = jornada({ corteMin: 60 })
    expect(r.ventana).toBe(9)
    expect(r.corteEsPago).toBe(false)
    expect(r.horasDia).toBe(8)
    expect(r.horasSemana).toBe(40)
    expect(r.excedeTopeDiario).toBe(false)
    expect(r.extrasSemana).toBe(0)
    expect(r.deudaExtrasMes).toBe(0)
  })

  it('con media hora de corte son 8,5 trabajadas porque esa media hora se computa como trabajo', () => {
    const r = jornada({ corteMin: 30 })
    expect(r.corteEsPago).toBe(true)
    expect(r.horasDia).toBe(9)
    // La media hora del art. del descanso continuo NO se resta: por eso la ventana entera cuenta.
    expect(r.horasSemana).toBe(45)
    expect(r.excedeTopeDiario).toBe(true)
  })

  it('el tope semanal no salva al diario: 42,5 h semanales igual generan extras', () => {
    // Ventana de 8,5 h con corte de 30 min -> la ventana entera se trabaja.
    const r = jornada({ entrada: 9, salida: 17.5, corteMin: 30 })
    expect(r.horasDia).toBe(8.5)
    expect(r.horasSemana).toBe(42.5)
    expect(r.excedeTopeSemanal).toBe(false)
    expect(r.excedeTopeDiario).toBe(true)
    expect(r.extrasPorTopeSemanal).toBe(0)
    expect(r.extrasPorTopeDiario).toBe(2.5)
    expect(r.extrasSemana).toBe(2.5)
  })

  it('toma el mayor de los dos caminos, nunca la suma', () => {
    // 6 días de 9 h trabajadas: diario da 6, semanal da 54-44 = 10. Manda 10.
    const r = jornada({ entrada: 8, salida: 17, corteMin: 0, diasPorSemana: 6 })
    expect(r.horasDia).toBe(9)
    expect(r.horasSemana).toBe(54)
    expect(r.extrasPorTopeDiario).toBe(6)
    expect(r.extrasPorTopeSemanal).toBe(10)
    expect(r.extrasSemana).toBe(10)
    expect(r.extrasSemana).toBeLessThan(r.extrasPorTopeDiario + r.extrasPorTopeSemanal)
    expect(r.superaTopeExtras).toBe(true)
  })

  it('la industria tolera 48 semanales donde el comercio corta en 44', () => {
    const com = jornada({ entrada: 8, salida: 16, corteMin: 0, diasPorSemana: 6 })
    const ind = jornada({
      entrada: 8,
      salida: 16,
      corteMin: 0,
      diasPorSemana: 6,
      rama: 'industria',
    })
    expect(com.horasSemana).toBe(48)
    expect(com.extrasSemana).toBe(4)
    expect(ind.extrasSemana).toBe(0)
  })

  it('valoriza las extras al doble de la hora simple', () => {
    const r = jornada({ entrada: 9, salida: 17.5, corteMin: 30, nominal: 30000 })
    expect(r.valorHora).toBe(150) // 30.000 / 200
    const esperado = 2.5 * SEMANAS_POR_MES * 150 * 2
    expect(r.deudaExtrasMes).toBeCloseTo(esperado, 0)
  })

  it('marca como anómalo el corte que no es ni continuo ni discontinuo reducido', () => {
    expect(jornada({ corteMin: 45 }).corteAnomalo).toBe(true)
    expect(jornada({ corteMin: 30 }).corteAnomalo).toBe(false)
    expect(jornada({ corteMin: 60 }).corteAnomalo).toBe(false)
    expect(DESCANSO_INTERMEDIO.continuaEsTrabajoEfectivo).toBe(true)
  })

  it('resuelve el turno que cruza la medianoche', () => {
    const r = jornada({ entrada: 22, salida: 6, corteMin: 0 })
    expect(r.ventana).toBe(8)
    expect(r.horasDia).toBe(8)
    expect(r.excedeTopeDiario).toBe(false)
  })

  it('no devuelve horas negativas si el corte se come la ventana', () => {
    const r = jornada({ entrada: 9, salida: 11, corteMin: 600 })
    expect(r.horasDia).toBe(0)
    expect(r.extrasSemana).toBe(0)
  })
})

describe('esJornadaCompleta', () => {
  it('el umbral es el tope legal diario en una semana estándar', () => {
    expect(esJornadaCompleta(8, 5)).toBe(true)
    expect(esJornadaCompleta(8.5, 5)).toBe(true)
    expect(esJornadaCompleta(9, 6)).toBe(true)
    expect(esJornadaCompleta(7.5, 5)).toBe(false)
    expect(esJornadaCompleta(8, 4)).toBe(false)
  })
})

describe('smnCheck', () => {
  it('marca 25.000 por jornada completa como bajo el mínimo', () => {
    const r = smnCheck(25000, 200, true)
    expect(r.piso).toBe(SMN_VIGENTE)
    expect(r.bajoElMinimo).toBe(true)
    expect(r.diferencia).toBeLessThan(0)
  })

  it('EL CASO DE LA PREGUNTA: L-V de 9 a 18 con corte de 1 h son 173 h/mes y el piso sigue siendo el SMN entero', () => {
    // Prorratear 173/200 rebajaría el piso a ~22.000 y daría por buena la oferta que la página
    // examina. El SMN es un monto mensual para la jornada completa, no una tarifa por hora.
    const j = jornada({ nominal: 25000 })
    expect(j.horasDia).toBe(8)
    expect(j.horasMes).toBeCloseTo(173.33, 1)
    const r = smnCheck(25000, j.horasMes, esJornadaCompleta(j.horasDia, 5))
    expect(r.jornadaCompleta).toBe(true)
    expect(r.piso).toBe(SMN_VIGENTE)
    expect(r.bajoElMinimo).toBe(true)
    expect(r.piso).toBeGreaterThan(r.pisoPorHora)
  })

  it('la jornada reducida sí se mide por hora, con el divisor 200 del decreto', () => {
    const r = smnCheck(25000, 100, false)
    expect(r.jornadaCompleta).toBe(false)
    expect(r.piso).toBeCloseTo(100 * SMN_HORA, 2)
    expect(r.piso).toBeCloseTo(SMN_VIGENTE / 2, 2)
    expect(r.bajoElMinimo).toBe(false)
  })

  it('no sube el piso por trabajar más de 200 horas: eso se paga por hora extra', () => {
    expect(smnCheck(30000, 260, true).piso).toBe(SMN_VIGENTE)
  })

  it('reconoce el nominal anclado al SMN de enero, que hoy está viejo', () => {
    const r = smnCheck(SMN_2026.enero, 200, true)
    expect(r.esElMinimoDeEnero).toBe(true)
    expect(r.bajoElMinimo).toBe(true)
  })
})

describe('survivalCheck — la cuenta que contesta la pregunta', () => {
  it('el líquido del SMN completo no paga el alquiler nuevo promedio de Montevideo', () => {
    const r = survivalCheck({
      nominal: SMN_VIGENTE,
      region: 'montevideo',
      personas: 1,
      inquilino: true,
      ingresos: 1,
    })
    expect(r.liquido).toBeCloseTo(computePayroll({ nominal: SMN_VIGENTE }).liquido, 2)
    expect(r.alquilerNuevo).toBeGreaterThan(r.liquido)
    expect(r.restaTrasAlquiler).toBeLessThan(0)
    expect(r.alquilerPctIngreso).toBeGreaterThan(100)
  })

  it('solo, alquilando y en Montevideo, el SMN queda bajo la línea de pobreza del INE', () => {
    const r = survivalCheck({
      nominal: SMN_VIGENTE,
      region: 'montevideo',
      personas: 1,
      inquilino: true,
      ingresos: 1,
    })
    expect(r.sobreLaLinea).toBe(false)
    expect(r.margen).toBeLessThan(0)
  })

  it('sin alquilar, el mismo sueldo sí supera la línea: es el mecanismo real', () => {
    const r = survivalCheck({
      nominal: SMN_VIGENTE,
      region: 'montevideo',
      personas: 1,
      inquilino: false,
      ingresos: 1,
    })
    expect(r.sobreLaLinea).toBe(true)
    expect(r.alquilerNuevo).toBe(0)
  })

  it('dos ingresos iguales cambian el resultado del hogar', () => {
    const solo = survivalCheck({
      nominal: 30000,
      region: 'montevideo',
      personas: 2,
      inquilino: true,
      ingresos: 1,
    })
    const dos = survivalCheck({
      nominal: 30000,
      region: 'montevideo',
      personas: 2,
      inquilino: true,
      ingresos: 2,
    })
    expect(solo.sobreLaLinea).toBe(false)
    expect(dos.sobreLaLinea).toBe(true)
    expect(dos.ingresoHogar).toBeCloseTo(solo.ingresoHogar * 2, 2)
  })

  it('el interior alquila más barato que Montevideo', () => {
    expect(alquilerNuevoRegion('interior')).toBeLessThan(alquilerNuevoRegion('montevideo'))
    expect(alquilerNuevoRegion('interior')).toBeGreaterThan(0)
  })
})

describe('licencia por estudio', () => {
  it('escala por tramos y 48 exactas caen en el tramo alto', () => {
    expect(diasLicenciaEstudio(30)).toBe(6)
    expect(diasLicenciaEstudio(36)).toBe(6)
    expect(diasLicenciaEstudio(40)).toBe(9)
    expect(diasLicenciaEstudio(47.9)).toBe(9)
    expect(diasLicenciaEstudio(48)).toBe(12)
    expect(diasLicenciaEstudio(50)).toBe(12)
  })
})

describe('el relevamiento se publica con sus límites', () => {
  it('la muestra limpia es la declarada menos el centinela', () => {
    expect(BOARD_CENSUS.conSalarioMensual - BOARD_CENSUS.centinela111111).toBe(
      BOARD_CENSUS.muestraLimpia
    )
    expect(BOARD_CENSUS.muestraLimpia).toBeLessThan(BOARD_CENSUS.avisos)
  })

  it('el porcentaje con sueldo útil coincide con los conteos', () => {
    const pct = (BOARD_CENSUS.muestraLimpia / BOARD_CENSUS.avisos) * 100
    expect(pct).toBeCloseTo(BOARD_CENSUS.pctConSueldoUtil, 1)
  })

  it('los cuartiles están ordenados', () => {
    expect(BOARD_CENSUS.minimo).toBeLessThan(BOARD_CENSUS.p25)
    expect(BOARD_CENSUS.p25).toBeLessThan(BOARD_CENSUS.mediana)
    expect(BOARD_CENSUS.mediana).toBeLessThan(BOARD_CENSUS.p75)
  })

  it('la ventana de nueve horas es la más frecuente y los conteos cierran', () => {
    expect(BOARD_HOURS.moda).toBe(9)
    expect(BOARD_HOURS.nueveExactas).toBeGreaterThan(BOARD_HOURS.ocho)
    expect(BOARD_HOURS.nueveOMas).toBeGreaterThanOrEqual(BOARD_HOURS.nueveExactas)
    expect(BOARD_HOURS.nueveOMas + BOARD_HOURS.ocho + BOARD_HOURS.menorAOcho).toBeLessThanOrEqual(
      BOARD_HOURS.conVentanaHoraria
    )
    expect(BOARD_HOURS.conVentanaHoraria).toBeLessThan(BOARD_HOURS.avisosLeidos)
  })

  it('ningún ejemplo publica el nombre de la empresa', () => {
    const campos = Object.keys(BOARD_EXAMPLES[0])
    expect(campos).not.toContain('empresa')
    expect(campos).not.toContain('company')
  })

  it('los ejemplos van ordenados por monto y traen su lectura', () => {
    const montos = BOARD_EXAMPLES.map(e => e.nominal)
    expect([...montos].sort((a, b) => a - b)).toEqual(montos)
    BOARD_EXAMPLES.forEach(e => {
      expect(e.puesto.length).toBeGreaterThan(3)
      expect(e.lectura.length).toBeGreaterThan(40)
      expect(e.nominal).toBeGreaterThan(0)
    })
  })

  it('hay al menos un ejemplo de ventana de nueve horas, que es el de la pregunta', () => {
    expect(BOARD_EXAMPLES.filter(e => e.ventana === 9).length).toBeGreaterThanOrEqual(2)
  })

  it('el ejemplo anclado al SMN de enero está en la lista', () => {
    expect(BOARD_EXAMPLES.some(e => e.nominal === SMN_2026.enero)).toBe(true)
  })
})

describe('contenido', () => {
  it('la FAQ responde y cada respuesta es sustantiva', () => {
    expect(LOWWAGE_FAQ.length).toBeGreaterThanOrEqual(8)
    LOWWAGE_FAQ.forEach(f => {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.short.length).toBeGreaterThan(10)
      expect(f.answer.length).toBeGreaterThan(200)
    })
  })

  it('no hay preguntas repetidas', () => {
    expect(new Set(LOWWAGE_FAQ.map(f => f.question)).size).toBe(LOWWAGE_FAQ.length)
  })

  it('mecanismos y pasos vienen completos', () => {
    expect(MECANISMOS.length).toBeGreaterThanOrEqual(5)
    expect(QUE_HACER.length).toBe(3)
    ;[...MECANISMOS, ...QUE_HACER].forEach(m => {
      expect(m.titulo.length).toBeGreaterThan(5)
      expect(m.detalle.length).toBeGreaterThan(60)
    })
  })

  it('todas las fuentes son oficiales y con URL absoluta', () => {
    expect(LOWWAGE_SOURCES.length).toBeGreaterThanOrEqual(10)
    LOWWAGE_SOURCES.forEach(s => {
      expect(s.url).toMatch(/^https:\/\//)
      expect(s.url).toMatch(/gub\.uy|impo\.com\.uy/)
      expect(s.label.length).toBeGreaterThan(10)
    })
  })

  it('cita el decreto del SMN y las cuatro normas de jornada', () => {
    const urls = LOWWAGE_SOURCES.map(s => s.url).join(' ')
    expect(urls).toContain('decretos/319-2025')
    expect(urls).toContain('leyes/5350-1915')
    expect(urls).toContain('decretos-ley/14320-1974')
    expect(urls).toContain('leyes/15996-1988')
    expect(urls).toContain('leyes/18345-2008')
  })
})
