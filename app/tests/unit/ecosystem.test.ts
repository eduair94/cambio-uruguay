// The ecosystem strip links out to our own published assets. It must never
// claim third-party endorsement, must never link the robots-disallowed
// /api-reference page, and must stay translated in all three locales.

import { describe, expect, it } from 'vitest'

import en from '../../i18n/locales/json/en.json'
import es from '../../i18n/locales/json/es.json'
import pt from '../../i18n/locales/json/pt.json'
import { ECOSYSTEM_LINKS } from '../../utils/ecosystem'

const LOCALES = { en, es, pt } as Record<string, Record<string, unknown>>

function labels(locale: Record<string, unknown>): Record<string, string> {
  const eco = locale.ecosystem as { links?: Record<string, string> } | undefined
  return eco?.links ?? {}
}

describe('ECOSYSTEM_LINKS', () => {
  it('has at least one link', () => {
    expect(ECOSYSTEM_LINKS.length).toBeGreaterThan(0)
  })

  it('uses unique ids', () => {
    const ids = ECOSYSTEM_LINKS.map(l => l.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('external links are absolute https and internal links are root-relative', () => {
    for (const link of ECOSYSTEM_LINKS) {
      if (link.internal) expect(link.url.startsWith('/')).toBe(true)
      else expect(link.url.startsWith('https://')).toBe(true)
    }
  })

  it('never links the robots-disallowed /api-reference page', () => {
    expect(ECOSYSTEM_LINKS.some(l => l.url.includes('/api-reference'))).toBe(false)
  })

  it('gives every link an icon', () => {
    for (const link of ECOSYSTEM_LINKS) expect(link.icon).toMatch(/^mdi-/)
  })

  it.each(Object.keys(LOCALES))('has a label for every link in %s', localeName => {
    const locale = LOCALES[localeName]!
    const eco = locale.ecosystem as { title?: string; subtitle?: string } | undefined
    expect(eco?.title, `${localeName}: ecosystem.title`).toBeTruthy()
    expect(eco?.subtitle, `${localeName}: ecosystem.subtitle`).toBeTruthy()
    for (const link of ECOSYSTEM_LINKS) {
      expect(labels(locale)[link.id], `${localeName}: ecosystem.links.${link.id}`).toBeTruthy()
    }
  })
})
