// Internal links have to resolve in the router.
//
// A `to:` pointing at a path with no page file behind it renders a normal-looking
// card that 404s on click. Nothing else catches it: the nav-coverage test walks
// from `pages/` to `siteNav.ts` and back, and never sees the hand-written link
// lists ("Seguir por acá", "Relacionadas") that most content pages carry inline.
// That is how `/dolar-blue-hoy` ended up advertising `/frontera`, which does not
// exist — only `/frontera/[ruta]` does.
//
// Scope is deliberately narrow: literal, absolute, lowercase-slug paths written
// in source. Anything computed, external, or templated is out — this test is a
// tripwire for typos and for links written against a route that was later moved,
// not a crawler.

import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

const APP_DIR = join(__dirname, '..', '..')
const PAGES_DIR = join(APP_DIR, 'pages')

/** Every source file under `dir` with one of the given extensions. */
function sourceFiles(dir: string, exts: string[]): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return sourceFiles(full, exts)
    if (!exts.some(ext => name.endsWith(ext))) return []
    return [full]
  })
}

const pageFiles = sourceFiles(PAGES_DIR, ['.vue']).map(f =>
  relative(PAGES_DIR, f).split(sep).join('/')
)

/** `herramientas/index.vue` -> `/herramientas`; `index.vue` -> `/`. */
function fileToRoute(file: string): string {
  const route = file.replace(/\.vue$/, '').replace(/(^|\/)index$/, '')
  return route ? `/${route}` : '/'
}

const staticRoutes = new Set(pageFiles.filter(f => !f.includes('[')).map(fileToRoute))

/** Optional Nuxt segments include their slash: `/foo/[[bar]]` also matches `/foo`. */
function routeMatcher(route: string): RegExp {
  const pattern = route
    .split('/')
    .slice(1)
    .map(segment => {
      if (/^\[\[[^\]]+\]\]$/.test(segment)) return '(?:/[^/]+)?'
      if (/^\[\.\.\.[^\]]+\]$/.test(segment)) return '/.+'
      if (/^\[[^\]]+\]$/.test(segment)) return '/[^/]+'
      return `/${segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`
    })
    .join('')
  return new RegExp(`^${pattern}$`)
}

const dynamicRoutes = pageFiles
  .filter(f => f.includes('['))
  .map(fileToRoute)
  .map(routeMatcher)

function resolves(path: string): boolean {
  return staticRoutes.has(path) || dynamicRoutes.some(re => re.test(path))
}

/**
 * The link shapes this codebase actually writes. Every one requires the path to
 * be a CLOSED string literal, so `localePath('/temas/' + hub.slug)` yields the
 * prefix rather than a half-parsed path — those are dropped below.
 *
 * `to:` is guarded against a preceding letter because `mailto:` ends in it.
 */
const LINK_PATTERNS = [
  /localePath\(\s*'(\/[^']*)'/g,
  /(?<![A-Za-z])to:\s*'(\/[^']*)'/g,
  /\bto="(\/[^"]*)"/g,
  /:to="'(\/[^']*)'"/g,
  // The catalog shapes. `utils/*.ts` is where this site's link lists actually live —
  // a "Seguir por acá" block is usually a `to:` in a frozen array, and the older
  // catalogs spell the same thing `href:`. Guarded against a preceding letter for
  // the same reason `to:` is, so `baseHref:` and friends don't match.
  //
  // `path:` is deliberately NOT here. It reads like a route but this codebase uses
  // it for REST endpoints of api.cambio-uruguay.com — `/regional`, `/regional/series`
  // — documented on the API pages. Those are backend paths that will never resolve
  // in the Nuxt router, and matching them would make this test fail on correct code.
  /(?<![A-Za-z])href:\s*'(\/[^']*)'/g,
]

function internalLinks(file: string): string[] {
  const source = readFileSync(file, 'utf8')
  const found = new Set<string>()
  for (const pattern of LINK_PATTERNS) {
    for (const match of source.matchAll(pattern)) {
      const path = match[1]!
      // `/api/…` is a Nitro handler, not a page; `/_…` is framework internal;
      // a trailing slash means the literal is a prefix being concatenated with
      // a computed segment, so the full path is unknowable from source.
      if (path.startsWith('/api/') || path.startsWith('/_')) continue
      if (path !== '/' && path.endsWith('/')) continue
      if (!/^\/[a-z0-9][a-z0-9\-/]*$/.test(path) && path !== '/') continue
      found.add(path)
    }
  }
  return [...found]
}

const scanned = [
  ...sourceFiles(PAGES_DIR, ['.vue']),
  ...sourceFiles(join(APP_DIR, 'components'), ['.vue']),
  ...sourceFiles(join(APP_DIR, 'layouts'), ['.vue']),
  // `utils/` was the hole. Content pages here are data-driven: the page renders a
  // `v-for` over a catalog, so the link literal the reader clicks lives in
  // `utils/<topic>.ts` and never appears in the `.vue` file at all. Scanning only
  // the templates left ~250 real, rendered links unguarded — the exact links this
  // test exists to check, in the directory the site keeps them.
  ...sourceFiles(join(APP_DIR, 'utils'), ['.ts']).filter(file => !file.endsWith('.test.ts')),
]

describe('every hard-coded internal link resolves to a page', () => {
  it('accepts both forms of optional historical and branch segments', () => {
    for (const path of [
      '/historico/bcu/usd',
      '/historico/bcu/usd/billete',
      '/sucursales/brou',
      '/sucursales/brou/montevideo',
    ]) {
      expect(resolves(path), path).toBe(true)
    }
  })

  it('still rejects missing required segments and extra path segments', () => {
    for (const path of [
      '/frontera',
      '/historico/bcu/usd/billete/extra',
      '/sucursales/brou/montevideo/extra',
    ]) {
      expect(resolves(path), path).toBe(false)
    }
    expect(resolves('/frontera/chuy')).toBe(true)
  })

  it('finds link literals to check at all', () => {
    // Guards the guard: a regex that silently stops matching would make this
    // whole file pass on zero links.
    const total = scanned.reduce((sum, file) => sum + internalLinks(file).length, 0)
    expect(total).toBeGreaterThan(200)
  })

  it('actually reaches into the catalogs, not just the templates', () => {
    // The bound above would stay green on templates alone, so the widening needs
    // its own assertion or it could be reverted without turning anything red.
    const inUtils = sourceFiles(join(APP_DIR, 'utils'), ['.ts'])
      .filter(file => !file.endsWith('.test.ts'))
      .reduce((sum, file) => sum + internalLinks(file).length, 0)
    expect(inUtils).toBeGreaterThan(100)
  })

  it('has no link pointing at a path the router cannot resolve', () => {
    const broken: string[] = []
    for (const file of scanned) {
      for (const path of internalLinks(file)) {
        if (!resolves(path)) broken.push(`${relative(APP_DIR, file)} -> ${path}`)
      }
    }
    expect(broken.sort()).toEqual([])
  })
})
