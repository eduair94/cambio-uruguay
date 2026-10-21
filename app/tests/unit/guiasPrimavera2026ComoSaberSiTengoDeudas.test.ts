import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { getGuide } from '../../utils/guides'

const g = getGuide('como-saber-si-tengo-deudas-uruguay')!

const text = () =>
  [
    g.title,
    g.description,
    ...g.sections.flatMap(s => [s.heading, s.body, ...(s.table?.rows.flat() ?? [])]),
    ...(g.faqs ?? []).map(f => `${f.q} ${f.a}`),
  ].join(' ')

/** Cada trozo que el lector ve como una unidad: una sección o una respuesta. */
const blocks = () => [
  ...g.sections.map(s => ({
    donde: s.heading,
    texto: [s.heading, s.body, ...(s.table?.rows.flat() ?? [])].join(' '),
  })),
  ...(g.faqs ?? []).map(f => ({ donde: `FAQ «${f.q}»`, texto: `${f.q} ${f.a}` })),
]

const sectionLinks = (heading: RegExp) =>
  (g.sections.find(s => heading.test(s.heading))?.links ?? []).map(l => l.to)

/** Una ruta interna existe si hay página estática o si es una guía del catálogo. */
const resolves = (to: string) => {
  if (to.startsWith('/guias/')) return getGuide(to.slice('/guias/'.length)) !== undefined
  const pages = join(__dirname, '..', '..', 'pages')
  return existsSync(join(pages, `${to}.vue`)) || existsSync(join(pages, to, 'index.vue'))
}

describe('guía: cómo saber si tengo deudas en Uruguay', () => {
  it('existe con su slug, su fecha y un snippet que entra en el SERP', () => {
    expect(g).toBeDefined()
    expect(g.updatedAt).toBe('2026-10-21')
    expect(g.tag).toBe('DEUDAS')
    expect(g.title.length).toBeLessThanOrEqual(43)
    expect(`${g.title} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
    expect(g.description.length).toBeGreaterThanOrEqual(100)
    expect(g.description.length).toBeLessThanOrEqual(155)
  })

  it('contesta primero que no hay un registro único', () => {
    expect(g.description).toMatch(/^No hay un registro único/)
    expect(g.sections[0]!.heading).toMatch(/no hay un registro único/i)
  })

  it('trae la tabla por acreedor, con una fila por cada consulta', () => {
    const table = g.sections.find(s => s.table)!.table!
    expect(table.headers).toEqual(['Acreedor', 'Dónde se consulta', 'Qué te piden'])
    expect(table.rows.length).toBeGreaterThanOrEqual(8)
    for (const row of table.rows) expect(row).toHaveLength(3)
    const acreedores = table.rows.map(r => r[0]).join(' ')
    for (const name of ['Bancos', 'Patente', 'Montevideo', 'BPS', 'DGI', 'UTE', 'OSE', 'Antel'])
      expect(acreedores).toContain(name)
  })

  it('nombra cada consulta con lo que pide hoy, verificado el 21/10/2026', () => {
    for (const dato of [
      'Central de Riesgos',
      'Clearing',
      'pregunta de seguridad',
      'correo',
      'matrícula',
      'padrón',
      'ID Uruguay',
      'número de cuenta corriente',
      '099 019 500',
      '1950 3000',
      '*1997',
      '0800 1997',
      '1344',
      '0800 1930',
      '123, opción 1',
      '*611',
      'Diagonal Fabini 777',
      '15 días corridos',
      '21 de octubre de 2026',
    ])
      expect(text()).toContain(dato)
  })

  it('no promete que la patente o la intendencia se consulten con la cédula sola', () => {
    for (const b of blocks().filter(b => /SUCIVE/.test(b.texto) && /cédula/i.test(b.texto)))
      expect(b.texto, b.donde).toMatch(/matrícula/)
    for (const b of blocks().filter(
      b => /Intendencia de Montevideo/.test(b.texto) && /cédula/i.test(b.texto)
    ))
      expect(b.texto, b.donde).toMatch(/cuenta corriente/)
  })

  it('dice que la consulta del BCU exige registrarse y no la llama gratis', () => {
    const bcu = g.sections.find(s => /Central de Riesgos del BCU/.test(s.heading))!
    expect(bcu.body).toMatch(/registrarse/)
    expect(bcu.body).not.toMatch(/BCU[^.]*gratis|gratis[^.]*BCU/)
  })

  it('los plazos del registro viajan con su norma', () => {
    const bloques = blocks().filter(b => /cinco años/.test(b.texto))
    expect(bloques.length).toBeGreaterThan(0)
    for (const b of bloques) expect(b.texto, b.donde).toMatch(/18\.331/)
    expect(text()).toMatch(/15 años de su vencimiento/)
  })

  it('resume el Clearing y manda a /salir-del-clearing en vez de copiarlo', () => {
    expect(sectionLinks(/Central de Riesgos del BCU/)).toContain('/salir-del-clearing')
    expect(sectionLinks(/error/)).toContain('/salir-del-clearing')
    // Los precios y el teléfono del informe de Equifax ya los publica esa página.
    expect(text()).not.toMatch(/2628 1515|\$ ?540/)
  })

  it('cada sección enlaza las páginas del sitio que nombra', () => {
    expect(sectionLinks(/Patente/)).toEqual(
      expect.arrayContaining([
        '/guias/pagar-patente-sucive-uruguay',
        '/multas-de-transito-y-patente-uruguay',
      ])
    )
    expect(sectionLinks(/Intendencia/)).toContain('/contribucion-inmobiliaria-uruguay')
    expect(sectionLinks(/BPS y DGI/)).toEqual(
      expect.arrayContaining(['/certificados-bps-uruguay', '/certificado-unico-dgi-uruguay'])
    )
    expect(sectionLinks(/UTE, OSE y Antel/)).toEqual(
      expect.arrayContaining([
        '/que-pasa-si-no-pago-antel',
        '/factura-de-ute-uruguay',
        '/factura-de-ose-uruguay',
      ])
    )
    expect(sectionLinks(/compraron la deuda/)).toEqual(
      expect.arrayContaining([
        '/guias/me-compraron-la-deuda-uruguay',
        '/guias/estudio-de-cobranza-uruguay',
      ])
    )
    expect(sectionLinks(/Prescribió/)).toEqual(
      expect.arrayContaining([
        '/guias/cuando-prescribe-una-deuda-uruguay',
        '/prescripcion-de-deudas-con-el-estado-uruguay',
      ])
    )
    expect((g.related ?? []).map(r => r.to)).toContain(
      '/guias/mejorar-historial-crediticio-uruguay'
    )
  })

  it('ningún enlace interno apunta a una ruta que no existe', () => {
    const tos = [
      ...g.sections.flatMap(s => (s.links ?? []).map(l => l.to)),
      ...(g.related ?? []).map(r => r.to),
    ]
    for (const to of tos) expect(resolves(to), to).toBe(true)
  })

  it('forma: secciones, FAQ, relacionadas y fuentes', () => {
    expect(g.sections.length).toBeGreaterThanOrEqual(6)
    expect(g.sections.length).toBeLessThanOrEqual(9)
    expect(g.faqs?.length ?? 0).toBeGreaterThanOrEqual(5)
    expect(g.faqs?.length ?? 0).toBeLessThanOrEqual(7)
    expect(g.related?.length ?? 0).toBeGreaterThanOrEqual(3)
    expect(g.related?.length ?? 0).toBeLessThanOrEqual(6)
    expect(g.faqs!.map(f => f.q)).toContain('¿Dónde puedo averiguar todas las deudas que tengo?')
  })

  it('cita fuentes primarias https, con el texto vigente de IMPO', () => {
    const urls = (g.sources ?? []).map(s => s.url)
    expect(urls.length).toBeGreaterThanOrEqual(10)
    for (const url of urls) expect(url).toMatch(/^https:\/\//)
    expect(urls.filter(u => /-originales\//.test(u))).toEqual([])
    for (const url of [
      'https://consultadeuda.bcu.gub.uy/consultadeuda/ayuda.html',
      'https://subsitio.bcu.gub.uy/central-de-riesgos/',
      'https://www.impo.com.uy/bases/leyes/18331-2008/14',
      'https://www.impo.com.uy/bases/leyes/18331-2008/22',
      'https://www.impo.com.uy/revista/clearing-de-informes-guia-de-orientacion-a-los-consumidores/',
      'https://www.sucive.gub.uy/consulta_deuda',
    ])
      expect(urls).toContain(url)
  })

  it('prosa plana y en uruguayo', () => {
    expect(text()).not.toMatch(/\*\*|^#|\n- /m)
    expect(text()).not.toMatch(/septiembre/i)
  })
})
