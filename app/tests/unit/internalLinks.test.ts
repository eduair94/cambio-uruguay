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

/** `/casa/[origin]/[intent]` -> a matcher; `[...slug]` swallows the rest. */
const dynamicRoutes = pageFiles
  .filter(f => f.includes('['))
  .map(fileToRoute)
  .map(
    route =>
      new RegExp(
        `^${route
          .replace(/\[\.\.\.[^\]]+\]/g, '.+')
          .replace(/\[[^\]]+\]/g, '[^/]+')
          .replace(/\//g, '\\/')}$`
      )
  )

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
]

describe('every hard-coded internal link resolves to a page', () => {
  it('finds link literals to check at all', () => {
    // Guards the guard: a regex that silently stops matching would make this
    // whole file pass on zero links.
    const total = scanned.reduce((sum, file) => sum + internalLinks(file).length, 0)
    expect(total).toBeGreaterThan(200)
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
