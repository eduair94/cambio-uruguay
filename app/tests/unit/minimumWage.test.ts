import { describe, expect, it } from 'vitest'
import {
  AGUINALDO_MENSUAL,
  FORMAS,
  LIQUIDO_SMN,
  PALANCAS_NINGUNA,
  PALANCAS_TODAS,
  SERVICIOS_DESGLOSE,
  VACACIONAL_MENSUAL,
  evaluarAviso,
  minimumWageQueryToParams,
  normalizeMinimumWageQuery,
  planDelMes,
  puertasDeEntrada,
  regionDe,
} from '../../utils/minimumWage'
import { COST_MODEL } from '../../utils/costOfLiving'
import { SMN_VIGENTE, TRANSPORTE_MES } from '../../utils/lowWage'
import { computePayroll } from '../../utils/payroll'
import { UR } from '../../utils/stateSupport'

describe('ingresos del salario mínimo', () => {
  it('parte del líquido del SMN vigente', () => {
    expect(LIQUIDO_SMN).toBe(Math.round(computePayroll({ nominal: SMN_VIGENTE }).liquido))
    expect(LIQUIDO_SMN).toBeGreaterThan(20000)
    expect(LIQUIDO_SMN).toBeLessThan(21000)
  })
  it('el aguinaldo prorrateado es un doceavo del líquido de un sueldo', () => {
    expect(AGUINALDO_MENSUAL).toBeCloseTo(LIQUIDO_SMN / 12, 0)
  })
  it('el salario vacacional prorrateado son 20 jornales líquidos por año', () => {
    expect(Math.abs(VACACIONAL_MENSUAL - ((LIQUIDO_SMN / 30) * 20) / 12)).toBeLessThan(5)
  })
})

describe('desglose de servicios', () => {
  it('no pasa del total que usa el modelo del sitio', () => {
    const suma = Object.values(SERVICIOS_DESGLOSE).reduce((a, b) => a + b, 0)
    expect(suma).toBeLessThanOrEqual(COST_MODEL.utilitiesBase)
  })
})

describe('planDelMes', () => {
  it('pieza en Montevideo sin palancas: el techo es el líquido menos los gastos personales', () => {
    const plan = planDelMes('pieza', 'montevideo', PALANCAS_NINGUNA)
    const gastos =
      Math.round(COST_MODEL.foodPerAdult * COST_MODEL.lifestyleFood.austero) +
      SERVICIOS_DESGLOSE.celular +
      TRANSPORTE_MES +
      COST_MODEL.healthPerPerson +
      Math.round(COST_MODEL.miscPerPerson * COST_MODEL.lifestyleMisc.austero)
    expect(plan.ingreso).toBe(LIQUIDO_SMN)
    expect(plan.gasto).toBe(gastos)
    expect(plan.techoPieza).toBe(LIQUIDO_SMN - gastos)
    expect(plan.techoPieza).toBeLessThan(6000)
  })
  it('las palancas suben el techo exactamente lo que valen', () => {
    const sin = planDelMes('pieza', 'montevideo', PALANCAS_NINGUNA)
    const con = planDelMes('pieza', 'montevideo', PALANCAS_TODAS)
    const esperado =
      TRANSPORTE_MES -
      COST_MODEL.aPieBiciMonthly +
      COST_MODEL.healthPerPerson +
      AGUINALDO_MENSUAL +
      VACACIONAL_MENSUAL
    expect(con.techoPieza - sin.techoPieza).toBe(esperado)
    expect(con.techoPieza).toBeGreaterThan(9000)
  })
  it('una casa paga además UTE y OSE, e internet sólo si no se renuncia', () => {
    const conInternet = planDelMes('solo-interior', 'interior', {
      ...PALANCAS_TODAS,
      sinInternet: false,
    })
    const sinInternet = planDelMes('solo-interior', 'interior', PALANCAS_TODAS)
    expect(sinInternet.servicio).toBe(SERVICIOS_DESGLOSE.ute + SERVICIOS_DESGLOSE.ose)
    expect(conInternet.servicio - sinInternet.servicio).toBe(SERVICIOS_DESGLOSE.internet)
    expect(sinInternet.techoVivienda).toBe(sinInternet.techoPieza - sinInternet.servicio)
  })
  it('el interior come y viaja más barato que Montevideo', () => {
    const mvd = planDelMes('solo-montevideo', 'montevideo', PALANCAS_NINGUNA)
    const int = planDelMes('solo-interior', 'interior', PALANCAS_NINGUNA)
    expect(int.gasto).toBeLessThan(mvd.gasto)
  })
  it('dos sueldos: el doble de ingreso y de gastos personales, servicios ×1,15', () => {
    const uno = planDelMes('solo-montevideo', 'montevideo', PALANCAS_TODAS)
    const dos = planDelMes('dos-sueldos', 'montevideo', PALANCAS_TODAS)
    expect(dos.ingreso).toBe(uno.ingreso * 2)
    expect(dos.gasto).toBe(uno.gasto * 2)
    expect(dos.servicio).toBe(
      Math.round(SERVICIOS_DESGLOSE.ute * 1.15) + Math.round(SERVICIOS_DESGLOSE.ose * 1.15)
    )
  })
})

describe('evaluarAviso', () => {
  const plan = planDelMes('solo-interior', 'interior', PALANCAS_TODAS)
  it('cierra cuando alquiler más gastos comunes conocidos entran en el techo', () => {
    const e = evaluarAviso(plan, {
      tipo: 'casa',
      alquiler: plan.techoVivienda - 1000,
      gastosComunes: 0,
      serviciosIncluidos: false,
    })
    expect(e).toEqual({
      veredicto: 'cierra',
      costo: plan.techoVivienda - 1000,
      sobra: 1000,
      falta: null,
    })
  })
  it('con gastos comunes desconocidos nunca dice "cierra" a secas', () => {
    const e = evaluarAviso(plan, {
      tipo: 'apartamento',
      alquiler: plan.techoVivienda - 700,
      gastosComunes: null,
      serviciosIncluidos: false,
    })
    expect(e.veredicto).toBe('cierra-si')
    expect(e.falta).toBe('gastos-comunes')
    expect(e.sobra).toBe(700)
  })
  it('no cierra si el alquiler solo ya pasa el techo', () => {
    const e = evaluarAviso(plan, {
      tipo: 'apartamento',
      alquiler: plan.techoVivienda + 1,
      gastosComunes: null,
      serviciosIncluidos: false,
    })
    expect(e.veredicto).toBe('no-cierra')
  })
  it('una pieza con servicios incluidos cierra; sin ese dato, cierra si', () => {
    const pieza = planDelMes('pieza', 'montevideo', PALANCAS_TODAS)
    const base = { tipo: 'habitacion' as const, alquiler: 8000, gastosComunes: null }
    expect(evaluarAviso(pieza, { ...base, serviciosIncluidos: true }).veredicto).toBe('cierra')
    const si = evaluarAviso(pieza, { ...base, serviciosIncluidos: false })
    expect(si.veredicto).toBe('cierra-si')
    expect(si.falta).toBe('servicios')
    expect(si.sobra).toBe(pieza.techoPieza - 8000)
  })
})

describe('puertasDeEntrada', () => {
  const tope40 = Math.floor(0.4 * SMN_VIGENTE)
  it('una pensión es hospedaje; otra pieza no tiene puerta publicada', () => {
    expect(
      puertasDeEntrada('pieza', { tipo: 'habitacion', alquiler: 9000, pension: true }, false)
    ).toEqual(['hospedaje'])
    expect(
      puertasDeEntrada('pieza', { tipo: 'habitacion', alquiler: 9000, pension: false }, false)
    ).toEqual([])
  })
  it('ANDA hasta el 40 % del nominal, y el régimen sin garantía siempre', () => {
    expect(
      puertasDeEntrada('solo-interior', { tipo: 'casa', alquiler: tope40, pension: false }, false)
    ).toEqual(['anda', 'sin-garantia'])
    expect(
      puertasDeEntrada(
        'solo-interior',
        { tipo: 'casa', alquiler: tope40 + 2, pension: false },
        false
      )
    ).toEqual(['sin-garantia'])
  })
  it('un solo mínimo no llega al FGA; dos sí', () => {
    const alquiler = 15000
    expect(
      puertasDeEntrada('solo-montevideo', { tipo: 'apartamento', alquiler, pension: false }, false)
    ).not.toContain('fga')
    expect(
      puertasDeEntrada('dos-sueldos', { tipo: 'apartamento', alquiler, pension: false }, false)
    ).toContain('fga')
    expect(2 * LIQUIDO_SMN).toBeGreaterThanOrEqual(15 * UR.valor)
    expect(LIQUIDO_SMN).toBeLessThan(15 * UR.valor)
  })
  it('FGA Jóvenes sólo si es joven, solo, y hasta el 40 % del líquido', () => {
    const tope = Math.floor(0.4 * LIQUIDO_SMN)
    const aviso = { tipo: 'apartamento' as const, alquiler: tope, pension: false }
    expect(puertasDeEntrada('solo-montevideo', aviso, true)).toContain('fga-jovenes')
    expect(puertasDeEntrada('solo-montevideo', aviso, false)).not.toContain('fga-jovenes')
    expect(
      puertasDeEntrada('solo-montevideo', { ...aviso, alquiler: tope + 2 }, true)
    ).not.toContain('fga-jovenes')
    expect(puertasDeEntrada('dos-sueldos', aviso, true)).not.toContain('fga-jovenes')
  })
})

describe('query', () => {
  it('defaults: pieza, todas las palancas, página 1', () => {
    const q = normalizeMinimumWageQuery({})
    expect(q).toEqual({
      forma: 'pieza',
      departamento: '',
      palancas: PALANCAS_TODAS,
      joven: false,
      page: 1,
    })
    expect(minimumWageQueryToParams(q)).toEqual({})
  })
  it('valores basura caen a los defaults', () => {
    const q = normalizeMinimumWageQuery({ forma: 'x', page: '-3', caminar: 'si', departamento: 42 })
    expect(q.forma).toBe('pieza')
    expect(q.page).toBe(1)
    expect(q.palancas.caminar).toBe(true)
    expect(q.departamento).toBe('')
  })
  it('ida y vuelta por la URL', () => {
    const q = normalizeMinimumWageQuery({
      forma: 'dos-sueldos',
      departamento: 'Salto',
      caminar: '0',
      asse: '0',
      joven: '1',
      page: '3',
    })
    expect(normalizeMinimumWageQuery(minimumWageQueryToParams(q))).toEqual(q)
  })
})

describe('formas y regiones', () => {
  it('las cuatro formas existen en orden de presentación', () => {
    expect(FORMAS.map(f => f.id)).toEqual([
      'pieza',
      'solo-interior',
      'dos-sueldos',
      'solo-montevideo',
    ])
  })
  it('regionDe ignora tildes y mayúsculas', () => {
    expect(regionDe('MONTEVIDEO')).toBe('montevideo')
    expect(regionDe('Paysandú')).toBe('interior')
  })
})
