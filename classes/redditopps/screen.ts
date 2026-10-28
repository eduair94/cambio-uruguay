// El filtro barato de la cola: ¿vale la pena gastar una línea del juez en este hilo?
//
// Todo es trabajo de strings sobre lo que ya bajó el listado. Comparte con el bot
// (`classes/redditbot/filter.ts`) las listas de lo que NUNCA se contesta —temas sensibles, pedidos
// de evasión, flairs de meme/política/noticia—, porque las razones son las mismas para una persona
// que para una cuenta automática. Y se diferencia en dos cosas:
//
//  - No exige que el hilo sea "de plata". El sitio también tiene directorios de autos, alquileres,
//    celulares y muebles, y "busco apto en el Cordón" no menciona un peso. El tema lo decide quién
//    genera candidatas (`candidates.ts`).
//  - Acepta pedidos que no son preguntas. "Busco auto usado hasta 8 mil dólares" no lleva signo de
//    pregunta y es exactamente el hilo que hay que contestar con el directorio.
import type { RedditPostRaw } from "../reddit";
import { hasBlockedFlair, isEvasion, isSensitive, looksLikeAQuestion, strip } from "../redditbot/filter";
import { decodeEntities } from "./text";

export type ScreenReason =
  | "nsfw"
  | "stickied"
  | "locked"
  | "removed"
  | "deleted_author"
  | "blocked_flair"
  | "too_short"
  | "already_linked"
  | "sensitive"
  | "evasion"
  | "marketplace_offer"
  | "not_a_request";

export interface ScreenVerdict {
  ok: boolean;
  reason?: ScreenReason;
}

/** Pedidos sin signo de pregunta. Palabra entera, sobre texto ya normalizado. */
const REQUEST =
  /\b(busco|buscando|buscamos|necesito|necesitamos|recomiendan|recomienden|recomendacion|recomendaciones|aconsejan|consejo|consejos|sugerencia|sugerencias|opiniones|que opinan|experiencias? con|ayuda|looking for|any recommendations?|recommend|advice)\b/;

/**
 * Avisos, no pedidos: "Vendo heladera", "Se alquila apto", "Ofrezco clases". Quien publica un aviso
 * no preguntó nada, y contestarle con un enlace a otro directorio es exactamente lo que un
 * moderador borra. Anclado al principio del título, que es donde lo pone todo el mundo.
 */
const OFFER = /^[([]?\s*(vendo|se vende|venta|ofrezco|ofrecemos|regalo|permuto|alquilo|se alquila|doy en alquiler|wts|for sale)\b/;
const OFFER_FLAIR = /\b(vendo|venta|oferta|ofrezco|servicio|servicios)\b/;

/** El texto de un hilo, normalizado, con las entidades de HTML ya resueltas. */
export const opportunityText = (post: Pick<RedditPostRaw, "title" | "selftext">): string =>
  strip(decodeEntities(`${post.title} ${post.selftext}`));

export function screenForOpportunity(post: RedditPostRaw): ScreenVerdict {
  if (post.over18) return { ok: false, reason: "nsfw" };
  if (post.stickied) return { ok: false, reason: "stickied" };
  if (post.locked) return { ok: false, reason: "locked" };
  if (post.removedBy || post.selftext === "[removed]" || post.selftext === "[deleted]") {
    return { ok: false, reason: "removed" };
  }
  if (!post.author || post.author === "[deleted]" || post.author === "AutoModerator") {
    return { ok: false, reason: "deleted_author" };
  }
  if (hasBlockedFlair(post.linkFlair)) return { ok: false, reason: "blocked_flair" };

  const text = opportunityText(post);
  if (text.length < 25) return { ok: false, reason: "too_short" };
  if (text.includes("cambio-uruguay") || text.includes("cambio uruguay .com")) {
    return { ok: false, reason: "already_linked" };
  }
  if (isSensitive(text)) return { ok: false, reason: "sensitive" };
  if (isEvasion(text)) return { ok: false, reason: "evasion" };

  const decodedTitle = decodeEntities(post.title);
  const decodedBody = decodeEntities(post.selftext);
  const asks = looksLikeAQuestion(decodedTitle, decodedBody);

  // "Vendo mi auto, ¿cuánto pido?" sí es un pedido —y lo contesta el tasador—; "Vendo heladera
  // impecable, 15 mil" no. Lo que separa a los dos es la pregunta.
  const offer = OFFER.test(strip(decodedTitle)) || OFFER_FLAIR.test(strip(post.linkFlair || ""));
  if (offer && !asks) return { ok: false, reason: "marketplace_offer" };

  if (!asks && !REQUEST.test(text)) {
    return { ok: false, reason: "not_a_request" };
  }
  return { ok: true };
}
