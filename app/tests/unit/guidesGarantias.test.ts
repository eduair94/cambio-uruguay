import { describe, expect, it } from 'vitest'

import { getGuide } from '../../utils/guides'

const g = getGuide('garantias-de-alquiler-uruguay')!
const text = () =>
  [
    g.title,
    g.description,
    ...g.sections.map(s => `${s.heading} ${s.body}`),
    ...(g.faqs ?? []).map(f => `${f.q} ${f.a}`),
  ].join(' ')

describe('guía de garantías de alquiler (comparativa 2026)', () => {
  it('conserva el slug y sube la fecha', () => {
    expect(g).toBeDefined()
    expect(g.updatedAt).toBe('2026-09-15')
    expect(g.title.length).toBeLessThanOrEqual(60)
    expect(g.description.length).toBeGreaterThanOrEqual(100)
    expect(g.description.length).toBeLessThanOrEqual(190)
  })
  it('nombra a los cinco proveedores y a los fondos del Ministerio', () => {
    for (const name of ['ANDA', 'Contaduría', 'Porto', 'Sura', 'Mapfre', 'Fondo de Garantía'])
      expect(text()).toContain(name)
  })
  it('trae la tabla comparativa con una fila por garantía', () => {
    const table = g.sections.find(s => s.table)!.table!
    expect(table.headers).toEqual([
      'Garantía',
      'Cuánto cuesta',
      'Cuánto podés alquilar',
      'Quién puede',
      'Demora',
    ])
    expect(table.rows.length).toBeGreaterThanOrEqual(6)
    for (const row of table.rows) expect(row).toHaveLength(5)
  })
  it('no publica un costo que el proveedor no publica', () => {
    const rows = g.sections.find(s => s.table)!.table!.rows
    for (const name of ['Porto', 'Sura', 'Mapfre']) {
      const row = rows.find(r => r[0].includes(name))!
      expect(row[1]).toMatch(/cotiz|no publica|alrededor de/i)
    }
  })
  it('FAQ, fuentes y enlaces', () => {
    expect(g.sections.length).toBeGreaterThanOrEqual(8)
    expect(g.sections.length).toBeLessThanOrEqual(9)
    expect(g.faqs?.length ?? 0).toBeGreaterThanOrEqual(6)
    expect(g.sources?.length ?? 0).toBeGreaterThanOrEqual(6)
    for (const s of g.sources ?? []) expect(s.url).toMatch(/^https:\/\//)
    const tos = (g.related ?? []).map(r => r.to)
    for (const to of [
      '/alquilar-sin-recibo-de-sueldo',
      '/alquilar-estando-en-clearing',
      '/guias/alquilar-sin-garantia-uruguay',
    ])
      expect(tos).toContain(to)
    expect(text()).not.toMatch(/\*\*|^#|\n- /m)
    expect(text()).not.toMatch(/septiembre/)
  })
})
