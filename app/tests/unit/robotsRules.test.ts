import { matchPathToRule, normalizeGroup } from '@nuxtjs/robots/util'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { PREFIXED_LOCALE_CODES } from '../../utils/locales'

// @nuxtjs/sitemap checks EVERY sitemap URL against the robots rules (getPathRobotConfig), one
// rule at a time, and the module's matcher allocates an array per rule. With `autoI18n` the
// module copied each rule under the 35 locale prefixes: 776 rules in the wildcard group, measured
// at 41–47 s of synchronous CPU per 10.000 URLs — the site worker answered nothing else while a
// sitemap was being built (2026-11-06: a used-car advert took 10–74 s, es-ES.xml answered 524).
// One `/*/…` rule per path says the same thing to every crawler that reads robots.txt.

type Group = { userAgent: string[]; allow?: string[]; disallow?: string[] }
let robots: { autoI18n?: unknown; allow: string[]; disallow: string[]; groups: Group[] }

beforeAll(async () => {
  vi.stubGlobal('defineNuxtConfig', (value: unknown) => value)
  try {
    robots = ((await import('../../nuxt.config')).default as unknown as { robots: typeof robots })
      .robots
  } finally {
    vi.unstubAllGlobals()
  }
})

const groups = () => [
  normalizeGroup({ userAgent: ['*'], allow: robots.allow, disallow: robots.disallow }),
  ...robots.groups.map(group => normalizeGroup(group)),
]
const blocked = (group: ReturnType<typeof normalizeGroup>, path: string) => {
  const rule = matchPathToRule(path, group._rules)
  return Boolean(rule && !rule.allow)
}
const underEveryLocale = (path: string) => [
  path,
  ...PREFIXED_LOCALE_CODES.map(code => `/${code}${path}`),
]

// Pages that answer in every locale (compactRoutes) and must never be crawled.
const PRIVATE_PAGES = [
  '/estadisticas-de-busqueda',
  '/estadisticas-por-pagina',
  '/estadisticas-de-uso',
  '/opinion-alquileres',
  '/opiniones-alquileres',
  '/contactos-comerciales',
  '/ranking-usuarios-charruadevs',
]
const PUBLIC_PATHS = [
  '/',
  '/autos-usados-uruguay',
  '/autos-usados-uruguay/precios/chevrolet-onix',
  '/autos-usados-uruguay/hasta-10000-dolares',
  '/alquileres-uruguay',
  '/guias/como-comprar-dolares',
  '/historico',
  '/casa/brou',
  '/sucursales',
  '/desarrolladores',
  '/avanzado',
  '/estadisticas-del-sitio',
  '/opiniones',
  '/api-docs',
  '/_nuxt/entry.js',
  // `/*/estadisticas-de-busqueda` also prefixes the private page's own chunk; a public page's
  // chunk must stay fetchable, or Google renders that page without its styles.
  '/_nuxt/estadisticas-del-sitio.C10v4Roa.css',
  '/_nuxt/autos-usados-uruguay.BfV47F8x.js',
]

describe('robots.txt rules', () => {
  it('are not multiplied by the locales: every rule is written once', () => {
    expect(robots.autoI18n).toBe(false)
  })

  // The ceiling is the measured problem (776 rules), not a target: each private page costs two
  // rules (`/x` and `/*/x`) and 26 was the 24 of 2026-11-06 plus /estadisticas-de-uso (2026-11-20).
  // 29 adds the advert comparison with a selection (2026-11-21) and the API block with its open-data
  // exception (`/api/` + `/api/datos/`, 2026-11-22): still two orders of magnitude under 776.
  // A prefix shared by two private pages (`/estadisticas-de-`) would fit under 24, but it would also
  // block any future public `/estadisticas-de-…` page in silence, so each one keeps its own line.
  it('keep the wildcard group small enough to test every sitemap URL against', () => {
    const [wildcard] = groups()
    expect(wildcard._rules.length).toBeLessThanOrEqual(29)
    for (const group of groups()) expect(group._rules.length).toBeLessThanOrEqual(29)
  })

  // Clarity's bot activity, 2026-11-21: 4.390 bot requests to /api/ in one day, mostly AhrefsBot,
  // Applebot and OpenAI. The engines that RENDER pages keep the API (a blocked call is a part of the
  // page indexed empty); everyone keeps the open data.
  it('close the site API to crawlers that do not render pages, never to Googlebot or Bingbot', () => {
    const [wildcard, ai, renderers] = groups()
    const api = ['/api/rentals/zone-profile', '/api/branches', '/api/rentals']
    for (const group of [wildcard, ai]) {
      expect(api.filter(path => !blocked(group, path))).toEqual([])
      expect(blocked(group, '/api/datos/alquileres')).toBe(false)
    }
    const agents = (group: { userAgent: string[] }) => group.userAgent.map(ua => ua.toLowerCase())
    expect(agents(renderers)).toEqual(expect.arrayContaining(['googlebot', 'bingbot']))
    expect(agents(ai)).not.toContain('bingbot')
    expect(api.filter(path => blocked(renderers, path))).toEqual([])
    expect(blocked(renderers, '/api/datos/alquileres')).toBe(false)
    // The search-engine group still gets every private page and the seller phone.
    const privateOpen = PRIVATE_PAGES.filter(path => !blocked(renderers, path))
    expect(privateOpen).toEqual([])
    expect(blocked(renderers, '/api/cars/contact/ml-MLU1')).toBe(true)
  })

  it('block each private page, bare and under every locale prefix', () => {
    const [wildcard] = groups()
    const open = PRIVATE_PAGES.flatMap(underEveryLocale)
      .flatMap(path => [path, `${path}/`])
      .filter(path => !blocked(wildcard, path))
    expect(open).toEqual([])
  })

  it('block admin, server internals and the seller phone in every group', () => {
    for (const group of groups()) {
      const open = [
        ...underEveryLocale('/admin/'),
        ...underEveryLocale('/server/x'),
        '/api/cars/contact/ml-MLU1',
      ].filter(path => !blocked(group, path))
      expect(open).toEqual([])
    }
    expect(blocked(groups()[0], '/api-reference')).toBe(true)
  })

  // A used-car advert is noindex in every language and expires within weeks. Since every page
  // answers in every locale, ClaudeBot alone asked for 3.729 translated adverts on 2026-11-06
  // (none the day before), each one a full SSR. The Spanish advert stays crawlable: noindex,
  // follow is how its links reach the model pages.
  it('keep crawlers out of the translated used-car adverts, and only those', () => {
    for (const group of groups()) {
      const adverts = ['/autos-usados-uruguay/fb-1561585904936621', '/autos-usados-uruguay/ml-MLU1']
      const open = adverts
        .flatMap(path => PREFIXED_LOCALE_CODES.map(code => `/${code}${path}`))
        .filter(path => !blocked(group, path))
      expect(open).toEqual([])
      expect(adverts.filter(path => blocked(group, path))).toEqual([])
      // `/*/autos-usados-uruguay/` also prefixes the share cards of the directory and the model
      // pages: social crawlers read the wildcard group (caught on the access log, 2026-11-06).
      const cards = [
        '/__og-image__/image/autos-usados-uruguay/og.png',
        '/__og-image__/image/en/autos-usados-uruguay/og.png',
        '/__og-image__/image/fr/autos-usados-uruguay/precios/chevrolet-onix/og.png',
      ]
      expect(cards.filter(path => blocked(group, path))).toEqual([])
    }
  })

  // Every car card links to a comparison of its own advert (`?autos=<key>`, noindex): one URL per
  // advert for crawlers to fetch. The selection is closed, the bare comparison page is not.
  it('keep crawlers out of the advert comparisons with a selection, not out of the page', () => {
    for (const group of groups()) {
      expect(blocked(group, '/autos-usados-uruguay/comparar?autos=ml-MLU1513098568')).toBe(true)
      expect(blocked(group, '/autos-usados-uruguay/comparar?autos=fb-1,julio-26444')).toBe(true)
      expect(blocked(group, '/autos-usados-uruguay/comparar')).toBe(false)
    }
  })

  it('never block a public page, in any locale, for any group', () => {
    for (const group of groups()) {
      const closed = PUBLIC_PATHS.flatMap(underEveryLocale).filter(path => blocked(group, path))
      expect(closed).toEqual([])
    }
  })
})
