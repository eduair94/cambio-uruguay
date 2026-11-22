import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { guideSectionIds } from '../../utils/guideReading'
import { usuarioBpsGuide } from '../../utils/guideVeranoUsuarioBps'
import { getGuide, guides } from '../../utils/guides'
import {
  DGI_IDENTITIES,
  IDUY_METHODS,
  IDUY_RAISE_LEVEL,
  UBPS_ACTIVATION_LINK_DAYS,
  UBPS_ACTIVATION_STEPS,
  UBPS_ADULT_REQUIREMENTS,
  UBPS_APP_FEATURES,
  UBPS_EXTERNAL_AGENTS,
  UBPS_FAQ,
  UBPS_GAPS,
  UBPS_MINOR_ALONE_OVER_AGE,
  UBPS_PASSWORD_MIN_CHARS,
  UBPS_RESET_LINK_HOURS,
  UBPS_ROUTES,
  UBPS_SERVICES,
  UBPS_SMS_CODE_DAYS,
  UBPS_SMS_CODE_MAX_REQUESTS,
  UBPS_SOURCES,
  UBPS_VERIFIED_AT,
} from '../../utils/usuarioBps'

const SLUG = 'usuario-personal-bps-uruguay'
const guide = usuarioBpsGuide

/** Todo el texto que el lector ve: título, descripción, secciones, tablas, pasos y preguntas. */
const visibleText = () =>
  [
    guide.title,
    guide.description,
    ...guide.sections.flatMap(s => [s.heading, s.body, ...(s.table?.rows.flat() ?? [])]),
    ...(guide.steps ?? []).flatMap(s => [s.name, s.text]),
    ...(guide.faqs ?? []).flatMap(f => [f.q, f.a]),
  ].join('\n')

describe('las constantes salen de la fuente y no de una cuenta', () => {
  it('fija los plazos de la activación (BPS 18292)', () => {
    expect(UBPS_ACTIVATION_LINK_DAYS).toBe(30)
    expect(UBPS_SMS_CODE_DAYS).toBe(10)
    expect(UBPS_SMS_CODE_MAX_REQUESTS).toBe(3)
  })

  it('fija el enlace de restablecimiento y el largo de la contraseña (formulario del BPS)', () => {
    expect(UBPS_RESET_LINK_HOURS).toBe(24)
    expect(UBPS_PASSWORD_MIN_CHARS).toBe(10)
  })

  it('fija la edad de los menores que van solos (BPS 11444)', () => {
    expect(UBPS_MINOR_ALONE_OVER_AGE).toBe(15)
  })

  it('nombra los agentes externos que la ficha vigente nombra, y sólo esos', () => {
    expect([...UBPS_EXTERNAL_AGENTS]).toEqual(['Abitab', 'Red Pagos', 'ANDA'])
  })

  it('pide las tres cosas de la ficha para un mayor de edad', () => {
    expect(UBPS_ADULT_REQUIREMENTS).toHaveLength(3)
    const texto = UBPS_ADULT_REQUIREMENTS.join(' ')
    expect(texto).toMatch(/cédula/i)
    expect(texto).toMatch(/correo/i)
    expect(texto).toMatch(/celular/i)
  })

  it('la fecha de lectura es una fecha ISO real', () => {
    expect(UBPS_VERIFIED_AT).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(Date.parse(UBPS_VERIFIED_AT))).toBe(false)
  })
})

describe('la activación', () => {
  it('tiene los cinco pasos de la ficha y sólo el 2 y el 3 dependen del celular uruguayo', () => {
    expect(UBPS_ACTIVATION_STEPS).toHaveLength(5)
    expect(UBPS_ACTIVATION_STEPS.map(s => s.onlyUruguayanPhone)).toEqual([
      false,
      true,
      true,
      false,
      false,
    ])
  })

  it('los pasos llevan los plazos de las constantes, no un literal aparte', () => {
    const texto = UBPS_ACTIVATION_STEPS.map(s => s.text).join(' ')
    expect(texto).toContain(`${UBPS_ACTIVATION_LINK_DAYS} días`)
    expect(texto).toContain(`${UBPS_SMS_CODE_DAYS} días`)
    expect(texto).toContain(`hasta ${UBPS_SMS_CODE_MAX_REQUESTS} veces`)
  })
})

describe('las vías por condición', () => {
  it('cubre cada condición de la ficha una sola vez', () => {
    const condiciones = UBPS_ROUTES.map(r => r.condicion)
    expect([...condiciones].sort()).toEqual(
      ['apoderado', 'exterior', 'extranjero', 'mayor', 'menor', 'tercero'].sort()
    )
    for (const route of UBPS_ROUTES) {
      expect(route.quien.trim().length).toBeGreaterThan(0)
      expect(route.donde.trim().length).toBeGreaterThan(0)
      expect(route.que.trim().length).toBeGreaterThan(20)
    }
  })

  it('los menores, los apoderados y los terceros van sólo al BPS, como dice la ficha', () => {
    for (const condicion of ['menor', 'apoderado', 'tercero'] as const) {
      const route = UBPS_ROUTES.find(r => r.condicion === condicion)
      expect(route?.donde, condicion).toMatch(/sucursales del BPS/i)
      for (const agent of UBPS_EXTERNAL_AGENTS) expect(route?.donde).not.toContain(agent)
    }
  })

  it('el mayor de edad puede ir a los tres agentes externos', () => {
    const mayor = UBPS_ROUTES.find(r => r.condicion === 'mayor')
    for (const agent of UBPS_EXTERNAL_AGENTS) expect(mayor?.donde).toContain(agent)
  })
})

describe('ID Uruguay', () => {
  it('el nivel básico es el único que no alcanza para el BPS', () => {
    const noAlcanzan = IDUY_METHODS.filter(m => !m.alcanzaParaBps)
    expect(noAlcanzan.map(m => m.nivel)).toEqual(['Básico'])
    expect(IDUY_METHODS.filter(m => m.nivel === 'Intermedio').every(m => m.alcanzaParaBps)).toBe(
      true
    )
  })

  it('publica las tres formas de elevar el Usuario gub.uy, con la videollamada primero', () => {
    expect(IDUY_RAISE_LEVEL).toHaveLength(3)
    expect(IDUY_RAISE_LEVEL[0]).toMatch(/videollamada/i)
    expect(IDUY_RAISE_LEVEL[1]).toMatch(/firma digital/i)
    expect(IDUY_RAISE_LEVEL[2]).toMatch(/en persona/i)
  })

  it('la DGI acepta cuatro identidades y el Usuario personal BPS no es una', () => {
    expect(DGI_IDENTITIES).toHaveLength(4)
    expect(DGI_IDENTITIES.join(' ')).not.toMatch(/usuario personal/i)
  })
})

describe('el contenido que la guía publica', () => {
  it('las fuentes son todas oficiales y no se repiten', () => {
    expect(UBPS_SOURCES.length).toBeGreaterThanOrEqual(10)
    for (const source of UBPS_SOURCES) {
      expect(source.label.trim().length).toBeGreaterThan(0)
      expect(source.publisher.trim().length).toBeGreaterThan(0)
      expect(source.url).toMatch(
        /^https:\/\/((www|serviciosenlinea|scp)\.bps\.gub\.uy|www\.gub\.uy|mi\.iduruguay\.gub\.uy|play\.google\.com\/store\/apps\/details\?id=uy\.gub\.bps\.)/
      )
    }
    const urls = UBPS_SOURCES.map(s => s.url)
    expect(new Set(urls).size).toBe(urls.length)
  })

  it('cita la ficha del trámite y la de la activación, que sostienen los plazos', () => {
    const urls = UBPS_SOURCES.map(s => s.url).join(' ')
    expect(urls).toContain('bps.gub.uy/11444/')
    expect(urls).toContain('bps.gub.uy/18292/')
  })

  it('las preguntas no se repiten y todas tienen respuesta', () => {
    expect(UBPS_FAQ.length).toBeGreaterThanOrEqual(8)
    const questions = UBPS_FAQ.map(f => f.question)
    expect(new Set(questions).size).toBe(questions.length)
    for (const item of UBPS_FAQ) {
      expect(item.question.trim().startsWith('¿') || /\?$/.test(item.question.trim())).toBe(true)
      expect(item.question.trim().endsWith('?')).toBe(true)
      expect(item.answer.trim().length).toBeGreaterThan(40)
    }
  })

  it('no publica ningún importe: ni el BPS ni los locales publican un costo', () => {
    // Ni pesos ni dólares ni unidades indexadas. La única cifra que esta guía puede afirmar es un
    // plazo o un largo de contraseña, y eso ya lo fijan las constantes con su test.
    expect(visibleText()).not.toMatch(/\$|USD|U\$S|unidades? indexadas?|\bUI\b|\bUR\b/)
  })

  it('declara los huecos en vez de rellenarlos', () => {
    expect(UBPS_GAPS.length).toBeGreaterThanOrEqual(3)
    const texto = UBPS_GAPS.join(' ')
    expect(texto).toMatch(/cuesta/i)
    expect(texto).toMatch(/bloquean/i)
    const ultima = guide.sections.at(-1)
    for (const gap of UBPS_GAPS) expect(ultima?.body).toContain(gap)
  })

  it('las listas que la prosa enumera no están vacías', () => {
    expect(UBPS_SERVICES.length).toBeGreaterThanOrEqual(5)
    expect(UBPS_APP_FEATURES.length).toBeGreaterThanOrEqual(5)
  })
})

describe('la guía que compone este catálogo', () => {
  it('tiene el slug, la etiqueta y la fecha que se pidieron', () => {
    expect(guide.slug).toBe(SLUG)
    expect(guide.tag).toBe('BPS')
    expect(guide.updatedAt).toBe('2026-11-22')
  })

  it('el título entra en el SERP con la marca puesta y no la trae él', () => {
    // Mismo criterio que `guideSnippetBudget.test.ts`: la página arma «<título> | Cambio Uruguay».
    expect(`${guide.title} | Cambio Uruguay`.length).toBeLessThanOrEqual(60)
    expect(guide.title).not.toMatch(/cambio uruguay/i)
  })

  it('la descripción entra en el SERP y arranca por la respuesta', () => {
    expect(guide.description.length).toBeLessThanOrEqual(155)
    expect(guide.description).toMatch(/^En persona/)
    for (const agent of UBPS_EXTERNAL_AGENTS) expect(guide.description).toContain(agent)
  })

  it('ni el título ni la descripción repiten los de otra guía del catálogo', () => {
    const otras = guides.filter(g => g.slug !== SLUG)
    expect(otras.map(g => g.title.trim())).not.toContain(guide.title.trim())
    expect(otras.map(g => g.description.trim())).not.toContain(guide.description.trim())
  })

  it('usa el catálogo en vez de repetir sus cifras', () => {
    const cuerpo = guide.sections.map(s => s.body).join(' ')
    expect(cuerpo).toContain(`${UBPS_ACTIVATION_LINK_DAYS} días`)
    expect(cuerpo).toContain(`${UBPS_RESET_LINK_HOURS} horas`)
    expect(cuerpo).toContain(`${UBPS_PASSWORD_MIN_CHARS} caracteres`)
    expect(cuerpo).toContain('22 de noviembre de 2026')
  })

  it('publica la tabla de vías con una fila por condición, y la de ID Uruguay con una por método', () => {
    const tablas = guide.sections.map(s => s.table).filter(Boolean)
    expect(tablas).toHaveLength(2)
    expect(tablas[0]?.rows).toHaveLength(UBPS_ROUTES.length)
    expect(tablas[1]?.rows).toHaveLength(IDUY_METHODS.length)
    for (const tabla of tablas) {
      expect(tabla!.headers.length).toBeGreaterThan(1)
      for (const row of tabla!.rows) {
        expect(row).toHaveLength(tabla!.headers.length)
        for (const cell of row) expect(cell.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('es un trámite: publica los pasos para el HowTo', () => {
    expect((guide.steps ?? []).length).toBeGreaterThanOrEqual(5)
    for (const step of guide.steps ?? []) {
      expect(step.name.trim().length).toBeGreaterThan(0)
      expect(step.text.trim().length).toBeGreaterThan(10)
    }
  })

  it('arrastra las preguntas y las fuentes del catálogo tal cual', () => {
    expect((guide.faqs ?? []).map(f => f.q)).toEqual(UBPS_FAQ.map(f => f.question))
    expect((guide.sources ?? []).map(s => s.url)).toEqual(UBPS_SOURCES.map(s => s.url))
  })

  it('cada sección tiene un ancla propia', () => {
    const ids = guideSectionIds(guide.sections)
    expect(new Set(ids).size).toBe(guide.sections.length)
    expect(ids.every(id => /^guia-[a-z0-9-]+$/.test(id))).toBe(true)
  })

  it('cada enlace interno apunta a una página o a una guía que existe', () => {
    const PAGES = join(__dirname, '..', '..', 'pages')
    const links = [...guide.sections.flatMap(s => s.links ?? []), ...(guide.related ?? [])]
    expect(links.length).toBeGreaterThan(0)
    for (const link of links) {
      expect(link.label.trim().length).toBeGreaterThan(0)
      expect(link.to.startsWith('/')).toBe(true)
      expect(link.to).not.toBe(`/guias/${SLUG}`)
      if (link.to.startsWith('/guias/')) {
        expect(getGuide(link.to.slice('/guias/'.length)), link.to).toBeDefined()
      } else {
        const page = join(PAGES, `${link.to.slice(1)}.vue`)
        const index = join(PAGES, link.to.slice(1), 'index.vue')
        expect(existsSync(page) || existsSync(index), link.to).toBe(true)
      }
    }
  })

  it('si ya está en el catálogo, es este mismo objeto', () => {
    // La integración en `utils/guides.ts` la hace otro commit. Hasta entonces la guía no está en
    // el catálogo, y cuando entre tiene que ser ésta y no una copia que pueda separarse.
    const enCatalogo = getGuide(SLUG)
    if (enCatalogo) expect(enCatalogo).toBe(guide)
  })
})
