import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ANDA_CARENCIA,
  ANDA_CUOTA_AFILIADOS_DESDE,
  ANDA_CUOTA_FUNEBRE,
  ANDA_CUOTA_VIGENCIA,
  ANDA_RUBROS_MONTEVIDEO,
  BPS_GASTOS_COMPLEMENTARIOS_TOPE,
  BPS_PARTIDA_VIGENCIA_DIAS,
  BPS_SUBSIDIO_PLAZO_DIAS,
  BPS_SUBSIDIO_TOPE,
  BPS_SUBSIDIO_VIGENCIA,
  CANELONES_FICTO_FOSA,
  CANELONES_FICTO_NICHO,
  CANELONES_PCT_FOSA,
  CANELONES_PCT_NICHO,
  CANELONES_TARIFAS,
  CANELONES_VIGENCIA_DESDE,
  INSCRIPCION_DIAS_HABILES,
  INSCRIPCION_DIAS_HABILES_RURAL,
  LICENCIA_DUELO,
  MVD_CREMACION_GRATIS_HASTA_ANOS,
  MVD_CREMACION_HORAS_MINIMAS,
  MVD_SERVICIO_GRATUITO,
  MVD_TARIFAS,
  MVD_TASA_ANUAL_NICHO_UI,
  MVD_TUBULAR_YEARS,
  PARTIDA_MANUSCRITA_COMUN,
  PARTIDA_MANUSCRITA_URGENTE,
  SEPELIO_FAQ,
  SEPELIO_REVIEW_BY,
  SEPELIO_SOURCES,
  SEPELIO_UI_VALUE,
  SEPELIO_UI_VALUE_AT,
  SEPELIO_VERIFIED_AT,
  canelonesTarifa,
  fechaUy,
  miles,
  mvdTarifa,
  sepelioPesos,
  sepelioUi,
  uiEnPesos,
} from '../../utils/costoSepelio'
import { costoSepelioGuide as guide } from '../../utils/guideVeranoCostoSepelio'
import { guides } from '../../utils/guides'
import { trabajoBpsGuides } from '../../utils/guidesTrabajoBps'

const SLUG = 'cuanto-cuesta-un-sepelio-uruguay'
const BPS_SLUG = 'subsidio-expensas-funerarias-bps-uruguay'
const PAGES_DIR = join(__dirname, '..', '..', 'pages')

/** Espejo del `<title>` de `pages/guias/[slug].vue` (ver `guideSnippetBudget.test.ts`). */
const rendered = (title: string) => `${title} | Cambio Uruguay`

/** Todo el texto que el lector ve: título, descripción, secciones, tablas, pasos y preguntas. */
const visibleText = (): string =>
  [
    guide.title,
    guide.description,
    ...guide.sections.flatMap(s => [s.heading, s.body, ...(s.table?.rows.flat() ?? [])]),
    ...(guide.steps ?? []).flatMap(s => [s.name, s.text]),
    ...(guide.faqs ?? []).flatMap(f => [f.q, f.a]),
  ].join('\n')

/** Una ruta del sitio existe si es una página de `pages/` o una guía del catálogo. */
function routeExists(route: string): boolean {
  if (route.startsWith('/guias/')) {
    const slug = route.slice('/guias/'.length)
    return guides.some(g => g.slug === slug) || slug === SLUG
  }
  if (route.startsWith('/indicadores/'))
    return existsSync(join(PAGES_DIR, 'indicadores', '[indicador].vue'))
  const base = join(PAGES_DIR, ...route.split('/').filter(Boolean))
  return existsSync(`${base}.vue`) || existsSync(join(base, 'index.vue'))
}

describe('el formato no depende de ICU', () => {
  it('escribe pesos, UI y fechas como el resto del sitio', () => {
    expect(miles(11544)).toBe('11.544')
    expect(miles(132)).toBe('132')
    expect(sepelioPesos(44716)).toBe('$ 44.716')
    expect(sepelioUi(1720)).toBe('1.720 UI')
    expect(fechaUy('2026-07-01')).toBe('1/7/2026')
    expect(fechaUy('2026-11-22')).toBe('22/11/2026')
  })

  it('un id de tarifa mal escrito tira en vez de publicar vacío', () => {
    expect(() => mvdTarifa('no-existe')).toThrow()
    expect(() => canelonesTarifa('no-existe')).toThrow()
  })
})

describe('Montevideo: las tarifas son las del Digesto, en UI', () => {
  it('fija cada tarifa en la cifra textual de la norma', () => {
    const porId = Object.fromEntries(MVD_TARIFAS.map(row => [row.id, row.ui]))
    expect(porId).toEqual({
      'inhumacion-fosa': 1070,
      'inhumacion-local': 750,
      'cremacion-cadaver': 1720,
      'cremacion-en-vida': 1040,
      'cremacion-restos': 750,
      'reduccion-fosa': 1410,
      arrendamiento: 550,
      prorroga: 900,
      urnario: 1420,
      traslado: 750,
    })
  })

  it('cada fila cita su artículo y no repite id', () => {
    const ids = MVD_TARIFAS.map(row => row.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const row of MVD_TARIFAS) {
      expect(row.concepto.trim().length).toBeGreaterThan(0)
      expect(row.norma).toMatch(/^Arts?\. /)
    }
  })

  it('convierte a pesos con la UI del INE del día de la lectura', () => {
    expect(SEPELIO_UI_VALUE).toBe(6.7119)
    expect(SEPELIO_UI_VALUE_AT).toBe('2026-11-22')
    expect(uiEnPesos(1720)).toBe(11544)
    expect(uiEnPesos(1070)).toBe(7182)
    expect(uiEnPesos(550)).toBe(3692)
  })

  it('fija la tasa anual de un nicho por cementerio y los plazos de la norma', () => {
    expect(MVD_TASA_ANUAL_NICHO_UI).toEqual({
      Central: 400,
      Buceo: 400,
      'Paso Molino': 370,
      Cerro: 300,
      Norte: 300,
    })
    expect(MVD_TUBULAR_YEARS).toBe(2)
    expect(MVD_CREMACION_HORAS_MINIMAS).toBe(24)
    expect(MVD_CREMACION_GRATIS_HASTA_ANOS).toBe(5)
  })

  it('el servicio gratuito lista lo que comprende y a quién está destinado', () => {
    expect(MVD_SERVICIO_GRATUITO.incluye).toHaveLength(4)
    expect(MVD_SERVICIO_GRATUITO.prestaciones).toHaveLength(5)
    expect(MVD_SERVICIO_GRATUITO.edadMenores).toBe(18)
    expect(MVD_SERVICIO_GRATUITO.salas).toHaveLength(2)
    expect(MVD_SERVICIO_GRATUITO.telefono).toBe('1950')
  })
})

describe('Canelones: la planilla del segundo semestre de 2026', () => {
  it('la tasa de sepultura es el porcentaje del ficto que dice la ordenanza', () => {
    expect(CANELONES_FICTO_FOSA).toBe(30900)
    expect(CANELONES_FICTO_NICHO).toBe(59200)
    expect(canelonesTarifa('inhumacion-fosa').uyu).toBe(
      (CANELONES_FICTO_FOSA * CANELONES_PCT_FOSA) / 100
    )
    expect(canelonesTarifa('inhumacion-nicho').uyu).toBe(
      (CANELONES_FICTO_NICHO * CANELONES_PCT_NICHO) / 100
    )
  })

  it('fija cremación, nicho, urnario y cenizario en la cifra de la planilla', () => {
    expect(canelonesTarifa('cremacion').uyu).toBe(3082)
    expect(canelonesTarifa('nicho-anual').uyu).toBe(11243)
    expect(canelonesTarifa('urnario').uyu).toBe(3990)
    expect(canelonesTarifa('cenizario').uyu).toBe(3188)
    expect(CANELONES_VIGENCIA_DESDE).toBe('2026-07-01')
  })

  it('cada fila explica qué es la cifra', () => {
    const ids = CANELONES_TARIFAS.map(row => row.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const row of CANELONES_TARIFAS) expect(row.nota.trim().length).toBeGreaterThan(5)
  })
})

describe('el BPS, ANDA y los trámites', () => {
  it('fija los topes del BPS al 1/1/2026 y sus dos plazos', () => {
    expect(BPS_SUBSIDIO_TOPE).toBe(44716)
    expect(BPS_GASTOS_COMPLEMENTARIOS_TOPE).toBe(22358)
    expect(BPS_SUBSIDIO_VIGENCIA).toBe('2026-01-01')
    expect(BPS_SUBSIDIO_PLAZO_DIAS).toBe(180)
    expect(BPS_PARTIDA_VIGENCIA_DIAS).toBe(30)
  })

  it('la guía del subsidio publica los mismos topes que esta', () => {
    // `guidesTrabajoBps.ts` los escribe a mano. Si un ajuste de enero toca una de las dos guías y
    // no la otra, el sitio publicaría dos topes distintos para el mismo subsidio.
    const bps = trabajoBpsGuides.find(g => g.slug === BPS_SLUG)
    expect(bps, `falta la guía ${BPS_SLUG}`).toBeDefined()
    expect(bps!.description).toContain(sepelioPesos(BPS_SUBSIDIO_TOPE))
    const filas = bps!.sections.flatMap(s => s.table?.rows ?? [])
    expect(filas.flat()).toContain(sepelioPesos(BPS_SUBSIDIO_TOPE))
    expect(filas.flat()).toContain(sepelioPesos(BPS_GASTOS_COMPLEMENTARIOS_TOPE))
  })

  it('fija la cuota de ANDA con su fecha y la carencia de menor a mayor', () => {
    expect(ANDA_CUOTA_FUNEBRE).toBe(132)
    expect(ANDA_CUOTA_VIGENCIA).toBe('2026-07-01')
    expect(ANDA_CUOTA_AFILIADOS_DESDE).toBe('2015-06-01')
    expect(ANDA_CARENCIA.map(c => c.meses)).toEqual([6, 12, 24])
    expect(ANDA_RUBROS_MONTEVIDEO.length).toBeGreaterThanOrEqual(10)
  })

  it('fija los plazos del Registro Civil, las partidas y la licencia por duelo', () => {
    expect(INSCRIPCION_DIAS_HABILES).toBe(10)
    expect(INSCRIPCION_DIAS_HABILES_RURAL).toBe(20)
    expect(PARTIDA_MANUSCRITA_COMUN).toBe(153)
    expect(PARTIDA_MANUSCRITA_URGENTE).toBe(612)
    expect(LICENCIA_DUELO.dias).toBe('3 días hábiles')
    expect(LICENCIA_DUELO.articulo).toBe(7)
  })

  it('declara cuándo hay que releer las cifras en pesos', () => {
    // No es una alarma por fecha: un test que se pone rojo solo un día rompe la CI de todos los PR
    // a la vez. La relectura la hace la rutina de febrero de 2027 (ajuste de pasividades), que
    // también revisa el tope del BPS y la planilla de Canelones.
    expect(SEPELIO_VERIFIED_AT).toBe('2026-11-22')
    expect(SEPELIO_REVIEW_BY > SEPELIO_VERIFIED_AT).toBe(true)
  })
})

describe('la guía que compone este catálogo', () => {
  const text = visibleText()

  it('tiene la forma de una guía del catálogo', () => {
    expect(guide.slug).toBe(SLUG)
    expect(guide.updatedAt).toBe('2026-11-22')
    expect(guide.tag).toMatch(/^[A-ZÁÉÍÓÚÑ ]{3,14}$/)
    expect(guide.sections.length).toBeGreaterThanOrEqual(6)
    for (const section of guide.sections) {
      expect(section.heading.trim().length).toBeGreaterThan(0)
      expect(section.body.trim().length).toBeGreaterThan(200)
    }
    for (const step of guide.steps ?? []) expect(step.text.trim().length).toBeGreaterThan(10)
  })

  it('el título entra en el SERP con la marca y la descripción en 155 caracteres', () => {
    expect(rendered(guide.title).length).toBeLessThanOrEqual(60)
    expect(guide.description.length).toBeLessThanOrEqual(155)
    expect(guide.description.length).toBeGreaterThan(110)
    expect(guide.title).not.toMatch(/cambio uruguay/i)
  })

  it('el título y la descripción contestan con la cifra de la norma', () => {
    const cremar = sepelioUi(mvdTarifa('cremacion-cadaver').ui)
    expect(guide.title).toContain(cremar)
    expect(guide.description).toContain(cremar)
    expect(guide.description).toContain(sepelioUi(mvdTarifa('inhumacion-fosa').ui))
  })

  it('no repite el título ni la descripción de ninguna otra guía', () => {
    const otras = guides.filter(g => g.slug !== SLUG)
    expect(otras.some(g => g.title.trim() === guide.title.trim())).toBe(false)
    expect(otras.some(g => g.description.trim() === guide.description.trim())).toBe(false)
  })

  it('publica la tabla de Montevideo con una fila por tarifa y su conversión', () => {
    const tabla = guide.sections.find(s => s.heading.includes('Montevideo'))?.table
    expect(tabla?.rows.length).toBe(MVD_TARIFAS.length)
    for (const [i, row] of MVD_TARIFAS.entries()) {
      expect(tabla?.rows[i]).toEqual([
        row.concepto,
        sepelioUi(row.ui),
        sepelioPesos(uiEnPesos(row.ui)),
        row.norma,
      ])
    }
    expect(tabla?.headers.join(' ')).toContain(fechaUy(SEPELIO_UI_VALUE_AT))
  })

  it('publica la tabla de Canelones con una fila por tasa', () => {
    const tabla = guide.sections.find(s => s.heading.includes('Canelones'))?.table
    expect(tabla?.rows.length).toBe(CANELONES_TARIFAS.length)
    for (const row of CANELONES_TARIFAS) {
      expect(tabla?.rows.some(cells => cells.includes(sepelioPesos(row.uyu)))).toBe(true)
    }
    for (const row of tabla?.rows ?? []) expect(row).toHaveLength(tabla!.headers.length)
  })

  it('cada monto en pesos que publica sale de una constante', () => {
    // Las empresas fúnebres no publican precios, así que un monto que no esté en esta lista sería
    // un precio escrito a mano o sacado de la prensa, que es justo lo que la guía no publica.
    const permitidos = new Set(
      [
        ...MVD_TARIFAS.map(row => uiEnPesos(row.ui)),
        ...CANELONES_TARIFAS.map(row => row.uyu),
        CANELONES_FICTO_FOSA,
        CANELONES_FICTO_NICHO,
        BPS_SUBSIDIO_TOPE,
        BPS_GASTOS_COMPLEMENTARIOS_TOPE,
        ANDA_CUOTA_FUNEBRE,
        PARTIDA_MANUSCRITA_COMUN,
        PARTIDA_MANUSCRITA_URGENTE,
      ].map(sepelioPesos)
    )
    const montos = text.match(/\$\s?\d{1,3}(?:\.\d{3})*/g) ?? []
    expect(montos.length).toBeGreaterThan(0)
    for (const monto of montos) expect(permitidos.has(monto), monto).toBe(true)
  })

  it('cada cifra en UI que publica sale de una constante', () => {
    const permitidas = new Set(
      [...MVD_TARIFAS.map(row => row.ui), ...Object.values(MVD_TASA_ANUAL_NICHO_UI)].map(sepelioUi)
    )
    const cifras = text.match(/\d{1,3}(?:\.\d{3})* UI\b/g) ?? []
    expect(cifras.length).toBeGreaterThan(0)
    for (const cifra of cifras) expect(permitidas.has(cifra), cifra).toBe(true)
  })

  it('no publica promedios ni rangos de prensa', () => {
    expect(text).not.toMatch(/promedio|en general cuesta|suele costar|alrededor de \$/i)
  })

  it('enlaza la guía del subsidio en vez de repetirla', () => {
    const links = [...guide.sections.flatMap(s => s.links ?? []), ...(guide.related ?? [])].map(
      l => l.to
    )
    expect(links).toContain(`/guias/${BPS_SLUG}`)
    // La explicación del trámite vive allá: acá no se repiten sus preguntas.
    const bps = trabajoBpsGuides.find(g => g.slug === BPS_SLUG)!
    const suyas = new Set((bps.faqs ?? []).map(f => f.q.trim()))
    for (const faq of guide.faqs ?? []) expect(suyas.has(faq.q.trim()), faq.q).toBe(false)
  })

  it('cada enlace interno apunta a una página o guía que existe', () => {
    const links = [...guide.sections.flatMap(s => s.links ?? []), ...(guide.related ?? [])]
    expect(links.length).toBeGreaterThan(5)
    for (const link of links) {
      expect(link.label.trim().length).toBeGreaterThan(0)
      expect(link.to.startsWith('/')).toBe(true)
      expect(routeExists(link.to), link.to).toBe(true)
    }
  })

  it('arrastra las preguntas del catálogo tal cual', () => {
    expect((guide.faqs ?? []).map(f => f.q)).toEqual(SEPELIO_FAQ.map(f => f.question))
    const questions = SEPELIO_FAQ.map(f => f.question)
    expect(new Set(questions).size).toBe(questions.length)
    for (const item of SEPELIO_FAQ) {
      expect(item.question.trim().endsWith('?')).toBe(true)
      expect(item.answer.trim().length).toBeGreaterThan(40)
    }
  })

  it('arrastra las fuentes del catálogo tal cual, todas https y sin repetir', () => {
    expect((guide.sources ?? []).map(s => s.url)).toEqual(SEPELIO_SOURCES.map(s => s.url))
    const urls = SEPELIO_SOURCES.map(s => s.url)
    expect(new Set(urls).size).toBe(urls.length)
    for (const source of SEPELIO_SOURCES) {
      expect(source.url).toMatch(/^https:\/\//)
      expect(source.label.trim().length).toBeGreaterThan(0)
      expect(source.publisher.trim().length).toBeGreaterThan(0)
    }
  })

  it('cada tarifa pública tiene su norma oficial entre las fuentes', () => {
    const urls = SEPELIO_SOURCES.map(s => s.url).join(' ')
    expect(urls).toContain('normativa.montevideo.gub.uy/content/a2101')
    expect(urls).toContain('imcanelones.gub.uy')
    expect(urls).toContain('bps.gub.uy/3494')
    expect(urls).toContain('ine.gub.uy')
    expect(urls).toContain('impo.com.uy/bases/leyes/18345-2008/7')
  })
})
