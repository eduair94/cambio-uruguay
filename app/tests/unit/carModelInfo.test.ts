import { describe, expect, it } from 'vitest'
import { carVideoEmbed, validCarModelInfo } from '../../utils/carModelInfo'

const good = {
  marketSlug: 'volkswagen-saveiro',
  brand: 'Volkswagen',
  model: 'Saveiro',
  readAt: '2026-10-03T00:00:00.000Z',
  wiki: {
    lang: 'es',
    title: 'Volkswagen Gol',
    url: 'https://es.wikipedia.org/wiki/Volkswagen_Gol',
    extract: 'El Volkswagen Gol es un automóvil…',
    description: 'modelo de automóvil',
    thumbnail: 'https://upload.wikimedia.org/wikipedia/commons/6/69/Gol.JPG',
  },
  wikiReadAt: '2026-10-03T00:00:00.000Z',
  videos: [
    {
      id: 'c8MmSaOgDlw',
      title: 'Prueba Saveiro',
      channel: 'Autos UY',
      channelUrl: 'https://www.youtube.com/@autos',
    },
  ],
  videosReadAt: '2026-10-03T00:00:00.000Z',
  failures: [],
}

describe('validCarModelInfo', () => {
  it('keeps a well-formed document', () => {
    const info = validCarModelInfo(good)
    expect(info?.wiki?.title).toBe('Volkswagen Gol')
    expect(info?.videos).toHaveLength(1)
  })

  it('drops a link that is not Wikipedia and an id that is not a YouTube id', () => {
    const info = validCarModelInfo({
      ...good,
      wiki: { ...good.wiki, url: 'https://evil.example/wiki/x' },
      videos: [
        { id: 'javascript:alert(1)', title: 'x', channel: 'y' },
        ...good.videos,
        good.videos[0],
      ],
    })
    expect(info?.wiki).toBeNull()
    expect(info?.videos.map(video => video.id)).toEqual(['c8MmSaOgDlw'])
  })

  it('refuses a language that does not match the host and a thumbnail off Wikimedia', () => {
    const info = validCarModelInfo({
      ...good,
      wiki: { ...good.wiki, lang: 'en', thumbnail: 'https://tracker.example/pixel.gif' },
    })
    expect(info?.wiki).toBeNull()
    const thumbless = validCarModelInfo({
      ...good,
      wiki: { ...good.wiki, thumbnail: 'https://tracker.example/pixel.gif' },
    })
    expect(thumbless?.wiki?.thumbnail).toBeNull()
  })

  it('is null when there is nothing to show', () => {
    expect(validCarModelInfo({ ...good, wiki: null, videos: [] })).toBeNull()
    expect(validCarModelInfo(null)).toBeNull()
    expect(validCarModelInfo({ brand: 'x' })).toBeNull()
  })

  it('embeds without cookies', () => {
    expect(carVideoEmbed('c8MmSaOgDlw')).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\//)
  })
})
