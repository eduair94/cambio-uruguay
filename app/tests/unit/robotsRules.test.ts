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

  it('keep the wildcard group small enough to test every sitemap URL against', () => {
    const [wildcard] = groups()
    expect(wildcard._rules.length).toBeLessThanOrEqual(24)
    for (const group of groups()) expect(group._rules.length).toBeLessThanOrEqual(24)
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

  it('never block a public page, in any locale, for any group', () => {
    for (const group of groups()) {
      const closed = PUBLIC_PATHS.flatMap(underEveryLocale).filter(path => blocked(group, path))
      expect(closed).toEqual([])
    }
  })
})
