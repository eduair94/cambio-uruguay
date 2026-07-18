import { describe, expect, it } from 'vitest'

import { getHub, guideHubs, hubGuides, hubOfGuide, hubSlugs } from '../../utils/guideHubs'
import { getGuide } from '../../utils/guides'
import { parejaGuides } from '../../utils/guidesPareja'
import { redditGuides } from '../../utils/guidesReddit'

describe('guideHubs catalogue integrity', () => {
  it('has unique hub slugs', () => {
    const slugs = guideHubs.map(h => h.slug)
    expect(new Set(slugs).size).toBe(slugs.length)
  })

  it('has required, non-empty top-level fields on every hub', () => {
    for (const hub of guideHubs) {
      expect(hub.slug.trim().length).toBeGreaterThan(0)
      expect(hub.title.trim().length).toBeGreaterThan(0)
      expect(hub.seoTitle.trim().length).toBeGreaterThan(0)
      expect(hub.description.trim().length).toBeGreaterThan(0)
      expect(hub.tag.trim().length).toBeGreaterThan(0)
      expect(hub.icon.startsWith('mdi-')).toBe(true)
      expect(hub.intro.trim().length).toBeGreaterThan(0)
      // A hub is substantial: at least three things to click, guides + resources.
      const items = hub.guideSlugs.length + (hub.resources?.length ?? 0)
      expect(items, `hub ${hub.slug} is too thin`).toBeGreaterThanOrEqual(3)
      expect(hub.guideSlugs.length, `hub ${hub.slug} has no guides`).toBeGreaterThanOrEqual(2)
    }
  })

  it('resolves every guideSlug in every hub to a real guide', () => {
    for (const hub of guideHubs) {
      for (const slug of hub.guideSlugs) {
        expect(getGuide(slug), `hub ${hub.slug} → missing guide ${slug}`).toBeDefined()
      }
    }
  })

  it('points every resource and related hub at something valid', () => {
    const hubSet = new Set(hubSlugs())
    for (const hub of guideHubs) {
      for (const res of hub.resources ?? []) {
        expect(res.label.trim().length).toBeGreaterThan(0)
        expect(res.description.trim().length).toBeGreaterThan(0)
        expect(res.to.startsWith('/')).toBe(true)
      }
      for (const other of hub.relatedHubs ?? []) {
        expect(hubSet.has(other), `hub ${hub.slug} → unknown related hub ${other}`).toBe(true)
        expect(other).not.toBe(hub.slug) // no self-reference
      }
    }
  })

  it('never places the same guide in two hubs', () => {
    const inHubs = guideHubs.flatMap(h => h.guideSlugs)
    expect(new Set(inHubs).size, 'a guide appears in more than one hub').toBe(inHubs.length)
  })

  it('covers every Reddit-mined and couple/family guide in exactly one hub', () => {
    const inHubs = new Set(guideHubs.flatMap(h => h.guideSlugs))
    for (const guide of [...redditGuides, ...parejaGuides]) {
      expect(hubOfGuide(guide.slug), `guide ${guide.slug} is in no hub`).toBeDefined()
      expect(inHubs.has(guide.slug)).toBe(true)
    }
  })

  it('exposes helpers consistently', () => {
    for (const slug of hubSlugs()) {
      const hub = getHub(slug)
      expect(hub?.slug).toBe(slug)
      expect(hubGuides(hub!).length).toBe(hub!.guideSlugs.length)
    }
  })
})
