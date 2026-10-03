// El modelo explicado: qué es un Volkswagen Saveiro (Wikipedia) y videos que lo prueban (YouTube),
// para la ficha de cada aviso y la página de precios del modelo. APP DB `carmodelinfos`, un
// documento por `marketSlug`, público a propósito: todo lo que guarda ya es público en su origen.
//
// Espejo en app/utils/carModelInfo.ts: si cambia la forma, cambian los dos.

export interface CarModelWiki {
  lang: "es" | "en";
  title: string;
  url: string;
  /** El resumen que la propia Wikipedia sirve como introducción (texto plano). */
  extract: string;
  description: string | null;
  thumbnail: string | null;
}

export interface CarModelVideo {
  id: string;
  title: string;
  channel: string;
  channelUrl: string | null;
}

export interface CarModelInfoRecord {
  marketSlug: string;
  brand: string;
  model: string;
  /** Último intento, haya salido bien o no. */
  readAt: string;
  /** null = se buscó y no hay artículo; ausente = todavía no se pudo leer. */
  wiki?: CarModelWiki | null;
  wikiReadAt?: string | null;
  videos: CarModelVideo[];
  videosReadAt: string | null;
  /** Fuentes que fallaron en el último intento: se reintentan antes que el refresco mensual. */
  failures: string[];
}
