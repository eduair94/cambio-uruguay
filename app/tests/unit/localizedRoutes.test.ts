import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { isLocalizedRoute, splitLocalePath } from '../../utils/localizedRoutes'
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

  it('flags only routes that have a page', () => {
    const flagged = NAV_SECTIONS.flatMap(section => section.entries).filter(
      entry => entry.localized
    )
    expect(flagged.length).toBeGreaterThan(20)
    for (const entry of flagged) expect(pageFile(entry.to!), entry.to).toBeTruthy()
  })
})
