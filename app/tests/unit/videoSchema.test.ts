// The structured data is the one part of this feature whose only reader is a crawler: a missing
// required field costs a rich result and produces no visible bug for anyone to notice.
import { describe, expect, it } from 'vitest'

import type { VideoItem } from '../../server/models/VideosSnapshot'
import { buildVideoObject, buildVideoPageSchema, SITE_URL } from '../../utils/videoSchema'

function video(over: Partial<VideoItem> = {}): VideoItem {
  return {
    videoId: 'abc123',
    title: 'Por qué sube el dólar',
    description: 'El análisis de la semana.',
    url: 'https://www.youtube.com/watch?v=abc123',
    embedUrl: 'https://www.youtube.com/embed/abc123',
    thumbnail: 'https://i.ytimg.com/vi/abc123/hqdefault.jpg',
    publishedAt: '2026-08-14T12:00:00.000Z',
    channelId: 'UCtest',
    channelKey: 'econ-uy',
    channelName: 'Economía UY',
    channelHandle: '@econuy',
    channelCountry: 'UY',
    views: 12345,
    topics: ['dolar'],
    money: 'money',
    matchedOn: ['dolar'],
    score: 80,
    ...over,
  }
}

describe('buildVideoObject', () => {
  it('carries every field Google requires', () => {
    const schema = buildVideoObject(video())
    expect(schema['@type']).toBe('VideoObject')
    expect(schema.name).toBeTruthy()
    expect(schema.description).toBeTruthy()
    expect(schema.thumbnailUrl[0]).toMatch(/^https:\/\//)
    expect(schema.uploadDate).toBe('2026-08-14T12:00:00.000Z')
    expect(schema.contentUrl).toMatch(/watch\?v=/)
    expect(schema.embedUrl).toMatch(/\/embed\//)
  })

  it('falls back to the title when YouTube gave no description', () => {
    // An empty `description` is a validation error, not a graceful omission — and blank YouTube
    // descriptions are common.
    expect(buildVideoObject(video({ description: '' })).description).toBe('Por qué sube el dólar')
  })

  it('credits the channel as publisher, never this site', () => {
    const schema = buildVideoObject(video())
    expect(schema.publisher).toEqual({ '@type': 'Organization', name: 'Economía UY' })
    expect(JSON.stringify(schema)).not.toContain('Cambio Uruguay')
  })

  it('reports the view count as an interaction, and omits it when there is none', () => {
    expect(buildVideoObject(video()).interactionStatistic).toMatchObject({
      '@type': 'InteractionCounter',
      userInteractionCount: 12345,
    })
    expect(buildVideoObject(video({ views: null })).interactionStatistic).toBeUndefined()
    expect(buildVideoObject(video({ views: 0 })).interactionStatistic).toBeUndefined()
  })

  it('never invents a duration', () => {
    // YouTube's public feed does not carry one, and Google treats it as recommended, not required.
    expect(buildVideoObject(video()).duration).toBeUndefined()
  })
})

describe('buildVideoPageSchema', () => {
  const base = {
    url: `${SITE_URL}/videos-de-economia-uruguay`,
    name: 'Videos de economía',
    description: 'Los videos de economía uruguaya.',
    videos: [video({ videoId: 'a' }), video({ videoId: 'b' })],
    capturedAt: '2026-08-18T10:00:00.000Z',
  }

  function graph(input: Parameters<typeof buildVideoPageSchema>[0]) {
    return buildVideoPageSchema(input)['@graph'] as Array<Record<string, unknown>>
  }

  it('emits one graph with the breadcrumb and the collection page', () => {
    const nodes = graph(base)
    expect(nodes.map(n => n['@type'])).toEqual(['BreadcrumbList', 'CollectionPage'])
  })

  it('numbers the breadcrumb from the site root', () => {
    const [crumbs] = graph(base)
    expect(crumbs!.itemListElement).toEqual([
      { '@type': 'ListItem', position: 1, name: 'Cambio Uruguay', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Videos de economía', item: base.url },
    ])
  })

  it('inserts the parent crumb without breaking the numbering', () => {
    const [crumbs] = graph({
      ...base,
      url: `${SITE_URL}/videos-de-economia-uruguay/dolar`,
      parent: { name: 'Videos de economía', url: `${SITE_URL}/videos-de-economia-uruguay` },
    })
    const positions = (crumbs!.itemListElement as Array<{ position: number }>).map(c => c.position)
    expect(positions).toEqual([1, 2, 3])
  })

  it('publishes the snapshot time as dateModified, and omits it when there is none', () => {
    const [, page] = graph(base)
    expect(page!.dateModified).toBe('2026-08-18T10:00:00.000Z')
    const [, noDate] = graph({ ...base, capturedAt: null })
    expect(noDate!.dateModified).toBeUndefined()
  })

  it('lists the videos in order, one ListItem each', () => {
    const [, page] = graph(base)
    const list = page!.mainEntity as {
      numberOfItems: number
      itemListElement: Array<{ position: number; item: { name: string } }>
    }
    expect(list.numberOfItems).toBe(2)
    expect(list.itemListElement.map(i => i.position)).toEqual([1, 2])
    expect(list.itemListElement[0]!.item.name).toBeTruthy()
  })

  it('survives an empty list rather than emitting a broken ItemList', () => {
    const [, page] = graph({ ...base, videos: [] })
    expect((page!.mainEntity as { numberOfItems: number }).numberOfItems).toBe(0)
  })

  it('adds FAQPage only when questions were passed', () => {
    expect(graph(base).map(n => n['@type'])).not.toContain('FAQPage')
    const withFaq = graph({ ...base, faq: [{ question: '¿Y?', answer: 'Y nada.' }] })
    expect(withFaq.map(n => n['@type'])).toContain('FAQPage')
  })
})
