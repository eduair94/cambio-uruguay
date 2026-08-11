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

describe('despachante de aduana', () => {
  // The word shows up all over the import pages with no entry behind it, so readers were left to
  // guess whether the courier that charges them tributes IS one. It is not: different norm,
  // different role. The entry has to keep both halves of that distinction.
  const term = getTerm('despachante-de-aduana')!

  it('exists and is filed under impuestos', () => {
    expect(term).toBeDefined()
    expect(term.category).toBe('impuestos')
  })

  it('separates the despachante from the operador postal that liquidates your tributes', () => {
    expect(term.body).toContain('Ley 19.276, art. 14')
    expect(term.body).toContain('art. 15')
    expect(term.body).toContain('Decreto 50/026, art. 8')
    expect(term.body).toContain('operador postal')
  })

  it('publishes the absence of a public roster instead of inventing a lookup URL', () => {
    expect(term.body).toContain('no publica una nómina consultable en línea')
    expect(term.body).not.toMatch(/https?:\/\//)
  })

  it('states art. 15 as the exceptions list it is, not as an affirmative rule', () => {
    // The entry used to say "El art. 15 invierte lo que mucha gente supone: su intervención es
    // preceptiva por regla". The article says no such thing. Its rubric is "Intervención no
    // preceptiva" and it opens "No será preceptiva la intervención del despachante de aduana en las
    // operaciones aduaneras relacionadas con los despachos de:" — a closed list of exceptions. The
    // affirmative side lives in art. 14 ("Definición y preceptividad"), which is what we now cite.
    expect(term.body).toContain('Intervención no preceptiva')
    expect(term.body).toContain('sujetos facultados')
    expect(term.body).not.toMatch(/art\. 15[^.]*intervención es preceptiva por regla/)
    expect(term.body).not.toContain('su intervención es preceptiva por regla')
    expect(term.short).not.toContain('su intervención es obligatoria salvo')
  })

  it('carries the US$ 200 cap of literal C instead of dropping it', () => {
    // Literal C exempts express postal shipments only "siempre que su valor en aduana no exceda el
    // equivalente en moneda nacional de US$ 200". Omitting the cap while asserting that a
    // door-to-door purchase never needs a despachante was the actual error.
    expect(term.body).toContain('US$ 200')
    expect(term.body).toMatch(/entrega expresa/)
    expect(term.example).toContain('US$ 200')
  })

  it('leaves the >US$ 800 despachante question open, like the rest of the site does', () => {
    // /preguntas-frecuentes-aduana-uruguay ships 'despachante-mas-800' as an unresolved conflict
    // (DNA's operational page vs. the postal exemptions). A glossary entry must not quietly close
    // in one direction what the FAQ publishes as a conflict.
    expect(term.body).not.toContain('una compra puerta a puerta no lleva despachante')
    expect(term.body).toMatch(/no cerramos/)
    expect(term.body).toContain('más de US$ 800')
  })

  it('credits the Registro to the article that actually creates it', () => {
    // arts. 14 and 15 do not mention the register; CAROU art. 23 does ("La Dirección Nacional de
    // Aduanas llevará el Registro de Despachantes de Aduana y de Apoderados").
    expect(term.body).toContain('art. 23')
    expect(term.body).toContain('Registro de Despachantes de Aduana y de Apoderados')
  })
})
