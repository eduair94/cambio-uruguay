import { describe, expect, it } from 'vitest'
import {
  GLOSSARY_CATEGORIES,
  getTerm,
  glossary,
  glossaryByCategory,
  glossarySlugs,
  relatedTerms,
} from '../../utils/glossary'

describe('glossary catalogue integrity', () => {
  it('has unique slugs', () => {
    const slugs = glossarySlugs()
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('gives every term the required, non-empty fields and a known category', () => {
    for (const term of glossary) {
      expect(term.slug.trim().length).toBeGreaterThan(0)
      expect(term.term.trim().length).toBeGreaterThan(0)
      expect(term.short.trim().length).toBeGreaterThan(0)
      expect(term.body.trim().length).toBeGreaterThan(40)
      expect(Object.keys(GLOSSARY_CATEGORIES)).toContain(term.category)
    }
  })

  it('only references related slugs that resolve to a real term', () => {
    const slugs = new Set(glossarySlugs())
    for (const term of glossary) {
      for (const rel of term.related) {
        expect(slugs.has(rel)).toBe(true)
      }
    }
  })

  it('never lists a term as related to itself', () => {
    for (const term of glossary) {
      expect(term.related).not.toContain(term.slug)
    }
  })
})

describe('lookup + grouping helpers', () => {
  it('resolves every slug via getTerm', () => {
    for (const slug of glossarySlugs()) {
      expect(getTerm(slug)?.slug).toBe(slug)
    }
  })

  it('returns undefined for an unknown slug', () => {
    expect(getTerm('does-not-exist')).toBeUndefined()
  })

  it('groups every term exactly once across categories', () => {
    const grouped = glossaryByCategory().flatMap(g => g.items)
    expect(grouped.length).toBe(glossary.length)
  })

  it('maps related slugs to their term objects', () => {
    const oro = getTerm('oro')!
    const related = relatedTerms(oro)
    expect(related.map(t => t.slug).sort()).toEqual([...oro.related].sort())
  })
})
