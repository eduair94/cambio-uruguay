import { existsSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { URUGUAY } from '../../utils/calculators'
import {
  GENERAL_RULE,
  RENT_WITHHOLDING_PCT,
  SMALL_LANDLORD_MAX_BPC,
  SMALL_LANDLORD_OTHER_CAPITAL_MAX_BPC,
  rentTax,
} from '../../utils/capitalTax'
import { getTerm } from '../../utils/glossary'
import { getGuide } from '../../utils/guides'
import { indicatorFromSlug } from '../../utils/indicators'
import { BPC_2025 } from '../../utils/irpfCasos'

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
  if (to.startsWith('/indicadores/'))
    return indicatorFromSlug(to.slice('/indicadores/'.length)) !== null
  // El archivo histórico es una ruta dinámica: /historico/<origen>/<moneda>.
  if (/^\/historico\/[a-z0-9.]+\/[a-z0-9.]+$/.test(to))
    return existsSync(join(PAGES, 'historico', '[origin]', '[currency]', '[[type]].vue'))
  const route = to.slice(1)
  return existsSync(join(PAGES, `${route}.vue`)) || existsSync(join(PAGES, route, 'index.vue'))
}

describe('guía de IRPF de alquileres (lado del propietario)', () => {
  it('existe con su slug, la fecha de verificación y un snippet que entra en el SERP', () => {
    expect(g).toBeDefined()
    expect(g.slug).toBe('irpf-de-alquileres-uruguay')
    expect(g.updatedAt).toBe('2026-11-20')
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
    const s = section(/A partir de qué monto/)
    expect(s.body).toContain(tope)
    expect(s.body).toContain(otras)
    expect(s.body).toContain(pesos(URUGUAY.bpc))
    expect(s.body).toContain('secreto bancario')
    expect(s.body).toMatch(/art\. 38/)
    expect(g.faqs!.map(f => f.a).join(' ')).toContain(tope)
  })

  it('la BPC del texto es la de 2026 verificada en el BPS', () => {
    // El texto dice «con la BPC de 2026». Si este valor cambia, hay que revisar la guía entera
    // (la fecha, los topes y la tabla de vencimientos), no sólo actualizar el número. En enero de
    // 2027 este test falla a propósito: pasar la fila de 2026 a TOPES_DGI_ANTERIORES con sus
    // literales ($ 274.560 / $ 20.592), cambiar el año del encabezado, sumar las filas del
    // calendario 2027 de la DGI y poner el vencimiento de diciembre de 2026 en la sección 3 y en la
    // pregunta «Cuándo vence» (que hoy dice «el día que fije el calendario de 2027 de la DGI»).
    expect(URUGUAY.bpc).toBe(6864)
    expect(text()).toContain('$ 274.560')
    expect(text()).toContain('$ 20.592')
  })

  it('la tabla de montos es la retención de capitalTax.ts para cada alquiler redondo', () => {
    const s = section(/Cuánto pagás/)
    const table = s.table!
    expect(table.headers).toHaveLength(4)
    expect(table.rows.length).toBeGreaterThanOrEqual(5)
    const topeAnual = SMALL_LANDLORD_MAX_BPC * URUGUAY.bpc
    for (const [alquiler, mes, anio, tope] of table.rows) {
      const grossRent = Number(alquiler.replace(/\D/g, ''))
      const { withholding } = rentTax({ grossRent, deductions: 0 })
      expect(mes).toBe(pesos(withholding))
      expect(anio).toBe(pesos(withholding * 12))
      expect(tope.startsWith(pesos(grossRent * 12))).toBe(true)
      expect(tope).toContain(grossRent * 12 <= topeAnual ? 'dentro' : 'pasa')
    }
    const byRent = Object.fromEntries(table.rows.map(r => [r[0], r]))
    expect(byRent['$ 20.000']!.slice(1, 3)).toEqual(['$ 2.100', '$ 25.200'])
    expect(byRent['$ 25.000']![3]).toContain('pasa')
    expect(byRent['$ 20.000']![3]).toContain('dentro')
    // Sin mínimo: dicho en la sección, no sólo en la FAQ (las respuestas de la FAQ no salen en el
    // HTML del servidor, sólo en el JSON-LD).
    expect(s.body).toContain('No hay un monto mínimo')
    expect(s.body).toContain(pesos(topeAnual))
  })

  it('la tabla de retención lista quién retiene y quién no', () => {
    const table = section(/inmobiliaria, la Contaduría o ANDA/).table!
    expect(table.headers).toHaveLength(2)
    const byWho = Object.fromEntries(table.rows.map(([w, r]) => [w, r]))
    expect(byWho['Inmobiliaria que administra y cobra']).toBe('Sí')
    expect(byWho['Plataforma digital']).toMatch(/^No/)
    expect(byWho['Inquilino particular']).toMatch(/^No/)
  })

  it('nombra los medios de pago de la DGI y la base del anticipo', () => {
    const pago = section(/boleto 2908/).body
    for (const name of ['Abitab', 'Red Pagos', 'BANRED', '662/007', 'numeral 18']) {
      expect(pago).toContain(name)
    }
    expect(g.steps!.map(s => s.text).join(' ')).toContain('Abitab')
  })

  it('cuenta la devolución del excedente, la opción por todos y el alquiler impago', () => {
    const s = section(/definitivo o declarar por lo real/)
    expect(s.body).toContain('devolución')
    expect(s.body).toContain('662/007')
    expect(s.body).toContain('numeral 2')
    expect(s.body).toContain('numeral 17')
    expect(s.body).toContain('tres meses')
    expect(s.body).toContain('Decreto 148/007, art. 13')
    const tos = s.links!.map(l => l.to)
    expect(tos).toContain('/contribucion-inmobiliaria-uruguay')
    expect(tos).toContain('/impuesto-de-primaria-uruguay')
  })

  it('explica la conversión del alquiler en dólares con la norma, sin un tipo de cambio fijo', () => {
    const s = section(/en dólares/)
    for (const word of ['interbancaria', 'comprador billete', '150/007', '662/007'])
      expect(s.body).toContain(word)
    expect(s.links!.map(l => l.to)).toContain('/cotizacion-del-bcu')
    // El histórico enlazado es el del BCU, no el de las pizarras que la sección descarta.
    expect(s.links!.map(l => l.to)).toContain('/historico/bcu/usd')
    expect(s.links!.map(l => l.to)).not.toContain('/historico')
    // Ningún monto en pesos ni cotización congelada en la sección.
    expect(s.body).not.toMatch(/\$ \d/)
    // Cómo se convierten los dólares para el tope de 40 BPC no lo dice ninguna fuente.
    expect(s.body).not.toMatch(/se comparan ya convertidos/)
  })

  it('el tope es anual: el monto por mes sólo vale si se cobra lo mismo los doce meses', () => {
    const porMes = pesos((40 * URUGUAY.bpc) / 12)
    const minimo = g.faqs!.find(f => /A partir de qué monto/.test(f.q))!.a
    for (const t of [g.sections[0]!.body, minimo]) {
      expect(t).toContain(`${porMes} por mes si cobrás lo mismo los doce meses`)
      expect(t).not.toMatch(/Lo único que te deja/)
    }
    expect(minimo).toContain('total del año civil')
  })

  it('publica los topes de la DGI por año: 2026 de la BPC, 2025 y 2024 de su tabla', () => {
    const table = section(/A partir de qué monto/).table!
    expect(table.headers).toHaveLength(4)
    const byYear = Object.fromEntries(table.rows.map(([y, ...rest]) => [y, rest]))
    expect(byYear['2026']).toEqual([
      pesos(40 * URUGUAY.bpc),
      pesos((40 * URUGUAY.bpc) / 12),
      pesos(3 * URUGUAY.bpc),
    ])
    expect(byYear['2026']).toEqual(['$ 274.560', '$ 22.880', '$ 20.592'])
    expect(byYear['2025']).toEqual([
      pesos(40 * BPC_2025),
      pesos((40 * BPC_2025) / 12),
      pesos(3 * BPC_2025),
    ])
    expect(byYear['2025']).toEqual(['$ 263.040', '$ 21.920', '$ 19.728'])
    // 2024: los literales de la DGI salen de la misma BPC (247.080 / 40 = 18.531 / 3 = 6.177).
    expect(byYear['2024']).toEqual(['$ 247.080', '$ 20.590', '$ 18.531'])
    expect(247_080 / 40).toBe(18_531 / 3)
    const body = section(/A partir de qué monto/).body
    expect(body).toContain('No hay un monto a partir del cual')
    expect(body).toContain('19.889')
    const tos = section(/A partir de qué monto/).links!.map(l => l.to)
    expect(tos).toContain('/indicadores/bpc')
    expect(tos).toContain('/pagar-el-alquiler-en-efectivo-uruguay')
  })

  it('la sección de formularios tiene el 5500, el 5600 y el 5501 con sus descargas', () => {
    const s = section(/Formularios 5500 y 5600/)
    const forms = s.table!.rows.map(r => r[0])
    expect(forms).toEqual(['5500', '5600', '5501'])
    expect(s.body).toContain('02/2022')
    expect(s.body).toContain('31 de diciembre del año de la solicitud')
    const sourceUrls = (g.sources ?? []).map(src => src.url).join(' ')
    for (const slug of [
      'formulario-5500-solicitud-constancia-exoneracion-arrendamiento',
      'formulario-5600-solicitud-levantamiento-voluntario-del-secreto',
      'formulario-5501-solicitud-anulacion-constancia-exoneracion',
      'medios-habilitados-para-pago-del-irpf',
      'resoluciones-dgi-interes-general/662-2007',
      'decretos/150-2007/74',
      'decretos/148-2007/13',
      'leyes/19889-2020/224',
    ])
      expect(sourceUrls, slug).toContain(slug)
  })

  it('la FAQ contesta el monto mínimo y los formularios, y no publica días de 2027', () => {
    const qs = g.faqs!.map(f => f.q)
    expect(qs[1]).toMatch(/A partir de qué monto/)
    expect(qs.some(q => /5500 y 5600/.test(q))).toBe(true)
    const vence = g.faqs!.find(f => /Cuándo vence/.test(f.q))!.a
    expect(vence).toContain('28 de diciembre')
    expect(vence).not.toMatch(/\d+ de (enero|febrero) de 2027/)
    const devolucion = g.faqs!.find(f => /devolución/.test(f.q))!.a
    expect(devolucion).toContain('662/007')
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
      '/contribucion-inmobiliaria-uruguay',
      '/impuesto-de-primaria-uruguay',
      '/indicadores/bpc',
      '/pagar-el-alquiler-en-efectivo-uruguay',
      '/cotizacion-del-bcu',
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
    expect(g.sections.length).toBeLessThanOrEqual(10)
    expect(g.faqs?.length ?? 0).toBeGreaterThanOrEqual(5)
    expect(g.faqs?.length ?? 0).toBeLessThanOrEqual(9)
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
