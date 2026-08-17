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

import { askText, askTextWithImage } from "../ai_text";
import type { RetrievedPage } from "../rag/types";
import { contextOf } from "../rag/retrieve";

/** The line that says out loud what this account is. Non-negotiable and checked in validate.ts. */
export const DISCLOSURE = "— bot de cambio-uruguay.com; si me equivoqué, corregime y lo arreglo.";

/**
 * Voice rules, sent as a system hint rather than buried in the prompt.
 *
 * The Claude endpoint runs on a box whose `caveman` plugin clips every reply to telegraphic
 * fragments; `classes/claude.ts` already counters that generically, and this adds the specific
 * register a Reddit comment needs on top. Kept separate from the task prompt so the same wording
 * applies to the retry, which reuses the prompt but not necessarily the conversation.
 */
export const VOICE =
  "Escribís comentarios de Reddit en español rioplatense, de vos. Prosa natural y completa, " +
  "oraciones bien formadas, tono de alguien que sabe del tema y contesta sin vueltas. Nunca " +
  "telegráfico, nunca en viñetas, nunca con encabezados.";

export interface ComposeInput {
  postTitle: string;
  postBody: string;
  page: RetrievedPage;
  /** Other retrieved pages, used as extra context only — never linked. */
  support: readonly RetrievedPage[];
  url: string;
  /**
   * The post's image, when it has one. Handed to whichever provider is active — Claude reads it off
   * a workspace file, Gemini takes the bytes inline.
   */
  image?: { data: Buffer; mimeType: string; ext: string };
  /** Told to the model in the prompt so it knows an attachment exists even on the text-only path. */
  imageNote?: string;
}

export function buildComposePrompt(input: ComposeInput): string {
  const context = contextOf([input.page, ...input.support], 4500);

  return `Estás por comentar en un hilo de Reddit Uruguay. Escribís en nombre de cambio-uruguay.com,
pero el comentario tiene que leerse como el de alguien que sabe del tema y se tomó dos minutos para
contestar — no como una respuesta genérica pegada desde una página.

LO QUE ESCRIBIÓ LA PERSONA
título: ${input.postTitle}
cuerpo: ${(input.postBody || "(sin cuerpo)").slice(0, 1500)}
${input.imageNote ? `\nADJUNTO: ${input.imageNote}\n` : ""}
CONTEXTO — texto extraído de páginas del sitio. Es tu ÚNICA fuente de datos.
${context}

CÓMO CONTESTAR

1. Empezá por la respuesta. La primera oración tiene que contestar lo que preguntó, no anunciar que
   vas a contestar.
2. Enganchá con SU caso. Retomá el dato concreto que dio —el monto, el país, el banco, el plazo, lo
   que se ve en la foto— para que quede claro que leíste el hilo y no un resumen. Si dijo algo
   específico y lo ignorás, el comentario no sirve.
3. Si en el contexto hay algo que contradice lo que la persona da por sentado, decíselo. Esa es la
   parte útil.
4. Si el contexto no alcanza para una parte, decilo en media oración y seguí. No la completes.

CÓMO NO ESCRIBIR

Lo que sigue delata a un bot de lejos. Nada de esto:

- saludos y cierres de cortesía: "¡Hola!", "espero que te sirva", "¡suerte!", "saludos"
- elogiar la pregunta: "buena pregunta", "excelente consulta"
- muletillas de manual: "es importante destacar", "cabe mencionar", "vale la pena aclarar",
  "ten en cuenta", "en resumen", "en definitiva", "por otro lado"
- estructura de informe: enumerar "en primer lugar / en segundo lugar", listas, viñetas, títulos,
  negritas, emojis
- la fórmula "no es solo X, sino también Y"
- prometer resultados, mandar a "consultar con un profesional", opinar sobre personas concretas
- tutear. Es voseo: "tenés", "podés", "fijate", "mirá". NUNCA "tienes", "puedes", "debes", "ten".

Frases cortas mezcladas con alguna más larga. Está bien empezar una oración con "Ojo" o "Igual".

REGLAS DURAS (se verifican después; si fallan, el comentario se descarta)

- NINGÚN número que no aparezca literal en el CONTEXTO. Ni cifras, ni porcentajes, ni plazos, ni
  cantidades para enumerar. Si no está arriba, no se escribe.
- Un solo enlace, exactamente este, al final del cuerpo: ${input.url}
  Va como "el detalle está acá", no como el motivo del comentario.
- Última línea, sola en su renglón y textual:
${DISCLOSURE}
- Entre 60 y 130 palabras, sin contar esa última línea.

Devolvé SOLO el comentario, sin comillas ni explicación.`;
}

/** One attempt. `null` when the model gave nothing. Validation is the caller's job. */
export async function composeReply(input: ComposeInput): Promise<string | null> {
  const prompt = buildComposePrompt(input);
  const text = input.image
    ? await askTextWithImage(prompt, input.image, { systemHint: VOICE })
    : await askText(prompt, { systemHint: VOICE });
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
