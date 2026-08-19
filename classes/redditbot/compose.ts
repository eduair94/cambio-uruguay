// Write the comment.
//
// The whole value of this bot rests on one property: the answer has to be worth reading even if
// the reader never clicks. A comment that says "buena pregunta, mirá acá <link>" is spam with extra
// steps — it gives nothing, it takes attention, and subreddits remove it on sight. So the prompt
// puts the answer first and the link last, and `validate.ts` enforces afterwards what the prompt
// only asks for.
//
// The composer itself never searches. What it may use is text somebody already downloaded and
// verified: the site page (retrieved) and, for the part that page does not cover, external
// sources fetched by `augment.ts`. The distinction matters — a model searching mid-composition
// would fold half-remembered facts into a comment that reads as if it came from the site, and
// nothing downstream could tell which sentence came from where.

import { askText, askTextWithImage } from "../ai_text";
import type { RetrievedPage } from "../rag/types";
import { contextOf } from "../rag/retrieve";

/**
 * La firma que este bot YA NO escribe.
 *
 * Estuvo obligatoria al pie de cada comentario y se sacó. Dos razones, la segunda es la que manda:
 *
 *  1. Repetida sesenta veces, una firma idéntica es la huella que hace que un moderador encuentre
 *     los sesenta comentarios de una y los borre juntos. La transparencia que se logra por comentario
 *     se paga con que ninguno sobreviva, y un comentario borrado no informó a nadie.
 *  2. La aclaración de que esto es un bot vive en la BIO de la cuenta. Es una decisión ya tomada, y
 *     ahora además es una puerta: `identity.ts` lee la descripción pública antes de publicar y la
 *     corrida no escribe si no dice que es automatizada y de qué sitio.
 *
 * Se conserva exportada porque los tests y el histórico la nombran, y porque borrarla haría que
 * "¿por qué el bot no se identifica?" no tenga dónde contestarse.
 */
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
  /**
   * Lo que el hilo ya contestó, para no repetirlo y para poder corregirlo.
   *
   * NO es evidencia. Es lo único del prompt cuyos números NO valen: un comentario de Reddit es
   * justamente lo que puede estar equivocado, y dejar que respalde una cifra nuestra convertiría el
   * error de un desconocido en una afirmación del sitio. Ver `thread.ts`.
   */
  threadComments?: string;
  /**
   * Verified text from OUTSIDE the site, for the part of the question the page does not cover.
   *
   * Same standing as the site's own text: it was downloaded by us from URLs that answered 200,
   * and the validator checks figures against it too. What it is NOT is a licence to write from
   * memory — an unsourced claim is still an unsourced claim, wherever it would have come from.
   */
  externalEvidence?: string;
}

export function buildComposePrompt(input: ComposeInput): string {
  // 9 000, not 4 500: the page decides WHICH answer, but writing it needs the page's figures, and
  // the four best-matching slices routinely leave them out. `input.page` arrives already widened
  // by the caller — see `contextPage` in run.ts.
  const context = contextOf([input.page, ...input.support], 9000);

  return `Estás por comentar en un hilo de Reddit Uruguay. Escribís en nombre de cambio-uruguay.com,
pero el comentario tiene que leerse como el de alguien que sabe del tema y se tomó dos minutos para
contestar — no como una respuesta genérica pegada desde una página.

LO QUE ESCRIBIÓ LA PERSONA
título: ${input.postTitle}
cuerpo: ${(input.postBody || "(sin cuerpo)").slice(0, 1500)}
${input.imageNote ? `\nADJUNTO: ${input.imageNote}\n` : ""}
CONTEXTO — texto extraído de la página del sitio que vamos a enlazar.
${context}
${input.externalEvidence ? `
FUENTES EXTERNAS VERIFICADAS — las descargamos nosotros para la parte que la página no cubre.
Podés usarlas igual que el contexto de arriba: las cifras que aparezcan acá son válidas.
${input.externalEvidence}
` : ""}${input.threadComments ? `
LO QUE YA CONTESTARON EN EL HILO — esto NO es una fuente. Es lo que dijeron otras personas.
Sirve para dos cosas y sólo dos: no repetir lo que ya está dicho, y corregir lo que esté mal.
NINGUNA cifra de acá abajo se puede usar en tu respuesta: pueden estar equivocadas, que es
justamente por lo que las estás leyendo.
${input.threadComments}
` : ""}

CÓMO CONTESTAR

1. Empezá por la respuesta. La primera oración tiene que contestar lo que preguntó, no anunciar que
   vas a contestar.
2. Enganchá con SU caso. Retomá el dato concreto que dio —el monto, el país, el banco, el plazo, lo
   que se ve en la foto— para que quede claro que leíste el hilo y no un resumen. Si dijo algo
   específico y lo ignorás, el comentario no sirve.
3. Si en el contexto hay algo que contradice lo que la persona da por sentado, decíselo. Esa es la
   parte útil.
4. Y lo mismo con lo que ya contestaron otros, si te lo pasaron. Si alguien afirmó algo que el
   CONTEXTO desmiente, corregilo con el dato concreto y sin agrandarlo: "ojo que X e Y no son lo
   mismo, Y es tal cosa". Es lo más útil que se puede escribir en un hilo que ya tiene respuestas.
   Si lo que dijeron está bien, no lo repitas: escribí sólo lo que falta. Nunca cites usuarios por
   su nombre ni digas que alguien se equivocó — hablás del dato, no de la persona.
5. Si ni el contexto ni las fuentes externas alcanzan para una parte, decilo en media oración y
   seguí. No la completes de memoria.

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

- NINGÚN número que no aparezca literal en el CONTEXTO o en las FUENTES EXTERNAS. Ni cifras, ni
  porcentajes, ni plazos, ni cantidades para enumerar. Si no está arriba, no se escribe.
- Un solo enlace, exactamente este, al final del cuerpo: ${input.url}
  Va como "el detalle está acá", no como el motivo del comentario.
- Nada de firmas, ni de presentarte, ni de aclarar qué sos. El comentario termina cuando termina la
  respuesta.
- Entre 60 y 130 palabras.

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
