import { describe, expect, it } from 'vitest'
import {
  getWithdrawContent,
  LAST_RESEARCHED,
  withdrawContent,
  WITHDRAW_PATH,
  WITHDRAW_SOURCES,
  type WithdrawContent,
  type WithdrawLocale,
} from '../../utils/withdrawCash'

const LOCALES: WithdrawLocale[] = ['es', 'en', 'pt']

describe('withdrawCash constants', () => {
  it('exposes an ISO LAST_RESEARCHED date and a root-relative path', () => {
    expect(LAST_RESEARCHED).toMatch(/^\d{4}-\d{2}-\d{2}$/)
    expect(Number.isNaN(Date.parse(LAST_RESEARCHED))).toBe(false)
    expect(WITHDRAW_PATH.startsWith('/')).toBe(true)
  })

  it('has non-empty, absolute https sources', () => {
    expect(WITHDRAW_SOURCES.length).toBeGreaterThanOrEqual(5)
    for (const src of WITHDRAW_SOURCES) {
      expect(src.label.trim().length).toBeGreaterThan(0)
      expect(src.to).toMatch(/^https:\/\//)
    }
  })
})

describe('getWithdrawContent', () => {
  it('returns the matching content for each supported locale', () => {
    for (const locale of LOCALES) {
      expect(getWithdrawContent(locale).locale).toBe(locale)
    }
  })

  it('falls back to Spanish for unknown locales', () => {
    expect(getWithdrawContent('de').locale).toBe('es')
    expect(getWithdrawContent('').locale).toBe('es')
  })
})

describe('withdrawCash content integrity', () => {
  const required = (s: string) => expect(s.trim().length).toBeGreaterThan(0)

  it.each(LOCALES)('has the core required string fields (%s)', locale => {
    const c = withdrawContent[locale]
    required(c.lang)
    required(c.title)
    required(c.metaTitle)
    required(c.description)
    required(c.keywords)
    // every UI chrome string is present and non-empty
    for (const value of Object.values(c.ui)) required(value)
    // live-IVA labels present and non-empty
    for (const value of Object.values(c.ivaLive)) required(value)
  })

  it.each(LOCALES)('has non-empty tldr, sections, zones, steps and faq (%s)', locale => {
    const c = withdrawContent[locale]
    expect(c.tldr.length).toBeGreaterThanOrEqual(3)
    c.tldr.forEach(required)

    expect(c.sections.length).toBeGreaterThanOrEqual(6)
    for (const section of c.sections) {
      required(section.id)
      required(section.heading)
      expect(section.paragraphs.length).toBeGreaterThanOrEqual(1)
      section.paragraphs.forEach(required)
      for (const b of section.bullets ?? []) required(b)
    }

    expect(c.zones.length).toBeGreaterThanOrEqual(5)
    for (const zone of c.zones) {
      required(zone.id)
      required(zone.icon)
      required(zone.name)
      required(zone.summary)
      expect(zone.tips.length).toBeGreaterThanOrEqual(1)
      zone.tips.forEach(required)
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

  it.each(LOCALES)('has network rows with all fields (%s)', locale => {
    const c = withdrawContent[locale]
    expect(c.networkRows.length).toBe(2)
    for (const row of c.networkRows) {
      required(row.network)
      required(row.reach)
      required(row.usdPerTxn)
      required(row.uyuPerTxn)
      required(row.note)
    }
  })

  it.each(LOCALES)('has related links that are root-relative (%s)', locale => {
    const c = withdrawContent[locale]
    expect(c.related.length).toBeGreaterThanOrEqual(2)
    for (const link of c.related) {
      required(link.label)
      expect(link.to.startsWith('/')).toBe(true)
    }
  })
})

describe('withdrawCash locale parity', () => {
  // Structural shape must match across locales so the page renders identically
  // and no translation silently drops a section/zone/step/faq.
  const shape = (c: WithdrawContent) => ({
    sectionIds: c.sections.map(s => s.id),
    zoneIds: c.zones.map(z => z.id),
    zoneIcons: c.zones.map(z => z.icon),
    networks: c.networkRows.map(r => r.network),
    steps: c.steps.length,
    faq: c.faq.length,
    tldr: c.tldr.length,
    related: c.related.map(r => r.to),
    uiKeys: Object.keys(c.ui).sort(),
    ivaLiveKeys: Object.keys(c.ivaLive).sort(),
  })

  it('en and pt mirror the es structure exactly', () => {
    const base = shape(withdrawContent.es)
    expect(shape(withdrawContent.en)).toEqual(base)
    expect(shape(withdrawContent.pt)).toEqual(base)
  })

  it('section ids are unique within each locale', () => {
    for (const locale of LOCALES) {
      const ids = withdrawContent[locale].sections.map(s => s.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})
