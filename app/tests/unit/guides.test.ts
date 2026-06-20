import { describe, expect, it } from 'vitest'
import { getGuide, guideSlugs, guides } from '../../utils/guides'

describe('getGuide', () => {
  it('returns the matching guide for a known slug', () => {
    const guide = getGuide('billete-cable-transferencia')
    expect(guide).toBeDefined()
    expect(guide?.slug).toBe('billete-cable-transferencia')
    expect(guide?.title).toContain('BILLETE')
  })

  it('returns undefined for an unknown slug', () => {
    expect(getGuide('zzz-does-not-exist')).toBeUndefined()
    expect(getGuide('')).toBeUndefined()
  })
})

describe('guideSlugs', () => {
  it('matches the slugs of every guide, in catalogue order', () => {
    expect(guideSlugs()).toEqual(guides.map(g => g.slug))
  })

  it('contains the four original guides in catalogue order', () => {
    expect(guideSlugs().slice(0, 4)).toEqual([
      'conviene-comprar-dolares-hoy',
      'billete-cable-transferencia',
      'comprar-dolares-mejor-precio',
      'mejor-momento-cambiar-divisas',
    ])
  })
})

describe('guides catalogue integrity', () => {
  it('has been expanded with additional guides', () => {
    expect(guides.length).toBeGreaterThanOrEqual(16)
  })

  it('has unique slugs', () => {
    const slugs = guides.map(g => g.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('has required, non-empty top-level fields on every guide', () => {
    for (const guide of guides) {
      expect(guide.slug.trim().length).toBeGreaterThan(0)
      expect(guide.title.trim().length).toBeGreaterThan(0)
      expect(guide.description.trim().length).toBeGreaterThan(0)
      expect(guide.tag.trim().length).toBeGreaterThan(0)
      // updatedAt must be a valid ISO YYYY-MM-DD date.
      expect(guide.updatedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      expect(Number.isNaN(Date.parse(guide.updatedAt))).toBe(false)
    }
  })

  it('has at least one section, each with non-empty heading and body', () => {
    for (const guide of guides) {
      expect(guide.sections.length).toBeGreaterThanOrEqual(1)
      for (const section of guide.sections) {
        expect(section.heading.trim().length).toBeGreaterThan(0)
        expect(section.body.trim().length).toBeGreaterThan(0)
      }
    }
  })

  it('gives every related link and step the required fields', () => {
    for (const guide of guides) {
      for (const link of guide.related ?? []) {
        expect(link.label.trim().length).toBeGreaterThan(0)
        expect(link.to.startsWith('/')).toBe(true)
      }
      for (const step of guide.steps ?? []) {
        expect(step.name.trim().length).toBeGreaterThan(0)
        expect(step.text.trim().length).toBeGreaterThan(10)
      }
    }
  })

  it('exposes every slug through getGuide', () => {
    for (const slug of guideSlugs()) {
      expect(getGuide(slug)?.slug).toBe(slug)
    }
  })
})
