// Guardas de `utils/childSupport.ts`.
//
// Lo que se vigila acá no es la aritmética —hay una sola multiplicación— sino la HONESTIDAD del
// catálogo: la página existe porque la respuesta correcta a «qué porcentaje del sueldo es» es
// «ninguno», y el modo de romperla es que alguien, en una edición futura, agregue el porcentaje
// que todo el mundo espera encontrar. Los tests de abajo hacen que ese cambio ponga CI en rojo.

import { describe, expect, it } from 'vitest'

import { URUGUAY } from '../../utils/calculators'
import {
  CHILD_SUPPORT_FAQ,
  CHILD_SUPPORT_NOT_PUBLISHED,
  CHILD_SUPPORT_SOURCES,
  CHILD_SUPPORT_VERIFIED_AT,
  NON_PAYMENT_LEVERS,
  OBLIGOR_ORDER,
  REGISTRY_OVERDUE_INSTALMENTS,
  REGISTRY_RULES,
  REGISTRY_YEARS,
  SUPPORT_COVERS,
  SUPPORT_TRAITS,
  UNIVERSAL_FLOOR_BPC,
  universalFloorUyu,
} from '../../utils/childSupport'

describe('el piso del artículo 46', () => {
  it('es de 1 BPC por núcleo familiar', () => {
    expect(UNIVERSAL_FLOOR_BPC).toBe(1)
  })

  it('se convierte a pesos con la BPC vigente del sitio', () => {
    expect(universalFloorUyu()).toBe(URUGUAY.bpc)
    expect(universalFloorUyu(7000)).toBe(7000)
  })

  it('redondea a peso entero', () => {
    expect(universalFloorUyu(6864.4)).toBe(6864)
    expect(Number.isInteger(universalFloorUyu(6864.6))).toBe(true)
  })
})

describe('el catálogo no publica un porcentaje que la ley no fija', () => {
  const prose = [
    ...SUPPORT_COVERS.map(i => `${i.label} ${i.detail}`),
    ...OBLIGOR_ORDER.map(o => `${o.label} ${o.detail}`),
    ...SUPPORT_TRAITS.map(t => `${t.label} ${t.detail}`),
    ...NON_PAYMENT_LEVERS.map(l => `${l.label} ${l.detail}`),
    ...CHILD_SUPPORT_FAQ.map(f => `${f.question} ${f.answer}`),
  ].join('\n')

  // La trampa concreta: «el 30 % del sueldo». Se prohíbe cualquier porcentaje escrito con cifra,
  // que es como se cuela un dato inventado. Las fracciones en palabras («la mitad», «un tercio»)
  // sí están permitidas porque salen textuales del artículo 381 del CGP.
  it('no afirma ningún porcentaje numérico', () => {
    expect(prose).not.toMatch(/\d+\s*(%|por ciento)/)
  })

  it('dice explícitamente que no hay porcentaje fijo', () => {
    const answer = CHILD_SUPPORT_FAQ[0]?.answer ?? ''
    expect(CHILD_SUPPORT_FAQ[0]?.question).toMatch(/porcentaje/i)
    expect(answer).toMatch(/ninguno fijo/i)
  })

  it('lista lo que se niega a publicar, con el motivo', () => {
    expect(CHILD_SUPPORT_NOT_PUBLISHED.length).toBeGreaterThanOrEqual(3)
    for (const item of CHILD_SUPPORT_NOT_PUBLISHED) {
      expect(item.claim.length).toBeGreaterThan(20)
      expect(item.why.length).toBeGreaterThan(40)
    }
    expect(CHILD_SUPPORT_NOT_PUBLISHED.map(i => i.key)).toContain('porcentaje')
  })
})

describe('el orden de obligados del artículo 51', () => {
  it('empieza por los padres y baja un escalón por vez', () => {
    expect(OBLIGOR_ORDER[0]?.rank).toBe(0)
    expect(OBLIGOR_ORDER[0]?.label).toMatch(/padres/i)
    expect(OBLIGOR_ORDER.map(o => o.rank)).toEqual([0, 1, 2, 3, 4])
  })

  it('pone a los ascendientes por delante de los hermanos', () => {
    const ascendientes = OBLIGOR_ORDER.findIndex(o => /ascendientes/i.test(o.label))
    const hermanos = OBLIGOR_ORDER.findIndex(o => /hermanos/i.test(o.label))
    expect(ascendientes).toBeGreaterThanOrEqual(0)
    expect(ascendientes).toBeLessThan(hermanos)
  })
})

describe('el registro de deudores alimentarios morosos', () => {
  it('exige más de tres cuotas y dura cinco años', () => {
    expect(REGISTRY_OVERDUE_INSTALMENTS).toBe(3)
    expect(REGISTRY_YEARS).toBe(5)
  })

  it('cita la ley viva y nunca el artículo 5 de la 17.957, que está derogado', () => {
    const norms = [...REGISTRY_RULES.map(r => r.article), ...NON_PAYMENT_LEVERS.map(l => l.norm)]
    expect(norms.some(n => n.includes('18.244'))).toBe(true)
    expect(norms.join(' ')).not.toMatch(/17\.957\s*art\.\s*5\b/)
  })

  it('separa el registro del Clearing, que no inhabilita a nadie', () => {
    const clearing = CHILD_SUPPORT_FAQ.find(f => /clearing/i.test(f.question))
    expect(clearing).toBeDefined()
    expect(clearing?.answer).toMatch(/18\.331/)
    expect(clearing?.answer).toMatch(/18\.244/)
  })
})

describe('las fuentes', () => {
  it('son todas oficiales y verificables', () => {
    expect(CHILD_SUPPORT_SOURCES.length).toBeGreaterThanOrEqual(8)
    for (const source of CHILD_SUPPORT_SOURCES) {
      expect(source.url).toMatch(/^https:\/\/www\.impo\.com\.uy\//)
      expect(source.label.length).toBeGreaterThan(20)
    }
  })

  it('no repite una URL', () => {
    const urls = CHILD_SUPPORT_SOURCES.map(s => s.url)
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('lleva la fecha en que se contrastó el texto oficial', () => {
    expect(CHILD_SUPPORT_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})

describe('cada palanca de cobro nombra su norma', () => {
  it.each(NON_PAYMENT_LEVERS.map(l => [l.key, l] as const))('%s', (_key, lever) => {
    expect(lever.norm).toMatch(/(Ley|CGP|CNA)/)
    expect(lever.detail.length).toBeGreaterThan(60)
    if (lever.to) expect(lever.to).toMatch(/^\//)
  })
})
