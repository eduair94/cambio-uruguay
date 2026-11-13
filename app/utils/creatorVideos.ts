// app/utils/creatorVideos.ts
// Videos de creadores uruguayos que embebemos A MANO en páginas del sitio, al lado del tema que
// tratan, para mandarles audiencia.
//
// No es /videos-de-economia-uruguay: aquel listado lo arma solo el feed de cada canal
// (`classes/videos/`) y se renueva varias veces por día. Esto es lo contrario: pocos videos,
// elegidos uno por uno porque contestan la MISMA pregunta que la página donde aparecen
// ("¿débito o crédito?" en la página de tarjetas de débito). Un video que no es del tema de la
// página no entra aunque sea bueno: un embed suelto es ruido y además le resta al creador, que
// recibe visitas que no vinieron a verlo.
//
// Por qué así y no de otra forma:
//   - El reproductor es la fachada de `components/videos/Embed.vue`: cero bytes de YouTube hasta
//     que alguien aprieta play, y desde youtube-nocookie.com. La reproducción embebida cuenta como
//     vista del creador igual que una en youtube.com.
//   - Los enlaces al canal y a los videos salen SIN `noreferrer` (ver los componentes): así YouTube
//     Analytics le muestra al creador que esas visitas vinieron de cambio-uruguay.com. Con
//     `noreferrer` la visita llega como "directa" y el creador no sabe de dónde salió.
//   - Ningún creador paga por estar acá ni le pagamos: la relación es recíproca y se dice en la
//     página (`relationship`).
//
// Para agregar un video: leer el feed del canal
// (`https://www.youtube.com/feeds/videos.xml?channel_id=<id>`), copiar el id, el título TAL CUAL y
// la fecha de publicación, y anotar en qué páginas responde a la pregunta de la página. Nada de
// Shorts (no se embeben como video normal) ni de videos sobre una acción puntual: este sitio no
// recomienda papeles.
//
// Módulo PURO (sin Vue/Nuxt): los componentes y el test comparten la misma fuente.

export interface Creator {
  id: string
  name: string
  /** Handle de YouTube con arroba. */
  handle: string
  /** `UC…` del canal; el mismo que usa `classes/videos/channels.ts`. */
  channelId: string
  /** Quién es, en una línea. */
  blurb: string
  /** Cómo es la relación con el sitio, dicho en la página. */
  relationship: string
}

export interface CreatorVideo {
  /** Id de YouTube (11 caracteres). */
  videoId: string
  /** Título tal cual lo publicó el creador. */
  title: string
  /** YYYY-MM-DD de publicación en YouTube. */
  publishedAt: string
  creatorId: string
  /** Rutas del sitio (sin locale) donde contesta la pregunta de la página. */
  pages: readonly string[]
  /** Qué aporta el video en una línea, escrita por nosotros. */
  summary: string
  /** El creador nos menciona en este video o en su descripción. */
  mentionsUs?: boolean
}

export const CREATORS: readonly Creator[] = Object.freeze([
  {
    id: 'javier-gutierrez-finanzas',
    name: 'Javier Gutiérrez Finanzas',
    handle: '@JavierGutierrezFinanzas',
    channelId: 'UC_1NE9RUSIvNIMUD3COfp7A',
    blurb:
      'Canal uruguayo de finanzas personales, inversión y psicología del dinero: débito o crédito, dónde dejar los ahorros y los errores de conducta que más cuestan.',
    relationship:
      'Canal independiente: no le pagamos ni nos paga. Nos mencionó en sus videos y nosotros recomendamos los suyos donde tratan el mismo tema que la página.',
  },
])

export const CREATOR_VIDEOS: readonly CreatorVideo[] = Object.freeze([
  {
    videoId: '3pr3cvroY6s',
    title: '¿Débito o Crédito? Por qué usar la equivocada te cuesta dinero',
    publishedAt: '2026-11-12',
    creatorId: 'javier-gutierrez-finanzas',
    pages: [
      '/tarjetas-de-debito-uruguay',
      '/tarjetas-de-credito-uruguay',
      '/conviene-pagar-todo-con-credito-uruguay',
    ],
    summary:
      'Las diferencias entre pagar con débito y con crédito: seguridad, comisiones que no se ven y cuándo la tarjeta equivocada te cuesta plata.',
    mentionsUs: true,
  },
  {
    videoId: 'he3SyAROyxU',
    title: '¿Prex o Gletir? Cuál es la mejor opción para tus ahorros',
    publishedAt: '2026-10-22',
    creatorId: 'javier-gutierrez-finanzas',
    pages: ['/cuenta-remunerada-uruguay', '/inversiones-uruguay'],
    summary:
      'La cuenta remunerada de Prex contra el Fondo Centenario de Liquidez de Gletir: costos, liquidez y qué mirar antes de dejar tus pesos en uno u otro.',
  },
  {
    videoId: 'J_RgnwX6j4A',
    title: '¿Volvemos a cometer los mismos errores? | El lado humano del dinero #6',
    publishedAt: '2026-11-01',
    creatorId: 'javier-gutierrez-finanzas',
    pages: ['/inversiones-uruguay'],
    summary:
      'Psicología del inversor en primera persona: cómo los recuerdos y las emociones empujan a repetir las mismas decisiones con la plata.',
  },
])

/**
 * Lo que muestra la portada: el canal que nos mencionó, el video donde lo hizo y otros suyos.
 * El primero de `videoIds` es el de la mención.
 */
export const HOME_CREATOR_FEATURE = Object.freeze({
  creatorId: 'javier-gutierrez-finanzas',
  videoIds: ['3pr3cvroY6s', 'he3SyAROyxU', 'J_RgnwX6j4A'] as readonly string[],
})

export function getCreator(id: string): Creator | undefined {
  return CREATORS.find(c => c.id === id)
}

export function getCreatorVideo(videoId: string): CreatorVideo | undefined {
  return CREATOR_VIDEOS.find(v => v.videoId === videoId)
}

/** Videos para una ruta (sin locale), del más nuevo al más viejo. */
export function creatorVideosFor(page: string): CreatorVideo[] {
  return CREATOR_VIDEOS.filter(v => v.pages.includes(page)).sort((a, b) =>
    b.publishedAt.localeCompare(a.publishedAt)
  )
}

export function channelUrl(creator: Pick<Creator, 'handle'>): string {
  return `https://www.youtube.com/${creator.handle}`
}

/** Abre directamente el diálogo de "Suscribirse" de YouTube. */
export function subscribeUrl(creator: Pick<Creator, 'handle'>): string {
  return `${channelUrl(creator)}?sub_confirmation=1`
}

export function videoUrl(video: Pick<CreatorVideo, 'videoId'>): string {
  return `https://www.youtube.com/watch?v=${video.videoId}`
}

/** `hqdefault` es el único tamaño que YouTube garantiza para todo video (ver `videos/Embed.vue`). */
export function videoThumbnail(video: Pick<CreatorVideo, 'videoId'>): string {
  return `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`
}

/**
 * 2026-11-12 → "12 de noviembre de 2026" (o su forma en el idioma de la página).
 *
 * La hora y la zona van fijas: sin eso el servidor formatea en UTC y el navegador en la zona del
 * lector, y cerca de medianoche son dos días distintos y un error de hidratación.
 */
export function formatVideoDate(iso: string, locale = 'es'): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(`${iso}T12:00:00Z`))
}
