import { describe, expect, it } from 'vitest'
import { getTool, tools, toolSlugs, toolsByCategory, TOOL_CATEGORIES } from '../../utils/tools'
import {
  getTerm,
  glossary,
  glossaryByCategory,
  glossarySlugs,
  relatedTerms,
} from '../../utils/glossary'
import {
  convertEntries,
  convertSlug,
  convertSlugs,
  convertAmount,
  foreignCode,
  getConvertEntry,
  relatedAmounts,
} from '../../utils/convert'

describe('tools catalogue', () => {
  it('has unique slugs and required fields', () => {
    const slugs = toolSlugs()
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const tool of tools) {
      expect(tool.slug.trim()).not.toBe('')
      expect(tool.title.trim()).not.toBe('')
      expect(tool.description.trim()).not.toBe('')
      expect(tool.icon.startsWith('mdi-')).toBe(true)
      expect(tool.keywords.length).toBeGreaterThan(0)
      expect(Object.keys(TOOL_CATEGORIES)).toContain(tool.category)
    }
  })

  it('includes the import-tax calculator and resolves by slug', () => {
    expect(getTool('calculadora-impuestos-importacion')).toBeDefined()
    expect(getTool('nope')).toBeUndefined()
  })

  it('groups every tool into a category', () => {
    const grouped = toolsByCategory()
    const count = grouped.reduce((n, g) => n + g.items.length, 0)
    expect(count).toBe(tools.length)
  })
})

describe('glossary catalogue', () => {
  it('has unique slugs and substantive bodies', () => {
    const slugs = glossarySlugs()
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(glossary.length).toBeGreaterThanOrEqual(40)
    for (const term of glossary) {
      expect(term.term.trim()).not.toBe('')
      expect(term.short.trim().length).toBeGreaterThan(20)
      expect(term.body.trim().length).toBeGreaterThan(80)
    }
  })

  it('only references related slugs that exist', () => {
    const all = new Set(glossarySlugs())
    for (const term of glossary) {
      for (const rel of term.related) {
        expect(all.has(rel)).toBe(true)
      }
    }
  })

  it('resolves terms and related terms', () => {
    const iva = getTerm('iva')
    expect(iva).toBeDefined()
    expect(relatedTerms(iva!).length).toBeGreaterThan(0)
    expect(getTerm('does-not-exist')).toBeUndefined()
  })

  it('groups every term into a category', () => {
    const grouped = glossaryByCategory()
    const count = grouped.reduce((n, g) => n + g.items.length, 0)
    expect(count).toBe(glossary.length)
  })
})

describe('convert catalogue', () => {
  it('builds deterministic, unique slugs', () => {
    const slugs = convertSlugs()
    expect(new Set(slugs).size).toBe(slugs.length)
    expect(convertSlug(100, 'USD', 'UYU')).toBe('100-dolares-a-pesos-uruguayos')
    expect(convertSlug(1000, 'UYU', 'USD')).toBe('1000-pesos-uruguayos-a-dolares')
  })

  it('resolves an entry by slug', () => {
    const entry = getConvertEntry('100-dolares-a-pesos-uruguayos')
    expect(entry).toBeDefined()
    expect(entry?.amount).toBe(100)
    expect(entry?.from).toBe('USD')
    expect(getConvertEntry('zzz')).toBeUndefined()
  })

  it('converts foreign->UYU by multiplying and UYU->foreign by dividing', () => {
    const usd = getConvertEntry('100-dolares-a-pesos-uruguayos')!
    expect(convertAmount(usd, 41)).toBe(4100)
    const uyu = getConvertEntry('1000-pesos-uruguayos-a-dolares')!
    expect(convertAmount(uyu, 40)).toBe(25)
  })

  it('returns null for missing or invalid rates', () => {
    const usd = convertEntries[0]!
    expect(convertAmount(usd, null)).toBeNull()
    expect(convertAmount(usd, 0)).toBeNull()
  })

  it('exposes the foreign side of each pair', () => {
    expect(foreignCode(getConvertEntry('100-dolares-a-pesos-uruguayos')!)).toBe('USD')
    expect(foreignCode(getConvertEntry('1000-pesos-uruguayos-a-dolares')!)).toBe('USD')
  })

  it('lists related amounts for the same directed pair only', () => {
    const usd = getConvertEntry('100-dolares-a-pesos-uruguayos')!
    const related = relatedAmounts(usd)
    expect(related.length).toBeGreaterThan(0)
    expect(related.every(e => e.from === 'USD' && e.to === 'UYU')).toBe(true)
    expect(related.every(e => e.slug !== usd.slug)).toBe(true)
  })
})
