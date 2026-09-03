// El artículo 14 del Decreto-Ley 14.560, y las dos trampas de citarlo.
//
// PRIMERA: la redacción vigente se la dio la Ley 19.604 en 2018; la anterior (Decreto-Ley 15.220,
// 1981) decía otra cosa. Cualquier resumen anterior a 2018 está hablando de otro régimen, y en el
// SERP uruguayo del 2026-09-03 varios de los que rankean son de antes.
//
// SEGUNDA, y es la que este test cuida de verdad: la pregunta más buscada —si el que compra hereda
// la deuda— NO la contestan estas normas. Decir que sí o que no citándolas sería inventar sobre
// una decisión de comprar un inmueble.
import { describe, expect, it } from 'vitest'
import {
  EL_REPARTO,
  GASTOS_COMUNES_FAQ,
  GASTOS_COMUNES_SOURCES,
  GASTOS_COMUNES_VERIFIED_AT,
  LA_DEUDA,
  ORDEN_PUBLICO,
  SIN_RESPUESTA,
  type ReglaGasto,
} from '../../utils/gastosComunes'

const TODAS: ReglaGasto[] = [...LA_DEUDA, ...EL_REPARTO, ORDEN_PUBLICO]

describe('cada regla trae su norma', () => {
  it.each(TODAS.map(r => [r.titulo, r] as const))('%s cita su artículo', (_t, regla) => {
    expect(regla.articulo).toMatch(/Decreto-Ley 14\.560|Ley 10\.751/)
    expect(regla.texto.trim().length).toBeGreaterThan(60)
  })
})

describe('los cuatro números que la gente busca', () => {
  it('la prescripción son cuatro años', () => {
    const r = LA_DEUDA.find(x => /[Pp]rescriben/.test(x.titulo))
    expect(r, 'falta la regla de prescripción').toBeTruthy()
    expect(r!.texto).toContain('cuatro años')
    expect(r!.texto).toContain('1222')
  })

  it('el interés es 12 % anual', () => {
    expect(LA_DEUDA.some(x => x.texto.includes('12 % anual'))).toBe(true)
  })

  it('los intereses no se capitalizan, y se dice explícito', () => {
    const r = LA_DEUDA.find(x => /capitalizan/i.test(x.titulo))
    expect(r).toBeTruthy()
    expect(r!.texto).toMatch(/no hay interés sobre interés/i)
  })

  it('la cuenta aprobada es título ejecutivo', () => {
    expect(LA_DEUDA[0]!.titulo).toMatch(/título ejecutivo/i)
  })
})

describe('el orden público, que es lo que invalida los reglamentos', () => {
  it('dice que no se puede pactar en contra', () => {
    expect(ORDEN_PUBLICO.texto).toMatch(/orden público/)
    expect(ORDEN_PUBLICO.texto).toMatch(/reglamentos de la copropiedad/)
  })

  it('la FAQ lo repite, porque es la pregunta que llega', () => {
    const q = GASTOS_COMUNES_FAQ.find(f => /reglamento del edificio/i.test(f.question))
    expect(q).toBeTruthy()
    expect(q!.answer).toMatch(/^No\./)
  })
})

describe('lo que la ley no contesta se dice que no lo contesta', () => {
  it('la pregunta del comprador está marcada como sin respuesta', () => {
    expect(SIN_RESPUESTA).toHaveLength(1)
    expect(SIN_RESPUESTA[0]!.sinPublicar ?? SIN_RESPUESTA[0]!.sinRespuesta).toBe(true)
    expect(SIN_RESPUESTA[0]!.titulo).toMatch(/comprás|compro/i)
  })

  it('no afirma ni que la hereda ni que no la hereda', () => {
    const texto = SIN_RESPUESTA[0]!.texto
    expect(texto).toMatch(/dicen que la deuda siga a la unidad/i)
    expect(texto).toMatch(/^Ni el artículo 14/)
    expect(texto).toMatch(/no alcanza para afirmar/i)
    // Y da la salida que no depende de la interpretación.
    expect(texto).toMatch(/constancia de deuda/i)
  })

  it('la FAQ contesta esa pregunta con la misma prudencia', () => {
    const q = GASTOS_COMUNES_FAQ.find(f => /compro un apartamento con deuda/i.test(f.question))
    expect(q).toBeTruthy()
    expect(q!.answer).toMatch(/no alcanza para afirmar/i)
  })
})

describe('el reparto', () => {
  it('es proporcional al valor de la unidad, no por partes iguales', () => {
    expect(EL_REPARTO[0]!.texto).toMatch(/proporcional al valor/i)
  })

  it('planta baja y subsuelo no pagan escaleras ni ascensores', () => {
    const r = EL_REPARTO.find(x => /piso bajo/i.test(x.titulo))
    expect(r).toBeTruthy()
    expect(r!.articulo).toContain('Ley 10.751, art. 5')
  })
})

describe('fuentes', () => {
  it('citan el texto vigente y no el original', () => {
    for (const s of GASTOS_COMUNES_SOURCES) {
      expect(s.url).toContain('impo.com.uy')
      expect(s.url).not.toContain('-originales')
    }
  })

  it('nombran la ley que le dio al art. 14 su redacción vigente', () => {
    expect(GASTOS_COMUNES_SOURCES.some(s => s.label.includes('19.604'))).toBe(true)
  })

  it('la fecha de verificación es ISO y no del futuro', () => {
    expect(GASTOS_COMUNES_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(new Date(`${GASTOS_COMUNES_VERIFIED_AT}T00:00:00Z`).getTime()).toBeLessThanOrEqual(
      Date.now()
    )
  })
})
