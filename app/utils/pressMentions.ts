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
export const PRESS_MENTIONS_LAST_REVIEWED = '2026-08-17'

export type MentionPlatform = 'x' | 'prensa' | 'reddit' | 'youtube'

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
}

export const PRESS_MENTIONS: readonly PressMention[] = Object.freeze([
  {
    id: 'alainmizrahi-soy-santander-2026-08',
    pages: ['/tarjetas-de-credito-uruguay'],
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

/** Menciones que corresponden a una ruta, de la más nueva a la más vieja. */
export function mentionsFor(page: string): PressMention[] {
  return PRESS_MENTIONS.filter(m => m.pages.includes(page)).sort((a, b) =>
    b.date.localeCompare(a.date)
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
})

export function platformLabel(platform: MentionPlatform): string {
  return PLATFORM_LABELS[platform]
}
