// Lo que el hilo YA contestó, antes de que nosotros contestemos.
//
// Hasta ahora el bot leía el título y el cuerpo del post y nada más. Eso alcanza para saber QUÉ se
// preguntó y no alcanza para escribir un comentario que valga la pena, por dos motivos opuestos y
// los dos malos:
//
//  1. **Repetir.** Si el primer comentario ya explicó lo mismo, el nuestro no agrega nada y sí se
//     lee como promoción: llega tarde, dice lo ya dicho y trae un enlace. Es, exactamente, la forma
//     de parecer un bot aunque el texto sea correcto.
//  2. **No corregir.** Medido en el hilo que originó todo esto: alguien preguntó por cuentas
//     remuneradas y el único comentario afirmaba que Prex y Mercado Pago "están todas en el mismo
//     manager de fondo... están con VALO". Es falso —Prex va por VALO con Gletir en el medio,
//     Mercado Pago por BIND AFISA— y corregirlo con la fuente es lo más útil que se puede escribir
//     ahí. El bot no podía: no leía el comentario.
//
// LO QUE ESTO NO ES: una fuente. El texto que vuelve de acá se le muestra al redactor para que sepa
// qué se dijo, y NO entra al conjunto de evidencia contra el que el validador compara las cifras.
// Un comentario de Reddit es precisamente lo que puede estar equivocado —es la razón de ser de este
// módulo—, así que dejar que sus números "justifiquen" una cifra nuestra convertiría el error ajeno
// en una afirmación del sitio.

import { fetchComments, type RedditCommentRaw } from "../reddit";

/** Cuántos comentarios mirar. Los mejores votados; abajo de eso es ruido. */
const MAX_COMMENTS = 8;
/** Por comentario. Un párrafo alcanza para saber qué dijo. */
const MAX_CHARS = 700;

/** Los votos que hacen que un comentario cuente como "lo que el hilo cree". */
const MIN_SCORE = 0;

export interface ThreadContext {
  /** Texto listo para el prompt. Vacío cuando no hay nada que mostrar. */
  text: string;
  /** Cuántos comentarios entraron, para el log. */
  count: number;
}

export const EMPTY_THREAD: ThreadContext = { text: "", count: 0 };

/**
 * Los comentarios que ya están en el hilo, ordenados por voto.
 *
 * Nunca tira: un fallo acá tiene que costar el contexto, no la respuesta. Se llama sólo para el
 * hilo que de verdad vamos a contestar, así que es UNA llamada por comentario publicado.
 */
export async function fetchThreadContext(
  sub: string,
  postId: string,
  ownUsername = ""
): Promise<ThreadContext> {
  let comments: RedditCommentRaw[] = [];
  try {
    comments = await fetchComments(sub, postId);
  } catch (error: any) {
    console.warn(`[redditbot] no pude leer los comentarios del hilo: ${error?.message || error}`);
    return EMPTY_THREAD;
  }

  const own = ownUsername.toLowerCase();
  const usable = comments
    .filter((c) => c.body && c.body.trim().length > 20)
    .filter((c) => !["[deleted]", "[removed]", "automoderator"].includes(c.author?.toLowerCase() ?? ""))
    // Lo nuestro no es "lo que el hilo contestó". Sin esto, una segunda pasada sobre el mismo hilo
    // se leería a sí misma y trataría su propio comentario como algo a no repetir.
    .filter((c) => !own || c.author?.toLowerCase() !== own)
    .filter((c) => c.score >= MIN_SCORE)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_COMMENTS);

  if (!usable.length) return EMPTY_THREAD;

  const text = usable
    .map((c) => `[${c.score >= 0 ? "+" : ""}${c.score} votos] ${c.body.replace(/\s+/g, " ").slice(0, MAX_CHARS)}`)
    .join("\n\n");

  return { text, count: usable.length };
}
