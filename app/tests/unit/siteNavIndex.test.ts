import { describe, expect, it } from 'vitest'
import {
  SITE_ORIGIN,
  searchSiteNav,
  siteNavSections,
  siteNavT,
} from '../../server/utils/siteNavIndex'

describe('siteNavT', () => {
  it('resolves Spanish labels and leaves a missing key as the key', () => {
    expect(siteNavT('nav.asistenteIa')).not.toBe('nav.asistenteIa')
    expect(siteNavT('no.existe.esta.clave')).toBe('no.existe.esta.clave')
  })
})

describe('searchSiteNav', () => {
  it('finds the rentals directory by its everyday name', () => {
    const hits = searchSiteNav('alquileres')
    expect(hits.map(hit => hit.path)).toContain('/alquileres-uruguay')
    const hit = hits.find(h => h.path === '/alquileres-uruguay')!
    expect(hit.url).toBe(`${SITE_ORIGIN}/alquileres-uruguay`)
    expect(hit.title).not.toMatch(/^nav\./)
  })

  it('never returns quick actions or external links', () => {
    for (const hit of searchSiteNav('tema oscuro idioma twitter')) {
      expect(hit.path.startsWith('/')).toBe(true)
    }
  })
})

describe('siteNavSections', () => {
  it('lists every section with resolved titles and absolute URLs', () => {
    const sections = siteNavSections()
    expect(sections.length).toBeGreaterThan(3)
    for (const section of sections) {
      expect(section.title).not.toMatch(/^search\.section\./)
      for (const page of section.pages) {
        expect(page.url.startsWith(SITE_ORIGIN)).toBe(true)
        expect(page.title).not.toBe('')
      }
    }
    expect(sections.flatMap(s => s.pages).some(p => p.path === '/asistente-ia')).toBe(true)
  })
})

describe('searchSiteNav hubs', () => {
  it('does not send a specific question to an index page', () => {
    const paths = searchSiteNav('como se calcula el aguinaldo').map(hit => hit.path)
    expect(paths[0]).toBe('/guias/como-se-calcula-el-aguinaldo-uruguay')
    expect(paths).not.toContain('/guias')
    expect(paths).not.toContain('/temas')
  })

  it('still finds an index page when it is what was asked for', () => {
    expect(searchSiteNav('guias').map(hit => hit.path)).toContain('/guias')
  })
})
