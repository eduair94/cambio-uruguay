import { describe, expect, it } from 'vitest'

import { importacionGuides } from '../../utils/guidesImportacion'
import { getGuide } from '../../utils/guides'
import { hubOfGuide } from '../../utils/guideHubs'

describe('guía impuesto-temu-uruguay', () => {
  const g = importacionGuides.find(x => x.slug === 'impuesto-temu-uruguay')!
  it('existe, está en el índice y en el hub de importación', () => {
    expect(g).toBeDefined()
    expect(getGuide('impuesto-temu-uruguay')?.slug).toBe('impuesto-temu-uruguay')
    expect(hubOfGuide('impuesto-temu-uruguay')?.slug).toBe('importaciones-y-aduana-uruguay')
  })
  it('cumple los presupuestos de título, descripción, secciones, FAQ y fuentes', () => {
    expect(g.title.length).toBeLessThanOrEqual(60)
    expect(g.description.length).toBeGreaterThanOrEqual(100)
    expect(g.description.length).toBeLessThanOrEqual(190)
    expect(g.sections.length).toBeGreaterThanOrEqual(6)
    expect(g.sections.length).toBeLessThanOrEqual(9)
    expect(g.faqs?.length ?? 0).toBeGreaterThanOrEqual(5)
    expect(g.sources?.length ?? 0).toBeGreaterThanOrEqual(4)
    for (const s of g.sources ?? []) expect(s.url).toMatch(/^https:\/\//)
    expect(g.updatedAt).toBe('2026-09-15')
  })
  it('nombra los hechos que la gente busca', () => {
    const text = [
      g.title,
      g.description,
      ...g.sections.map(s => `${s.heading} ${s.body}`),
      ...(g.faqs ?? []).map(f => `${f.q} ${f.a}`),
    ].join(' ')
    expect(text).toMatch(/Decreto 50\/026/)
    expect(text).toMatch(/1\.?º? de mayo de 2026/)
    expect(text).toMatch(/US\$ ?800/)
    expect(text).toMatch(/BFE Express/)
    expect(text).toMatch(/US\$ ?200/)
    expect(text).not.toMatch(/\*\*|^#|\n- /m)
  })
  it('enlaza la franquicia y los problemas con la aduana', () => {
    const tos = (g.related ?? []).map(r => r.to)
    expect(tos).toContain('/franquicia-aduana-uruguay')
    expect(tos).toContain('/problemas-con-la-aduana-uruguay')
  })
})

// El registro de vendedores dejó de ser futuro el 1/10/2026 y la RG DNA 26/2026 (vigente desde el
// 5/10) abrió el alta a pedido del operador postal. Las guías que lo explican lo decían en futuro y
// con "salvo nueva prórroga"; éstas son las que se corrigieron el 2026-10-31, junto con el PR #158.
describe('las guías de importación con el registro de vendedores vigente', () => {
  const textOf = (slug: string) => {
    const guide = getGuide(slug)!
    return [
      ...guide.sections.map(s => s.body),
      ...(guide.faqs ?? []).map(f => f.a),
      ...(guide.sources ?? []).map(s => s.label),
    ].join(' ')
  }

  it.each(['impuesto-temu-uruguay', 'comprar-en-amazon-desde-uruguay'])(
    '%s ya no lo da por futuro y cita la RG 26/2026',
    slug => {
      const text = textOf(slug)
      expect(text).not.toMatch(/salvo nueva prórroga|podría moverse/)
      expect(text).toMatch(/3 de noviembre/)
      expect(text).toMatch(/26\/2026/)
      expect(text).toMatch(/courier/)
    }
  )

  it('comprar-online-exterior-impuestos cita bien el num. 28 y lo que grava el IMESI', () => {
    const text = textOf('comprar-online-exterior-impuestos')
    // G es el lit. b y H el lit. a del num. 28 de la RG 11/2026; el lit. c es sólo el código J.
    expect(text).not.toMatch(/num\. 28 lit\. c \(códigos de tipo de envío: G/)
    // El art. 27 del Decreto 96/990 grava cosméticos y máquinas de afeitar.
    expect(text).not.toMatch(/cosmética de uso corriente no gravada/)
    expect(text).toMatch(/máquinas de afeitar/)
    expect(text).toMatch(/registro de empresas extranjeras/)
  })
})
