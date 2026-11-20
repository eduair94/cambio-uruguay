// app/utils/pressMentions.ts
// Menciones de terceros al sitio: quién nos citó, dónde y para decir qué.
//
// Solo entran menciones VERIFICABLES: cada una tiene URL pública al post o nota
// original, autor identificable y cita textual. Nada de "nos recomendaron en
// redes" sin link. Las métricas (likes, vistas) se guardan con la fecha en que
// se leyeron, porque siguen corriendo después.
//
// Regla editorial: la mención se publica tal cual, sin editar la cita, y con
// nuestra respuesta al lado —incluida la parte donde el que nos cita va más lejos
// que nuestros datos—. Una mención no cambia ningún puntaje del ranking.
//
// Módulo PURO (sin Vue/Nuxt): la página y el test comparten la misma fuente.

/** Fecha (YYYY-MM-DD) en que se leyeron las citas y métricas de abajo. */
export const PRESS_MENTIONS_LAST_REVIEWED = '2026-11-13'

export type MentionPlatform = 'x' | 'prensa' | 'reddit' | 'youtube' | 'directorio'

export interface MentionMetric {
  label: string
  value: string
}

export interface PressMention {
  id: string
  /** Rutas del sitio donde corresponde mostrarla (sin locale). */
  pages: readonly string[]
  platform: MentionPlatform
  author: string
  /** Usuario/handle sin arroba, cuando aplica. */
  handle?: string
  /** Quién es, en una línea, para que se entienda por qué importa la mención. */
  authorNote: string
  /** URL del post exacto que nos cita. */
  url: string
  /** URL del hilo/nota completa, si la mención es parte de algo más largo. */
  threadUrl?: string
  /** ISO (YYYY-MM-DD) de publicación. */
  date: string
  /** Cita textual, sin editar. */
  quote: string
  /** De qué venía el hilo o la nota. */
  context: string
  metrics?: readonly MentionMetric[]
  /** Nuestra respuesta: qué confirmamos, qué no, y qué cambió en la página. */
  ourTake: string
  /** Texto del botón al original; por defecto, según la plataforma. */
  linkLabel?: string
  /** Va primera en cada página donde aparece, antes que las más nuevas. */
  featured?: boolean
}

export const PRESS_MENTIONS: readonly PressMention[] = Object.freeze([
  {
    id: 'diario-norte-cotizacion-del-dia-2026-11',
    // La página de la API de datos abiertos la pone arriba: es la prueba de que un medio publica
    // la pizarra todos los días tomándola de acá.
    pages: ['/datos-abiertos-uruguay', '/acerca'],
    platform: 'prensa',
    author: 'Diario NORTE',
    authorNote: 'Diario regional del norte del país, editado en Rivera',
    url: 'https://diarionorte.com.uy/ensenanza/olimpiada-de-robotica-de-ceibal-reunio-a-mas-de-9-200-participantes-y-a-equipos-de-todo-el-pais-79138.html',
    date: '2026-11-12',
    quote: 'Fuente: Banco República (datos vía Cambio-Uruguay.com)',
    context:
      'Es el pie del recuadro «Cotización del día» que Diario NORTE publica en su portada y al costado de cada nota: dólar, dólar eBROU, peso argentino, real, euro y unidad indexada, con compra y venta. El recuadro está en todo el sitio, no en una nota puntual; lo verificamos en la portada y en una nota del 12/11/2026.',
    ourTake:
      'La atribución es exacta: los precios son la pizarra del BROU, y Cambio Uruguay es quien la lee, la normaliza y la publica en una API sin clave. Por eso el pie dice «Banco República» primero y nosotros después, que es el orden correcto: el que fija el precio es el banco. Para el que quiera hacer lo mismo con alquileres, viviendas o autos usados, esa es la idea de /datos-abiertos-uruguay: los mismos números que publica el sitio, gratis y con la licencia por escrito.',
    linkLabel: 'Ver el recuadro en una nota',
    featured: true,
  },
  {
    id: 'javier-gutierrez-finanzas-youtube-2026-11',
    // La portada lo cuenta con sus videos (components/HomeCreatorMention.vue); acá queda con la
    // cita y la respuesta, como las demás.
    pages: ['/acerca'],
    platform: 'youtube',
    author: 'Javier Gutiérrez Finanzas',
    handle: 'JavierGutierrezFinanzas',
    authorNote: 'Canal uruguayo de finanzas personales e inversión',
    url: 'https://www.youtube.com/watch?v=3pr3cvroY6s',
    date: '2026-11-13',
    quote: 'Una referencia para quienes siguen el mundo de las finanzas y la inversión',
    context:
      'Es el título con el que presenta a Cambio Uruguay, con el enlace al sitio, en la descripción de su video «¿Débito o Crédito? Por qué usar la equivocada te cuesta dinero» (publicado el 12/11/2026; la referencia la agregó el 13/11). Contó que la va a sumar también en videos siguientes que traten temas cercanos.',
    ourTake:
      'La relación es recíproca y la decimos: el 12/11 nos pidió entrar al directorio de /videos-de-economia-uruguay, lo sumamos después de leer su feed (con filtro, porque también publica relatos personales que no son de plata) y le preguntamos si podía mencionarnos, sin que una cosa fuera condición de la otra. No hay pago en ningún sentido. Desde ese día, además, sus videos aparecen al lado de las páginas que tratan lo mismo: el de débito o crédito en tarjetas de débito y de crédito, y el de Prex o Gletir en cuenta remunerada e inversiones.',
    linkLabel: 'Ver el video',
  },
  {
    id: 'jentic-api-directory-2026',
    pages: ['/datos-abiertos-uruguay', '/acerca'],
    platform: 'directorio',
    author: 'Jentic',
    authorNote: 'Catálogo de APIs para agentes de IA',
    url: 'https://jentic.com/apis/cambio-uruguay.com/cambio-uruguay',
    date: '2026-11-13',
    quote:
      'The Cambio Uruguay Public API aggregates buy and sell quotes from dozens of Uruguayan exchange houses and banks',
    context:
      'Ficha de la API de cotizaciones en el catálogo público de Jentic, que indexa APIs para que los agentes de IA las puedan llamar: describe las rutas de cotización actual, por casa y de series históricas, y remite a la documentación de cambio-uruguay.com. No tiene fecha propia; la fecha de acá es la del día en que la leímos.',
    ourTake:
      'La descripción es correcta para la API de cotizaciones. Lo que el catálogo todavía no lista es lo que sumamos después: el servidor MCP (29 herramientas, también alquileres, autos y productos) y la API de datos abiertos de precios de alquileres, viviendas y autos usados. Las dos están documentadas en /datos-abiertos-uruguay y en /buscar-con-ia.',
    linkLabel: 'Ver la ficha',
  },
  {
    id: 'alainmizrahi-soy-santander-2026-08',
    // También en el media kit (/publicidad): es la prueba de que el ranking se cita afuera tal
    // como está, que es lo que un anunciante compra cuando NO compra una posición.
    pages: ['/tarjetas-de-credito-uruguay', '/publicidad', '/acerca'],
    platform: 'x',
    author: 'Alain Mizrahi',
    handle: 'alainmizrahi',
    authorNote: 'Cuenta verificada uruguaya, ~20.300 seguidores',
    url: 'https://x.com/alainmizrahi/status/2089187331588682078',
    threadUrl: 'https://x.com/alainmizrahi/status/2089187320406659566',
    date: '2026-08-17',
    quote:
      'Encontré un ranking independiente de 25 tarjetas uruguayas, que le pone 71/100 a Soy Santander y anota lo mismo que yo: canjear sale más caro que comprar por tu cuenta. Entre sus datos y los míos, no queda mucho para defender.',
    context:
      'Cierre de un hilo de cinco tuits en el que comparó, producto por producto, el precio de televisores Samsung en la tienda de canje de Soy Santander contra el de la tienda oficial de Samsung Uruguay: US$ 899 vs US$ 879 en el Neo QLED de 43", US$ 1.049 vs US$ 979 en el de 55", US$ 1.499 vs US$ 1.479 en el de 75" y US$ 2.499 vs US$ 2.179 en el de 85". Su conclusión: el precio de partida del catálogo ya viene inflado, así que el punto vale menos de lo que dice valer.',
    metrics: [
      { label: 'Hilo', value: '54.800 visualizaciones' },
      { label: 'El tuit que nos cita', value: '12.400 visualizaciones' },
    ],
    ourTake:
      'El 71/100 era el puntaje de nuestra rúbrica para Soy Santander cuando escribió el hilo, y la ficha ya listaba en contra que "el catálogo de canje suele estar por encima del precio de mercado". Fuimos a comprobarlo con nuestro propio relevamiento el mismo 17/8/2026, comparando 9 televisores Samsung con modelo coincidente entre la Tienda Soy Santander y la tienda oficial de la marca: 7 salían más caros en Santander (entre +1,1% y +8,7%, mediana +6,3%) y 2 más baratos. O sea: la dirección del reclamo se sostiene, pero no todas sus cifras —en el 85" no encontramos ningún par que dé la diferencia que menciona—, y los dos catálogos corren promos rotativas, así que cualquier comparación es una foto del día. En el camino apareció el dato que mejor lo explica y que no estaba en ninguna parte: los centros de canje no los opera el banco (la Tienda la administra RIOLUX S.A. y Viajes, DIEGAL S.A., con deslinde expreso de Santander sobre venta y posventa). Con eso bajamos el puntaje de canje de 80 a 70 y el programa quedó en 69/100.',
  },
])

/** Menciones que corresponden a una ruta: las destacadas primero y después de la más nueva a la más vieja. */
export function mentionsFor(page: string): PressMention[] {
  return PRESS_MENTIONS.filter(m => m.pages.includes(page)).sort(
    (a, b) =>
      Number(Boolean(b.featured)) - Number(Boolean(a.featured)) || b.date.localeCompare(a.date)
  )
}

export function getPressMention(id: string): PressMention | undefined {
  return PRESS_MENTIONS.find(m => m.id === id)
}

const PLATFORM_LABELS: Readonly<Record<MentionPlatform, string>> = Object.freeze({
  x: 'X (Twitter)',
  prensa: 'Prensa',
  reddit: 'Reddit',
  youtube: 'YouTube',
  directorio: 'Directorio',
})

export function platformLabel(platform: MentionPlatform): string {
  return PLATFORM_LABELS[platform]
}

const LINK_LABELS: Readonly<Record<MentionPlatform, string>> = Object.freeze({
  x: 'Ver el posteo original',
  prensa: 'Ver la nota',
  reddit: 'Ver el hilo original',
  youtube: 'Ver el video',
  directorio: 'Ver la ficha',
})

/** Texto del botón que lleva al original. */
export function mentionLinkLabel(mention: Pick<PressMention, 'platform' | 'linkLabel'>): string {
  return mention.linkLabel ?? LINK_LABELS[mention.platform]
}
