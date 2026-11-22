import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  AJUSTE_2025_PCT,
  AJUSTE_2026_ANUNCIADO_EL,
  AJUSTE_2026_PROVISORIO_PCT,
  AJUSTE_2027_FECHA,
  AJUSTE_2027_NORMA,
  AJUSTE_2027_PCT,
  AJUSTE_2027_PROVISORIO_PCT,
  AJUSTE_2027_URL,
  AUMJUB_2027,
  AUMJUB_FAQ,
  AUMJUB_HISTORIA,
  AUMJUB_IMSN_REFERENCIA,
  AUMJUB_INE_PROXIMOS,
  AUMJUB_MINIMA_BPC,
  AUMJUB_MINIMA_DIFERENCIAL_2026,
  AUMJUB_MINIMA_DIFERENCIAL_BPC,
  AUMJUB_PRORRATEO_2026,
  AUMJUB_PUNTOS_SOBRE_IPC_2026,
  AUMJUB_SOURCES,
  AUMJUB_VERIFIED_AT,
  type AumJub2027,
  aumJubEstado,
  aumJubFaq,
  aumJubFecha,
  aumJubFechaCorta,
  aumJubMes,
  aumJubMesesQueFaltan,
  aumJubSources,
  aumJubVentanaDoceMeses,
  formatAumJubPct,
  formatAumJubUyu,
} from '../../utils/aumentoJubilaciones'
import { AJUSTE_PASIVIDADES_2026_PCT, JUBILACION_MINIMA_2026 } from '../../utils/bpsFigures2026'
import type { Guide } from '../../utils/guides'
import {
  AUMENTO_JUBILACIONES_SLUG,
  aumentoJubilacionesGuide,
  buildAumentoJubilacionesGuide,
} from '../../utils/guideVeranoAumentoJubilaciones'
import { BPC_2026 } from '../../utils/irpfCasos'

/** Los mismos presupuestos que `guideSnippetBudget.test.ts`, con la marca que agrega la página. */
const MAX_TITLE = 60
const MAX_DESCRIPTION = 155
const rendered = (title: string) => `${title} | Cambio Uruguay`

const PENDIENTE: AumJub2027 = {
  pct: null,
  provisorioPct: null,
  norma: null,
  fecha: null,
  url: null,
}
const PROVISORIO: AumJub2027 = { ...PENDIENTE, provisorioPct: 10.25 }
const DEFINITIVO: AumJub2027 = {
  pct: 10.48,
  provisorioPct: 10.25,
  norma: 'el Decreto N.º 99/027',
  fecha: '2027-01-29',
  url: 'https://www.bps.gub.uy/99999/ajuste-definitivo-de-jubilaciones-y-pensiones-para-2027.html',
}

/** Todo el texto visible de una guía: título, descripción, secciones, tablas, pasos y FAQ. */
function textoDe(guide: Guide): string {
  const parts: string[] = [guide.title, guide.description]
  for (const s of guide.sections) {
    parts.push(s.heading, s.body)
    for (const row of s.table?.rows ?? []) parts.push(...row)
  }
  for (const step of guide.steps ?? []) parts.push(step.name, step.text)
  for (const faq of guide.faqs ?? []) parts.push(faq.q, faq.a)
  return parts.join('\n')
}

const dias = (desde: string, hasta: string) =>
  Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000)

describe('las constantes salen de la fuente y no de una cuenta', () => {
  it('2026: provisorio 5,72 % y definitivo 5,97 %, anunciado el 30/1/2026', () => {
    expect(AJUSTE_2026_PROVISORIO_PCT).toBe(5.72)
    expect(AJUSTE_PASIVIDADES_2026_PCT).toBe(5.97)
    expect(AJUSTE_2026_ANUNCIADO_EL).toBe('2026-01-30')
  })

  it('2025: 6,13 %, el IMSN de 2024', () => {
    expect(AJUSTE_2025_PCT).toBe(6.13)
    expect(AUMJUB_HISTORIA.map(a => a.anio)).toEqual([2025, 2026])
    expect(AUMJUB_HISTORIA[0]?.imsnEneroNoviembrePct).toBe(5.93)
  })

  it('el provisorio nunca le gana al definitivo en los años verificados', () => {
    for (const anio of AUMJUB_HISTORIA) {
      expect(anio.imsnEneroNoviembrePct).toBeLessThanOrEqual(anio.definitivoPct)
      expect(anio.inePublicoNoviembre < anio.inePublicoDiciembre).toBe(true)
      // El dato de diciembre sale en enero del año del aumento.
      expect(anio.inePublicoDiciembre.startsWith(`${anio.anio}-01-`)).toBe(true)
    }
  })

  it('los 2,32 puntos del BPS son la resta del ajuste y el IPC de 2025', () => {
    expect(AUMJUB_PUNTOS_SOBRE_IPC_2026).toBe(2.32)
  })

  it('la mínima de 2026 es 3,05 BPC y el escalón 3,111 BPC, como publica el BPS', () => {
    expect(JUBILACION_MINIMA_2026).toBe(20935)
    expect(Math.round(AUMJUB_MINIMA_BPC * BPC_2026)).toBe(JUBILACION_MINIMA_2026)
    expect(Math.round(AUMJUB_MINIMA_DIFERENCIAL_BPC * BPC_2026)).toBe(
      AUMJUB_MINIMA_DIFERENCIAL_2026
    )
  })

  it('la tabla de prorrateo tiene los doce meses de 2025, de mayor a menor y cierra en cero', () => {
    expect(AUMJUB_PRORRATEO_2026).toHaveLength(12)
    expect(AUMJUB_PRORRATEO_2026[0]).toEqual({ mes: 'enero de 2025', pct: 2.16 })
    expect(AUMJUB_PRORRATEO_2026.at(-1)).toEqual({ mes: 'diciembre de 2025', pct: 0 })
    for (let i = 1; i < AUMJUB_PRORRATEO_2026.length; i++) {
      expect(AUMJUB_PRORRATEO_2026[i]!.pct).toBeLessThanOrEqual(AUMJUB_PRORRATEO_2026[i - 1]!.pct)
      expect(AUMJUB_PRORRATEO_2026[i]!.pct).toBeLessThan(AJUSTE_PASIVIDADES_2026_PCT)
    }
  })

  it('la referencia del IMSN es un informe real del INE y el IMSN no es el IMS', () => {
    expect(AUMJUB_IMSN_REFERENCIA.mes).toMatch(/^\d{4}-\d{2}$/)
    expect(AUMJUB_IMSN_REFERENCIA.url).toMatch(/^https:\/\/www5\.ine\.gub\.uy\//)
    expect(AUMJUB_IMSN_REFERENCIA.publicadoEl > `${AUMJUB_IMSN_REFERENCIA.mes}-28`).toBe(true)
    expect(AUMJUB_IMSN_REFERENCIA.imsnAcumuladoPct).not.toBe(AUMJUB_IMSN_REFERENCIA.imsAcumuladoPct)
  })

  it('los próximos informes del INE están en orden y después de la referencia', () => {
    const meses = AUMJUB_INE_PROXIMOS.map(p => p.mes)
    expect([...meses].sort()).toEqual(meses)
    for (const p of AUMJUB_INE_PROXIMOS) expect(p.fecha > `${p.mes}-28`).toBe(true)
  })
})

describe('2027 todavía no existe, y eso está escrito así', () => {
  it('las cinco piezas de 2027 son coherentes entre sí', () => {
    expect(AUMJUB_2027).toEqual({
      pct: AJUSTE_2027_PCT,
      provisorioPct: AJUSTE_2027_PROVISORIO_PCT,
      norma: AJUSTE_2027_NORMA,
      fecha: AJUSTE_2027_FECHA,
      url: AJUSTE_2027_URL,
    })
    // La norma y la fecha del definitivo no pueden existir sin el definitivo.
    if (AJUSTE_2027_PCT === null) {
      expect(AJUSTE_2027_NORMA).toBeNull()
      expect(AJUSTE_2027_FECHA).toBeNull()
    }
    if (AJUSTE_2027_FECHA !== null) expect(AJUSTE_2027_FECHA).toMatch(/^2027-\d{2}-\d{2}$/)
    if (AJUSTE_2027_URL !== null) expect(AJUSTE_2027_URL).toMatch(/^https:\/\/www\.(bps|impo)\./)
  })

  it('al día de la verificación, 2027 está pendiente', () => {
    expect(AUMJUB_VERIFIED_AT).toBe('2026-11-22')
    expect(aumJubEstado()).toBe(
      AJUSTE_2027_PCT !== null
        ? 'definitivo'
        : AJUSTE_2027_PROVISORIO_PCT !== null
          ? 'provisorio'
          : 'pendiente'
    )
  })

  // Sin alarmas por fecha: un test que se pone rojo solo un día rompe la CI de todos los PR a la vez.
  // La carga del provisorio, del definitivo y de cada informe nuevo del INE la hacen las rutinas
  // programadas (1/12, 5/1 y 2/2), que leen estas mismas constantes.
  it('la referencia del IMSN es anterior al día de la última revisión de la guía', () => {
    expect(
      dias(AUMJUB_IMSN_REFERENCIA.publicadoEl, aumentoJubilacionesGuide.updatedAt)
    ).toBeGreaterThanOrEqual(0)
    expect(
      dias(AUMJUB_IMSN_REFERENCIA.publicadoEl, aumentoJubilacionesGuide.updatedAt)
    ).toBeLessThanOrEqual(75)
  })
})

describe('los formatos', () => {
  it('porcentajes con coma decimal y espacio, como el BPS', () => {
    expect(formatAumJubPct(5.97)).toBe('5,97 %')
    expect(formatAumJubPct(2.5)).toBe('2,5 %')
    expect(formatAumJubPct(2)).toBe('2 %')
    expect(formatAumJubPct(0, 2)).toBe('0,00 %')
    expect(formatAumJubPct(0.8, 2)).toBe('0,80 %')
  })

  it('pesos con punto de miles', () => {
    expect(formatAumJubUyu(20935)).toBe('$ 20.935')
    expect(formatAumJubUyu(6864)).toBe('$ 6.864')
    expect(formatAumJubUyu(21888.61, 2)).toBe('$ 21.888,61')
  })

  it('fechas como se leen en Uruguay', () => {
    expect(aumJubFecha('2026-07-01')).toBe('1.º de julio de 2026')
    expect(aumJubFecha('2026-09-30')).toBe('30 de setiembre de 2026')
    expect(aumJubFechaCorta('2026-01-30')).toBe('30/1/2026')
    expect(aumJubMes('2026-09')).toBe('setiembre de 2026')
  })

  it('la ventana de doce meses y los meses que faltan salen del mes de referencia', () => {
    expect(aumJubMesesQueFaltan('2026-09')).toBe(3)
    expect(aumJubVentanaDoceMeses('2026-09')).toBe('de octubre de 2025 a setiembre de 2026')
    expect(aumJubVentanaDoceMeses('2026-12')).toBe('de enero de 2026 a diciembre de 2026')
  })
})

describe('la composición condicional: pendiente, provisorio, definitivo', () => {
  const pendiente = buildAumentoJubilacionesGuide(PENDIENTE)
  const provisorio = buildAumentoJubilacionesGuide(PROVISORIO)
  const definitivo = buildAumentoJubilacionesGuide(DEFINITIVO)

  it('el estado sale de las constantes y no de un flag aparte', () => {
    expect(aumJubEstado(PENDIENTE)).toBe('pendiente')
    expect(aumJubEstado(PROVISORIO)).toBe('provisorio')
    expect(aumJubEstado(DEFINITIVO)).toBe('definitivo')
  })

  it.each([
    ['pendiente', PENDIENTE],
    ['provisorio', PROVISORIO],
    ['definitivo', DEFINITIVO],
  ] as const)('%s: título y descripción entran en el SERP', (_estado, state) => {
    const guide = buildAumentoJubilacionesGuide(state)
    expect(rendered(guide.title).length, rendered(guide.title)).toBeLessThanOrEqual(MAX_TITLE)
    expect(guide.description.length, guide.description).toBeLessThanOrEqual(MAX_DESCRIPTION)
    expect(guide.title).toContain('2027')
    expect(guide.title).not.toMatch(/cambio uruguay/i)
  })

  it('pendiente: dice que no hay número y publica la referencia con su mes', () => {
    const texto = textoDe(pendiente)
    expect(pendiente.title).toBe('Jubilaciones 2027: cuánto y cuándo aumentan')
    expect(pendiente.description.startsWith('Todavía no hay cifra')).toBe(true)
    expect(texto).toContain('todavía no existe')
    expect(texto).toContain(formatAumJubPct(AUMJUB_IMSN_REFERENCIA.imsnAcumuladoPct))
    expect(texto).toContain(formatAumJubPct(AUMJUB_IMSN_REFERENCIA.imsnDoceMesesPct))
    expect(texto).toContain(aumJubMes(AUMJUB_IMSN_REFERENCIA.mes))
    expect(texto).toMatch(/no como una promesa/)
    expect(pendiente.sections.some(s => s.heading.startsWith('Qué se sabe hoy'))).toBe(true)
  })

  it('provisorio: el título y la respuesta corta traen el provisorio, no la referencia', () => {
    expect(provisorio.title).toBe('Jubilaciones 2027: 10,25 % provisorio')
    expect(provisorio.sections[0]?.heading).toContain('10,25 %')
    expect(provisorio.sections[0]?.body).toContain('10,25 %')
    expect(provisorio.sections.some(s => s.heading.startsWith('Qué se sabe hoy'))).toBe(false)
    expect(textoDe(provisorio)).not.toContain('todavía no existe')
  })

  it('definitivo: título, respuesta, tabla, FAQ y fuentes cambian sin tocar la prosa', () => {
    const texto = textoDe(definitivo)
    expect(definitivo.title).toBe('Aumento de jubilaciones 2027: 10,48 %')
    expect(definitivo.sections[0]?.heading).toBe('2027: 10,48 %')
    expect(definitivo.sections[0]?.body).toContain('el Decreto N.º 99/027')
    expect(definitivo.sections[0]?.body).toContain('29 de enero de 2027')
    expect(texto).not.toContain('todavía no existe')
    expect(texto).not.toMatch(/Todavía no hay (porcentaje|cifra)/)
    const fila2027 = definitivo.sections
      .map(s => s.table)
      .find(Boolean)
      ?.rows.find(r => r[0] === '2027')
    expect(fila2027).toEqual(['2027', '10,25 %', '10,48 %', 'Diciembre: 29/1/2027'])
    expect(definitivo.faqs?.[0]?.a.startsWith('10,48 %')).toBe(true)
    expect(definitivo.sources?.[0]?.url).toBe(DEFINITIVO.url)
    expect(aumJubSources(DEFINITIVO)).toHaveLength(AUMJUB_SOURCES.length + 1)
  })

  it('las preguntas son las mismas en los tres estados: cambian las respuestas', () => {
    const preguntas = (s: AumJub2027) => aumJubFaq(s).map(f => f.question)
    expect(preguntas(PROVISORIO)).toEqual(preguntas(PENDIENTE))
    expect(preguntas(DEFINITIVO)).toEqual(preguntas(PENDIENTE))
    expect(aumJubFaq(DEFINITIVO)[0]?.answer).not.toBe(aumJubFaq(PENDIENTE)[0]?.answer)
  })

  it('la versión publicada es la de las constantes', () => {
    expect(aumentoJubilacionesGuide).toEqual(buildAumentoJubilacionesGuide(AUMJUB_2027))
  })
})

describe('la guía que se publica', () => {
  const guide = aumentoJubilacionesGuide
  const texto = textoDe(guide)

  it('tiene el slug, la fecha y la etiqueta de la casa', () => {
    expect(guide.slug).toBe(AUMENTO_JUBILACIONES_SLUG)
    expect(guide.slug).toBe('aumento-de-jubilaciones-uruguay')
    expect(guide.updatedAt).toBe('2026-11-22')
    expect(guide.tag).toMatch(/^[A-ZÁÉÍÓÚÑ ]{2,16}$/)
  })

  it('compone las cifras desde las constantes', () => {
    expect(texto).toContain(formatAumJubPct(AJUSTE_PASIVIDADES_2026_PCT))
    expect(texto).toContain(formatAumJubPct(AJUSTE_2026_PROVISORIO_PCT))
    expect(texto).toContain(formatAumJubPct(AJUSTE_2025_PCT))
    expect(texto).toContain(formatAumJubUyu(JUBILACION_MINIMA_2026))
    expect(texto).toContain(formatAumJubUyu(BPC_2026))
  })

  it('nombra el índice correcto y la norma que lo crea', () => {
    expect(texto).toMatch(/Índice Medio de Salarios Nominales/)
    expect(texto).toMatch(/Ley 17\.649/)
    expect(texto).toMatch(/artículo 67 de la Constitución/)
  })

  it('no le inventa una norma al aumento general de 2026', () => {
    // Ni el BPS ni IMPO dan un decreto del 5,97 %: la guía tiene que decirlo y no citar uno.
    expect(texto).toMatch(/no encontramos uno/)
    const queNoPublica = guide.sections.find(s => s.heading === 'Lo que esta guía no publica')
    expect(queNoPublica?.body).toMatch(/corresponden al Poder Ejecutivo/)
  })

  it('las secciones, la tabla y los pasos están completos', () => {
    expect(guide.sections.length).toBeGreaterThanOrEqual(6)
    for (const section of guide.sections) {
      expect(section.heading.trim().length).toBeGreaterThan(0)
      expect(section.body.trim().length).toBeGreaterThan(100)
      if (section.table) {
        for (const row of section.table.rows) {
          expect(row).toHaveLength(section.table.headers.length)
          for (const cell of row) expect(cell.trim().length).toBeGreaterThan(0)
        }
      }
    }
    const prorrateo = guide.sections.find(s => s.heading.includes('jubilaste'))
    expect(prorrateo?.table?.rows).toHaveLength(AUMJUB_PRORRATEO_2026.length)
    expect((guide.steps ?? []).length).toBeGreaterThanOrEqual(4)
    for (const step of guide.steps ?? []) expect(step.text.trim().length).toBeGreaterThan(10)
  })

  it('cada enlace interno apunta a una página que existe', () => {
    const pages = join(__dirname, '..', '..', 'pages')
    const links = [...(guide.related ?? []), ...guide.sections.flatMap(s => s.links ?? [])].map(
      l => l.to
    )
    expect(links.length).toBeGreaterThan(5)
    for (const to of links) {
      expect(to.startsWith('/'), to).toBe(true)
      const slug = to.slice(1)
      const existe = slug.startsWith('guias/')
        ? existsSync(join(pages, 'guias', '[slug].vue'))
        : slug.startsWith('indicadores/')
          ? existsSync(join(pages, 'indicadores', '[indicador].vue'))
          : existsSync(join(pages, `${slug}.vue`)) || existsSync(join(pages, slug, 'index.vue'))
      expect(existe, to).toBe(true)
    }
  })

  it('arrastra las preguntas del catálogo tal cual', () => {
    expect((guide.faqs ?? []).map(f => f.q)).toEqual(AUMJUB_FAQ.map(f => f.question))
    expect((guide.faqs ?? []).map(f => f.a)).toEqual(AUMJUB_FAQ.map(f => f.answer))
  })

  it('las preguntas no se repiten y todas tienen respuesta', () => {
    expect(AUMJUB_FAQ.length).toBeGreaterThanOrEqual(6)
    const questions = AUMJUB_FAQ.map(f => f.question)
    expect(new Set(questions).size).toBe(questions.length)
    for (const item of AUMJUB_FAQ) {
      expect(item.question.trim().endsWith('?')).toBe(true)
      expect(item.answer.trim().length).toBeGreaterThan(40)
    }
  })

  it('las fuentes son oficiales, no se repiten y cubren las normas que se citan', () => {
    const urls = AUMJUB_SOURCES.map(s => s.url)
    expect(new Set(urls).size).toBe(urls.length)
    for (const source of AUMJUB_SOURCES) {
      expect(source.label.trim().length).toBeGreaterThan(0)
      expect(source.url).toMatch(
        /^https:\/\/(www\.bps\.gub\.uy|www\.impo\.com\.uy|www5\.ine\.gub\.uy|www\.gub\.uy\/instituto-nacional-estadistica)\//
      )
    }
    const todas = urls.join(' ')
    for (const fragmento of [
      '/constitucion/1967-1967/67',
      '/leyes/17649-2003',
      '/decretos/188-2020',
      '/decretos/189-2025',
      '/decretos/183-2026',
      '/decretos/213-2026',
      '/decretos/11-2026',
      '/23862/',
      'IMS%20Diciembre%202025',
    ]) {
      expect(todas, fragmento).toContain(fragmento)
    }
    expect((guide.sources ?? []).map(s => s.url)).toEqual(aumJubSources().map(s => s.url))
  })

  it('no publica ninguna cifra de ingresos del sitio ni promete el número de 2027', () => {
    expect(texto).not.toMatch(/RPM|AdSense|ingreso publicitario/i)
    if (AJUSTE_2027_PCT === null) {
      // Ningún «va a ser de X %» ni «aumentará X %» para 2027 mientras no exista el dato.
      expect(texto).not.toMatch(/2027[^.]{0,40}(?:será|va a ser|aumentará) (?:de )?\d/)
    }
  })
})
