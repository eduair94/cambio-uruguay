import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import { guideSlugs } from '../../utils/guides'
import {
  LINKEDIN_EPOCH,
  LINKEDIN_FEED_CACHE_CONTROL,
  LINKEDIN_POSTS,
  LINKEDIN_SEASONAL,
  dollarPost,
  formatPesos,
  joinNames,
  linkedinImageUrl,
  linkedinMessage,
  linkedinPostDate,
  pickLinkedinPost,
  renderLinkedinFeed,
  summarizeUsd,
  wantsUsd,
  type LinkedinPost,
  type LinkedinRateRow,
  type UsdSnapshot,
} from '../../utils/linkedinPosts'

const PAGES = join(__dirname, '..', '..', 'pages')
const GUIDES = new Set(guideSlugs())

function routeExists(path: string): boolean {
  if (path === '/') return true
  const guide = path.match(/^\/guias\/([^/]+)$/)
  if (guide) return GUIDES.has(guide[1]!)
  const rel = path.slice(1)
  return existsSync(join(PAGES, `${rel}.vue`)) || existsSync(join(PAGES, rel, 'index.vue'))
}

const ALL: LinkedinPost[] = [...LINKEDIN_POSTS, ...Object.values(LINKEDIN_SEASONAL)]

// Las marcas que delatan a un texto generado o a un posteo de agencia. El pedido fue "que no suene
// a IA": si un post nuevo trae una de estas, que lo reescriba una persona.
const AI_TELLS: Array<[string, RegExp]> = [
  ['raya (—/–)', /[—–]/],
  ['signo de exclamación', /[¡!]/],
  ['hashtag', /#\w/],
  ['emoji', /\p{Extended_Pictographic}/u],
  ['"sabías que"', /sab[ií]as que/i],
  ['"no es solo/no solo"', /\bno (es )?s[oó]lo\b/i],
  ['"hoy en día"', /hoy en d[ií]a/i],
  ['"en el mundo actual"', /mundo actual/i],
  ['"descubrí/descubre"', /descubr/i],
  ['"te cuento"', /te cuento/i],
  // "clave" como adjetivo ("es clave", "punto clave"); "la clave es gratis" (de una API) no cuenta.
  [
    '"clave" adjetivo',
    /\b(es|son|resulta|punto|factor|papel|aspecto) clave\b|\bclave (para|en)\b/i,
  ],
  ['"fundamental/crucial"', /\b(fundamental|crucial|imprescindible)\b/i],
  ['"potenciar"', /potenci/i],
  ['"sin duda"', /sin duda/i],
  ['"en resumen/en conclusión"', /en (resumen|conclusi[oó]n)/i],
  ['"aquí" (acá se dice acá)', /\baqu[ií]\b/i],
]

describe('banco de posts de LinkedIn', () => {
  it('cada id es único', () => {
    const ids = ALL.map(p => p.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('cada post enlaza a una ruta que existe', () => {
    const missing = ALL.filter(p => !routeExists(p.path)).map(p => `${p.id} → ${p.path}`)
    expect(missing).toEqual([])
  })

  it.each(ALL.map(p => [p.id, p] as const))('%s no trae marcas de texto generado', (_id, post) => {
    const hits = AI_TELLS.filter(([, re]) => re.test(post.text)).map(([label]) => label)
    expect(hits).toEqual([])
  })

  it.each(LINKEDIN_POSTS.map(p => [p.id, p] as const))(
    '%s no trae montos ni porcentajes que envejecen',
    (_id, post) => {
      expect(post.text).not.toMatch(/\$|%|US\$|U\$S/)
    }
  )

  it.each(ALL.map(p => [p.id, p] as const))('%s tiene forma de post de LinkedIn', (_id, post) => {
    const text = post.text
    expect(text.length).toBeGreaterThanOrEqual(150)
    expect(text.length).toBeLessThanOrEqual(900)
    expect(text).not.toMatch(/https?:\/\//) // la URL la agrega `linkedinMessage`
    expect(text).not.toMatch(/\n{3,}/)
    expect(text).toBe(text.trim())
    // LinkedIn corta con "ver más" cerca de los 210 caracteres: la primera línea es el gancho.
    expect(text.split('\n')[0]!.length).toBeLessThanOrEqual(210)
  })

  it('alcanza para más de seis semanas sin repetir', () => {
    expect(LINKEDIN_POSTS.length).toBeGreaterThanOrEqual(42)
  })
})

describe('linkedinPostDate', () => {
  it('cambia de post a las 9 de Montevideo (12:00 UTC)', () => {
    expect(linkedinPostDate(new Date('2026-11-16T11:59:00Z'))).toBe('2026-11-15')
    expect(linkedinPostDate(new Date('2026-11-16T12:00:00Z'))).toBe('2026-11-16')
  })

  it('cruza el fin de mes y de año', () => {
    expect(linkedinPostDate(new Date('2027-01-01T05:00:00Z'))).toBe('2026-12-31')
  })
})

const SNAP: UsdSnapshot = {
  cheapestSell: 40.93,
  cheapestNames: ['Prex'],
  bestBuy: 40.4,
  bestBuyNames: ['Cambio Fénix'],
  brouSell: 41.7,
  sampleSize: 30,
}

describe('pickLinkedinPost', () => {
  it('el día de inicio sale el primer post de la rotación', () => {
    expect(pickLinkedinPost(LINKEDIN_EPOCH, null).id).toBe(LINKEDIN_POSTS[0]!.id)
  })

  it('la rotación da la vuelta y también funciona antes del inicio', () => {
    const len = LINKEDIN_POSTS.length
    const day = (n: number) =>
      new Date(Date.parse(`${LINKEDIN_EPOCH}T12:00:00Z`) + n * 86_400_000)
        .toISOString()
        .slice(0, 10)
    const firstNonMonday = [0, 1, 2].find(n => !wantsUsd(day(n)))!
    expect(pickLinkedinPost(day(firstNonMonday + len), null).id).toBe(
      pickLinkedinPost(day(firstNonMonday), null).id
    )
    expect(pickLinkedinPost(day(-1), null).id).toBe(LINKEDIN_POSTS[len - 1]!.id)
  })

  it('el lunes con datos sale el dólar; sin datos, el post de la rotación', () => {
    expect(wantsUsd('2026-11-16')).toBe(true)
    expect(pickLinkedinPost('2026-11-16', SNAP).id).toBe('dolar-lunes')
    expect(pickLinkedinPost('2026-11-16', null).id).not.toBe('dolar-lunes')
  })

  it('un día que no es lunes ignora los datos del dólar', () => {
    expect(wantsUsd('2026-11-17')).toBe(false)
    expect(pickLinkedinPost('2026-11-17', SNAP).id).not.toBe('dolar-lunes')
  })

  it('la temporada gana sobre todo lo demás', () => {
    expect(pickLinkedinPost('2026-12-12', SNAP).id).toBe('aguinaldo-diciembre')
    expect(pickLinkedinPost('2027-06-20', null).id).toBe('aguinaldo-junio')
  })
})

const row = (
  origin: string,
  buy: number,
  sell: number,
  extra: Partial<LinkedinRateRow> = {}
): LinkedinRateRow => ({
  origin,
  code: 'USD',
  type: '',
  buy,
  sell,
  date: '2026-11-16T03:00:00.000Z',
  ...extra,
})

// Forma real del 12/11/2026: una casa con la pizarra quieta hace 120 días era "la más barata".
const ROWS: LinkedinRateRow[] = [
  row('baluma_cambio', 37.15, 39.55),
  row('prex', 40.12, 40.93),
  row('fortex', 39.95, 41.1),
  row('cambial', 40, 41.1),
  row('cambio_fenix', 40.4, 41.35),
  row('oca', 39.6, 41.4),
  row('indumex', 39.3, 41.7),
  row('cambio_3', 39.4, 41.6),
  row('brou', 39.3, 41.7),
  row('itau', 39.1, 41.8),
  row('santander', 38.65, 42.3),
  row('cambio_pernas', 39.3, 41.8),
  row('bcu', 41, 41.2),
  row('brou', 39.5, 41.5, { type: 'EBROU' }),
  row('cambio_pando', 39.5, 41.5, { code: 'EUR' }),
]
const NAMES = {
  prex: { name: 'Prex' },
  cambio_fenix: { name: 'Cambio Fénix' },
  brou: { name: 'BROU' },
}
const NOW = new Date('2026-11-16T12:30:00Z')
const FROZEN = new Set(['baluma_cambio|USD|'])

describe('summarizeUsd', () => {
  it('saca las pizarras quietas, el BCU y las cotizaciones especiales', () => {
    const s = summarizeUsd(ROWS, NAMES, FROZEN, NOW)!
    expect(s.cheapestSell).toBe(40.93)
    expect(s.cheapestNames).toEqual(['Prex'])
    expect(s.bestBuy).toBe(40.4)
    expect(s.bestBuyNames).toEqual(['Cambio Fénix'])
    expect(s.brouSell).toBe(41.7)
    expect(s.sampleSize).toBe(11)
  })

  it('sin el reporte de pizarras quietas no afirma nada', () => {
    expect(summarizeUsd(ROWS, NAMES, null, NOW)).toBeNull()
  })

  it('con pocas casas no afirma nada', () => {
    expect(summarizeUsd(ROWS.slice(0, 6), NAMES, FROZEN, NOW)).toBeNull()
  })

  it('descarta filas viejas', () => {
    const stale = ROWS.map(r =>
      r.origin === 'prex' ? { ...r, date: '2026-11-01T03:00:00.000Z' } : r
    )
    expect(summarizeUsd(stale, NAMES, FROZEN, NOW)!.cheapestSell).toBe(41.1)
  })

  it('un arbitraje gratis es un dato roto', () => {
    const broken = [...ROWS, row('cambio_raro', 41.5, 41.9)]
    expect(summarizeUsd(broken, NAMES, FROZEN, NOW)).toBeNull()
  })

  it('una "más barata" muy por debajo del BROU es una coma corrida', () => {
    const comma = [...ROWS, row('cambio_coma', 3.0, 4.1)]
    expect(summarizeUsd(comma, NAMES, FROZEN, NOW)).toBeNull()
  })

  it('los empates se nombran ordenados, con el nombre de la casa si lo hay', () => {
    const tie = ROWS.filter(r => r.origin !== 'prex')
    const s = summarizeUsd([...tie, row('cambio_zeta', 39, 41.2)], NAMES, FROZEN, NOW)!
    expect(s.cheapestNames).toEqual(['Cambial', 'Fortex'])
    // Sin nombre registrado, la clave se vuelve legible en vez de salir cruda.
    const unnamed = summarizeUsd(ROWS, {}, FROZEN, NOW)!
    expect(unnamed.bestBuyNames).toEqual(['Cambio Fenix'])
  })
})

describe('dollarPost', () => {
  it('formatea a la uruguaya y calcula la diferencia sobre mil dólares', () => {
    const text = [0, 1, 2].map(w => dollarPost(SNAP, w).text)
    for (const t of text) {
      expect(t).toContain('$ 40,93')
      expect(t).toContain('Prex')
      expect(t).toContain('$ 41,70')
      expect(t).toContain('$ 770')
      for (const [label, re] of AI_TELLS) expect(re.test(t), label).toBe(false)
    }
    expect(new Set(text).size).toBe(3)
  })

  it('sin BROU, o con una diferencia chica, no compara contra el BROU', () => {
    const t = dollarPost({ ...SNAP, brouSell: 40.95 }, 0).text
    expect(t).not.toContain('BROU')
    expect(t).toContain('Cambio Fénix')
    expect(dollarPost({ ...SNAP, brouSell: null }, 1).text).not.toContain('BROU')
  })

  it('formatPesos y joinNames', () => {
    expect(formatPesos(1050)).toBe('1.050')
    expect(formatPesos(769.9999)).toBe('770')
    expect(joinNames(['A'])).toBe('A')
    expect(joinNames(['A', 'B'])).toBe('A y B')
    expect(joinNames(['A', 'B', 'C'])).toBe('A, B y otras')
  })
})

describe('renderLinkedinFeed', () => {
  const post: LinkedinPost = {
    id: 'x',
    path: '/guias/algo',
    text: 'Uno & <dos>\n\nTres ]]> cuatro:',
  }
  const xml = renderLinkedinFeed('2026-11-17', post, NOW)

  it('un ítem por día, con guid de fecha y hora de publicación 9 de Montevideo', () => {
    expect(xml.match(/<item>/g)).toHaveLength(1)
    expect(xml).toContain('<guid isPermaLink="false">cambio-uruguay-linkedin-2026-11-17</guid>')
    expect(xml).toContain('<pubDate>Tue, 17 Nov 2026 12:00:00 GMT</pubDate>')
  })

  it('el mensaje lleva la URL al pie y no rompe el XML', () => {
    expect(xml).toContain('<title>Uno &amp; &lt;dos&gt;</title>')
    expect(xml).toContain('<link>https://cambio-uruguay.com/guias/algo</link>')
    expect(xml).toContain(
      'Tres ]]]]><![CDATA[> cuatro:\nhttps://cambio-uruguay.com/guias/algo]]></description>'
    )
  })

  it('ofrece la OG image de la ruta para "Share an update with image"', () => {
    expect(xml).toContain('url="https://cambio-uruguay.com/__og-image__/image/guias/algo/og.png"')
    expect(linkedinImageUrl('/')).toBe('https://cambio-uruguay.com/__og-image__/image/og.png')
  })

  it('un texto que no termina en dos puntos deja una línea en blanco antes de la URL', () => {
    expect(linkedinMessage({ id: 'y', path: '/', text: 'Hola.' })).toBe(
      'Hola.\n\nhttps://cambio-uruguay.com/'
    )
  })
})

describe('LINKEDIN_FEED_CACHE_CONTROL', () => {
  // 12/11/2026 17:01 UTC: el origen se trabó dos minutos (97 respuestas 499/503 en todo el sitio) e
  // IFTTT cortó la consulta del feed por timeout. El borde tiene que poder contestar con la copia
  // que ya tiene mientras el origen no responde.
  it('deja que el borde sirva la copia guardada si el origen tarda o falla', () => {
    expect(LINKEDIN_FEED_CACHE_CONTROL).toMatch(/\bs-maxage=\d+/)
    expect(LINKEDIN_FEED_CACHE_CONTROL).toMatch(/\bstale-while-revalidate=\d+/)
    expect(LINKEDIN_FEED_CACHE_CONTROL).toMatch(/\bstale-if-error=\d+/)
  })

  it('no prohíbe servir una copia vieja', () => {
    // must-revalidate le prohíbe a TODA caché usar una respuesta vencida sin revalidar.
    expect(LINKEDIN_FEED_CACHE_CONTROL).not.toMatch(
      /must-revalidate|proxy-revalidate|no-cache|no-store|private/
    )
  })
})
