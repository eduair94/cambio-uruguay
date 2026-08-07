import { describe, expect, it } from 'vitest'

import {
  COINS_PATH,
  COINS_SOURCES,
  coinsContent,
  getCoinsContent,
  LAST_RESEARCHED,
  type CoinsContent,
  type CoinsLocale,
} from '../../utils/coins'

const LOCALES: CoinsLocale[] = ['es', 'en', 'pt']

describe('coins constants', () => {
  it('exposes an ISO LAST_RESEARCHED date and a root-relative path', () => {
    expect(LAST_RESEARCHED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(Date.parse(LAST_RESEARCHED))).toBe(false)
    expect(COINS_PATH.startsWith('/')).toBe(true)
  })

  it('has non-empty, absolute https sources', () => {
    expect(COINS_SOURCES.length).toBeGreaterThanOrEqual(3)
    for (const src of COINS_SOURCES) {
      expect(src.label.trim().length).toBeGreaterThan(0)
      expect(src.to).toMatch(/^https:\/\//)
    }
  })
})

describe('getCoinsContent', () => {
  it('returns the matching content for each supported locale', () => {
    for (const locale of LOCALES) {
      expect(getCoinsContent(locale).locale).toBe(locale)
    }
  })

  it('falls back to Spanish for unknown locales', () => {
    expect(getCoinsContent('de').locale).toBe('es')
    expect(getCoinsContent('').locale).toBe('es')
  })
})

describe('coins content integrity', () => {
  const required = (s: string) => expect(s.trim().length).toBeGreaterThan(0)

  it.each(LOCALES)('has the core required string fields (%s)', locale => {
    const c = coinsContent[locale]
    required(c.lang)
    required(c.title)
    required(c.metaTitle)
    required(c.description)
    required(c.keywords)
    for (const value of Object.values(c.ui)) required(value)
  })

  it.each(LOCALES)('has non-empty tldr, sections, steps and faq (%s)', locale => {
    const c = coinsContent[locale]
    expect(c.tldr.length).toBeGreaterThanOrEqual(3)
    c.tldr.forEach(required)

    expect(c.sections.length).toBeGreaterThanOrEqual(4)
    for (const section of c.sections) {
      required(section.id)
      required(section.heading)
      expect(section.paragraphs.length).toBeGreaterThanOrEqual(1)
      section.paragraphs.forEach(required)
      for (const b of section.bullets ?? []) required(b)
    }

    expect(c.steps.length).toBeGreaterThanOrEqual(3)
    for (const step of c.steps) {
      required(step.name)
      expect(step.text.trim().length).toBeGreaterThan(10)
    }

    expect(c.faq.length).toBeGreaterThanOrEqual(6)
    for (const entry of c.faq) {
      required(entry.q)
      expect(entry.a.trim().length).toBeGreaterThan(10)
    }
  })

  it.each(LOCALES)('has related links that are root-relative (%s)', locale => {
    const c = coinsContent[locale]
    expect(c.related.length).toBeGreaterThanOrEqual(2)
    for (const link of c.related) {
      required(link.label)
      expect(link.to.startsWith('/')).toBe(true)
    }
  })
})

describe('coins locale parity', () => {
  // Structural shape must match across locales so the page renders identically
  // and no translation silently drops a section/step/faq.
  const shape = (c: CoinsContent) => ({
    sectionIds: c.sections.map(s => s.id),
    steps: c.steps.length,
    faq: c.faq.length,
    tldr: c.tldr.length,
    related: c.related.map(r => r.to),
    uiKeys: Object.keys(c.ui).sort(),
  })

  it('en and pt mirror the es structure exactly', () => {
    const base = shape(coinsContent.es)
    expect(shape(coinsContent.en)).toEqual(base)
    expect(shape(coinsContent.pt)).toEqual(base)
  })

  it('section ids are unique within each locale', () => {
    for (const locale of LOCALES) {
      const ids = coinsContent[locale].sections.map(s => s.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})
