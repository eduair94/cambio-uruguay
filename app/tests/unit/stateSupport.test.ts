import { describe, expect, it } from 'vitest'
import {
  AFAM_15084,
  AFAM_PE,
  APOYOS,
  APOYOS_FAQ,
  BONO_SOCIAL_UTE,
  CARNE_SALUD,
  FGA,
  FGA_INGRESO_MINIMO_PESOS,
  ORDEN_SUGERIDO,
  PUERTAS,
  STATE_SUPPORT_SOURCES,
  STATE_SUPPORT_VERIFIED_AT,
  TARIFA_SOCIAL_OSE,
  TUS,
  UR,
  URUGUAY_TRABAJA,
  bonificacionUte,
  compararAsignaciones,
  conApoyos,
  montoAfam15084,
  montoAfamPlanEquidad,
  montoTus,
  planDeApoyos,
  topeKwhBonificado,
} from '../../utils/stateSupport'
import { SMN_VIGENTE } from '../../utils/lowWage'

/** El líquido de un salario mínimo, tal como lo publica la página (aportes del 19,6 %). */
const LIQUIDO_SMN = 20408

describe('asignación familiar del Plan de Equidad (Ley 18.227 art. 4)', () => {
  it('con un solo beneficiario devuelve exactamente el monto que publica BPS', () => {
    const r = montoAfamPlanEquidad({
      menores: 1,
      enMedia: 0,
      conDiscapacidad: 0,
      ingresoSalarialHogar: SMN_VIGENTE,
    })
    expect(r.total).toBeCloseTo(AFAM_PE.primerBeneficiario, 2)
  })

  it('no multiplica: dos hijos pagan menos que el doble de uno (escala 0,6)', () => {
    const uno = montoAfamPlanEquidad({
      menores: 1,
      enMedia: 0,
      conDiscapacidad: 0,
      ingresoSalarialHogar: 0,
    })
    const dos = montoAfamPlanEquidad({
      menores: 2,
      enMedia: 0,
      conDiscapacidad: 0,
      ingresoSalarialHogar: 0,
    })
    expect(dos.total).toBeGreaterThan(uno.total)
    expect(dos.total).toBeLessThan(uno.total * 2)
    // 2^0,6 = 1,5157…
    expect(dos.total).toBeCloseTo(AFAM_PE.primerBeneficiario * Math.pow(2, 0.6), 2)
  })

  it('el complemento de educación media usa la misma escala, sobre los que cursan ese nivel', () => {
    const r = montoAfamPlanEquidad({
      menores: 3,
      enMedia: 2,
      conDiscapacidad: 0,
      ingresoSalarialHogar: 0,
    })
    expect(r.base).toBeCloseTo(AFAM_PE.primerBeneficiario * Math.pow(3, 0.6), 2)
    expect(r.media).toBeCloseTo(AFAM_PE.complementoMedia * Math.pow(2, 0.6), 2)
    expect(r.total).toBeCloseTo(r.base + r.media, 2)
  })

  it('la discapacidad es un monto fijo por chico y no entra en la escala', () => {
    const r = montoAfamPlanEquidad({
      menores: 0,
      enMedia: 0,
      conDiscapacidad: 2,
      ingresoSalarialHogar: 0,
    })
    expect(r.total).toBeCloseTo(AFAM_PE.discapacidad * 2, 2)
    expect(r.base).toBe(0)
  })

  it('sin menores no paga nada', () => {
    const r = montoAfamPlanEquidad({
      menores: 0,
      enMedia: 0,
      conDiscapacidad: 0,
      ingresoSalarialHogar: 0,
    })
    expect(r.total).toBe(0)
  })
})

describe('asignación familiar contributiva (Decreto-Ley 15.084)', () => {
  it('un salario mínimo con dos hijos cae en la franja alta', () => {
    const r = montoAfam15084({
      menores: 2,
      enMedia: 0,
      conDiscapacidad: 0,
      ingresoSalarialHogar: SMN_VIGENTE,
    })
    expect(r.franja).toBe(1)
    expect(r.total).toBe(AFAM_15084.montoFranja1 * 2)
  })

  it('DOS salarios mínimos pasan el primer tope y el hogar cae a la segunda franja', () => {
    const dosSueldos = SMN_VIGENTE * 2
    expect(dosSueldos).toBeGreaterThan(AFAM_15084.topeFranja1)
    const r = montoAfam15084({
      menores: 2,
      enMedia: 0,
      conDiscapacidad: 0,
      ingresoSalarialHogar: dosSueldos,
    })
    expect(r.franja).toBe(2)
    expect(r.total).toBe(AFAM_15084.montoFranja2 * 2)
  })

  it('el tope de la segunda franja sube por cada beneficiario a partir del tercero', () => {
    const ingreso = AFAM_15084.topeFranja2 + 5000
    const conDos = montoAfam15084({
      menores: 2,
      enMedia: 0,
      conDiscapacidad: 0,
      ingresoSalarialHogar: ingreso,
    })
    const conTres = montoAfam15084({
      menores: 3,
      enMedia: 0,
      conDiscapacidad: 0,
      ingresoSalarialHogar: ingreso,
    })
    expect(conDos.franja).toBe(0)
    expect(conDos.total).toBe(0)
    expect(conTres.franja).toBe(2)
    expect(conTres.total).toBe(AFAM_15084.montoFranja2 * 3)
  })

  it('el beneficiario con discapacidad cobra doble', () => {
    const r = montoAfam15084({
      menores: 0,
      enMedia: 0,
      conDiscapacidad: 1,
      ingresoSalarialHogar: SMN_VIGENTE,
    })
    expect(r.total).toBe(AFAM_15084.montoFranja1 * 2)
  })

  it('por encima del tope no genera derecho al cobro', () => {
    const r = montoAfam15084({
      menores: 1,
      enMedia: 0,
      conDiscapacidad: 0,
      ingresoSalarialHogar: 200000,
    })
    expect(r.franja).toBe(0)
    expect(r.total).toBe(0)
    expect(r.detalle).toContain('materno-infantil')
  })
})

describe('la opción del artículo 9: se cobra una sola y conviene la más alta', () => {
  it('con un sueldo mínimo y dos hijos, el Plan de Equidad paga más que la contributiva', () => {
    const r = compararAsignaciones({
      menores: 2,
      enMedia: 0,
      conDiscapacidad: 0,
      ingresoSalarialHogar: SMN_VIGENTE,
    })
    expect(r.elegido).toBe('plan-equidad')
    expect(r.monto).toBe(r.planEquidad.total)
    expect(r.planEquidad.total).toBeGreaterThan(r.contributiva.total)
    expect(r.diferencia).toBeCloseTo(r.planEquidad.total - r.contributiva.total, 2)
  })

  it('sin hijos no hay ninguna', () => {
    const r = compararAsignaciones({
      menores: 0,
      enMedia: 0,
      conDiscapacidad: 0,
      ingresoSalarialHogar: SMN_VIGENTE,
    })
    expect(r.elegido).toBe('ninguno')
    expect(r.monto).toBe(0)
  })
})

describe('Tarjeta Uruguay Social', () => {
  it('la duplicada es exactamente el doble de la simple', () => {
    for (let menores = 0; menores <= 4; menores++) {
      const simple = montoTus({ menores, duplicada: false, menores03: 0, embarazos: 0 })
      const doble = montoTus({ menores, duplicada: true, menores03: 0, embarazos: 0 })
      expect(doble).toBe(simple * 2)
    }
  })

  it('cero y un menor pagan lo mismo, y el tope está en cuatro', () => {
    const cero = montoTus({ menores: 0, duplicada: false, menores03: 0, embarazos: 0 })
    const uno = montoTus({ menores: 1, duplicada: false, menores03: 0, embarazos: 0 })
    const cuatro = montoTus({ menores: 4, duplicada: false, menores03: 0, embarazos: 0 })
    const seis = montoTus({ menores: 6, duplicada: false, menores03: 0, embarazos: 0 })
    expect(cero).toBe(uno)
    expect(seis).toBe(cuatro)
    expect(cuatro).toBe(TUS.simplePorMenores[4])
  })

  it('suma los adicionales por primera infancia y embarazo', () => {
    const r = montoTus({ menores: 2, duplicada: false, menores03: 2, embarazos: 1 })
    expect(r).toBe(TUS.simplePorMenores[2]! + TUS.adicionalMenor03 * 2 + TUS.adicionalEmbarazo)
  })
})

describe('tarifas', () => {
  it('cada programa tiene su porcentaje de Bono Social y sin programa no hay descuento', () => {
    expect(bonificacionUte('tus-duplicada')).toBe(BONO_SOCIAL_UTE.pctTusDuplicada)
    expect(bonificacionUte('tus-simple')).toBe(BONO_SOCIAL_UTE.pctTusSimple)
    expect(bonificacionUte('afam-pe')).toBe(BONO_SOCIAL_UTE.pctAfamPeYVejez)
    expect(bonificacionUte('ninguno')).toBe(0)
  })

  it('el tope de kWh bonificados sube en hogares de cinco o más', () => {
    expect(topeKwhBonificado(4)).toBe(BONO_SOCIAL_UTE.topeKwhHasta4Personas)
    expect(topeKwhBonificado(5)).toBe(BONO_SOCIAL_UTE.topeKwhCincoOMas)
  })

  it('la tarifa de OSE es un importe fijo, no un porcentaje', () => {
    expect(TARIFA_SOCIAL_OSE.cargoHasta15m3).toBeLessThan(500)
    expect(TARIFA_SOCIAL_OSE.topeM3).toBe(15)
  })
})

describe('el hueco del FGA: la garantía que no alcanza con un sueldo mínimo', () => {
  it('quince UR están por encima del líquido de un salario mínimo', () => {
    expect(FGA_INGRESO_MINIMO_PESOS).toBeCloseTo(FGA.ingresoMinUR * UR.valor, 2)
    expect(FGA_INGRESO_MINIMO_PESOS).toBeGreaterThan(LIQUIDO_SMN)
  })

  it('el plan resuelve "no califica" con un sueldo y "corresponde" con dos', () => {
    const base = {
      personasHogar: 1,
      menores: 0,
      menoresEnMedia: 0,
      menores03: 0,
      menoresConDiscapacidad: 0,
      embarazos: 0,
      calificaMides: false,
      tusDuplicada: false,
      facturaLuz: 0,
    }
    const solo = planDeApoyos({
      ...base,
      ingresoSalarialHogar: SMN_VIGENTE,
      liquidoHogar: LIQUIDO_SMN,
    })
    const enPareja = planDeApoyos({
      ...base,
      personasHogar: 2,
      ingresoSalarialHogar: SMN_VIGENTE * 2,
      liquidoHogar: LIQUIDO_SMN * 2,
    })
    expect(solo.items.find(i => i.apoyo.id === 'fga')?.estado).toBe('no-califica')
    expect(enPareja.items.find(i => i.apoyo.id === 'fga')?.estado).toBe('corresponde')
  })
})

describe('el plan del hogar', () => {
  const hogarConHijos = {
    ingresoSalarialHogar: SMN_VIGENTE,
    liquidoHogar: LIQUIDO_SMN,
    personasHogar: 4,
    menores: 2,
    menoresEnMedia: 1,
    menores03: 1,
    menoresConDiscapacidad: 0,
    embarazos: 0,
    tusDuplicada: false,
    facturaLuz: 0,
  }

  it('sin calificación del MIDES sólo cuenta la asignación contributiva', () => {
    const r = planDeApoyos({ ...hogarConHijos, calificaMides: false })
    expect(r.tus).toBe(0)
    expect(r.transferencias).toBe(r.asignacion.contributiva.total)
    expect(r.transferencias).toBeGreaterThan(0)
  })

  it('con calificación del MIDES suma la mejor asignación y la TUS', () => {
    const r = planDeApoyos({ ...hogarConHijos, calificaMides: true })
    expect(r.tus).toBeGreaterThan(0)
    expect(r.transferencias).toBeCloseTo(r.asignacion.monto + r.tus, 2)
    expect(r.transferencias).toBeGreaterThan(
      planDeApoyos({ ...hogarConHijos, calificaMides: false }).transferencias
    )
  })

  it('los programas que dependen del ICC nunca se marcan "no califica" desde afuera', () => {
    const r = planDeApoyos({ ...hogarConHijos, calificaMides: false })
    for (const it of r.items.filter(i => i.apoyo.requiereIcc)) {
      expect(it.estado, `${it.apoyo.nombre} decidido sin datos`).not.toBe('no-califica')
    }
  })

  it('no infla el total: sin factura de luz declarada, el ahorro de tarifas es cero', () => {
    const sinFactura = planDeApoyos({ ...hogarConHijos, calificaMides: true })
    const conFactura = planDeApoyos({ ...hogarConHijos, calificaMides: true, facturaLuz: 2000 })
    expect(sinFactura.ahorroTarifas).toBe(0)
    expect(sinFactura.total).toBe(sinFactura.transferencias)
    expect(conFactura.descuentoUte).toBeCloseTo(2000 * 0.85, 2)
    expect(conFactura.total).toBeCloseTo(conFactura.transferencias + conFactura.descuentoUte, 2)
  })

  it('el hogar sin hijos ni calificación no recibe transferencias, y lo dice', () => {
    const r = planDeApoyos({
      ingresoSalarialHogar: SMN_VIGENTE,
      liquidoHogar: LIQUIDO_SMN,
      personasHogar: 1,
      menores: 0,
      menoresEnMedia: 0,
      menores03: 0,
      menoresConDiscapacidad: 0,
      embarazos: 0,
      calificaMides: false,
      tusDuplicada: false,
      facturaLuz: 0,
    })
    expect(r.transferencias).toBe(0)
    // Pero no queda vacío: el carné de salud, el INEFOP y el Fonasa siguen ahí.
    const corresponden = r.items.filter(i => i.estado === 'corresponde').map(i => i.apoyo.id)
    expect(corresponden).toContain('carne-salud')
    expect(corresponden).toContain('inefop')
  })
})

describe('la resta con los apoyos adentro', () => {
  it('marca cuando las transferencias cruzan la línea de pobreza', () => {
    const r = conApoyos(20408, 23446, 5000)
    expect(r.yaEstaba).toBe(false)
    expect(r.cruzaLaLinea).toBe(true)
    expect(r.margenAntes).toBeLessThan(0)
    expect(r.margenDespues).toBeGreaterThan(0)
  })

  it('no dice que cruza si ya estaba arriba', () => {
    const r = conApoyos(50000, 23446, 5000)
    expect(r.yaEstaba).toBe(true)
    expect(r.cruzaLaLinea).toBe(false)
  })

  it('no inventa: sin transferencias el después es igual al antes', () => {
    const r = conApoyos(20408, 23446, 0)
    expect(r.despues).toBe(r.antes)
    expect(r.cruzaLaLinea).toBe(false)
  })
})

describe('el catálogo', () => {
  it('tiene ids únicos, kebab-case, y la ficha completa', () => {
    const ids = APOYOS.map(a => a.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const a of APOYOS) {
      expect(a.id).toMatch(/^[a-z0-9]+(-[a-z0-9]+)*$/)
      expect(a.nombre.trim()).not.toBe('')
      expect(a.da.trim().length).toBeGreaterThan(20)
      expect(a.quien.trim().length).toBeGreaterThan(20)
      expect(a.como.trim().length).toBeGreaterThan(10)
      expect(a.url).toMatch(/^https:\/\//)
    }
  })

  it('todo programa que depende del MIDES está marcado como tal', () => {
    const porIcc = ['afam-pe', 'tus', 'bono-social-ute', 'tarifa-social-ose', 'supergas']
    for (const id of porIcc) {
      expect(APOYOS.find(a => a.id === id)?.requiereIcc, id).toBe(true)
    }
    expect(APOYOS.find(a => a.id === 'afam-15084')?.requiereIcc).toBeUndefined()
  })

  it('el supergás viaja con su advertencia de vigencia', () => {
    const supergas = APOYOS.find(a => a.id === 'supergas')
    expect(supergas?.alerta).toBeTruthy()
    expect(supergas?.alerta).toContain('2025')
  })

  it('el orden sugerido arranca por el laudo y termina en lo que no es plata', () => {
    expect(ORDEN_SUGERIDO).toHaveLength(4)
    expect(ORDEN_SUGERIDO[0]!.titulo).toMatch(/laudo/i)
    for (const paso of ORDEN_SUGERIDO) {
      expect(paso.detalle.length).toBeGreaterThan(80)
      expect(paso.cuando.trim()).not.toBe('')
    }
  })

  it('cada puerta y cada fuente tienen enlace', () => {
    expect(PUERTAS.length).toBeGreaterThanOrEqual(4)
    for (const p of PUERTAS) expect(p.url).toMatch(/^https:\/\//)
    expect(STATE_SUPPORT_SOURCES.length).toBeGreaterThanOrEqual(10)
    for (const s of STATE_SUPPORT_SOURCES) expect(s.url).toMatch(/^https:\/\//)
  })

  it('la FAQ responde y no queda en una línea', () => {
    expect(APOYOS_FAQ.length).toBeGreaterThanOrEqual(5)
    for (const f of APOYOS_FAQ) {
      expect(f.question.endsWith('?')).toBe(true)
      expect(f.short.length).toBeGreaterThan(10)
      expect(f.answer.length).toBeGreaterThan(300)
    }
  })

  it('declara la fecha de verificación y las constantes derivadas', () => {
    expect(STATE_SUPPORT_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(CARNE_SALUD.costoNoAssePesos).toBeCloseTo(0.4 * UR.valor, 2)
    expect(URUGUAY_TRABAJA.apoyoPesos).toBeCloseTo(URUGUAY_TRABAJA.apoyoBpc * 6864, 2)
  })
})
