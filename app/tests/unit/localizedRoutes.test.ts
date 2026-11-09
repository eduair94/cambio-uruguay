import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve, sep } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  SPANISH_ONLY_ROUTES,
  isLocalizedRoute,
  isSpanishOnlyRoute,
  splitLocalePath,
} from '../../utils/localizedRoutes'
import { NAV_SECTIONS } from '../../utils/siteNav'

const APP = resolve(__dirname, '../..')
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
  // URLs to the other sitemaps, where every one answers 404.
  it('lists exactly the pages that exist only in Spanish', () => {
    const pagesDir = join(APP, 'pages')
    const files = (dir: string): string[] =>
      readdirSync(dir).flatMap(name => {
        const full = join(dir, name)
        return statSync(full).isDirectory() ? files(full) : name.endsWith('.vue') ? [full] : []
      })
    // `pages/alquiler/[departamento]/[barrio].vue` → `/alquiler/x/x`: one path the route answers.
    const samplePath = (file: string) =>
      `/${relative(pagesDir, file).split(sep).join('/')}`
        .replace(/\.vue$/, '')
        .replace(/\/index$/, '')
        .replace(/\[[^\]]+\]\]?/g, 'x') || '/'
    const spanishOnly = files(pagesDir)
      .filter(file =>
        /defineI18nRoute\(\{\s*locales:\s*\['es'\]\s*\}\)/.test(readFileSync(file, 'utf8'))
      )
      .map(samplePath)
    expect(spanishOnly.length).toBeGreaterThan(5)
    for (const path of spanishOnly) expect(isSpanishOnlyRoute(path), path).toBe(true)
    // …and no pattern is left over from a page that is gone or now speaks other languages.
    for (const route of SPANISH_ONLY_ROUTES) {
      expect(
        spanishOnly.some(path => route.test(path)),
        String(route)
      ).toBe(true)
    }
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
