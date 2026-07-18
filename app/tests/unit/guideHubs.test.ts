import { describe, expect, it } from 'vitest'

import { getHub, guideHubs, hubGuides, hubOfGuide, hubSlugs } from '../../utils/guideHubs'
import { getGuide } from '../../utils/guides'
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
      expect(hub.guideSlugs.length).toBeGreaterThanOrEqual(3)
    }
  })

  it('resolves every guideSlug in every hub to a real guide', () => {
    for (const hub of guideHubs) {
      for (const slug of hub.guideSlugs) {
        expect(getGuide(slug), `hub ${hub.slug} → missing guide ${slug}`).toBeDefined()
      }
    }
  })

  it('points every related link and related hub at something valid', () => {
    const hubSet = new Set(hubSlugs())
    for (const hub of guideHubs) {
      for (const link of hub.related ?? []) {
        expect(link.label.trim().length).toBeGreaterThan(0)
        expect(link.to.startsWith('/')).toBe(true)
      }
      for (const other of hub.relatedHubs ?? []) {
        expect(hubSet.has(other), `hub ${hub.slug} → unknown related hub ${other}`).toBe(true)
        expect(other).not.toBe(hub.slug) // no self-reference
      }
    }
  })

  it('covers every Reddit-mined guide in exactly one hub', () => {
    const inHubs = guideHubs.flatMap(h => h.guideSlugs)
    // No guide is placed in two hubs.
    expect(new Set(inHubs).size).toBe(inHubs.length)
    // Every Reddit guide belongs to a hub.
    for (const guide of redditGuides) {
      expect(hubOfGuide(guide.slug), `guide ${guide.slug} is in no hub`).toBeDefined()
    }
    // The hubs contain exactly the Reddit guides, nothing extra.
    expect(new Set(inHubs)).toEqual(new Set(redditGuides.map(g => g.slug)))
  })

  it('exposes helpers consistently', () => {
    for (const slug of hubSlugs()) {
      const hub = getHub(slug)
      expect(hub?.slug).toBe(slug)
      expect(hubGuides(hub!).length).toBe(hub!.guideSlugs.length)
    }
  })
})
