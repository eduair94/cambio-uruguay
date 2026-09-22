// app/utils/mediaKit.ts
// El media kit de /publicidad: a quién llega el sitio, qué formatos se venden y con qué reglas.
//
// SIN CIFRAS. Este repo es público y la regla de la raíz (AGENTS.md) es cero cifras de tráfico o
// ingreso en nada versionado. La audiencia se describe por lo que la gente viene a hacer —comparar
// una cotización, calcular un impuesto, buscar un alquiler— que es lo que un anunciante necesita
// saber para decidir si su producto encaja; el número lo pide por mail y se le manda con fecha.
// `tests/unit/mediaKit.test.ts` falla si a alguien se le escapa una cifra.
//
// La página vende tres formatos y NADA más: la fila patrocinada de la home
// (`SponsoredCasaRow`), la tarjeta patrocinada en un directorio de prestamistas o garantías, y un
// bloque en el newsletter. No se vende la posición en un ranking, ni una reseña, ni una mención
// dentro de una guía: lo dice `MEDIA_KIT_NOT_SOLD`, y /acerca lo dice desde antes ("el orden lo
// determina siempre el precio").
//
// Módulo PURO (sin Vue/Nuxt): la página y el test comparten la misma fuente.

/** Fecha (YYYY-MM-DD) de la última revisión de estas condiciones. */
export const MEDIA_KIT_LAST_REVIEWED = '2026-09-22'

export const MEDIA_KIT_CONTACT_EMAIL = 'admin@cambio-uruguay.com'

/** La etiqueta que lleva TODA unidad paga, la misma clave i18n que usa `AdSlot`. */
export const SPONSORED_LABEL_KEY = 'ads.label'

export interface MediaKitAudience {
  id: string
  title: string
  /** Qué viene a hacer esa gente al sitio. Cualitativo a propósito. */
  text: string
  /** Rutas de ejemplo donde está esa audiencia. */
  routes: readonly string[]
}

export interface MediaKitFormat {
  id: string
  title: string
  /** Dónde aparece, en una línea. */
  where: string
  /** Qué incluye: el bloque, el enlace, la etiqueta. */
  what: string
  /** Para qué anunciante tiene sentido. */
  fitsFor: string
  /** `rel` del enlace saliente: siempre `sponsored`. Se declara para que el test lo exija. */
  rel: 'sponsored'
  /** Ruta del sitio donde vive el formato, si es una página. */
  route?: string
}

export interface MediaKitRule {
  id: string
  title: string
  text: string
}

export const MEDIA_KIT_AUDIENCE: readonly MediaKitAudience[] = Object.freeze([
  {
    id: 'cotizaciones',
    title: 'Gente que va a cambiar plata hoy',
    text: 'Llega buscando la cotización del dólar del día, compara más de 40 casas de cambio y elige una para ir. Es la audiencia con intención de operar más clara del sitio, y la que ve la fila patrocinada de la home.',
    routes: ['/', '/casas-de-cambio', '/historico'],
  },
  {
    id: 'finanzas-personales',
    title: 'Gente que decide sobre su plata',
    text: 'Calcula IRPF, aguinaldo o un préstamo, compara tarjetas y programas de puntos, y lee guías sobre deudas, garantías de alquiler y cobros del exterior. Consulta con un problema concreto y sale con un número.',
    routes: ['/herramientas', '/prestamos-uruguay', '/tarjetas-de-credito-uruguay'],
  },
  {
    id: 'vivienda-y-consumo',
    title: 'Gente que va a alquilar, comprar o equipar',
    text: 'Recorre el directorio de alquileres y ventas, compara precios de electrodomésticos, celulares y autos usados, y vuelve durante semanas mientras decide.',
    routes: ['/alquileres-uruguay', '/equipar-casa-uruguay', '/autos-usados-uruguay'],
  },
])

export const MEDIA_KIT_FORMATS: readonly MediaKitFormat[] = Object.freeze([
  {
    id: 'fila-patrocinada-home',
    title: 'Fila patrocinada en la home',
    where: 'En la portada, debajo del ranking de casas de cambio y separada de él.',
    what: 'Un bloque propio con tu nombre, una línea de oferta y un botón al sitio de destino. Etiquetado "Publicidad", con el dominio de destino impreso y enlace rel="sponsored". Nunca dentro del ranking: el orden de las cotizaciones lo sigue decidiendo el precio.',
    fitsFor:
      'Casas de cambio, bancos y billeteras que quieran estar a la vista de quien va a cambiar hoy.',
    rel: 'sponsored',
    route: '/',
  },
  {
    id: 'tarjeta-patrocinada-directorio',
    title: 'Tarjeta patrocinada en un directorio',
    where:
      'En el directorio de préstamos o en la guía de garantías de alquiler, como tarjeta aparte al pie de la lista.',
    what: 'Una tarjeta con tu oferta y tu enlace, etiquetada "Publicidad", con rel="sponsored". Las tablas y los puntajes del directorio no se tocan: si tu producto está en la comparativa, sigue en el lugar que le dan sus condiciones.',
    fitsFor: 'Prestamistas, garantías de alquiler y seguros que ya publican tasas y condiciones.',
    rel: 'sponsored',
    route: '/prestamos-uruguay',
  },
  {
    id: 'newsletter',
    title: 'Bloque en el newsletter',
    where: 'En la edición diaria del resumen del dólar, después de las cotizaciones.',
    what: 'Un bloque de texto con tu oferta y un enlace, marcado como "Publicidad". Sin adjuntos ni seguimiento propio: se mide con los utm del enlace.',
    fitsFor:
      'Marcas que quieran llegar a lectores que ya eligieron recibir el resumen todos los días.',
    rel: 'sponsored',
    route: '/newsletter',
  },
])

/** Lo que NO se vende, en una línea cada uno. Es lo primero que pregunta un anunciante. */
export const MEDIA_KIT_NOT_SOLD: readonly string[] = Object.freeze([
  'Posiciones en el ranking de cotizaciones: el orden lo determina siempre el precio.',
  'Reseñas, notas o menciones dentro de una guía: el contenido editorial no lleva copia pagada.',
  'Cambios en puntajes, tablas o comparativas: un patrocinio no toca ningún dato.',
  'Formatos que tapan la página: nada fijo, flotante ni intersticial.',
  'Datos de los lectores: no se comparte ninguna información personal.',
])

export const MEDIA_KIT_RULES: readonly MediaKitRule[] = Object.freeze([
  {
    id: 'orden',
    title: 'El patrocinio nunca cambia el orden',
    text: 'Cambio Uruguay es independiente y gratuito: no cobramos por mostrar las cotizaciones ni priorizamos a ninguna casa de cambio a cambio de dinero. El orden lo determina siempre el precio. Un espacio patrocinado es un bloque aparte, nunca una posición.',
  },
  {
    id: 'etiqueta',
    title: 'Toda unidad paga dice "Publicidad"',
    text: 'La etiqueta va visible, en el idioma del lector, en cada bloque patrocinado, con el dominio de destino impreso al lado del enlace. Ningún patrocinio se disfraza de recomendación.',
  },
  {
    id: 'rel-sponsored',
    title: 'Los enlaces pagos llevan rel="sponsored"',
    text: 'Es lo que Google pide para un enlace por el que se pagó, y es lo que hacemos en todos: patrocinios y enlaces de afiliado. No vendemos enlaces "dofollow".',
  },
  {
    id: 'afiliados',
    title: 'Los enlaces de afiliado se avisan al lado',
    text: 'Cuando una guía compara servicios y uno de ellos nos paga una comisión por las cuentas que abran nuestros lectores, el enlace va debajo del texto con el aviso a la vista. La guía dice lo mismo con o sin el enlace.',
  },
  {
    id: 'derecho-a-decir-no',
    title: 'Nos reservamos el derecho a decir que no',
    text: 'No publicamos anuncios de productos que las guías del sitio desaconsejan, ni de servicios sin autorización del BCU cuando la requieren.',
  },
])

export function mediaKitFormat(id: string): MediaKitFormat | undefined {
  return MEDIA_KIT_FORMATS.find(f => f.id === id)
}

/** Todo el texto del media kit, para que el test busque cifras en un solo lugar. */
export function mediaKitTexts(): string[] {
  return [
    ...MEDIA_KIT_AUDIENCE.flatMap(a => [a.title, a.text]),
    ...MEDIA_KIT_FORMATS.flatMap(f => [f.title, f.where, f.what, f.fitsFor]),
    ...MEDIA_KIT_NOT_SOLD,
    ...MEDIA_KIT_RULES.flatMap(r => [r.title, r.text]),
  ]
}
