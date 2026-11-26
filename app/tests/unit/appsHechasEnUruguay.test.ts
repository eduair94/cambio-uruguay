// /apps-hechas-en-uruguay: la lista editorial de proyectos de desarrolladores uruguayos. Vigila la
// forma del módulo de datos, las reglas de privacidad que nacieron con él (ningún usuario de Reddit,
// ningún perfil personal de GitHub, ninguna persona como "quien la publica") y que la página dibuje
// ESE módulo, con los `rel` que se decidieron para cada tipo de enlace.
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  HECHAS_EN_UY,
  HECHAS_EN_UY_CATEGORIES,
  HECHAS_EN_UY_FAQ,
  HECHAS_EN_UY_PLATFORM_ICONS,
  HECHAS_EN_UY_PLATFORM_LABELS,
  HECHAS_EN_UY_THREAD,
  HECHAS_EN_UY_VERIFIED_AT,
  hechasEnUyByCategory,
  hechasEnUyLinks,
  hechasEnUyOriginLine,
  hechasEnUyShortName,
  hechasEnUyWithStore,
} from '../../utils/appsHechasEnUruguay'
import { USEFUL_APPS } from '../../utils/usefulAppsCatalog'

const APP = join(__dirname, '..', '..')
const MODULE_SRC = readFileSync(join(APP, 'utils', 'appsHechasEnUruguay.ts'), 'utf8')
const PAGE_SRC = readFileSync(join(APP, 'pages', 'apps-hechas-en-uruguay.vue'), 'utf8')
const UTILES_SRC = readFileSync(join(APP, 'pages', 'apps-utiles-uruguay.vue'), 'utf8')

const TRACKING = /[?&](?:utm_[a-z]+|ref|referral|aff|fbclid|gclid)=/i
const REDDIT_HANDLE = /(?:^|[^\dA-Z])u\/[\w-]+|reddit\.com\/(?:user|u)\//i
const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

/**
 * Quién puede aparecer como "lo publica": sólo marcas u organizaciones que el propio proyecto
 * declara. Las dos apps de tienda (Carpincho, Clara) figuran en la tienda a nombre de personas, así
 * que no llevan `publisher` — agregar uno exige pasar por esta lista a propósito.
 */
const PUBLISHERS_ALLOWED: Record<string, string> = {
  'your-starry-map': 'YourStarryMap, según sus términos',
  'python-social-auth': 'la organización Python Social Auth, en GitHub',
  // La página del juego se titula «… | Mateína» y lo llama «Juego original de Mateína».
  'mapa-en-clave': 'Mateína, según su web',
}

/**
 * Quién puede decir algo más fuerte que «su web no dice de dónde es». Cada entrada se agregó después
 * de leer la frase en la fuente (el archivo de investigación guarda la URL y la cita):
 * - Carpincho: «Hecha por uruguayos, para uruguayos» (superapp.uy) y «Hecha por uruguayos» (App Store).
 * - GymApp: sus términos (gymapp.live/terminos) dan un domicilio en Montevideo y la ley uruguaya.
 * - Clara: el bloque del desarrollador de su ficha de Google Play dice Punta del Este, Uruguay.
 * - Luce y Kiosko.uy: sus webs buscan en «tiendas de Uruguay» o son para «comercios de Uruguay» y no dicen quién
 *   las hace: eso es `para-uruguay`, nunca `hecha-por-uruguayos`.
 * - El mapa en clave (25/11/2026): su web dice «Mateína · Noticias y entretenimiento de Uruguay» y no
 *   dice quién la hace; el propio mensaje con que la mandaron pidió no dar por acreditado de dónde
 *   son sus desarrolladores. `para-uruguay`.
 * Subir una entrada de escalón exige pasar por esta lista a propósito.
 */
const ORIGIN_ALLOWED: Record<string, readonly string[]> = {
  'hecha-por-uruguayos': ['carpincho'],
  'domicilio-en-uruguay': ['gymapp', 'clara-bienestar-digital'],
  'para-uruguay': ['luce', 'kiosko', 'mapa-en-clave'],
}

/** Por dónde llegó un proyecto que no dice quién lo hace: el hilo o la invitación de la página. */
const ARRIVED_BY = /r\/CharruaDevs|invitación de esta página/

/** El único GitHub que la página puede enlazar: la organización, nunca un perfil personal. */
const GITHUB_ALLOWED = ['https://github.com/python-social-auth']

function urlsOf(item: (typeof HECHAS_EN_UY)[number]): string[] {
  return [item.url, item.docs, item.source, item.originSource].filter((u): u is string =>
    Boolean(u)
  )
}

describe('módulo de apps hechas en Uruguay', () => {
  it('ids en kebab-case y únicos', () => {
    const ids = HECHAS_EN_UY.map(item => item.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const id of ids) expect(id).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  })

  it('cada enlace es https y sin parámetros de seguimiento', () => {
    for (const item of HECHAS_EN_UY) {
      for (const url of urlsOf(item)) {
        expect(url.startsWith('https://'), `${item.id}: ${url}`).toBe(true)
        expect(TRACKING.test(url), `${item.id}: ${url}`).toBe(false)
        expect(() => new URL(url)).not.toThrow()
      }
    }
    expect(HECHAS_EN_UY_THREAD.url.startsWith('https://www.reddit.com/r/CharruaDevs/')).toBe(true)
  })

  it('cada proyecto se puede abrir: web propia o ficha de tienda', () => {
    for (const item of HECHAS_EN_UY) {
      expect(Boolean(item.url || item.android || item.ios), item.id).toBe(true)
      const { site, stores } = hechasEnUyLinks(item)
      expect(site.length + stores.length, item.id).toBeGreaterThan(0)
    }
  })

  it('verifiedAt es una fecha ISO no posterior al día de la revisión', () => {
    expect(HECHAS_EN_UY_VERIFIED_AT).toMatch(ISO_DAY)
    expect(HECHAS_EN_UY_THREAD.date).toMatch(ISO_DAY)
    expect(HECHAS_EN_UY_THREAD.date <= HECHAS_EN_UY_VERIFIED_AT).toBe(true)
    for (const item of HECHAS_EN_UY) {
      expect(item.verifiedAt, item.id).toMatch(ISO_DAY)
      expect(item.verifiedAt <= HECHAS_EN_UY_VERIFIED_AT, item.id).toBe(true)
      expect(item.verifiedAt >= HECHAS_EN_UY_THREAD.date, item.id).toBe(true)
    }
  })

  it('cada categoría tiene proyectos y cada proyecto una categoría que existe', () => {
    const ids = HECHAS_EN_UY_CATEGORIES.map(c => c.id) as string[]
    for (const item of HECHAS_EN_UY) expect(ids, item.id).toContain(item.category)
    for (const id of ids) {
      expect(
        HECHAS_EN_UY.some(item => item.category === id),
        id
      ).toBe(true)
    }
    const grouped = hechasEnUyByCategory()
    expect(grouped.map(g => g.category.id)).toEqual(ids)
    expect(grouped.flatMap(g => g.items).length).toBe(HECHAS_EN_UY.length)
  })

  it('"qué hace" es de una o dos frases y cierra con punto; precio y nota, igual', () => {
    for (const item of HECHAS_EN_UY) {
      expect(item.what.length, item.id).toBeGreaterThanOrEqual(40)
      expect(item.what.length, item.id).toBeLessThanOrEqual(260)
      expect(item.what.endsWith('.'), item.id).toBe(true)
      for (const extra of [item.price, item.note]) {
        if (extra === undefined) continue
        expect(extra.trim().length, item.id).toBeGreaterThan(0)
        expect(extra.endsWith('.'), item.id).toBe(true)
      }
      if (item.publisher !== undefined) expect(item.publisher.trim().length).toBeGreaterThan(0)
    }
  })

  it('las plataformas tienen etiqueta e ícono, y una ficha de tienda trae su plataforma', () => {
    for (const item of HECHAS_EN_UY) {
      expect(item.platforms.length, item.id).toBeGreaterThan(0)
      for (const p of item.platforms) {
        expect(HECHAS_EN_UY_PLATFORM_LABELS[p], `${item.id}: ${p}`).toBeTruthy()
        expect(HECHAS_EN_UY_PLATFORM_ICONS[p], `${item.id}: ${p}`).toMatch(/^mdi-[a-z0-9-]+$/)
      }
      if (item.android) {
        expect(item.android.id, item.id).toMatch(/^[A-Z]\w*(\.\w+)+$/i)
        expect(item.platforms, item.id).toContain('android')
      }
      if (item.ios) {
        expect(item.ios.id, item.id).toMatch(/^\d{6,12}$/)
        expect(item.platforms, item.id).toContain('ios')
      }
      if (item.platforms.includes('android')) expect(item.android, item.id).toBeTruthy()
      if (item.platforms.includes('ios')) expect(item.ios, item.id).toBeTruthy()
    }
  })

  it('los botones de tienda se arman con los ayudantes de apps útiles, no con URL pegadas', () => {
    const carpincho = HECHAS_EN_UY.find(item => item.id === 'carpincho')!
    const { stores } = hechasEnUyLinks(carpincho)
    expect(stores.map(s => s.href)).toEqual([
      'https://play.google.com/store/apps/details?id=com.carpincho.app',
      'https://apps.apple.com/uy/app/id6759762265',
    ])
    for (const item of HECHAS_EN_UY) {
      for (const link of [...hechasEnUyLinks(item).site, ...hechasEnUyLinks(item).stores]) {
        expect(link.icon).toMatch(/^mdi-[a-z0-9-]+$/)
        expect(link.ariaLabel).toContain(item.name)
      }
    }
  })

  it('cada tarjeta dice de dónde sale lo de "hecho en Uruguay"', () => {
    for (const item of HECHAS_EN_UY) {
      const line = hechasEnUyOriginLine(item)
      expect(line, item.id).toBe(item.origin)
      expect(line.length, item.id).toBeGreaterThan(10)
      expect(line.endsWith('.'), item.id).toBe(true)
      // Ni direcciones ni teléfonos: la fuente de GymApp y la de Clara traen los dos.
      expect(line, item.id).not.toMatch(/\d/)
    }
  })

  it('el escalón de origen sólo lo tienen las entradas cuya fuente lo dice', () => {
    for (const item of HECHAS_EN_UY) {
      if (item.uruguayBy === 'hilo') continue
      expect(ORIGIN_ALLOWED[item.uruguayBy], `${item.id}: ${item.uruguayBy}`).toContain(item.id)
    }
    for (const [origin, ids] of Object.entries(ORIGIN_ALLOWED)) {
      for (const id of ids) {
        expect(HECHAS_EN_UY.find(item => item.id === id)?.uruguayBy, id).toBe(origin)
      }
    }
  })

  it('la línea de origen afirma sólo lo que su escalón permite', () => {
    const CLAIMS_MADE_HERE = /la hacen uruguayos|hech[oa] en uruguay|es uruguay[oa]/i
    for (const item of HECHAS_EN_UY) {
      const line = item.origin
      switch (item.uruguayBy) {
        case 'hecha-por-uruguayos':
          expect(line, item.id).toMatch(/uruguayos/)
          break
        case 'domicilio-en-uruguay':
          expect(line, item.id).toMatch(/Uruguay/)
          expect(line, item.id).toMatch(/términos|ficha/)
          break
        case 'para-uruguay':
          expect(line, item.id).toMatch(/de Uruguay/)
          expect(line, item.id).toMatch(/no dice quién/)
          expect(line, item.id).not.toMatch(CLAIMS_MADE_HERE)
          expect(line, item.id).toMatch(ARRIVED_BY)
          break
        case 'hilo':
          expect(line, item.id).toMatch(/no dice de dónde es/)
          expect(line, item.id).not.toMatch(CLAIMS_MADE_HERE)
          expect(line, item.id).toContain('r/CharruaDevs')
          break
      }
    }
  })

  it('una entrada sin web nunca habla de «su web»', () => {
    for (const item of HECHAS_EN_UY) {
      if (item.url) continue
      for (const text of [item.origin, item.note ?? '', item.price ?? '']) {
        expect(text, item.id).not.toMatch(/\bweb\b/i)
      }
    }
  })

  it('un origen leído fuera de `source` guarda de dónde (GymApp: sus términos)', () => {
    const gym = HECHAS_EN_UY.find(item => item.id === 'gymapp')!
    expect(gym.originSource).toBe('https://gymapp.live/terminos')
  })
})

describe('privacidad y etiqueta de Reddit', () => {
  it('ningún usuario de Reddit en el módulo ni en la página', () => {
    for (const [name, src] of [
      ['módulo', MODULE_SRC],
      ['página', PAGE_SRC],
    ] as const) {
      expect(REDDIT_HANDLE.test(src), name).toBe(false)
    }
    const serialized = JSON.stringify({ HECHAS_EN_UY, HECHAS_EN_UY_FAQ, HECHAS_EN_UY_THREAD })
    expect(REDDIT_HANDLE.test(serialized)).toBe(false)
  })

  it('la única URL de reddit.com es la del hilo', () => {
    const redditUrls = MODULE_SRC.match(/https?:\/\/[^\s'"`]*reddit\.com[^\s'"`]*/g) ?? []
    expect(redditUrls).toEqual([HECHAS_EN_UY_THREAD.url])
    expect(PAGE_SRC).not.toMatch(/reddit\.com/)
  })

  it('el único GitHub es la organización de Python Social Auth', () => {
    const githubUrls = [MODULE_SRC, PAGE_SRC].flatMap(
      src => src.match(/https:\/\/github\.com\/[^\s'"`]*/g) ?? []
    )
    for (const url of githubUrls) {
      const owner = url.replace(/^https:\/\/github\.com\//, '').split('/')[0]
      expect(
        GITHUB_ALLOWED.map(u => u.split('/')[3]),
        url
      ).toContain(owner)
    }
  })

  it('"lo publica" sólo con las marcas permitidas, nunca una persona', () => {
    for (const item of HECHAS_EN_UY) {
      expect(item.publisher, item.id).toBe(PUBLISHERS_ALLOWED[item.id])
    }
    for (const id of ['carpincho', 'clara-bienestar-digital']) {
      expect(HECHAS_EN_UY.find(item => item.id === id)?.publisher).toBeUndefined()
    }
  })

  it('las respuestas que nombran proyectos salen del módulo, no de una lista a mano', () => {
    const queApps = HECHAS_EN_UY_FAQ.find(faq => faq.id === 'que-apps')!.answer
    const sonGratis = HECHAS_EN_UY_FAQ.find(faq => faq.id === 'son-gratis')!.answer
    for (const item of HECHAS_EN_UY) {
      const short = hechasEnUyShortName(item)
      expect(queApps, item.id).toContain(`${short}, ${item.tagline}`)
      expect(sonGratis, item.id).toContain(short)
      if (item.price) expect(sonGratis, item.id).toContain(item.price.slice(1))
    }
    for (const category of HECHAS_EN_UY_CATEGORIES) expect(queApps).toContain(`${category.label}:`)
    // Lo que no publica precio se dice; no se le inventa «gratis».
    for (const item of HECHAS_EN_UY.filter(i => !i.price)) {
      expect(sonGratis).toMatch(new RegExp(`${hechasEnUyShortName(item)}[^.]*no publica`))
    }
    expect(hechasEnUyShortName(HECHAS_EN_UY.find(i => i.id === 'clara-bienestar-digital')!)).toBe(
      'Clara'
    )
  })

  it('las preguntas frecuentes son texto plano sin enlaces crudos', () => {
    for (const faq of HECHAS_EN_UY_FAQ) {
      expect(faq.answer).not.toMatch(/https?:\/\/|<[a-z]/i)
      expect(faq.question.endsWith('?'), faq.id).toBe(true)
    }
  })
})

describe('la página dibuja el módulo', () => {
  it('importa el módulo y no lleva una lista escrita a mano', () => {
    expect(PAGE_SRC).toMatch(/from '~\/utils\/appsHechasEnUruguay'/)
    expect(PAGE_SRC).toMatch(/v-for="item in group\.items"/)
    for (const item of HECHAS_EN_UY) expect(PAGE_SRC).not.toContain(item.what)
  })

  it('los enlaces al proyecto llevan sólo noopener; los de tienda, los de apps útiles', () => {
    const rels = [...PAGE_SRC.matchAll(/\srel="([^"]+)"/g)].map(m => m[1])
    expect(rels.length).toBeGreaterThan(0)
    for (const rel of rels) {
      expect(['noopener', 'noopener noreferrer nofollow'], rel).toContain(rel)
    }
    const siteBlock = PAGE_SRC.slice(
      PAGE_SRC.indexOf('linksOf(item).site"'),
      PAGE_SRC.indexOf('linksOf(item).stores"')
    )
    expect(siteBlock).toMatch(/rel="noopener"/)
    expect(siteBlock).not.toMatch(/nofollow|noreferrer/)
    expect(PAGE_SRC).toMatch(/const threadLink = \{[^}]*rel: 'noopener' \}/)
    const storeBlock = PAGE_SRC.slice(PAGE_SRC.indexOf('linksOf(item).stores"'))
    expect(storeBlock.slice(0, 400)).toMatch(/rel="noopener noreferrer nofollow"/)
  })

  it('los nombres de los proyectos no se traducen', () => {
    expect(PAGE_SRC).toMatch(/class="ah-card__name" translate="no"/)
  })

  it('enlaza a apps útiles, y apps útiles le devuelve el enlace', () => {
    expect(PAGE_SRC).toContain("localePath('/apps-utiles-uruguay')")
    expect(UTILES_SRC).toContain("localePath('/apps-hechas-en-uruguay')")
  })

  it('invita a mandar una app por el buzón que ya existe, sin backend nuevo', () => {
    expect(PAGE_SRC).toMatch(/id="manda-tu-app"/)
    expect(PAGE_SRC).toMatch(/<FeedbackForm embedded lock-kind initial-kind="suggestion"/)
  })

  it('las cifras de la cabecera salen del módulo y el párrafo no pretende listar todo', () => {
    expect(PAGE_SRC).toContain(':note="`en ${groups.length} categorías`"')
    expect(PAGE_SRC).not.toMatch(/en \d+ categorías/)
    const start = PAGE_SRC.indexOf('<p class="ah-lead">')
    const lead = PAGE_SRC.slice(start, PAGE_SRC.indexOf('</p>', start))
    expect(lead).toContain('{{ HECHAS_EN_UY.length }}')
    expect(lead).toContain('{{ groups.length }} categorías')
    expect(lead).toMatch(/entre ellas/)
    // Los tres que el párrafo describe siguen en la lista.
    for (const id of ['luce', 'carpincho', 'kiosko']) {
      expect(
        HECHAS_EN_UY.some(item => item.id === id),
        id
      ).toBe(true)
    }
  })

  it('el "seis más" de la descripción es lo que queda después de nombrar tres', () => {
    const description = PAGE_SRC.match(/const description =\s*'([^']+)'/)?.[1] ?? ''
    expect(description).toContain('y seis más')
    expect(HECHAS_EN_UY.length - 3).toBe(6)
    for (const named of ['Luce', 'Subtitio', 'Kiosko']) {
      expect(description).toContain(named)
      expect(HECHAS_EN_UY.some(item => item.name.startsWith(named))).toBe(true)
    }
    // Abre con un proyecto que no compite con el sitio.
    expect(description.startsWith('Carpincho')).toBe(false)
  })

  it('el JSON-LD lista los proyectos y no inventa nodos de software ni un FAQPage', () => {
    expect(PAGE_SRC).toContain("'@type': 'BreadcrumbList'")
    expect(PAGE_SRC).toContain("'@type': 'ItemList'")
    expect(PAGE_SRC).not.toMatch(
      /'@type': '(?:SoftwareApplication|WebApplication|MobileApplication|FAQPage)'|aggregateRating/
    )
  })
})

describe('regla de /apps-utiles-uruguay', () => {
  it('un proyecto no está en las dos listas: si cumple la regla de apps útiles, va allá', () => {
    const utilesIds = new Set(USEFUL_APPS.map(app => app.id))
    const utilesPackages = new Set(USEFUL_APPS.map(app => app.android?.id).filter(Boolean))
    for (const item of HECHAS_EN_UY) {
      expect(utilesIds.has(item.id), item.id).toBe(false)
      if (item.android) expect(utilesPackages.has(item.android.id), item.id).toBe(false)
    }
  })

  it('cuenta bien las que tienen ficha de tienda', () => {
    expect(hechasEnUyWithStore()).toBe(HECHAS_EN_UY.filter(i => i.android || i.ios).length)
  })
})
