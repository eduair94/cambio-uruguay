import { describe, expect, it } from 'vitest'

import {
  OSE_2026_ADJUSTMENT,
  OSE_BILL_COMPONENTS,
  OSE_DECREE,
  OSE_FAQ,
  OSE_FIXED_CHARGES,
  OSE_SOURCES,
  SANEAMIENTO_RULE,
  fixedMonthlyFloor,
} from '../../utils/oseBill'

describe('los cargos fijos de OSE', () => {
  it('suma los dos cargos fijos cuando hay saneamiento', () => {
    // 327,50 + 137,05. El piso mensual que paga el hogar antes del primer metro cúbico.
    expect(fixedMonthlyFloor(true)).toBeCloseTo(464.55, 2)
  })

  it('cobra solo el cargo de agua cuando no hay saneamiento', () => {
    expect(fixedMonthlyFloor(false)).toBeCloseTo(327.5, 2)
  })

  it('trata el saneamiento como el caso por defecto', () => {
    expect(fixedMonthlyFloor()).toBe(fixedMonthlyFloor(true))
  })

  // La razón por la que `fixedMonthlyFloor` es una función y no una constante: si alguien actualiza
  // un cargo por el decreto del año que viene y el total quedó escrito a mano en otro lado, la
  // página publicaría una suma que no es la de sus propios sumandos.
  it('el piso es exactamente la suma de sus dos sumandos, no un número aparte', () => {
    expect(fixedMonthlyFloor(true)).toBeCloseTo(
      OSE_FIXED_CHARGES.agua.monto + OSE_FIXED_CHARGES.saneamiento.monto,
      10
    )
  })
})

describe('el ajuste 2026', () => {
  it('se descompone exactamente en inflación proyectada más desequilibrio estructural', () => {
    const { total, inflacionProyectada, desequilibrioEstructural } = OSE_2026_ADJUSTMENT
    expect(inflacionProyectada + desequilibrioEstructural).toBeCloseTo(total, 10)
  })

  it('el 44 % del ajuste no es inflación proyectada', () => {
    // La página afirma ese 44 % en prosa. La primera redacción decía «menos de la mitad del
    // aumento corresponde a la inflación», que es falso —4,8 sobre 8,5 es el 56 %— y lo agarró
    // este test antes de que llegara a la página. Queda como aserción para que la próxima
    // actualización del decreto no deje la frase en pie si el reparto cambia.
    const share = OSE_2026_ADJUSTMENT.desequilibrioEstructural / OSE_2026_ADJUSTMENT.total
    expect(Math.round(share * 100)).toBe(44)
  })
})

describe('la regla del saneamiento', () => {
  it('es del 100 %, que es lo que hace que el agua se pague dos veces', () => {
    expect(SANEAMIENTO_RULE.porcentaje).toBe(100)
  })

  it('conserva la cita del decreto y la nota de la discrepancia con URSEA', () => {
    expect(SANEAMIENTO_RULE.citaDecreto).toContain('100%')
    expect(SANEAMIENTO_RULE.citaDecreto).toContain('cargo variable de agua')
    // La nota no es decorativa: es la única señal de que las dos fuentes describen bases distintas.
    expect(SANEAMIENTO_RULE.notaUrsea).toMatch(/URSEA/)
  })
})

describe('el contrato de fuentes', () => {
  it('cita solo dominios oficiales uruguayos', () => {
    expect(OSE_SOURCES.length).toBeGreaterThan(0)
    for (const source of OSE_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/(www\.impo\.com\.uy|www\.gub\.uy)\//)
      expect(source.label.length).toBeGreaterThan(10)
    }
  })

  it('apunta al decreto vigente', () => {
    expect(OSE_DECREE.url).toBe('https://www.impo.com.uy/bases/decretos-originales/340-2025')
    expect(OSE_SOURCES.some(s => s.url === OSE_DECREE.url)).toBe(true)
  })
})

describe('el contenido de la página', () => {
  it('describe los cuatro componentes de la factura', () => {
    expect(OSE_BILL_COMPONENTS).toHaveLength(4)
    expect(OSE_BILL_COMPONENTS.filter(c => c.servicio === 'Agua')).toHaveLength(2)
    expect(OSE_BILL_COMPONENTS.filter(c => c.servicio === 'Saneamiento')).toHaveLength(2)
  })

  it('no promete un precio del metro cúbico que el módulo no publica', () => {
    // El módulo publica DOS importes y ninguno es un precio por m³. Si alguien agrega la tabla de
    // bloques sin resolver antes la ambigüedad del decreto, este test es el que se lo recuerda.
    const faq = OSE_FAQ.find(f => f.question.includes('metro cúbico'))
    expect(faq).toBeDefined()
    expect(faq?.answer).toMatch(/no publica la tabla/)
  })

  it('cada respuesta de la FAQ dice algo, no solo remite', () => {
    for (const entry of OSE_FAQ) {
      expect(entry.question.length).toBeGreaterThan(10)
      expect(entry.answer.length).toBeGreaterThan(80)
    }
  })
})
