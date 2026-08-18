// La línea que firma el post diario, con un enlace que funciona.
//
// Va al final del post que la cuenta publica, y NO va en los comentarios. La división es
// deliberada y viene de dos decisiones distintas:
//
//  - En un post propio la firma es honesta y barata. El post ya es de la cuenta, ocupa su propio
//    espacio, y quien lo lee tiene derecho a saber de dónde salió antes de contestarlo.
//  - En un comentario sería otra cosa. Un comentario con enlace es, para un AutoModerator, un
//    comentario promocional — no importa que el texto sea bueno ni que el enlace esté al pie —, y
//    el pase de comentarios existe justamente para que la cuenta pueda escribir sin promocionar
//    nada. Ahí la transparencia vive en la bio de la cuenta, que es donde Reddit la espera y donde
//    no le cuesta un borrado a cada comentario.
//
// Formato: markdown, en cursiva, en su propio párrafo. El link es explícito con https:// porque
// Reddit no convierte "cambio-uruguay.com" a secas en un enlace clickeable en todos sus clientes, y
// un enlace que no se puede tocar no es un enlace.

export const SITE_URL = "https://cambio-uruguay.com";

/** El texto exacto que se agrega al final de un post propio. */
export const DISCLOSURE_LINE_POST = `*Posteado por el bot de [cambio-uruguay.com](${SITE_URL}), que responde preguntas de plata en Uruguay.*`;

const SEPARATOR = "\n\n";

/**
 * El texto con la firma al final, sin duplicarla si ya estaba.
 *
 * Idempotente a propósito: por el camino del reintento el mismo borrador puede pasar dos veces, y
 * dos firmas seguidas es la clase de detalle que hace que un post se lea como roto.
 */
export function withDisclosure(text: string, line: string = DISCLOSURE_LINE_POST): string {
  const body = text.trim();
  if (!body) return body;
  if (body.includes(line)) return body;
  return `${body}${SEPARATOR}${line}`;
}

/** El texto sin la firma: lo que hay que medir y validar, porque la firma no la escribió el modelo. */
export function stripDisclosure(text: string): string {
  return text.split(DISCLOSURE_LINE_POST).join("").trim();
}
