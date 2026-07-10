// The anti-drift guard.
//
// The filesystem is the source of truth for what pages exist; `siteNav.ts` is
// the source of truth for what is reachable. This test asserts the two agree in
// BOTH directions, so dropping a new `.vue` into `pages/` without wiring it into
// the navigation model turns CI red — which is exactly how
// `/preguntas-frecuentes`, `/por-que-sube-el-dolar` and `/dolar/records` became
// orphans in the first place.

import { readdirSync, statSync } from 'node:fs'
import { join, relative, sep } from 'node:path'
import { describe, expect, it } from 'vitest'

import {
  DYNAMIC_ROUTE_KEYS,
  EXCLUDED_ROUTES,
  NAV_SECTIONS,
  UNLISTED_ROUTES,
  navRoutes,
} from '../../utils/siteNav'
import { toolSlugs } from '../../utils/tools'

const PAGES_DIR = join(__dirname, '..', '..', 'pages')

/** Every `.vue` file under `pages/`, as a posix path relative to `pages/`. */
function pageFiles(dir: string = PAGES_DIR): string[] {
  return readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) return pageFiles(full)
    if (!name.endsWith('.vue')) return []
    return [relative(PAGES_DIR, full).split(sep).join('/')]
  })
}

/** `herramientas/index.vue` -> `/herramientas`; `index.vue` -> `/`. */
function fileToRoute(file: string): string {
  const withoutExt = file.replace(/\.vue$/, '')
  const withoutIndex = withoutExt.replace(/(^|\/)index$/, '')
  return withoutIndex ? `/${withoutIndex}` : '/'
}

const files = pageFiles()
const staticFiles = files.filter(f => !f.includes('['))
const dynamicFiles = files.filter(f => f.includes('['))

const staticRoutes = staticFiles.map(fileToRoute)
const navSet = new Set(navRoutes())
const excludedSet = new Set(EXCLUDED_ROUTES)
const unlistedSet = new Set(UNLISTED_ROUTES.map(r => r.to))
const toolRoutes = new Set(toolSlugs().map(s => `/herramientas/${s}`))

describe('page inventory', () => {
  it('finds the pages directory', () => {
    expect(files.length).toBeGreaterThan(40)
  })
})

describe('every static page is reachable', () => {
  it('has no orphans', () => {
    const orphans = staticRoutes.filter(
      route =>
        !navSet.has(route) &&
        !excludedSet.has(route) &&
        !unlistedSet.has(route) &&
        !toolRoutes.has(route)
    )
    expect(orphans).toEqual([])
  })

  it('reaches the pages that used to be orphaned', () => {
    for (const route of ['/preguntas-frecuentes', '/por-que-sube-el-dolar', '/dolar/records']) {
      expect(navSet.has(route)).toBe(true)
    }
  })

  it('reaches the pages that used to be footer-only', () => {
    for (const route of [
      '/prestamos-uruguay',
      '/inversiones-uruguay',
      '/casas-de-cambio',
      '/casa-de-cambio-cerca-de-mi',
      '/couriers-uruguay',
      '/desarrolladores',
      '/newsletter',
      '/contacto',
      '/privacidad',
      '/terminos',
    ]) {
      expect(navSet.has(route)).toBe(true)
    }
  })
})

describe('every dynamic page is declared', () => {
  it('maps each bracketed page file to a DYNAMIC_ROUTE_KEYS entry', () => {
    const keys = dynamicFiles.map(f => f.replace(/\.vue$/, ''))
    const undeclared = keys.filter(k => !(k in DYNAMIC_ROUTE_KEYS))
    expect(undeclared).toEqual([])
  })

  it('has no stale DYNAMIC_ROUTE_KEYS entries', () => {
    const keys = new Set(dynamicFiles.map(f => f.replace(/\.vue$/, '')))
    const stale = Object.keys(DYNAMIC_ROUTE_KEYS).filter(k => !keys.has(k))
    expect(stale).toEqual([])
  })

  it('assigns every dynamic route to a real section', () => {
    const sectionIds = new Set(NAV_SECTIONS.map(s => s.id))
    for (const section of Object.values(DYNAMIC_ROUTE_KEYS)) {
      expect(sectionIds.has(section)).toBe(true)
    }
  })
})

describe('the navigation model has no dead links', () => {
  it('resolves every internal nav route to an existing page file', () => {
    const routeSet = new Set(staticRoutes)
    const dead = navRoutes().filter(route => !routeSet.has(route))
    expect(dead).toEqual([])
  })

  it('resolves every excluded route to an existing page file', () => {
    const routeSet = new Set(staticRoutes)
    const dead = EXCLUDED_ROUTES.filter(route => !routeSet.has(route))
    expect(dead).toEqual([])
  })

  it('resolves every unlisted route to an existing page file', () => {
    const routeSet = new Set(staticRoutes)
    const dead = UNLISTED_ROUTES.filter(route => !routeSet.has(route.to))
    expect(dead).toEqual([])
  })

  it('excludes exactly the offline, widget and account routes', () => {
    expect([...EXCLUDED_ROUTES].sort()).toEqual(['/cuenta', '/offline', '/widget'])
  })

  it('has no duplicate routes across sections', () => {
    const routes = navRoutes()
    expect(routes.length).toBe(new Set(routes).size)
  })

  it('gives every entry an i18n key and an icon', () => {
    for (const section of NAV_SECTIONS) {
      for (const entry of section.entries) {
        expect(entry.labelKey).toBeTruthy()
        expect(entry.icon).toMatch(/^mdi-/)
        expect(Boolean(entry.to) !== Boolean(entry.href)).toBe(true)
      }
    }
  })
})

describe('the tools catalogue matches the filesystem', () => {
  it('has one page per slug and one slug per page, both ways', () => {
    const fsSlugs = staticFiles
      .filter(f => f.startsWith('herramientas/') && f !== 'herramientas/index.vue')
      .map(f => f.replace('herramientas/', '').replace(/\.vue$/, ''))
      .sort()
    expect(toolSlugs().slice().sort()).toEqual(fsSlugs)
  })
})
