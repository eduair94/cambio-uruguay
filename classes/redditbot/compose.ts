// Write the comment.
//
// The whole value of this bot rests on one property: the answer has to be worth reading even if
// the reader never clicks. A comment that says "buena pregunta, mirá acá <link>" is spam with extra
// steps — it gives nothing, it takes attention, and subreddits remove it on sight. So the prompt
// puts the answer first and the link last, and `validate.ts` enforces afterwards what the prompt
// only asks for.
//
// Nothing here is grounded (no google_search): the context is text we already retrieved from our
// own pages. Letting the model search would let facts from anywhere leak into a comment that reads
// as if it came from the site.

import { askPlain } from "../gemini";
import type { RetrievedPage } from "../rag/types";
import { contextOf } from "../rag/retrieve";

/** The line that says out loud what this account is. Non-negotiable and checked in validate.ts. */
export const DISCLOSURE = "— bot de cambio-uruguay.com; si me equivoqué, corregime y lo arreglo.";

export interface ComposeInput {
  postTitle: string;
  postBody: string;
  page: RetrievedPage;
  /** Other retrieved pages, used as extra context only — never linked. */
  support: readonly RetrievedPage[];
  url: string;
}

export function buildComposePrompt(input: ComposeInput): string {
  const context = contextOf([input.page, ...input.support], 4500);

  return `Escribís un comentario en Reddit Uruguay, en nombre de cambio-uruguay.com.

PREGUNTA DE LA PERSONA
título: ${input.postTitle}
cuerpo: ${(input.postBody || "(sin cuerpo)").slice(0, 1500)}

CONTEXTO — texto extraído de páginas del sitio. Es tu ÚNICA fuente.
${context}

REGLAS
1. Contestá la pregunta primero, en 3 o 4 oraciones. Concreto, sin rodeos.
2. Español rioplatense, de vos. Nada de "¡Hola! Espero que estés bien" ni de "¡Excelente pregunta!".
3. NO uses ningún número que no aparezca literalmente en el CONTEXTO. Ni cifras, ni porcentajes, ni
   plazos, ni cantidades para enumerar. Si no está en el contexto, no lo escribas.
4. Si el contexto no alcanza para una parte de la pregunta, decilo en una frase corta en vez de
   completarla por tu cuenta.
5. Un solo enlace, exactamente este y al final del cuerpo: ${input.url}
   Presentalo como el lugar donde está el detalle, no como el punto del comentario.
6. Terminá con esta línea exacta, sola en su renglón:
${DISCLOSURE}
7. Entre 60 y 130 palabras en total, sin contar esa línea final.
8. Nada de prometer resultados, ni consejo legal o médico, ni hablar de personas concretas.
9. Sin títulos, sin viñetas, sin negritas. Texto corrido.

Devolvé SOLO el comentario, sin comillas ni explicación.`;
}

/** One attempt. `null` when the model gave nothing. Validation is the caller's job. */
export async function composeReply(input: ComposeInput): Promise<string | null> {
  const text = await askPlain(buildComposePrompt(input));
  if (!text) return null;
  return tidy(text);
}

/**
 * Remove the wrappers models add on their way out: a fenced block, surrounding quotes, a
 * "Comentario:" label. Cheap, and it keeps validate.ts from rejecting good text for cosmetics.
 */
export function tidy(text: string): string {
  let out = text.trim();
  out = out.replace(/^```[a-z]*\s*/i, "").replace(/```\s*$/i, "");
  out = out.replace(/^(comentario|respuesta)\s*:\s*/i, "");
  if (out.length > 1 && out.startsWith('"') && out.endsWith('"')) out = out.slice(1, -1);
  return out.replace(/\n{3,}/g, "\n\n").trim();
}
