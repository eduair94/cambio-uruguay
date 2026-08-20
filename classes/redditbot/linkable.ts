// Páginas que el bot NUNCA puede enlazar en un comentario.
//
// No es una lista de páginas malas: son páginas buenas que no contestan preguntas. La distinción
// importa porque el recuperador no puede verla. Una página que HABLA de plata en general —el mapa de
// temas, el radar de lo que se discute en Reddit, las estadísticas del sitio— tiene altísima
// afinidad semántica con cualquier hilo donde alguien se queje del costo de vida, y ninguna
// respuesta adentro. Es la peor combinación posible para este bot: gana el coseno justo en los
// hilos vagos, que son exactamente donde no hay nada útil para decir.
//
// EL CASO QUE LA ORIGINA (2026-08-19, r/monte_video, "Ustedes cómo llegan a fin de mes"): el primer
// comentario en vivo de la cuenta nueva. La página ganadora fue `/temas-de-dinero-reddit` con un
// coseno alto, el juez la aprobó con 0,9, el validador la dejó pasar porque no había ninguna cifra
// inventada —no había ninguna cifra— y salió publicado un párrafo que le repetía al autor lo que él
// mismo acababa de escribir, con un enlace al final. Todas las puertas hicieron lo suyo; ninguna
// medía esto. Se borró a mano.
//
// Cada puerta anterior mide algo distinto y ninguna mide esto:
//   - el filtro pregunta si el hilo es de plata (lo era)
//   - la puerta de recuperación pregunta si alguna página se le parece (una se le parecía mucho)
//   - el juez pregunta si esa página es relevante (lo era, para el tema)
//   - el validador pregunta si las cifras tienen fuente (no había cifras que auditar)
//
// Lo que faltaba es la pregunta previa: ¿esta página contesta algo, alguna vez?

/**
 * Prefijos de ruta que no se enlazan nunca.
 *
 * Prefijos y no rutas exactas porque varias son familias (`/newsletter/<fecha>`), y porque una
 * página nueva del mismo tipo va a nacer bajo el mismo prefijo.
 *
 * Hardcodeado y no configurable: no es una preferencia que se calibre, es una propiedad de esas
 * páginas. Una variable de entorno acá significaría que un `.env` mal copiado devuelve al bot a
 * enlazar el mapa de temas.
 */
export const NEVER_LINKED_PREFIXES: readonly string[] = Object.freeze([
  // Meta sobre el propio sitio. Ninguna contesta una pregunta de plata.
  "/estadisticas-del-sitio",
  "/estadisticas-reddit",
  "/analiticas",
  "/estado",
  "/buscar",
  "/mapa-del-sitio",
  "/sitemap",
  "/acerca",
  "/contacto",
  "/privacidad",
  "/terminos",
  "/conectar",
  "/mi-lista",
  // Meta sobre lo que se discute, no sobre lo que hay que hacer. Éstas son las que ganaron el
  // coseno en el hilo que originó el módulo.
  "/temas-de-dinero-reddit",
  "/mapa-de-temas",
  "/temas",
  "/tendencias-uruguay",
  // Noticias y contenido fechado: contestan "qué pasó", no "qué hago". Un comentario que enlaza la
  // nota de ayer envejece mal y se lee como promoción de tráfico.
  "/noticias",
  "/blog",
  "/newsletter",
  "/videos-de-economia-uruguay",
]);

/** ¿Se puede enlazar esta ruta en un comentario? */
export function linkablePage(path: string): boolean {
  if (!path || !path.startsWith("/")) return false;
  const clean = path.split("?")[0]!.split("#")[0]!.replace(/\/+$/, "") || "/";
  // La portada tampoco: enlazar la home es no haber contestado nada.
  if (clean === "/") return false;
  return !NEVER_LINKED_PREFIXES.some((prefix) => clean === prefix || clean.startsWith(`${prefix}/`));
}

/** Las candidatas que sí se pueden enlazar, en el mismo orden. */
export function linkableOnly<T extends { path: string }>(pages: readonly T[]): T[] {
  return pages.filter((page) => linkablePage(page.path));
}
