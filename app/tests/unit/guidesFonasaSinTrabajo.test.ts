import { describe, expect, it } from 'vitest'

import { getGuide } from '../../utils/guides'
import { hubOfGuide } from '../../utils/guideHubs'
import { trabajoBpsGuides } from '../../utils/guidesTrabajoBps'

// Reescritura del 2026-09-22 sobre el slug publicado el 2026-09-13 (misma URL, misma pregunta:
// «me quedé sin trabajo, ¿hasta cuándo me cubre FONASA?»). Lo que la versión vieja no traía y este
// test fija: «bonos de FONASA» es Chile, las duraciones y topes 2026 del seguro de paro, el plazo de
// 30 días para pedirlo, la cuota de 18 a 21, el tope de ASSE, los dos ajustes de cuotas de 2026 con
// su decreto, la ausencia de afiliación voluntaria publicada como ausencia, y las dos cifras que
// circulan y no rigen (3 meses COVID, 30 días de gracia) nombradas sólo para desmentirlas.
describe('guía me-quede-sin-trabajo-mutualista-fonasa-uruguay (reescritura 2026-09-22)', () => {
  const SLUG = 'me-quede-sin-trabajo-mutualista-fonasa-uruguay'
  const g = trabajoBpsGuides.find(x => x.slug === SLUG)!
  const text = () =>
    [
      g.title,
      g.description,
      ...g.sections.map(s => `${s.heading} ${s.body}`),
      ...(g.faqs ?? []).map(f => `${f.q} ${f.a}`),
    ].join(' ')

  it('existe, está en el índice y en el hub de sueldo y trabajo', () => {
    expect(g).toBeDefined()
    expect(getGuide(SLUG)?.slug).toBe(SLUG)
    expect(hubOfGuide(SLUG)?.slug).toBe('sueldo-trabajo-e-impuestos-uruguay')
  })

  it('cumple los presupuestos de título, descripción, secciones, FAQ y fuentes', () => {
    expect(g.title.length).toBeLessThanOrEqual(60)
    expect(g.title).toMatch(/2026/)
    expect(g.description.length).toBeGreaterThanOrEqual(100)
    expect(g.description.length).toBeLessThanOrEqual(155)
    expect(g.sections.length).toBeGreaterThanOrEqual(6)
    expect(g.sections.length).toBeLessThanOrEqual(9)
    expect(g.sections.some(s => s.table)).toBe(true)
    expect(g.faqs?.length ?? 0).toBeGreaterThanOrEqual(3)
    expect(g.faqs?.length ?? 0).toBeLessThanOrEqual(5)
    expect(g.sources?.length ?? 0).toBeGreaterThanOrEqual(10)
    for (const s of g.sources ?? []) {
      expect(s.url).toMatch(/^https:\/\//)
      expect(s.publisher).toBeTruthy()
    }
    expect(g.updatedAt).toBe('2026-09-22')
    expect(text()).not.toMatch(/\*\*|^#|\n- /m)
    expect(text()).not.toMatch(/septiembre/i)
  })

  it('contesta la pregunta uruguaya con la regla del BPS y desambigua el bono chileno', () => {
    expect(text()).toMatch(/último día del mes/)
    expect(text()).toMatch(/Chile/)
    expect(text()).toMatch(/30 días/)
    expect(text()).toMatch(/doce meses continuos|12 meses/)
    expect(text()).toMatch(/Ley 18\.731/)
    expect(text()).toMatch(/artículo 30/)
  })

  it('no repite las dos cifras que no rigen: 3 meses (COVID) ni 30 días de gracia', () => {
    // Se nombran sólo para desmentirlas: el decreto COVID y su ventana de 2020 van al lado.
    expect(text()).toMatch(/Decreto 217\/020/)
    expect(text()).toMatch(/31 de octubre de 2020/)
    expect(text()).not.toMatch(/tenés 3 meses más|tres meses más de cobertura desde/i)
    expect(text()).toMatch(/30 días de gracia[^.]*(no los menciona|no rigen)/)
  })

  it('publica la ausencia de afiliación voluntaria como ausencia, y sin precio de cuota', () => {
    expect(text()).toMatch(/No existe una afiliación voluntaria/)
    expect(text()).toMatch(/ausencia en la norma/)
    expect(text()).toMatch(/no publicamos un precio de cuota/)
    expect(text()).toMatch(/2,13 %/)
    expect(text()).toMatch(/2,50 %/)
    expect(text()).toMatch(/\$ 880/)
    expect(text()).toMatch(/Decreto 163\/026/)
  })

  it('trae los números del seguro de paro y de ASSE con su fuente', () => {
    expect(text()).toMatch(/72 jornales/)
    expect(text()).toMatch(/48 jornales/)
    expect(text()).toMatch(/30 días corridos/)
    expect(text()).toMatch(/62 UR/)
    expect(text()).toMatch(/\$ 3\.513/)
    expect(text()).toMatch(/\$ 8\.580/)
    const urls = (g.sources ?? []).map(s => s.url).join(' ')
    expect(urls).toContain('bps.gub.uy/23321')
    expect(urls).toContain('bps.gub.uy/4802')
    expect(urls).toContain('bps.gub.uy/6486')
    expect(urls).toContain('leyes/18731-2011/30')
    expect(urls).toContain('decretos/163-2026')
    expect(urls).toContain('asse.com.uy')
  })

  it('no nombra al cónyuge como beneficiario de los 12 meses', () => {
    expect(text()).toMatch(/cónyuge o concubino a cargo no tiene esa extensión/)
  })

  it('enlaza el seguro de paro, la devolución y el cambio de mutualista', () => {
    const tos = [
      ...(g.related ?? []).map(r => r.to),
      ...g.sections.flatMap(s => (s.links ?? []).map(l => l.to)),
    ]
    expect(tos).toContain('/seguro-de-paro-uruguay')
    expect(tos).toContain('/devolucion-fonasa-uruguay')
    expect(tos).toContain('/cambiar-de-mutualista-uruguay')
    expect(tos).toContain('/tickets-mutualistas-uruguay')
  })
})
