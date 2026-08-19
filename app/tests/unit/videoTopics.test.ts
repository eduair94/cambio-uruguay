// The topic pages' copy table. Its two ways of going wrong are both invisible in the browser:
// a related link that points at a page that no longer exists (a 404 shipped on 13 pages at once),
// and metadata that Google silently drops for being empty or too long.
import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

import es from '../../i18n/locales/json/es.json'
import { buildSearchIndex } from '../../utils/searchIndex'
import { scoreDocs } from '../../utils/siteNav'
import { getVideoTopicPage, VIDEO_TOPIC_PAGES, videoTopicSlugs } from '../../utils/videoTopics'

const PAGES_DIR = join(__dirname, '..', '..', 'pages')

/** `/herramientas/costo-de-vida` → true when `pages/herramientas/costo-de-vida.vue` exists. */
function routeHasPage(route: string): boolean {
  const rel = route.replace(/^\//, '')
  return existsSync(join(PAGES_DIR, `${rel}.vue`)) || existsSync(join(PAGES_DIR, rel, 'index.vue'))
}

describe('video topic pages', () => {
  it('has unique, url-safe slugs', () => {
    const slugs = videoTopicSlugs()
    expect(slugs.length).toBeGreaterThan(5)
    expect(new Set(slugs).size).toBe(slugs.length)
    for (const slug of slugs) expect(slug).toMatch(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  })

  it('gives every topic the copy the page and the head need', () => {
    for (const topic of VIDEO_TOPIC_PAGES) {
      expect(topic.label, topic.slug).toBeTruthy()
      expect(topic.h1, topic.slug).toBeTruthy()
      expect(topic.seoTitle, topic.slug).toBeTruthy()
      expect(topic.intro.length, topic.slug).toBeGreaterThan(80)
      expect(topic.icon, topic.slug).toMatch(/^mdi-/)
      expect(topic.keywords.length, topic.slug).toBeGreaterThan(2)
    }
  })

  it('keeps every meta description inside the length Google will actually show', () => {
    for (const topic of VIDEO_TOPIC_PAGES) {
      expect(topic.seoDescription.length, topic.slug).toBeGreaterThan(70)
      expect(topic.seoDescription.length, topic.slug).toBeLessThanOrEqual(200)
    }
  })

  it('gives every topic a distinct title and description', () => {
    // Thirteen near-identical pages is the shape Google treats as doorway pages.
    const titles = VIDEO_TOPIC_PAGES.map(t => t.seoTitle)
    const descriptions = VIDEO_TOPIC_PAGES.map(t => t.seoDescription)
    const intros = VIDEO_TOPIC_PAGES.map(t => t.intro)
    expect(new Set(titles).size).toBe(titles.length)
    expect(new Set(descriptions).size).toBe(descriptions.length)
    expect(new Set(intros).size).toBe(intros.length)
  })

  it('only links to pages that exist', () => {
    for (const topic of VIDEO_TOPIC_PAGES) {
      expect(topic.related.length, topic.slug).toBeGreaterThan(1)
      for (const link of topic.related) {
        expect(link.label, `${topic.slug} → ${link.to}`).toBeTruthy()
        expect(link.to, `${topic.slug} → ${link.to}`).toMatch(/^\//)
        expect(routeHasPage(link.to), `${topic.slug} → ${link.to} has a page`).toBe(true)
      }
    }
  })

  it('resolves a known slug and refuses an unknown one', () => {
    expect(getVideoTopicPage('dolar-y-cotizaciones')?.h1).toBeTruthy()
    expect(getVideoTopicPage('no-existe')).toBeUndefined()
  })
})

describe('video topic slugs never hijack the site search', () => {
  // The scorer gives an exact match on the LAST path segment 100 points, ahead of everything else.
  // A topic page at .../inversiones therefore outranks /inversiones-uruguay for the query
  // "inversiones" — measured, not hypothetical: it is why these slugs are two-word phrases
  // ("inversiones-y-bolsa") instead of the bare topic word. This is the guard, not the comment.
  // Built with the REAL Spanish labels, not the usual `t: key => key` stub. Half of what makes a
  // nav page win its query is its translated title ("Economía uruguaya"); with the stub every nav
  // doc is called "nav.economia" and scores nothing, so a stubbed index would report collisions
  // that do not exist and miss the ones that do.
  const t = (key: string): string => {
    const value = key
      .split('.')
      .reduce<unknown>((node, part) => (node as Record<string, unknown> | undefined)?.[part], es)
    return typeof value === 'string' ? value : key
  }
  const docs = buildSearchIndex({ locale: 'es', t })

  it('collides with no other document in the index', () => {
    const lastSegment = (to: string) => to.slice(to.lastIndexOf('/') + 1)
    const others = new Set(
      docs
        .filter(d => d.to && !d.to.startsWith('/videos-de-economia-uruguay'))
        .map(d => lastSegment(d.to!))
    )
    expect(others.size).toBeGreaterThan(50) // the index really was built
    for (const slug of videoTopicSlugs()) {
      expect(others.has(slug), `${slug} collides with another route's last segment`).toBe(false)
    }
  })

  it('never takes the top result away from a topic the site answers in prose', () => {
    // Asserted as "not a video list" rather than as one exact route: what the top hit IS for
    // "impuestos" is the site's own ranking business (today a glossary entry), and pinning it here
    // would make this test fail for reasons that have nothing to do with videos.
    for (const query of ['inversiones', 'impuestos', 'dolar', 'prestamos', 'aduana', 'clearing']) {
      const [top] = scoreDocs(query, docs)
      expect(top?.doc.to, `"${query}" must not land on a video list first`).not.toMatch(
        /^\/videos-de-economia-uruguay/
      )
    }
  })

  it('does take the top spot when the site has no page of its own', () => {
    // The mirror image, asserted so the rule above reads as a boundary and not as "video pages
    // must never rank". Nothing on this site answers "jubilaciones" in prose, and the page closest
    // to "economia uruguaya" is titled just "Economía" — in both cases the video list IS the best
    // answer the corpus has. The day either page is written, this test is what says so.
    expect(scoreDocs('jubilaciones', docs)[0]?.doc.to).toBe(
      '/videos-de-economia-uruguay/jubilaciones-y-afap'
    )
    expect(scoreDocs('economia uruguaya', docs)[0]?.doc.to).toBe(
      '/videos-de-economia-uruguay/macroeconomia-y-bcu'
    )
  })
})
