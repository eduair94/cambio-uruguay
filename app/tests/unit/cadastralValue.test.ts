import { describe, expect, it } from 'vitest'

import {
  CADASTRAL_FAQ,
  CADASTRAL_FREE_ACCESS,
  CADASTRAL_PATH,
  CADASTRAL_SERVICES,
  CADASTRAL_SOURCES,
  CADASTRAL_UNPUBLISHED,
  CEDULA_DATOS,
  REVISION_REQUISITOS,
  TASA_CATASTRAL_UR,
  TASA_CATASTRAL_VIGENCIA,
  pesosForCost,
  pesosForUr,
  urForCost,
} from '../../utils/cadastralValue'

describe('el catálogo del valor catastral', () => {
  it('describe los tres trámites con id único y ficha oficial propia', () => {
    const ids = CADASTRAL_SERVICES.map(s => s.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(CADASTRAL_SERVICES).toHaveLength(3)
    for (const service of CADASTRAL_SERVICES) {
      expect(service.label.length).toBeGreaterThan(0)
      expect(service.gives.length).toBeGreaterThan(0)
      // Toda afirmación de la página tiene que poder chequearse en su propia ficha.
      expect(service.url).toMatch(/^https:\/\/www\.gub\.uy\/tramites\//)
    }
  })

  // El caso que trae a la gente a la página: la cédula común es gratis y no pide
  // cuenta. Si alguien invierte esto, la página pasa a mandar al trámite pago y la
  // razón de ser de la página desaparece.
  it('mantiene la cédula catastral común gratis, sin usuario y primera', () => {
    const first = CADASTRAL_SERVICES[0]!
    expect(first.id).toBe('cedula-catastral')
    expect(first.cost.kind).toBe('free')
    expect(first.needsAccount).toBe(false)
  })

  it('cobra sólo la cédula informada, y en tasas catastrales', () => {
    const paid = CADASTRAL_SERVICES.filter(s => s.cost.kind === 'tasa')
    expect(paid.map(s => s.id)).toEqual(['cedula-catastral-informada'])
    expect(paid[0]!.needsAccount).toBe(true)
  })

  // La revisión de valor es GRATIS como solicitud: lo que cuesta es la DJCU, que la
  // DNC no cobra. Marcarla como paga mandaría a la gente a pagar algo que no se paga.
  it('deja la revisión de valor como solicitud gratuita y explica dónde está el gasto', () => {
    const revision = CADASTRAL_SERVICES.find(s => s.id === 'revision-valor-catastral')!
    expect(revision.cost.kind).toBe('free')
    expect(REVISION_REQUISITOS.some(r => /DJCU/.test(r))).toBe(true)
    expect(REVISION_REQUISITOS.some(r => /timbres profesionales/.test(r))).toBe(true)
  })
})

describe('la tasa catastral se publica en UR y con su vigencia', () => {
  it('vale 0,5 UR', () => {
    expect(TASA_CATASTRAL_UR).toBe(0.5)
  })

  // El importe sin su ventana es media verdad: la DNC lo republica cada semestre, y
  // un lector que llegue en enero tiene que saber contra qué se verificó.
  it('declara la ventana que dice la ficha', () => {
    expect(TASA_CATASTRAL_VIGENCIA).toEqual({ from: '2026-07-01', to: '2026-12-31' })
    expect(new Date(TASA_CATASTRAL_VIGENCIA.from).getTime()).toBeLessThan(
      new Date(TASA_CATASTRAL_VIGENCIA.to).getTime()
    )
  })

  it('convierte la tasa a pesos con la UR del día', () => {
    expect(urForCost({ kind: 'tasa', tasas: 1 })).toBe(0.5)
    expect(pesosForCost({ kind: 'tasa', tasas: 1 }, 1800)).toBe(900)
    expect(pesosForCost({ kind: 'free' }, 1800)).toBe(0)
  })

  // El contrato que evita publicar un peso de hace meses como «hoy»: sin UR viva la
  // cuenta devuelve null y la página imprime el importe en UR sin convertir.
  it('devuelve null —y nunca cero— cuando no hay UR viva', () => {
    for (const bad of [null, undefined, 0, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(pesosForUr(0.5, bad as number | null | undefined)).toBeNull()
      expect(pesosForCost({ kind: 'tasa', tasas: 1 }, bad as number | null | undefined)).toBeNull()
    }
  })

  it('no convierte los timbres profesionales, que la DNC no publica', () => {
    expect(urForCost({ kind: 'timbres', timbres: 2 })).toBeNull()
    expect(pesosForCost({ kind: 'timbres', timbres: 2 }, 1800)).toBeNull()
  })
})

describe('lo que la página afirma y lo que se abstiene de afirmar', () => {
  it('dice en la primera respuesta que el valor catastral no es el de mercado', () => {
    expect(CADASTRAL_FAQ[0]!.question).toMatch(/vale mi casa/i)
    expect(CADASTRAL_FAQ[0]!.answer).toMatch(/no es el precio de mercado/i)
  })

  // La abstención central: el valor es por padrón y sólo lo dice Catastro. Si algún
  // día alguien publica acá un valor «estimado», este test se pone rojo.
  it('se abstiene de publicar el valor de un padrón', () => {
    const abstention = CADASTRAL_UNPUBLISHED.find(f => /vale mi padrón/i.test(f.question))
    expect(abstention).toBeDefined()
    expect(abstention!.answer).toMatch(/no lo publicamos/i)
  })

  it('no deja ninguna pregunta ni abstención sin respuesta', () => {
    for (const item of [...CADASTRAL_FAQ, ...CADASTRAL_UNPUBLISHED]) {
      expect(item.question.trim().length).toBeGreaterThan(0)
      expect(item.answer.trim().length).toBeGreaterThan(20)
    }
  })

  it('lista los datos que pide la cédula para los dos regímenes', () => {
    expect(CEDULA_DATOS.map(d => d.regimen)).toEqual(['Urbano', 'Rural'])
    expect(CEDULA_DATOS.every(d => /padrón/i.test(d.datos))).toBe(true)
  })

  it('lista los servicios de acceso libre, con la emisión de cédulas entre ellos', () => {
    expect(CADASTRAL_FREE_ACCESS.length).toBeGreaterThanOrEqual(5)
    expect(CADASTRAL_FREE_ACCESS.some(s => /cédulas catastrales/i.test(s))).toBe(true)
    expect(new Set(CADASTRAL_FREE_ACCESS).size).toBe(CADASTRAL_FREE_ACCESS.length)
  })
})

describe('las fuentes', () => {
  it('son todas oficiales y sin repetir', () => {
    expect(CADASTRAL_SOURCES.length).toBeGreaterThanOrEqual(4)
    const urls = CADASTRAL_SOURCES.map(s => s.url)
    expect(new Set(urls).size).toBe(urls.length)
    for (const source of CADASTRAL_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/www\.gub\.uy\//)
      expect(source.label.length).toBeGreaterThan(20)
    }
  })

  // Cada trámite que la página manda a hacer tiene que estar respaldado en la lista
  // de fuentes que la propia página imprime.
  it('respaldan cada trámite que la página publica', () => {
    const urls = new Set(CADASTRAL_SOURCES.map(s => s.url))
    for (const service of CADASTRAL_SERVICES) expect(urls.has(service.url)).toBe(true)
  })

  it('la ruta de la página es la que usa el nav y el sitemap', () => {
    expect(CADASTRAL_PATH).toBe('/valor-catastral-uruguay')
  })
})
