import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { URUGUAY } from '../../utils/calculators'
import {
  GENERAL_RULE,
  RENT_WITHHOLDING_PCT,
  SMALL_LANDLORD_MAX_BPC,
  SMALL_LANDLORD_OTHER_CAPITAL_MAX_BPC,
} from '../../utils/capitalTax'
import { getTerm } from '../../utils/glossary'
import { getGuide } from '../../utils/guides'

const g = getGuide('irpf-de-alquileres-uruguay')!

const miles = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')
const pesos = (n: number) => `$ ${miles(n)}`

/** Todo lo que el lector ve: título, bajada, secciones con sus tablas, pasos y FAQ. */
const text = () =>
  [
    g.title,
    g.description,
    ...g.sections.flatMap(s => [s.heading, s.body, ...(s.table?.rows.flat() ?? [])]),
    ...(g.steps ?? []).flatMap(s => [s.name, s.text]),
    ...(g.faqs ?? []).map(f => `${f.q} ${f.a}`),
  ].join(' ')

const section = (re: RegExp) => g.sections.find(s => re.test(s.heading))!

const PAGES = join(__dirname, '..', '..', 'pages')
/** Una ruta existe si es una guía del catálogo, un término del glosario o un .vue de `pages/`. */
const resolves = (to: string): boolean => {
  if (to.startsWith('/guias/')) return getGuide(to.slice('/guias/'.length)) !== undefined
  if (to.startsWith('/glosario/')) return getTerm(to.slice('/glosario/'.length)) !== undefined
  const route = to.slice(1)
  return existsSync(join(PAGES, `${route}.vue`)) || existsSync(join(PAGES, route, 'index.vue'))
}

describe('guía de IRPF de alquileres (lado del propietario)', () => {
  it('existe con su slug, la fecha de verificación y un snippet que entra en el SERP', () => {
    expect(g).toBeDefined()
    expect(g.slug).toBe('irpf-de-alquileres-uruguay')
    expect(g.updatedAt).toBe('2026-10-21')
    expect(g.tag).toBe('IRPF')
    expect(g.title.length).toBeLessThanOrEqual(43)
    expect(`${g.title} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
    expect(g.description.length).toBeGreaterThanOrEqual(100)
    expect(g.description.length).toBeLessThanOrEqual(155)
    // El dato va adelante: la tasa en el título y en la primera frase de la bajada.
    expect(g.title).toContain('10,5 %')
    expect(g.description.slice(0, 30)).toContain('10,5 %')
  })

  it('la tasa sale de capitalTax.ts, igual que en /impuestos-inversiones-uruguay', () => {
    // Si alguien cambia la retención o la tasa en el módulo compartido, la guía la sigue sola;
    // este test fija que la cuenta publicada sea la que dice la norma hoy.
    expect(RENT_WITHHOLDING_PCT).toBe(10.5)
    expect(GENERAL_RULE.rate).toBe(12)
    const t = text()
    expect(t).toContain('10,5 %')
    expect(t).toContain('12 %')
    expect(t).toContain('87,5 %')
    expect(t).toContain('12,5 %')
    expect(t).toMatch(/Título 7, arts\. 35 y 37/)
  })

  it('trae el ejemplo de la DGI con su vencimiento, y el boleto con su código', () => {
    const s = section(/Cuánto pagás/)
    expect(s.body).toContain('$ 30.000')
    expect(s.body).toContain('$ 3.150')
    expect(s.body).toContain('25 de setiembre de 2026')
    const pago = section(/boleto 2908/)
    expect(pago.body).toContain('2908')
    expect(pago.body).toContain('111')
    expect(pago.body).toMatch(/plataformas digitales/)
    expect(pago.body).toMatch(/no son agentes de retención/)
    expect(g.steps?.length ?? 0).toBeGreaterThanOrEqual(4)
    expect(g.steps!.map(s => s.text).join(' ')).toContain('08/2026')
  })

  it('publica los vencimientos 2026 que da la DGI para los pagos a cuenta', () => {
    const table = section(/boleto 2908/).table!
    expect(table.headers).toHaveLength(2)
    for (const row of table.rows) expect(row).toHaveLength(2)
    const byMonth = Object.fromEntries(table.rows.map(([m, d]) => [m, d]))
    expect(byMonth['Agosto de 2026']).toBe('25 de setiembre de 2026')
    expect(byMonth['Setiembre de 2026']).toBe('26 de octubre de 2026')
    expect(byMonth['Octubre de 2026']).toBe('25 de noviembre de 2026')
    expect(byMonth['Noviembre de 2026']).toBe('28 de diciembre de 2026')
    // El calendario 2027 no está publicado: diciembre de 2026 no lleva día inventado.
    expect(byMonth['Diciembre de 2026']).toBeUndefined()
  })

  it('nombra a los agentes de retención y la opción de dejar la retención como definitiva', () => {
    const s = section(/inmobiliaria, la Contaduría o ANDA/)
    for (const name of ['Contaduría General de la Nación', 'ANDA', 'CEDE', 'Decreto 148/007'])
      expect(s.body).toContain(name)
    expect(s.body).toMatch(/art\. 45/)
    expect(s.body).toMatch(/art\. 17/)
  })

  it('arma los topes de la exoneración con la BPC compartida, sin montos escritos a mano', () => {
    const tope = pesos(SMALL_LANDLORD_MAX_BPC * URUGUAY.bpc)
    const otras = pesos(SMALL_LANDLORD_OTHER_CAPITAL_MAX_BPC * URUGUAY.bpc)
    const s = section(/La exoneración/)
    expect(s.body).toContain(tope)
    expect(s.body).toContain(otras)
    expect(s.body).toContain(pesos(URUGUAY.bpc))
    expect(s.body).toContain('secreto bancario')
    expect(s.body).toMatch(/art\. 38/)
    expect(g.faqs!.map(f => f.a).join(' ')).toContain(tope)
  })

  it('la BPC del texto es la de 2026 verificada en el BPS', () => {
    // El texto dice «con la BPC de 2026». Si este valor cambia, hay que revisar la guía entera
    // (la fecha, los topes y la tabla de vencimientos), no sólo actualizar el número.
    expect(URUGUAY.bpc).toBe(6864)
    expect(text()).toContain('$ 274.560')
    expect(text()).toContain('$ 20.592')
  })

  it('explica el trámite con sus formularios y la vigencia de la constancia', () => {
    const t = text()
    for (const form of ['5500', '5600', '5501']) expect(t).toContain(form)
    expect(t).toContain('Exoneración de IRPF Arrendamiento')
    expect(t).toContain('31 de octubre')
    expect(t).toMatch(/Presentación de exoneración de IRPF/)
  })

  it('cubre matrimonio, herederos y no residentes', () => {
    const familia = section(/matrimonio/)
    expect(familia.body).toMatch(/mitad y mitad/)
    expect(familia.body).toMatch(/capitulaciones/)
    expect(familia.body).toMatch(/sucesión esté inscripta en la DGI/)
    const irnr = section(/no sos residente/)
    expect(irnr.body).toContain('IRNR')
    expect(irnr.body).toContain('código 200')
    expect(irnr.body).toContain('NIE')
    expect(irnr.body).toMatch(/no puede pedir la exoneración/)
  })

  it('no compite con las páginas vecinas: las enlaza', () => {
    const tos = new Set([
      ...(g.related ?? []).map(r => r.to),
      ...g.sections.flatMap(s => (s.links ?? []).map(l => l.to)),
    ])
    for (const to of [
      '/impuestos-inversiones-uruguay',
      '/credito-fiscal-por-alquiler-uruguay',
      '/declaracion-de-irpf-uruguay',
      '/guias/alquiler-temporario-uruguay',
      '/alquiler-de-temporada-uruguay',
      '/herramientas/calculadora-impuestos-inversiones',
      '/herramientas/calculadora-irpf',
    ])
      expect(tos.has(to), to).toBe(true)
    // El inquilino tiene su propia página: la guía la enlaza desde su sección.
    expect(section(/inquilino/).links?.map(l => l.to)).toContain(
      '/credito-fiscal-por-alquiler-uruguay'
    )
  })

  it('cada enlace interno apunta a una ruta que existe', () => {
    const links = [...(g.related ?? []), ...g.sections.flatMap(s => s.links ?? [])]
    const broken = links.filter(l => !resolves(l.to)).map(l => l.to)
    expect(broken).toEqual([])
  })

  it('forma: secciones, FAQ, fuentes https y texto plano', () => {
    expect(g.sections.length).toBeGreaterThanOrEqual(6)
    expect(g.sections.length).toBeLessThanOrEqual(9)
    expect(g.faqs?.length ?? 0).toBeGreaterThanOrEqual(5)
    expect(g.faqs?.length ?? 0).toBeLessThanOrEqual(7)
    expect(g.related?.length ?? 0).toBeGreaterThanOrEqual(3)
    expect(g.related?.length ?? 0).toBeLessThanOrEqual(6)
    expect(g.sources?.length ?? 0).toBeGreaterThanOrEqual(8)
    for (const s of g.sources ?? []) expect(s.url).toMatch(/^https:\/\//)
    const sourceUrls = (g.sources ?? []).map(s => s.url).join(' ')
    expect(sourceUrls).toContain('ingreso-alquileres-anuales-temporada')
    expect(sourceUrls).toContain('exoneracion-arrendamientos')
    expect(sourceUrls).toContain('bps.gub.uy')
    const all = `${text()} ${(g.sources ?? []).map(s => s.label).join(' ')}`
    expect(all).not.toMatch(/\*\*|^#|\n-\s/m)
    expect(all).not.toMatch(/septiembre/i)
  })
})
