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
  // Segunda tanda (25/11/2026): leídos el título, la fecha y la descripción de cada uno en su
  // propia página de YouTube. Quedaron afuera los Shorts, los de Virgin Galactic (una acción
  // puntual), los relatos de viaje y los que ya están dichos por un video más nuevo del mismo tema.
  {
    videoId: '9B4SuZrEYoE',
    title:
      'El costo oculto de invertir: impuestos, comisiones y gastos que reducen tu rentabilidad',
    publishedAt: '2026-11-19',
    creatorId: 'javier-gutierrez-finanzas',
    pages: [
      '/herramientas/costo-real-de-invertir-afuera',
      '/impuestos-inversiones-uruguay',
      '/herramientas/calculadora-impuestos-inversiones',
      '/inversiones-uruguay',
    ],
    summary:
      'Lo que se come la rentabilidad sin que se vea: comisiones, transferencias internacionales, impuestos y gastos, con los cambios tributarios de Uruguay en 2026.',
    mentionsUs: true,
  },
  {
    videoId: '_QWtZ9UM3o0',
    title: 'Interactive Brokers no es para todos',
    publishedAt: '2026-07-04',
    creatorId: 'javier-gutierrez-finanzas',
    pages: ['/herramientas/costo-real-de-invertir-afuera'],
    summary:
      'Interactive Brokers contra Gletir invirtiendo desde Uruguay: comisiones, el costo de la transferencia internacional y a partir de qué capital empieza a tener sentido cada uno.',
  },
  {
    videoId: 'h8rA-F8kx1U',
    title: 'Prex vs Gletir Global: ¿En Cuál conviene Invertir?',
    publishedAt: '2026-08-27',
    creatorId: 'javier-gutierrez-finanzas',
    pages: ['/inversiones-uruguay'],
    summary:
      'Dos maneras de comprar acciones y ETF desde Uruguay, lado a lado: comisiones, variedad de activos, liquidez y para qué perfil sirve cada una.',
  },
  {
    videoId: '9WGUrZCLEBU',
    title: 'Nueva cuenta remunerada en Uruguay',
    publishedAt: '2026-08-20',
    creatorId: 'javier-gutierrez-finanzas',
    pages: ['/cuenta-remunerada-uruguay', '/letras-de-regulacion-monetaria-uruguay'],
    summary:
      'Itaú, Prex, Mercado Pago y Balance: qué es por dentro una cuenta remunerada (un fondo que compra Letras de Regulación Monetaria), quién administra la plata y por qué no paga IRPF.',
  },
  {
    videoId: 'rYnECsAC2IU',
    title: 'Dónde Invertir Pesos Uruguayos',
    publishedAt: '2025-04-15',
    creatorId: 'javier-gutierrez-finanzas',
    pages: ['/letras-de-regulacion-monetaria-uruguay', '/herramientas/calculadora-plazo-fijo'],
    summary:
      'Plazo fijo, unidades indexadas, fondos y Letras de Regulación Monetaria para un perfil conservador o un fondo de emergencia que le gane a la inflación.',
  },
  {
    videoId: 'tLU35_Fed4k',
    title: 'Cuánto cuesta vivir en Uruguay',
    publishedAt: '2025-08-14',
    creatorId: 'javier-gutierrez-finanzas',
    pages: ['/herramientas/costo-de-vida', '/vivir-con-25000-pesos-uruguay'],
    summary:
      'Un presupuesto de Montevideo armado rubro por rubro: vivienda, transporte, alimentación y el resto, con ejemplos.',
  },
  {
    videoId: 'mMQO5Cfwr-s',
    title: 'Uruguay el país más caro de Latinoamerica',
    publishedAt: '2026-03-13',
    creatorId: 'javier-gutierrez-finanzas',
    pages: ['/herramientas/costo-de-vida'],
    summary:
      'Por qué vivir en Uruguay sale tan caro comparado con la región: qué factores empujan los precios y cómo se siente en el día a día.',
  },
  {
    videoId: '3FuhSxEJM5s',
    title: '¿Comprar o alquilar? ¿Qué es lo que más me conviene?',
    publishedAt: '2025-06-01',
    creatorId: 'javier-gutierrez-finanzas',
    pages: ['/comprar-o-alquilar-uruguay'],
    summary:
      'Los pros y los contras de comprar la casa o seguir alquilando, pensados como una decisión financiera y no sólo como un deseo.',
  },
  {
    videoId: 'ti457AmitSs',
    title: 'Préstamos Hipotecarios en Uruguay',
    publishedAt: '2025-08-07',
    creatorId: 'javier-gutierrez-finanzas',
    pages: ['/prestamo-hipotecario-uruguay'],
    summary:
      'Lo que se subestima al pedir una hipoteca para la casa propia: cuánto tiempo se paga de verdad y la letra chica del contrato.',
  },
  {
    videoId: 'etb9qvJ6enY',
    title: 'La estafa de Prex que casi me hace perder todo (Cuidado).',
    publishedAt: '2026-05-08',
    creatorId: 'javier-gutierrez-finanzas',
    pages: ['/estafas-uruguay'],
    summary:
      'Lo llamaron haciéndose pasar por Prex y por un momento todo parecía real: en qué punto empezó a dudar y qué detalle lo salvó.',
  },
  {
    videoId: 'u9lMiLl4uB8',
    title: 'Si no programas tu año financiero, esto es lo que termina pasando',
    publishedAt: '2026-02-09',
    creatorId: 'javier-gutierrez-finanzas',
    pages: ['/plan-de-vida-uruguay'],
    summary:
      'Cómo programar el año financiero paso a paso, sin fórmulas mágicas, para dejar de improvisar con la plata cada enero.',
  },
])

/**
 * Lo que muestra la portada: el canal que nos mencionó, el video donde lo hizo y otros suyos.
 * El primero de `videoIds` es el de la mención.
 */
export const HOME_CREATOR_FEATURE = Object.freeze({
  creatorId: 'javier-gutierrez-finanzas',
  // 9B4SuZrEYoE primero: ahí nos recomienda hablando, en el video mismo (19/11/2026), y no sólo
  // en la descripción como en el de débito o crédito.
  videoIds: ['9B4SuZrEYoE', '3pr3cvroY6s', 'h8rA-F8kx1U'] as readonly string[],
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
