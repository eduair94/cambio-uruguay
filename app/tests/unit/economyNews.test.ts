import { describe, expect, it } from 'vitest'
import { ECONOMY_TOPICS, topicFeeds } from '../../server/utils/economyNews'

describe('economy news topics', () => {
  it('has unique topic ids', () => {
    const ids = ECONOMY_TOPICS.map(t => t.id)
    expect(new Set(ids).size).toBe(ids.length)
  })

  it('covers the six canonical economic beats', () => {
    const ids = ECONOMY_TOPICS.map(t => t.id).sort()
    expect(ids).toEqual(['bcu', 'comercio_exterior', 'empleo', 'empresas', 'fiscal', 'inflacion'])
  })

  it('builds valid, URL-encoded Uruguay Google News feeds for every topic', () => {
    for (const t of ECONOMY_TOPICS) {
      expect(t.queries.length).toBeGreaterThan(0)
      const feeds = topicFeeds(t)
      expect(feeds.length).toBe(t.queries.length)
      for (const f of feeds) {
        expect(f.startsWith('https://news.google.com/rss/search?q=')).toBe(true)
        expect(f).toContain('hl=es-419')
        expect(f).toContain('gl=UY')
        // queries must be URL-encoded (no raw spaces leak into the URL)
        expect(f.includes(' ')).toBe(false)
      }
    }
  })
})
