import { describe, expect, it } from 'vitest'

import { getGuide } from '../../utils/guides'
import { hubOfGuide } from '../../utils/guideHubs'
import { trabajoBpsGuides } from '../../utils/guidesTrabajoBps'

// Guía del 2026-09-22 para los ocho casos del autocompletado que la página de fechas no cubría
// (3 meses de antigüedad, en negro, certificado, atraso, seguro de paro, jubilados, IRPF, «cuántos
// días»). Este test fija las correcciones del dossier para que no se deshagan solas: el mito del año
// de antigüedad (art. 6, sólo para 1960), la construcción la paga el BPS y no el Fondo Social, el BSE
// se declara sin fuente primaria, y las dos consultas que son de México y Perú se contestan como tales.
describe('guía aguinaldo-casos-especiales-uruguay', () => {
  const slug = 'aguinaldo-casos-especiales-uruguay'
  const g = trabajoBpsGuides.find(x => x.slug === slug)!

  it('existe, está en el índice y en el hub de sueldo y trabajo', () => {
    expect(g).toBeDefined()
    expect(getGuide(slug)?.slug).toBe(slug)
    expect(hubOfGuide(slug)?.slug).toBe('sueldo-trabajo-e-impuestos-uruguay')
  })

  it('cumple los presupuestos de título, descripción, secciones, FAQ y fuentes', () => {
    expect(g.title.length).toBeLessThanOrEqual(60)
    expect(g.description.length).toBeGreaterThanOrEqual(100)
    expect(g.description.length).toBeLessThanOrEqual(155)
    expect(g.sections.length).toBeGreaterThanOrEqual(6)
    expect(g.sections.length).toBeLessThanOrEqual(9)
    expect(g.sections.some(s => s.table)).toBe(true)
    expect(g.faqs?.length ?? 0).toBeGreaterThanOrEqual(3)
    expect(g.faqs?.length ?? 0).toBeLessThanOrEqual(5)
    expect(g.sources?.length ?? 0).toBeGreaterThanOrEqual(4)
    for (const s of g.sources ?? []) {
      expect(s.url).toMatch(/^https:\/\/([\w-]+\.)*(gub\.uy|impo\.com\.uy)\//)
      expect(s.publisher).toBeTruthy()
    }
    expect(g.updatedAt).toBe('2026-09-22')
  })

  it('nombra los hechos que la gente busca, con su norma', () => {
    const text = [
      g.title,
      g.description,
      ...g.sections.map(s => `${s.heading} ${s.body}`),
      ...(g.faqs ?? []).map(f => `${f.q} ${f.a}`),
    ].join(' ')
    expect(text).toMatch(/Decreto 113\/026/)
    expect(text).toMatch(/20 de diciembre/)
    expect(text).toMatch(/30 de junio/)
    expect(text).toMatch(/art\. 6/) // el mito del año de antigüedad, sólo para 1960
    expect(text).toMatch(/1960/)
    expect(text).toMatch(/14\.407/)
    expect(text).toMatch(/18\.572/)
    expect(text).toMatch(/18\.091/)
    expect(text).toMatch(/19\.161/)
    expect(text).not.toMatch(/\*\*|^#|\n- /m)
    expect(text).not.toMatch(/septiembre/i)
  })

  it('no afirma lo que las fuentes no dicen', () => {
    const text = g.sections.map(s => s.body).join(' ')
    // El seguro de paro: ausencia verificada, nunca «no genera» como cita oficial.
    expect(text).not.toMatch(/no genera/i)
    // El BSE: no se dice ni que paga ni que no paga la cuota parte.
    expect(text).toMatch(/ni la ley de accidentes ni las páginas del BSE/i)
    // La canasta va con su año; la edición 2026 no está publicada.
    expect(text).toMatch(/edición 2025/)
    expect(text).toMatch(/no publicó la edición 2026/)
    // La construcción la paga el BPS, no el Fondo Social.
    expect(text).toMatch(/Fondo Social de la Construcción es otra prestación/)
    // El aguinaldo no se cuenta en días ni existe por Fiestas Patrias en Uruguay.
    expect(text).toMatch(/no se mide en días/)
    expect(text).toMatch(/no existe un aguinaldo por Fiestas Patrias/)
  })

  it('enlaza la página de fechas, la calculadora y el seguro de paro', () => {
    const tos = [...(g.related ?? []), ...g.sections.flatMap(s => s.links ?? [])].map(l => l.to)
    expect(tos).toContain('/cuando-se-cobra-el-aguinaldo-uruguay')
    expect(tos).toContain('/herramientas/calculadora-aguinaldo')
    expect(tos).toContain('/seguro-de-paro-uruguay')
    expect(tos).toContain('/denunciar-trabajo-en-negro-uruguay')
  })
})
