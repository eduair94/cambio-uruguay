import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import ts from 'typescript'
import { describe, expect, it } from 'vitest'
import {
  SPANISH_ONLY_ROUTES,
  isLocalizedRoute,
  isSpanishOnlyRoute,
  splitLocalePath,
} from '../../utils/localizedRoutes'
import { NAV_SECTIONS } from '../../utils/siteNav'
import { callsTo, parseScript } from './helpers/headScan'

const APP = resolve(__dirname, '../..')

/**
 * The locales a page's `defineI18nRoute` leaves it, or 'all' when it does not restrict them.
 * `defineI18nRoute(false)` keeps only the default locale (Spanish).
 */
function i18nRouteLocales(source: ts.SourceFile): 'all' | string[] {
  for (const call of callsTo(source, 'defineI18nRoute')) {
    const [argument] = call.arguments
    if (argument?.kind === ts.SyntaxKind.FalseKeyword) return ['es']
    if (!argument || !ts.isObjectLiteralExpression(argument)) continue
    for (const property of argument.properties) {
      if (
        ts.isPropertyAssignment(property) &&
        ts.isIdentifier(property.name) &&
        property.name.text === 'locales' &&
        ts.isArrayLiteralExpression(property.initializer)
      ) {
        return property.initializer.elements.map(element =>
          ts.isStringLiteral(element) ? element.text : element.getText(source)
        )
      }
    }
  }
  return 'all'
}

const PAGES = join(APP, 'pages')
const pageFiles = (dir: string): string[] =>
  readdirSync(dir).flatMap(name => {
    const full = join(dir, name)
    return statSync(full).isDirectory() ? pageFiles(full) : name.endsWith('.vue') ? [full] : []
  })
// `pages/alquiler/[departamento]/[barrio].vue` → `/alquiler/x/x`: one path the route answers.
const samplePath = (file: string) =>
  `/${relative(PAGES, file).split(sep).join('/')}`
    .replace(/\.vue$/, '')
    .replace(/\/index$/, '')
    .replace(/\[[^\]]+\]\]?/g, 'x') || '/'
// Parsed once, while the file loads: ~330 pages through the SFC compiler and the TypeScript parser
// took over the 5 s a test gets when the whole suite runs at once.
const PAGE_LOCALES = pageFiles(PAGES).map(file => ({
  path: samplePath(file),
  locales: i18nRouteLocales(parseScript(file)),
}))
const pageFile = (to: string) => {
  const base = to === '/' ? 'index' : to.slice(1)
  return [`pages/${base}.vue`, `pages/${base}/index.vue`]
    .map(file => join(APP, file))
    .find(file => existsSync(file))
}
// A canonical defined from `localePath` is canonical of itself in /en and /pt.
// Checked against production on 2026-10-20: no false positives over 240 nav
// pages; it misses pages that build the canonical another way, which carry the
// flag by hand.
const canonicalUsesLocalePath = (source: string) => {
  const lines = source.split('\n')
  return lines.some(
    (line, index) =>
      /\b(?:const|let)\s+canonical\w*\s*=/i.test(line) &&
      /localePath\(/.test(lines.slice(index, index + 3).join('\n'))
  )
}

describe('localized routes', () => {
  it('splits the locale prefix off a path', () => {
    expect(splitLocalePath('/en/guias/x')).toEqual({ locale: 'en', path: '/guias/x' })
    expect(splitLocalePath('/pt')).toEqual({ locale: 'pt', path: '/' })
    expect(splitLocalePath('/guias/x')).toEqual({ locale: 'es', path: '/guias/x' })
    expect(splitLocalePath('/entrada')).toEqual({ locale: 'es', path: '/entrada' })
  })

  it('knows the translated pages and families, and nothing else', () => {
    for (const path of [
      '/mapa',
      '/pizarra',
      '/historico/brou',
      '/historico/brou/usd',
      '/sucursales/brou/montevideo',
      '/sillas-escritorio-uruguay/una-silla',
      '/casas-de-cambio/bancos',
      '/inmobiliarias-uruguay/infocasas:1',
    ]) {
      expect(isLocalizedRoute(path), path).toBe(true)
    }
    for (const path of [
      '/',
      '/dolar-hoy',
      '/guias/una-guia',
      '/precio/shampoo',
      '/casa/brou',
      '/dolar/montevideo',
      '/equipar-casa-uruguay/mi-lista',
    ]) {
      expect(isLocalizedRoute(path), path).toBe(false)
    }
  })

  it('flags every nav page whose canonical is built with localePath', () => {
    const missing = NAV_SECTIONS.flatMap(section => section.entries)
      .filter(entry => entry.to && !isLocalizedRoute(entry.to))
      .filter(entry => {
        const file = pageFile(entry.to!)
        return file ? canonicalUsesLocalePath(readFileSync(file, 'utf8')) : false
      })
      .map(entry => entry.to)
    expect(missing).toEqual([])
  })

  // The sitemap lists the machine-translated locales of a page unless its route is Spanish-only
  // (server/utils/sitemapLocales.ts), and the route is Spanish-only when the PAGE says so. A page
  // that adds `defineI18nRoute({ locales: ['es'] })` without a pattern here sends its translated
  // URLs to the other sitemaps, where every one answers 404. Read from the AST, so the call may
  // span lines, carry a trailing comma or `paths`, or be `defineI18nRoute(false)`.
  it('lists exactly the pages that exist only in Spanish', () => {
    const verdicts = PAGE_LOCALES
    // Only "every locale" and "Spanish only" exist today, and only those reach the sitemap filter.
    // A page restricted to another subset needs that filter taught its locales first.
    const otherSubsets = verdicts.filter(
      v => v.locales !== 'all' && !(v.locales.length === 1 && v.locales[0] === 'es')
    )
    expect(otherSubsets, JSON.stringify(otherSubsets)).toEqual([])
    const spanishOnly = verdicts.filter(v => v.locales !== 'all').map(v => v.path)
    expect(spanishOnly.length).toBeGreaterThan(5)
    for (const path of spanishOnly) expect(isSpanishOnlyRoute(path), path).toBe(true)
    // …no pattern is left over from a page that is gone or now speaks other languages…
    for (const route of SPANISH_ONLY_ROUTES) {
      expect(
        spanishOnly.some(path => route.test(path)),
        String(route)
      ).toBe(true)
    }
    // …and no page that answers in every language falls under a pattern.
    for (const { path } of verdicts.filter(v => v.locales === 'all')) {
      expect(isSpanishOnlyRoute(path), path).toBe(false)
    }
    // The reader itself, on the spellings Prettier and the module allow.
    const read = (code: string) => i18nRouteLocales(parseScript('x.ts', code))
    expect(read("defineI18nRoute({\n  locales: ['es'],\n})")).toEqual(['es'])
    expect(read("defineI18nRoute({ paths: { es: '/x' }, locales: ['es'] })")).toEqual(['es'])
    expect(read('defineI18nRoute(false)')).toEqual(['es'])
    expect(read("defineI18nRoute({ locales: ['es', 'en'] })")).toEqual(['es', 'en'])
    expect(read("// defineI18nRoute({ locales: ['es'] })\nconst x = 1")).toBe('all')
    for (const path of [
      '/alquileres-uruguay',
      '/autos-usados-uruguay',
      '/autos-usados-uruguay/precios/toyota-hilux',
      '/autos-usados-uruguay/ml-1',
      '/bicicletas-electricas-uruguay',
      '/monopatines-electricos-uruguay',
      '/guias/alquilar-en-uruguay',
    ]) {
      expect(isSpanishOnlyRoute(path), path).toBe(false)
    }
    expect(isSpanishOnlyRoute('/autos-usados-uruguay/hasta-6000-dolares/')).toBe(true)
  })

  it('flags only routes that have a page', () => {
    const flagged = NAV_SECTIONS.flatMap(section => section.entries).filter(
      entry => entry.localized
    )
    expect(flagged.length).toBeGreaterThan(20)
    for (const entry of flagged) expect(pageFile(entry.to!), entry.to).toBeTruthy()
  })
})
