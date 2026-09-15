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
