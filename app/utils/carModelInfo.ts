// El modelo explicado (Wikipedia + videos de YouTube) que escribe `currency-autos-models`
// (classes/autos/modelInfo/) en APP DB `carmodelinfos`. Espejo de classes/autos/modelInfo/types.ts.
//
// Lo que llega de la base se revalida acá: una URL que no es de Wikipedia o un id que no tiene
// forma de id de YouTube no llega a la página, aunque el documento lo traiga.

export interface PublicCarModelWiki {
  lang: 'es' | 'en'
  title: string
  url: string
  extract: string
  description: string | null
  thumbnail: string | null
}

export interface PublicCarModelVideo {
  id: string
  title: string
  channel: string
  channelUrl: string | null
}

export interface PublicCarModelInfo {
  marketSlug: string
  brand: string
  model: string
  wiki: PublicCarModelWiki | null
  wikiReadAt: string | null
  videos: PublicCarModelVideo[]
  videosReadAt: string | null
}

const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/
const WIKI_URL = /^https:\/\/(es|en)\.wikipedia\.org\/wiki\/[^\s"'<>]+$/
const WIKI_THUMB = /^https:\/\/(upload|thumb)\.wikimedia\.org\/[^\s"'<>]+$/
const CHANNEL_URL = /^https:\/\/www\.youtube\.com\/[^\s"'<>]+$/

const text = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null
  const clean = value.replace(/\s+/g, ' ').trim()
  return clean ? clean.slice(0, max) : null
}

function wikiOf(raw: unknown): PublicCarModelWiki | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const lang = value.lang === 'en' ? 'en' : value.lang === 'es' ? 'es' : null
  const title = text(value.title, 160)
  const url = typeof value.url === 'string' && WIKI_URL.test(value.url) ? value.url : null
  const extract = text(value.extract, 1200)
  if (!lang || !title || !url || !extract || !url.startsWith(`https://${lang}.`)) return null
  const thumbnail =
    typeof value.thumbnail === 'string' && WIKI_THUMB.test(value.thumbnail) ? value.thumbnail : null
  return { lang, title, url, extract, description: text(value.description, 200), thumbnail }
}

function videoOf(raw: unknown): PublicCarModelVideo | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const id = typeof value.id === 'string' && VIDEO_ID.test(value.id) ? value.id : null
  const title = text(value.title, 200)
  const channel = text(value.channel, 120)
  if (!id || !title || !channel) return null
  const channelUrl =
    typeof value.channelUrl === 'string' && CHANNEL_URL.test(value.channelUrl)
      ? value.channelUrl
      : null
  return { id, title, channel, channelUrl }
}

export function validCarModelInfo(raw: unknown): PublicCarModelInfo | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Record<string, unknown>
  const marketSlug = text(value.marketSlug, 120)
  const brand = text(value.brand, 80)
  const model = text(value.model, 80)
  if (!marketSlug || !brand || !model) return null
  const wiki = wikiOf(value.wiki)
  const seen = new Set<string>()
  const videos = (Array.isArray(value.videos) ? value.videos : [])
    .map(videoOf)
    .filter((video): video is PublicCarModelVideo => {
      if (!video || seen.has(video.id)) return false
      seen.add(video.id)
      return true
    })
    .slice(0, 4)
  if (!wiki && !videos.length) return null
  return {
    marketSlug,
    brand,
    model,
    wiki,
    wikiReadAt: wiki ? text(value.wikiReadAt, 40) : null,
    videos,
    videosReadAt: videos.length ? text(value.videosReadAt, 40) : null,
  }
}

/** La miniatura que YouTube sirve para cualquier video público, sin API. */
export const carVideoThumbnail = (id: string): string => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
/** Incrustado sin cookies hasta que la persona le da play. */
export const carVideoEmbed = (id: string): string =>
  `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
export const carVideoUrl = (id: string): string => `https://www.youtube.com/watch?v=${id}`
