// Los videos nuevos de la lista de `/videos-de-economia-uruguay`, tuiteados por la cuenta de X del
// sitio: un feed RSS (`/feeds/videos.xml`) que IFTTT lee cada 5 minutos y publica con el applet
// "RSS Feed → X (Twitter): Post a tweet". Guía: `docs/app/X_FEED.md`, "Videos nuevos".
//
// Mismo camino que `/feeds/x.xml` (sin job, sin credenciales de X, sin modelo de lenguaje). Lo
// distinto es que acá no hay un turno por día: hay los videos que suben los canales, y el feed
// decide cuáles salen y cuándo para que la cuenta no tuitee cuatro videos en el mismo minuto.
//
// SIN ESTADO a propósito. Cada video tiene su hora de salida calculada sólo con lo que trae el
// snapshot (fecha de publicación, canal, id), así que el feed de las 15:00 y el de las 15:05 dicen
// lo mismo sobre lo que ya salió, y el `guid` (el id del video) hace que IFTTT no repita nada.
//
// PURO (sin Vue/Nuxt): lo usan la ruta del feed y los tests.

import { LINKEDIN_SITE, cdata, escapeXml } from './linkedinPosts'
import { TCO_URL_LENGTH, TWEET_LIMIT, tweetLength } from './xPosts'
import { getVideoTopicPage } from './videoTopics'

/** Lo que el feed necesita de cada video del snapshot (`VideoItem`). */
export interface TweetableVideo {
  videoId: string
  title: string
  publishedAt: string
  channelKey: string
  channelName: string
  channelCountry: string
  topics: string[]
  money: 'money' | 'maybe' | 'no'
}

export interface ScheduledVideo {
  video: TweetableVideo
  /** Cuándo sale (UTC). */
  at: Date
}

/**
 * Cuánto después de publicado sale el tuit. `currency-videos` relee los canales cada hora (a los
 * :26), así que a los 90 minutos el video ya está en el snapshot aunque el feed de YouTube haya
 * tardado en mostrarlo.
 */
export const VIDEO_TWEET_LAG_MINUTES = 90
/** Tope por día de Montevideo. Medido el 13/11/2026: entran de 1 a 4 videos relacionados por día. */
export const VIDEO_TWEETS_PER_DAY = 4
/** Separación mínima entre dos tuits de video. */
export const VIDEO_TWEET_GAP_MINUTES = 60
/** Desde esta hora de Montevideo no sale nada... */
export const VIDEO_QUIET_FROM_MINUTE = 23 * 60
/** ...hasta esta: lo que se publicó de noche sale a las 8:30. */
export const VIDEO_MORNING_MINUTE = 8 * 60 + 30

/**
 * Cómo se nombra cada tema adentro del tuit ("la lista de videos sobre ..."). Un mapa explícito y
 * no el H1 recortado: dos H1 no siguen el molde ("Videos de finanzas personales para uruguayos").
 * El test exige una frase por cada tema de `VIDEO_TOPIC_PAGES`.
 */
export const VIDEO_TWEET_TOPIC: Readonly<Record<string, string>> = Object.freeze({
  'dolar-y-cotizaciones': 'el dólar',
  'inflacion-y-precios': 'inflación y precios',
  'impuestos-y-dgi': 'impuestos',
  'jubilaciones-y-afap': 'jubilaciones y AFAP',
  'sueldos-y-trabajo': 'sueldos y trabajo',
  'creditos-y-deudas': 'créditos y deudas',
  'vivienda-y-alquileres': 'vivienda y alquileres',
  'criptomonedas-y-bitcoin': 'criptomonedas',
  'importar-y-aduana': 'importar y aduana',
  'inversiones-y-bolsa': 'inversiones',
  'ahorro-y-finanzas-personales': 'finanzas personales',
  'emprender-y-negocios': 'emprender y negocios',
  'macroeconomia-y-bcu': 'la economía uruguaya',
})

const MINUTE_MS = 60_000
const DAY_MS = 86_400_000
/** Montevideo es UTC-3 todo el año (sin horario de verano desde 2015). */
const MVD_OFFSET_MS = 3 * 3_600_000

const MESES =
  'enero|febrero|marzo|abril|mayo|junio|julio|agosto|setiembre|septiembre|octubre|noviembre|diciembre'

/**
 * Un título con la fecha COMPLETA es un programa que sale todos los días ("Hoy en el Diario Oficial
 * • 13 de noviembre 2026", "Entrevista ... | 20260717"): tuitearlo sería tuitear lo mismo a diario.
 * Un día sin año ("antes del 26 de Octubre") es contenido y pasa.
 */
const DATED_PROGRAM = new RegExp(
  `\\b\\d{1,2} de (?:${MESES})(?: de)? \\d{4}\\b|\\b20\\d{2}(?:0[1-9]|1[0-2])\\d{2}\\b|\\b\\d{1,2}/\\d{1,2}/\\d{2,4}\\b`,
  'i'
)

/** Si el video es "relacionado": canal uruguayo, de plata según el clasificador y con tema. */
export function videoIsTweetable(v: TweetableVideo): boolean {
  return (
    v.channelCountry === 'UY' &&
    v.money === 'money' &&
    v.topics.length > 0 &&
    !DATED_PROGRAM.test(v.title)
  )
}

/** El título del canal sin hashtags (en X serían nuestros) ni separadores colgando al final. */
export function cleanVideoTitle(title: string): string {
  return title
    .replace(/(^|\s)#[\p{L}\p{N}_]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/[\s|•·:,;\-–—]+$/u, '')
    .trim()
}

// ---- cuándo sale cada uno ----------------------------------------------------------------------

const mvdDay = (t: number) => new Date(t - MVD_OFFSET_MS).toISOString().slice(0, 10)
const mvdMinute = (t: number) => {
  const local = new Date(t - MVD_OFFSET_MS)
  return local.getUTCHours() * 60 + local.getUTCMinutes()
}
/** El instante de `minute` (minutos desde las 0:00) del día `day` de Montevideo. */
const mvdAt = (day: string, minute: number) =>
  Date.parse(`${day}T00:00:00Z`) + MVD_OFFSET_MS + minute * MINUTE_MS
const shiftDay = (day: string, n: number) =>
  new Date(Date.parse(`${day}T12:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10)

/** La primera hora a la que puede salir: 90 min después, o las 8:30 si cae de noche. */
function earliestAt(v: TweetableVideo): number {
  const t = Date.parse(v.publishedAt) + VIDEO_TWEET_LAG_MINUTES * MINUTE_MS
  const minute = mvdMinute(t)
  if (minute >= VIDEO_QUIET_FROM_MINUTE) return mvdAt(shiftDay(mvdDay(t), 1), VIDEO_MORNING_MINUTE)
  if (minute < VIDEO_MORNING_MINUTE) return mvdAt(mvdDay(t), VIDEO_MORNING_MINUTE)
  return t
}

/**
 * La agenda de un día de Montevideo. Cada día se calcula solo, con los videos cuya primera hora
 * posible cae ese día, así que correr la ventana de días no mueve lo que ya salió.
 *
 * El orden es por hora y desempata por fecha de publicación e id, nunca por el puntaje del
 * snapshot: el puntaje cambia con las vistas entre una lectura y otra, y reordenaría lo ya
 * publicado. Lo que no entra en el día (quinto video, segundo del mismo canal, o después de las 23)
 * no pasa al día siguiente: se queda en la página, sin tuit.
 */
function scheduleDay(day: string, candidates: Array<{ v: TweetableVideo; at: number }>) {
  const todays = candidates
    .filter(c => mvdDay(c.at) === day)
    .sort(
      (a, b) =>
        a.at - b.at ||
        Date.parse(a.v.publishedAt) - Date.parse(b.v.publishedAt) ||
        a.v.videoId.localeCompare(b.v.videoId)
    )
  const out: ScheduledVideo[] = []
  const channels = new Set<string>()
  let last: number | null = null
  for (const c of todays) {
    if (out.length >= VIDEO_TWEETS_PER_DAY) break
    if (channels.has(c.v.channelKey)) continue
    const at: number =
      last === null ? c.at : Math.max(c.at, last + VIDEO_TWEET_GAP_MINUTES * MINUTE_MS)
    if (mvdDay(at) !== day || mvdMinute(at) >= VIDEO_QUIET_FROM_MINUTE) break
    channels.add(c.v.channelKey)
    out.push({ video: c.v, at: new Date(at) })
    last = at
  }
  return out
}

/**
 * Qué videos ya salieron en `now` (los de hoy y los dos días anteriores, lo nuevo primero) y cuándo
 * sale el próximo que ya está programado (para la caché del borde).
 */
export function scheduleVideoTweets(
  videos: readonly TweetableVideo[],
  now: Date
): { released: ScheduledVideo[]; nextAt: Date | null } {
  const today = mvdDay(now.getTime())
  const days = [-2, -1, 0, 1].map(n => shiftDay(today, n))
  const candidates = videos
    .filter(videoIsTweetable)
    .filter(v => Number.isFinite(Date.parse(v.publishedAt)))
    .map(v => ({ v, at: earliestAt(v) }))
    .filter(c => days.includes(mvdDay(c.at)))

  const all = days.flatMap(day => scheduleDay(day, candidates))
  const released = all
    .filter(s => s.at.getTime() <= now.getTime())
    .sort((a, b) => b.at.getTime() - a.at.getTime())
  const pending = all.filter(s => s.at.getTime() > now.getTime())
  const nextAt = pending.length ? new Date(Math.min(...pending.map(s => s.at.getTime()))) : null
  return { released, nextAt }
}

// ---- el texto ----------------------------------------------------------------------------------

/** Una cifra estable por video, para rotar las redacciones sin depender del día. */
function variantOf(id: string, n: number): number {
  let h = 0
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0
  return h % n
}

const REDACCIONES: ReadonlyArray<(title: string, channel: string, topic: string) => string> = [
  (title, channel, topic) =>
    `Video nuevo de ${channel}: «${title}»\n\nLo sumamos a nuestra lista de videos sobre ${topic}, con lo último de los canales uruguayos.`,
  (title, channel, topic) =>
    `${channel} publicó «${title}».\n\nEstá en la lista de videos sobre ${topic}, junto a lo que subieron otros canales uruguayos.`,
  (title, channel, topic) =>
    `Para ver: «${title}», de ${channel}.\n\nY lo demás que se publicó sobre ${topic} en canales uruguayos, en una sola página.`,
]

export interface VideoTweet {
  /** El tuit sin la URL. */
  text: string
  url: string
  /** El tuit tal como se publica: el texto y la URL al pie. */
  message: string
}

/** El tuit de un video: título del canal, de quién es y a qué página del sitio lleva. */
export function videoTweet(v: TweetableVideo): VideoTweet {
  const slug = v.topics.find(t => getVideoTopicPage(t)) ?? null
  const url = slug
    ? `${LINKEDIN_SITE}/videos-de-economia-uruguay/${slug}#video-${v.videoId}`
    : `${LINKEDIN_SITE}/videos-de-economia-uruguay`
  const topic = (slug && VIDEO_TWEET_TOPIC[slug]) || 'economía'
  const write = REDACCIONES[variantOf(v.videoId, REDACCIONES.length)]!
  const channel = v.channelName.trim()

  let title = cleanVideoTitle(v.title) || v.title.trim()
  let text = write(title, channel, topic)
  // X cuenta la URL como 23 más el salto de línea doble que la separa.
  const budget = TWEET_LIMIT - TCO_URL_LENGTH - 2
  if (tweetLength(text) > budget) {
    const over = tweetLength(text) - budget
    title = `${title.slice(0, Math.max(10, title.length - over - 1)).trimEnd()}…`
    text = write(title, channel, topic)
  }
  return { text, url, message: `${text}\n\n${url}` }
}

// ---- el feed -----------------------------------------------------------------------------------

/**
 * Cache-Control del feed (la regla de Cloudflare de `/feeds/*` respeta `s-maxage`): hasta el
 * próximo video programado, entre 1 y 15 minutos. Quince como techo porque un video nuevo puede
 * entrar al snapshot en cualquier lectura horaria y su tuit no debería esperar más que eso.
 */
export function videoFeedCacheControl(now: Date, nextAt: Date | null): string {
  const until = nextAt ? Math.round((nextAt.getTime() - now.getTime()) / 1000) : 900
  const ttl = Math.min(900, Math.max(60, until))
  return `public, max-age=0, s-maxage=${ttl}, stale-while-revalidate=3600, stale-if-error=86400`
}

/** RSS 2.0 con los videos que ya salieron, el más nuevo primero. */
export function renderVideosFeed(released: readonly ScheduledVideo[], now: Date): string {
  const items = released.flatMap(({ video, at }) => {
    const tweet = videoTweet(video)
    return [
      '<item>',
      `<title>${escapeXml(cleanVideoTitle(video.title) || video.title)}</title>`,
      `<link>${escapeXml(tweet.url)}</link>`,
      `<guid isPermaLink="false">cambio-uruguay-video-${escapeXml(video.videoId)}</guid>`,
      `<pubDate>${at.toUTCString()}</pubDate>`,
      `<description>${cdata(tweet.message)}</description>`,
      '</item>',
    ]
  })
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    '<channel>',
    '<title>Cambio Uruguay: videos nuevos de economía</title>',
    `<link>${LINKEDIN_SITE}/videos-de-economia-uruguay</link>`,
    `<atom:link href="${LINKEDIN_SITE}/feeds/videos.xml" rel="self" type="application/rss+xml"/>`,
    '<description>Los videos nuevos de canales uruguayos sobre el dólar, precios, impuestos, sueldos e inversiones.</description>',
    '<language>es-UY</language>',
    `<lastBuildDate>${now.toUTCString()}</lastBuildDate>`,
    '<ttl>5</ttl>',
    ...items,
    '</channel>',
    '</rss>',
    '',
  ].join('\n')
}
