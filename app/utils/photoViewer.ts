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
