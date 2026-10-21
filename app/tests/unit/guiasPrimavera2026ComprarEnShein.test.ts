import { describe, expect, it } from 'vitest'

import { getGuide } from '../../utils/guides'

const g = getGuide('comprar-en-shein-desde-uruguay')!

/** Todo lo que el lector ve: títulos, prosa, tablas, pasos y FAQ. */
const text = () =>
  [
    g.title,
    g.description,
    ...g.sections.flatMap(s => [s.heading, s.body, ...(s.table?.rows.flat() ?? [])]),
    ...(g.steps ?? []).map(s => `${s.name} ${s.text}`),
    ...(g.faqs ?? []).map(f => `${f.q} ${f.a}`),
  ].join('\n')

/** Cada bloque que se lee como una unidad: una sección, un paso o una respuesta. */
const blocks = () => [
  ...g.sections.map(s => `${s.heading}\n${s.body}\n${(s.table?.rows.flat() ?? []).join(' ')}`),
  ...(g.steps ?? []).map(s => `${s.name}\n${s.text}`),
  ...(g.faqs ?? []).map(f => `${f.q}\n${f.a}`),
]

const section = (heading: RegExp) => {
  const s = g.sections.find(x => heading.test(x.heading))
  expect(s, `falta la sección ${heading}`).toBeDefined()
  return s!
}

const linksOf = (heading: RegExp) => (section(heading).links ?? []).map(l => l.to)

describe('guía de comprar en Shein desde Uruguay', () => {
  it('existe con su slug, su fecha y un snippet que entra en el SERP', () => {
    expect(g).toBeDefined()
    expect(g.slug).toBe('comprar-en-shein-desde-uruguay')
    expect(g.updatedAt).toBe('2026-10-21')
    expect(g.tag).toBe('IMPORTAR')
    expect(g.title.length).toBeLessThanOrEqual(43)
    expect(`${g.title} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
    expect(g.description.length).toBeGreaterThanOrEqual(100)
    expect(g.description.length).toBeLessThanOrEqual(155)
    // El dato va adelante: la respuesta a "¿Shein envía a Uruguay?" abre la descripción.
    expect(g.description).toMatch(/^Shein envía directo a Uruguay/)
  })

  it('publica el envío que Shein muestra para Uruguay, y nada que no muestre', () => {
    const table = section(/Shein envía a Uruguay/).table!
    expect(table.headers).toHaveLength(2)
    expect(table.rows.length).toBeGreaterThanOrEqual(5)
    for (const row of table.rows) expect(row).toHaveLength(2)
    const cells = table.rows.flat().join(' ')
    for (const dato of ['Envío estándar', '1 a 3 días', '8 a 13 días laborables', 'US$ 12,90'])
      expect(cells).toContain(dato)
    expect(cells).toMatch(/más de US\$ 79/)
    // Shein no lista un envío exprés para Uruguay ni una fecha de entrega fija: no se inventan.
    expect(text()).not.toMatch(/env[ií]o expr[eé]s/i)
    expect(text()).not.toMatch(/US\$ 12[.,]90 .{0,40}exprés/i)
  })

  it('dice cómo comprobarlo en el checkout y con qué fecha lo leyó', () => {
    expect(section(/Cómo comprobarlo/).body).toMatch(/checkout/)
    expect(section(/Cómo comprobarlo/).body).toMatch(/no podés escribir tu dirección/)
    expect(text()).toContain('21 de octubre de 2026')
  })

  it('separa cómo llega de cuánto se paga: las cifras del régimen aparecen una sola vez', () => {
    // El 22 % y el mínimo de US$ 20 viven en las páginas del impuesto Temu; acá van en UN bloque.
    expect(blocks().filter(b => b.includes('22 %'))).toHaveLength(1)
    expect(blocks().filter(b => b.includes('US$ 20 '))).toHaveLength(1)
    expect(section(/Cuánto pagás/).body).toContain('22 %')
    expect(section(/Cuánto pagás/).body).toContain('US$ 20')
    // El cupo anual no se repite: se enlaza.
    expect(text()).not.toContain('US$ 800')
  })

  it('cita las normas que sostiene cada afirmación', () => {
    for (const norma of [
      'Decreto 50/026',
      '(art. 3)',
      '(art. 4)',
      '(art. 5)',
      '(art. 7)',
      '(art. 8)',
      'art. 10',
      'Ley 19.920',
      'Ley 17.250',
      'IMESI',
    ])
      expect(text()).toContain(norma)
  })

  it('publica los plazos de la política vigente de Shein, cada uno con su fecha de arranque', () => {
    const reclamos = section(/no llega/).body
    expect(reclamos).toMatch(/90 días desde la fecha de pago/)
    expect(reclamos).toMatch(/60 días desde la fecha de entrega/)
    expect(reclamos).toMatch(/180 días desde la fecha del pedido/)
    const devoluciones = section(/devoluciones/i).body
    expect(devoluciones).toMatch(/30 días posteriores a la recepción/)
    expect(devoluciones).toMatch(/autogestionada/)
    expect(devoluciones).toMatch(/no se reembolsa/)
  })

  it('enlaza la página que corresponde en cada sección que la nombra', () => {
    expect(linksOf(/Directo o por casillero/)).toEqual(
      expect.arrayContaining(['/envio-directo-o-casillero-uruguay', '/comparativas/couriers'])
    )
    expect(linksOf(/Cuánto pagás/)).toEqual(
      expect.arrayContaining([
        '/impuesto-temu-uruguay',
        '/guias/impuesto-temu-uruguay',
        '/herramientas/calculadora-impuestos-importacion',
      ])
    )
    expect(linksOf(/franquicias te quedan/)).toContain('/franquicia-aduana-uruguay')
    expect(linksOf(/no llega/)).toContain('/derechos-consumidor-compras-online')
    expect(linksOf(/carrito/)).toContain('/importar')
    expect(linksOf(/Es seguro/)).toContain('/tiendas-online-uruguay/shein')
  })

  it('tiene forma de guía: secciones, pasos, preguntas, fuentes y relacionadas', () => {
    expect(g.sections.length).toBeGreaterThanOrEqual(6)
    expect(g.sections.length).toBeLessThanOrEqual(9)
    expect(g.steps?.length ?? 0).toBeGreaterThanOrEqual(5)
    expect(g.faqs?.length ?? 0).toBeGreaterThanOrEqual(5)
    expect(g.faqs?.length ?? 0).toBeLessThanOrEqual(7)
    const preguntas = (g.faqs ?? []).map(f => f.q)
    expect(preguntas).toContain('¿Shein envía a Uruguay?')
    expect(preguntas).toContain('¿Es seguro comprar en Shein desde Uruguay?')

    const related = (g.related ?? []).map(r => r.to)
    expect(related.length).toBeGreaterThanOrEqual(3)
    expect(related.length).toBeLessThanOrEqual(6)
    for (const to of [
      '/impuesto-temu-uruguay',
      '/guias/impuesto-temu-uruguay',
      '/franquicia-aduana-uruguay',
      '/envio-directo-o-casillero-uruguay',
    ])
      expect(related).toContain(to)
  })

  it('cada fuente es https y las de Shein y la norma están', () => {
    const urls = (g.sources ?? []).map(s => s.url)
    expect(urls.length).toBeGreaterThanOrEqual(8)
    for (const url of urls) expect(url).toMatch(/^https:\/\//)
    expect(urls).toContain('https://www.shein.com/Shipping-Info-a-280.html')
    expect(urls).toContain('https://www.shein.com/Return-Policy-a-281.html')
    expect(urls).toContain('https://www.impo.com.uy/bases/decretos/50-2026')
    expect(urls).toContain('https://www.impo.com.uy/bases/leyes/19920-2020/50')
  })

  it('es prosa plana en español uruguayo y sin promesas', () => {
    expect(text()).not.toMatch(/\*\*|^#|^\s*[-•] /m)
    expect(text()).not.toMatch(/septiembre/i)
    expect(text()).not.toMatch(/\bel mejor\b|garantizad/i)
  })
})
