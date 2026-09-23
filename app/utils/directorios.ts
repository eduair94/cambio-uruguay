/**
 * El registro de los directorios del sitio, para `/directorios-uruguay`.
 *
 * Un "directorio" acá es una página que lista entidades que RELEVAMOS nosotros —una casa de cambio,
 * un aviso de alquiler, un modelo de celular, una tienda— y que casi siempre tiene una ficha propia
 * por entidad. No entra una guía, por más que compare cosas adentro: la diferencia práctica es que
 * un directorio tiene una cifra que crece y una fecha de actualización, y una guía no.
 *
 * Este archivo es DATO PURO: no importa modelos, no toca la red y no sabe contar. La cifra de cada
 * tarjeta la trae `/api/directorios`, que le pregunta a la misma ruta que usa la página de cada
 * directorio y lee el mismo campo que esa página imprime. Acá vive lo que no cambia: qué compara
 * cada uno, dónde vive y **qué sustantivo lleva su cifra** — que es la palabra que usa su página.
 *
 * El sustantivo importa más de lo que parece. Alquileres tiene propiedades Y avisos, y no son lo
 * mismo (una propiedad publicada en tres portales son tres avisos); autos cuenta avisos y celulares
 * cuenta modelos, que es una unidad completamente distinta. Una tarjeta que dijera "12.480
 * resultados" estaría escondiendo justo eso.
 *
 * Esta página no va a rankear y no se construyó para eso: en este sitio rankea la ficha, no el hub
 * (ver `docs/seo/2026-09-16-directorios-de-producto-plan.md`). Su valor es que un lector que llegó
 * por una sola ficha vea que hay otras trece, y que los directorios queden enlazados entre sí.
 */

/** Las cuatro familias, en el orden en que se muestran. */
export type DirectorioFamilia = 'vivienda' | 'vehiculos' | 'compras' | 'dinero'

export const DIRECTORIO_FAMILIAS: readonly DirectorioFamilia[] = Object.freeze([
  'vivienda',
  'vehiculos',
  'compras',
  'dinero',
])

export const DIRECTORIO_FAMILIA_LABEL: Readonly<Record<DirectorioFamilia, string>> = Object.freeze({
  vivienda: 'Vivienda',
  vehiculos: 'Vehículos',
  compras: 'Compras',
  dinero: 'Dinero y servicios',
})

/** De dónde sale la cifra de un directorio. */
export type DirectorioFuente =
  /** Un job propio la recalcula sola, todos los días. */
  | 'relevado'
  /** Una lista que mantenemos a mano, con su fecha de revisión. */
  | 'curado'
  /**
   * Su página no imprime un total (habla por categoría o por banda), así que el hub tampoco: una
   * cifra que el lector no puede encontrar al hacer clic no se publica.
   */
  | 'sin-cifra'

export interface DirectorioEnlace {
  readonly to: string
  readonly label: string
}

export interface DirectorioEntry {
  /** Clave estable; es la misma que devuelve `/api/directorios`. */
  readonly id: string
  /** Ruta principal del directorio. */
  readonly to: string
  readonly familia: DirectorioFamilia
  readonly titulo: string
  /** Qué compara, en una línea, sin superlativos ni promesas. */
  readonly queCompara: string
  readonly icon: string
  /**
   * Sustantivo de la cifra, en plural. Se muestra pegado al número, así que dice exactamente qué se
   * contó: "avisos" y "propiedades" son cifras distintas del mismo directorio.
   */
  readonly unidad: string
  readonly fuente: DirectorioFuente
  /** Otras páginas del MISMO directorio (la segunda categoría, las oportunidades, la ficha). */
  readonly tambien?: readonly DirectorioEnlace[]
  /**
   * Los análisis y estadísticas que se calculan con los datos de ESTE directorio: el informe, la
   * evolución de precios, el tasador. Sólo la ruta: la etiqueta sale del menú (`siteNav`), que ya la
   * tiene en los tres idiomas, así que un análisis tiene que estar en el menú para figurar acá.
   *
   * Con esto se arma el vínculo en los dos sentidos (`utils/directorioAnalisis.ts`): el directorio
   * lista sus análisis y cada análisis lleva de vuelta a su directorio. Un análisis que sale de
   * varios directorios (CyberLunes lee las ofertas de cuatro) figura en cada uno.
   */
  readonly analisis?: readonly string[]
}

export const DIRECTORIOS: readonly DirectorioEntry[] = Object.freeze([
  {
    id: 'alquileres',
    to: '/alquileres-uruguay',
    familia: 'vivienda',
    titulo: 'Alquileres',
    queCompara:
      'Avisos de alquiler de cuatro portales unidos por propiedad, con la garantía que acepta cada uno como dato.',
    icon: 'mdi-home-city-outline',
    unidad: 'propiedades',
    fuente: 'relevado',
    tambien: Object.freeze([
      { to: '/oportunidades-inmobiliarias-uruguay', label: 'Oportunidades' },
    ]),
    analisis: Object.freeze([
      '/analisis-alquileres-uruguay',
      '/evolucion-precio-alquileres-uruguay',
      '/barrios-alquileres-uruguay',
      '/comparar-portales-de-alquiler-uruguay',
    ]),
  },
  {
    id: 'ventas',
    to: '/venta-viviendas-uruguay',
    familia: 'vivienda',
    titulo: 'Venta de viviendas',
    queCompara:
      'Viviendas en venta publicadas, una ficha por anuncio: nunca una unión inferida entre dos avisos.',
    icon: 'mdi-home-search-outline',
    unidad: 'avisos',
    fuente: 'relevado',
    analisis: Object.freeze(['/evolucion-precio-viviendas-uruguay']),
  },
  {
    id: 'inmobiliarias',
    to: '/inmobiliarias-uruguay',
    familia: 'vivienda',
    titulo: 'Inmobiliarias',
    queCompara:
      'Qué publica cada inmobiliaria, con su nombre público cruzado desde sus propios avisos.',
    icon: 'mdi-account-tie-outline',
    unidad: 'inmobiliarias',
    fuente: 'relevado',
  },
  {
    id: 'autos',
    to: '/autos-usados-uruguay',
    familia: 'vehiculos',
    titulo: 'Autos usados',
    queCompara:
      'Precios por modelo, año, versión y caja — la cohorte fija sin la cual una "ganga" suele ser otra versión.',
    icon: 'mdi-car-outline',
    unidad: 'avisos',
    fuente: 'relevado',
    tambien: Object.freeze([{ to: '/oportunidades-autos-usados-uruguay', label: 'Oportunidades' }]),
    analisis: Object.freeze([
      '/mercado-de-autos-usados-uruguay',
      '/evolucion-precio-autos-usados-uruguay',
      '/autos-chocados-y-con-deuda-uruguay',
      '/cuanto-vale-mi-auto-uruguay',
      '/vender-mi-auto-uruguay',
    ]),
  },
  {
    id: 'motos',
    to: '/motos-usadas-uruguay',
    familia: 'vehiculos',
    titulo: 'Motos usadas',
    queCompara:
      'Precios por modelo y año, con la cilindrada como dato propio cuando el aviso la declara.',
    icon: 'mdi-motorbike',
    unidad: 'avisos',
    fuente: 'relevado',
  },
  {
    id: 'movilidad',
    to: '/monopatines-electricos-uruguay',
    familia: 'vehiculos',
    titulo: 'Monopatines y bicicletas eléctricas',
    queCompara:
      'Precio nuevo y usado, con la normativa de cada departamento al lado y la fuente de cada regla.',
    icon: 'mdi-scooter-electric',
    // Sus dos páginas hablan por banda ("N avisos" por tipo) y no imprimen un total.
    unidad: 'avisos',
    fuente: 'sin-cifra',
    tambien: Object.freeze([
      { to: '/bicicletas-electricas-uruguay', label: 'Bicicletas eléctricas' },
    ]),
    // CyberLunes lee el historial de precio por oferta que escriben equipar, sillas, celulares y
    // movilidad (`pricewatchoffers`): es un análisis de los cuatro.
    analisis: Object.freeze(['/ciberlunes-y-black-friday-uruguay']),
  },
  {
    id: 'celulares',
    to: '/celulares-uruguay',
    familia: 'compras',
    titulo: 'Celulares',
    queCompara:
      'Precio por modelo y almacenamiento, y cuánto costaría el mismo equipo traído de Estados Unidos.',
    icon: 'mdi-cellphone',
    // El job sigue más de cien modelos, pero la página sólo publica los que tienen banda de precio
    // vigente, y lo dice con estas mismas palabras: la tarjeta cuenta lo que el lector va a ver.
    unidad: 'modelos con precio',
    fuente: 'relevado',
    analisis: Object.freeze(['/ciberlunes-y-black-friday-uruguay']),
  },
  {
    id: 'sillas',
    to: '/sillas-escritorio-uruguay',
    familia: 'compras',
    titulo: 'Sillas de escritorio',
    queCompara:
      'Precios por modelo en tiendas uruguayas, con lo que dice r/CharruaDevs de cada una.',
    icon: 'mdi-seat-outline',
    unidad: 'sillas',
    fuente: 'relevado',
    analisis: Object.freeze(['/ciberlunes-y-black-friday-uruguay']),
  },
  {
    id: 'equipar',
    to: '/equipar-casa-uruguay',
    familia: 'compras',
    titulo: 'Equipar una casa',
    queCompara:
      'Qué sale llenar una vivienda vacía, categoría por categoría, con la canasta emparejada y lo que falta.',
    icon: 'mdi-sofa-outline',
    // Habla por categoría; el "38 categorías" de su descripción es el tamaño del registro, no una
    // cifra que el job recalcule.
    unidad: 'categorías',
    fuente: 'sin-cifra',
    tambien: Object.freeze([
      { to: '/equipar-casa-uruguay/productos', label: 'Buscar avisos y armar mi lista' },
    ]),
    analisis: Object.freeze(['/ciberlunes-y-black-friday-uruguay']),
  },
  {
    id: 'tiendas',
    to: '/tiendas-online-uruguay',
    familia: 'compras',
    titulo: 'Tiendas online',
    queCompara:
      'Seis señales por tienda —sitio, antigüedad, reseñas, menciones— cada una con su fuente y su fecha.',
    icon: 'mdi-storefront-outline',
    unidad: 'tiendas',
    fuente: 'relevado',
    // Las ofertas que CyberLunes compara son de estas tiendas: "¿el descuento es real?" es la
    // pregunta que el lector le hace a una tienda.
    analisis: Object.freeze(['/ciberlunes-y-black-friday-uruguay']),
  },
  {
    id: 'precios',
    to: '/precios-de-supermercado-uruguay',
    familia: 'compras',
    titulo: 'Precios de supermercado',
    queCompara:
      'Los precios oficiales del SIPC, comparados por canasta emparejada y no por el total del local.',
    icon: 'mdi-cart-outline',
    unidad: 'artículos',
    fuente: 'relevado',
  },
  {
    id: 'casas',
    to: '/casas-de-cambio',
    familia: 'dinero',
    titulo: 'Casas de cambio',
    queCompara:
      'Cotización, sucursales y reputación de cada casa — el directorio con el que empezó el sitio.',
    icon: 'mdi-bank-outline',
    unidad: 'casas',
    // La cotización es en vivo, pero la LISTA de casas que muestra la comparativa es la investigada a
    // mano (`CASAS_REPUTATION`), y la cifra cuenta lo que el lector va a encontrar al hacer clic.
    fuente: 'curado',
    tambien: Object.freeze([
      { to: '/casa-de-cambio-cerca-de-mi', label: 'Cerca de mí' },
      { to: '/mapa', label: 'En el mapa' },
    ]),
    // Todo lo que se calcula con las pizarras que relevamos cada cinco minutos.
    analisis: Object.freeze([
      '/historico',
      '/analiticas',
      '/ultimos-cambios',
      '/mejor-casa-de-cambio',
      '/estado',
    ]),
  },
  {
    id: 'couriers',
    to: '/couriers-uruguay',
    familia: 'dinero',
    titulo: 'Couriers',
    queCompara: 'Qué cobra cada courier por traer un paquete, con el recargo postal y los plazos.',
    icon: 'mdi-package-variant-closed',
    unidad: 'couriers',
    fuente: 'curado',
  },
  {
    id: 'tarjetas',
    to: '/tarjetas-de-credito-uruguay',
    familia: 'dinero',
    titulo: 'Tarjetas de crédito',
    queCompara: 'Qué devuelve cada programa de puntos, medido en pesos y no en puntos.',
    icon: 'mdi-credit-card-outline',
    unidad: 'programas',
    fuente: 'curado',
    tambien: Object.freeze([
      { to: '/descuentos-con-tarjeta-uruguay', label: 'Descuentos vigentes' },
    ]),
    analisis: Object.freeze([
      '/cuanto-vale-una-milla-itau-uruguay',
      '/que-banco-tiene-mas-descuentos-uruguay',
    ]),
  },
])

/** Las claves que `/api/directorios` puede devolver: las que declaran tener cifra. */
export const DIRECTORIOS_CON_CIFRA: readonly string[] = Object.freeze(
  DIRECTORIOS.filter(entry => entry.fuente !== 'sin-cifra').map(entry => entry.id)
)

/** Una cifra ya resuelta para una tarjeta. `count` nulo = no la pudimos leer; nunca un cero. */
export interface DirectorioCifra {
  readonly count: number | null
  /** Fecha ISO (`YYYY-MM-DD`) del dato, o `null` si la fuente no la declara. */
  readonly asOf: string | null
}

export type DirectorioCifras = Readonly<Record<string, DirectorioCifra>>

/**
 * La cifra publicable de un directorio, o `null`.
 *
 * Un cero NO es una cifra publicable: los directorios de este sitio no están nunca vacíos de verdad,
 * así que un cero siempre significa "no lo pudimos leer" y publicarlo diría algo falso sobre el
 * directorio. La tarjeta se dibuja igual, sin número.
 */
export function directorioCifra(
  cifras: DirectorioCifras | null | undefined,
  id: string
): DirectorioCifra | null {
  const row = cifras?.[id]
  if (!row) return null
  if (row.count == null || !Number.isFinite(row.count) || row.count <= 0) return null
  return row
}

/** Agrupa el registro por familia, conservando el orden declarado en las dos dimensiones. */
export function directoriosPorFamilia(): ReadonlyArray<{
  familia: DirectorioFamilia
  label: string
  entries: readonly DirectorioEntry[]
}> {
  return DIRECTORIO_FAMILIAS.map(familia => ({
    familia,
    label: DIRECTORIO_FAMILIA_LABEL[familia],
    entries: DIRECTORIOS.filter(entry => entry.familia === familia),
  })).filter(group => group.entries.length > 0)
}

/** Todas las rutas que este hub enlaza, principales, secundarias y análisis, sin repetir. */
export function directorioRoutes(): string[] {
  const out: string[] = []
  for (const entry of DIRECTORIOS) {
    if (!out.includes(entry.to)) out.push(entry.to)
    for (const link of entry.tambien ?? []) if (!out.includes(link.to)) out.push(link.to)
    for (const route of entry.analisis ?? []) if (!out.includes(route)) out.push(route)
  }
  return out
}

/**
 * El eslabón que cada página de directorio pone en sus migas entre "Inicio" y su propio nombre:
 * Inicio › Directorios › Celulares. Sale de acá y no de un literal por página para que la ruta y la
 * etiqueta sean las mismas en las catorce, visibles y en JSON-LD. Las fichas (un modelo, una casa,
 * una sucursal) no lo llevan: sus migas mueven más de mil páginas programáticas y son otra decisión.
 */
export const DIRECTORIOS_HUB = Object.freeze({
  path: '/directorios-uruguay',
  label: 'Directorios',
  url: 'https://cambio-uruguay.com/directorios-uruguay',
})

/**
 * El mismo eslabón como `ListItem` de un `BreadcrumbList`, en la posición que le toque. Las páginas
 * trilingües pasan su etiqueta (`nav.directorios`) y su URL localizada; las que sólo existen en
 * español usan los valores por defecto.
 */
export function directoriosHubListItem(
  position: number,
  label: string = DIRECTORIOS_HUB.label,
  url: string = DIRECTORIOS_HUB.url
): Record<string, unknown> {
  return { '@type': 'ListItem', position, name: label, item: url }
}
