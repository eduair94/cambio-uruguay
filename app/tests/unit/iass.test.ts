import { describe, expect, it } from 'vitest'
import {
  IASS_ANNUAL_BRACKETS,
  IASS_MNI_BPC_ANNUAL,
  IASS_MNI_BPC_MONTHLY,
  IASS_MONTHLY_BRACKETS,
  IASS_MONTHS_PER_YEAR,
  IASS_MULTI_SOURCE_MONTHLY_BRACKETS,
  IASS_SOURCES,
  iassSeoDescription,
  iassWithholding,
} from '../../utils/iass'

/** BPC vigente desde el 1.º de enero de 2026 (Decreto 11/026), la misma que usa el IRPF. */
const BPC = 6864

describe('la escala que publica el BPS', () => {
  // Los cuatro tramos anuales con sus tasas. Si alguien "actualiza" esto a los 96 BPC y 10 % que
  // siguen publicando las calculadoras que salen primero en Google, el test lo frena: esa escala
  // está vieja y era justamente el motivo de que la página exista.
  it('mantiene los tramos anuales de 108, 180 y 600 BPC con 0, 6, 24 y 30 %', () => {
    expect(IASS_ANNUAL_BRACKETS).toEqual([
      { fromBpc: 0, toBpc: 108, ratePct: 0 },
      { fromBpc: 108, toBpc: 180, ratePct: 6 },
      { fromBpc: 180, toBpc: 600, ratePct: 24 },
      { fromBpc: 600, toBpc: null, ratePct: 30 },
    ])
  })

  it('mensualiza a 9, 15 y 50 BPC sin cambiar ninguna tasa', () => {
    expect(IASS_MONTHLY_BRACKETS).toEqual([
      { fromBpc: 0, toBpc: 9, ratePct: 0 },
      { fromBpc: 9, toBpc: 15, ratePct: 6 },
      { fromBpc: 15, toBpc: 50, ratePct: 24 },
      { fromBpc: 50, toBpc: null, ratePct: 30 },
    ])
  })

  // El MNI mensualizado que el BPS nombra (9 BPC) tiene que SER el anual sobre doce. Si la ficha
  // alguna vez publicara un mensual que no es la doceava parte, hay que leer la norma — no ajustar
  // la división para que cierre.
  it('el MNI mensualizado es el anual sobre doce', () => {
    expect(IASS_MNI_BPC_MONTHLY).toBe(IASS_MNI_BPC_ANNUAL / IASS_MONTHS_PER_YEAR)
  })

  it('los tramos son contiguos y sin huecos, en las tres escalas', () => {
    for (const scale of [
      IASS_ANNUAL_BRACKETS,
      IASS_MONTHLY_BRACKETS,
      IASS_MULTI_SOURCE_MONTHLY_BRACKETS,
    ]) {
      expect(scale[0]!.fromBpc).toBe(0)
      expect(scale[scale.length - 1]!.toBpc).toBeNull()
      for (let i = 1; i < scale.length; i++) {
        expect(scale[i]!.fromBpc).toBe(scale[i - 1]!.toBpc)
        expect(scale[i]!.ratePct).toBeGreaterThan(scale[i - 1]!.ratePct)
      }
    }
  })

  // La escala de la opción NO tiene tramo exento, y es a propósito: el MNI se usa una vez en el
  // año y esta es la escala del DESCUENTO, no la del impuesto. Un "arreglo" que le agregue un 0 %
  // adelante haría retener de menos todo el año y agrandaría el ajuste final.
  it('la escala de varios organismos arranca en 6 % y no tiene tramo exento', () => {
    expect(IASS_MULTI_SOURCE_MONTHLY_BRACKETS[0]).toEqual({ fromBpc: 0, toBpc: 6, ratePct: 6 })
    expect(IASS_MULTI_SOURCE_MONTHLY_BRACKETS.some(b => b.ratePct === 0)).toBe(false)
  })

  it('cita al BPS y a la ley, con URLs oficiales', () => {
    expect(IASS_SOURCES.length).toBeGreaterThanOrEqual(2)
    for (const source of IASS_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/(www\.)?(bps|impo)\./)
      expect(source.label.length).toBeGreaterThan(10)
    }
  })
})

describe('iassWithholding', () => {
  it('no retiene nada por debajo del mínimo mensualizado', () => {
    const r = iassWithholding(IASS_MNI_BPC_MONTHLY * BPC - 1, BPC)
    expect(r.taxUyu).toBe(0)
    expect(r.effectiveRatePct).toBe(0)
    expect(r.marginalRatePct).toBe(0)
  })

  it('exactamente en el mínimo tampoco retiene', () => {
    // El tramo exento llega HASTA 9 BPC: el peso 9·BPC todavía no paga.
    expect(iassWithholding(IASS_MNI_BPC_MONTHLY * BPC, BPC).taxUyu).toBe(0)
  })

  it('cobra 6 % sólo sobre el excedente del mínimo, no sobre todo el ingreso', () => {
    // 10 BPC: un BPC entero por encima del mínimo, al 6 %.
    const r = iassWithholding(10 * BPC, BPC)
    expect(r.taxUyu).toBeCloseTo(BPC * 0.06, 2)
    expect(r.marginalRatePct).toBe(6)
    // La confusión que mata a las calculadoras: la tasa efectiva NO es la del tramo.
    expect(r.effectiveRatePct).toBeLessThan(6)
  })

  it('suma los tramos cuando el ingreso cruza al 24 %', () => {
    // 20 BPC = 9 exentos + 6 al 6 % + 5 al 24 %.
    const r = iassWithholding(20 * BPC, BPC)
    const expected = 6 * BPC * 0.06 + 5 * BPC * 0.24
    expect(r.taxUyu).toBeCloseTo(expected, 2)
    expect(r.marginalRatePct).toBe(24)
    expect(r.shares).toHaveLength(3)
  })

  it('llega al 30 % marginal sin que la tasa efectiva lo alcance nunca', () => {
    const r = iassWithholding(80 * BPC, BPC)
    expect(r.marginalRatePct).toBe(30)
    // 80 BPC = 9 exentos + 6 al 6 % + 35 al 24 % + 30 al 30 % = 17,76 BPC de impuesto, o sea
    // 22,2 % del ingreso. Ni siquiera con el tramo del 30 % tocado la efectiva pasa del 24 %: es
    // el número que hay que poder mostrarle a alguien que llega convencido de que paga el 30 %.
    expect(r.effectiveRatePct).toBeCloseTo(22.2, 1)
    expect(r.effectiveRatePct).toBeLessThan(r.marginalRatePct)
  })

  it('el neto y el impuesto suman el ingreso', () => {
    const income = 37 * BPC
    const r = iassWithholding(income, BPC)
    expect(r.taxUyu + r.netUyu).toBeCloseTo(income, 2)
  })

  it('es monótona: más pasividad nunca deja menos en la mano', () => {
    let previousNet = -1
    for (let bpcUnits = 0; bpcUnits <= 90; bpcUnits += 1.5) {
      const r = iassWithholding(bpcUnits * BPC, BPC)
      expect(r.netUyu).toBeGreaterThanOrEqual(previousNet)
      previousNet = r.netUyu
    }
  })

  it('con la escala anual da doce veces la retención mensual del mismo ingreso', () => {
    // Es la propiedad que justifica mensualizar dividiendo: un ingreso parejo todo el año tiene
    // que pagar lo mismo mes a mes que de una sola vez.
    const monthly = iassWithholding(20 * BPC, BPC)
    const annual = iassWithholding(20 * BPC * 12, BPC, IASS_ANNUAL_BRACKETS)
    expect(annual.taxUyu).toBeCloseTo(monthly.taxUyu * 12, 1)
  })

  it('la opción de varios organismos retiene desde el primer peso', () => {
    const r = iassWithholding(3 * BPC, BPC, IASS_MULTI_SOURCE_MONTHLY_BRACKETS)
    expect(r.taxUyu).toBeCloseTo(3 * BPC * 0.06, 2)
  })

  it('ignora entradas que no son un ingreso', () => {
    for (const bad of [0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      const r = iassWithholding(bad, BPC)
      expect(r.taxUyu).toBe(0)
      expect(r.netUyu).toBe(0)
    }
    expect(iassWithholding(20 * BPC, 0).taxUyu).toBe(0)
  })
})

describe('iassSeoDescription', () => {
  it('trae los dos importes del día y entra en el snippet', () => {
    const d = iassSeoDescription(BPC)
    expect(d).toContain('61.776')
    expect(d).toContain('741.312')
    expect(d.length).toBeLessThanOrEqual(165)
  })

  it('sigue entrando en el snippet con una BPC de cinco cifras', () => {
    // El peor caso plausible: la BPC sube y los importes se alargan.
    expect(iassSeoDescription(99999).length).toBeLessThanOrEqual(165)
  })
})
