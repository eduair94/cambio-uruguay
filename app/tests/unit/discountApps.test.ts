import { describe, expect, it } from 'vitest'
import {
  DISCOUNT_FINDERS,
  DISCOUNT_FINDERS_LAST_REVIEWED,
  DISCOUNT_FINDER_SOURCES,
  OFFICIAL_BENEFIT_PAGES,
  coveredIssuers,
  getDiscountFinder,
  primaryFinder,
} from '../../utils/discountApps'

describe('discount finders catalogue', () => {
  it('has unique ids and the required copy on every entry', () => {
    const ids = DISCOUNT_FINDERS.map(f => f.id)
    expect(new Set(ids).size).toBe(ids.length)
    expect(DISCOUNT_FINDERS.length).toBeGreaterThan(0)

    for (const f of DISCOUNT_FINDERS) {
      expect(f.name.trim()).not.toBe('')
      expect(f.tagline.trim().length).toBeGreaterThan(20)
      expect(f.how.trim().length).toBeGreaterThan(40)
      expect(f.covers.length).toBeGreaterThan(0)
      expect(f.strengths.length).toBeGreaterThan(0)
      expect(['app', 'web']).toContain(f.kind)
    }
  })

  it('never recommends a tool without stating what to watch out for', () => {
    // La página recomienda herramientas de terceros: publicar los pros sin las
    // contras sería propaganda, no información.
    for (const f of DISCOUNT_FINDERS) {
      expect(f.caveats.length, `${f.id} sin caveats`).toBeGreaterThan(0)
      for (const c of f.caveats) expect(c.trim().length).toBeGreaterThan(20)
    }
  })

  it('labels every hard fact with where it came from', () => {
    const allowed = ['oficial', 'tienda', 'prensa', 'autodeclarado']
    for (const f of DISCOUNT_FINDERS) {
      for (const fact of f.facts) {
        expect(allowed).toContain(fact.source)
        expect(fact.label.trim()).not.toBe('')
        expect(fact.value.trim()).not.toBe('')
      }
    }
  })

  it('links out over https and without referral tracking', () => {
    // Sin afiliación: si algún día alguien agrega un link de referido, este test cae.
    const urls = [
      ...DISCOUNT_FINDERS.flatMap(f => [f.siteUrl, f.iosUrl, f.androidUrl]),
      ...DISCOUNT_FINDER_SOURCES.map(s => s.url),
      ...OFFICIAL_BENEFIT_PAGES.map(s => s.url),
    ].filter((u): u is string => Boolean(u))

    for (const u of urls) {
      expect(u.startsWith('https://'), `${u} no es https`).toBe(true)
      expect(/[?&](?:ref|referral|aff|utm_[a-z]+)=/i.test(u), `${u} trae tracking`).toBe(false)
    }
  })

  it('keeps the app-store links pointing at the right stores', () => {
    for (const f of DISCOUNT_FINDERS) {
      if (f.iosUrl) expect(f.iosUrl).toContain('apps.apple.com')
      if (f.androidUrl) expect(f.androidUrl).toContain('play.google.com')
      if (f.kind === 'web') {
        expect(f.iosUrl).toBeUndefined()
        expect(f.androidUrl).toBeUndefined()
      }
    }
  })

  it('resolves by id and exposes a primary finder', () => {
    expect(primaryFinder().id).toBe('bankos')
    expect(getDiscountFinder('bankos')?.free).toBe(true)
    expect(getDiscountFinder('no-existe')).toBeUndefined()
  })

  it('covers the issuers the card rankings talk about', () => {
    const covered = coveredIssuers()
    for (const issuer of ['BROU', 'Itaú', 'Santander', 'BBVA', 'Scotiabank', 'OCA', 'Prex']) {
      expect(covered).toContain(issuer)
    }
    // Sin repetidos, aunque dos herramientas cubran el mismo banco.
    expect(new Set(covered).size).toBe(covered.length)
  })

  it('carries a review date in ISO form', () => {
    expect(DISCOUNT_FINDERS_LAST_REVIEWED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })

  it('always offers the issuer’s own benefit page as the last word', () => {
    expect(OFFICIAL_BENEFIT_PAGES.length).toBeGreaterThanOrEqual(3)
    for (const s of OFFICIAL_BENEFIT_PAGES) {
      expect(s.publisher.trim()).not.toBe('')
      expect(s.label.trim()).not.toBe('')
    }
  })
})
