import { describe, expect, it } from 'vitest'
import { CATALOGS, INTEGRATIONS, INTEGRATIONS_WINDOW, PUBLIC_USES } from '../../utils/dataShowcase'

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/

describe('who uses our data', () => {
  it('lists public uses with a public URL, a verbatim footer and the day we saw it', () => {
    expect(PUBLIC_USES.length).toBeGreaterThan(0)
    const ids = PUBLIC_USES.map(u => u.id)
    expect(new Set(ids).size).toBe(ids.length)
    for (const u of PUBLIC_USES) {
      expect(u.url, u.id).toMatch(/^https:\/\//)
      expect(u.url, u.id).not.toMatch(/cambio-uruguay\.com/)
      expect(u.verifiedAt, u.id).toMatch(ISO_DAY)
      // The footer is what proves the use: no entry without the text they published.
      expect(u.quote.trim().length, u.id).toBeGreaterThan(10)
      expect(u.what.trim().length, u.id).toBeGreaterThan(20)
    }
  })

  it('describes integrations without naming anyone', () => {
    expect(INTEGRATIONS_WINDOW.from).toMatch(ISO_DAY)
    expect(INTEGRATIONS_WINDOW.to).toMatch(ISO_DAY)
    for (const i of INTEGRATIONS) {
      // No hostnames, no links: these consumers never said they use us in public.
      expect(i.what, i.id).not.toMatch(/https?:|www\.|\.(com|uy|app|io|net)\b/i)
      expect(i.endpoint.startsWith('/'), i.id).toBe(true)
    }
  })

  it('links catalogs that actually list the API', () => {
    for (const c of CATALOGS) {
      expect(c.url, c.id).toMatch(/^https:\/\//)
      expect(c.verifiedAt, c.id).toMatch(ISO_DAY)
    }
  })
})
