import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { rentalPropertyPath } from '../../utils/rentalPresentation'

// The rental sheet exists only in Spanish (`defineI18nRoute({ locales: ['es'] })` in
// pages/alquileres/[key].vue). Wrapped in `localePath`, its path came back EMPTY on /en and /pt
// (measured in production 2026-10-08): every card title, "View details, contact and nearby
// services", the map panel and the saved list rendered an <a> without href, and the page's
// ItemList pointed every item at the home page. The sheet's path has no locale prefix: use it as is.
const appRoot = fileURLToPath(new URL('../../', import.meta.url))

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sources(path)
    return /\.(vue|ts)$/.test(name) ? [path] : []
  })
}

describe('links to the Spanish-only rental sheet', () => {
  it('never pass through localePath', () => {
    const offenders = ['pages', 'components', 'composables', 'utils']
      .flatMap(dir => sources(join(appRoot, dir)))
      .filter(path => /localePath\(\s*rentalPropertyPath\(/.test(readFileSync(path, 'utf8')))
      .map(path => relative(appRoot, path))
    expect(offenders).toEqual([])
  })

  it('is the same path in every language', () => {
    expect(rentalPropertyPath('montevideo-cordon-abc')).toBe('/alquileres/montevideo-cordon-abc')
  })
})
