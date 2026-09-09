/**
 * Una foto que el visor a pantalla completa puede mostrar.
 *
 * Siempre trae su origen: ninguna imagen del sitio es propia — son fotos publicadas por tiendas,
 * portales y anunciantes, y el crédito con enlace al aviso original viaja con cada una.
 */
export interface PhotoViewerMedia {
  url: string
  alt: string
  sourceName: string
  sourceUrl: string
}

/**
 * Una foto que una tarjeta ya tiene a mano, antes de pedir la galería completa.
 *
 * El visor necesita el texto alternativo traducido y numerado, y eso lo arma él; quien pasa la
 * foto sólo aporta lo que sabe: dónde está y de qué aviso salió.
 */
export interface PropertyPhotoRef {
  url: string
  sourceName: string
  sourceUrl: string
}

/**
 * De dónde se traen las fotos que la lista no manda.
 *
 * Ni el directorio de alquileres ni el de ventas mandan la galería en el payload de la búsqueda
 * (ver `rentalPublicPropertyProjection` y `propertySaleSummaryProjection`): son decenas de fotos
 * por tarjeta. Cada superficie dice qué aviso está mirando y el visor pide esa ficha al abrirse.
 */
export type PropertyGallerySource =
  | { kind: 'rental'; key: string; params?: Record<string, unknown> }
  | { kind: 'sale'; key: string }

/** Lo que una tarjeta le pide a la página cuando alguien toca su foto. */
export interface PropertyPreviewRequest {
  title: string
  photos: PropertyPhotoRef[]
  source?: PropertyGallerySource | null
  detailHref?: string
}
