// Second gate: does the page the retriever picked actually answer THIS thread?
//
// The retriever is a similarity function, and similarity is not the question being asked. "¿Cuánto
// pago de aduana por una notebook?" and "¿Me conviene comprar la notebook en Uruguay o en Brasil?"
// live a few degrees apart in the embedding space and share most of their vocabulary, but only one
// of them is answered by the import-tax page. Nothing in a cosine can tell them apart; a model
// reading both can.
//
// Two independent gates, and the bot needs BOTH. They fail differently — the retriever fails on
// lexical overlap, the judge fails by being agreeable — so the cases where they fail together are
// far rarer than the cases where either fails alone. The prompt below is written to push against
// the judge's specific failure: it is told that "no" is the expected answer and asked for the
// question the page would have to answer, not for a rating.

import { askPlain } from "../gemini";
import type { RetrievedPage } from "../rag/types";

export interface JudgeVerdict {
  relevant: boolean;
  /** Path of the page the judge chose, which need NOT be the retriever's first. */
  path: string;
  confidence: number;
  reason: string;
}

function parseJsonLoose(text: string): Record<string, unknown> | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    return JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

const clamp01 = (value: unknown): number => {
  const num = Number(value);
  if (!Number.isFinite(num)) return 0;
  return Math.min(1, Math.max(0, num));
};

export function buildJudgePrompt(postTitle: string, postBody: string, pages: readonly RetrievedPage[]): string {
  const candidates = pages
    .map((page, i) => {
      const excerpt = page.chunks
        .slice(0, 2)
        .map((c) => c.chunk.text)
        .join(" ")
        .slice(0, 700);
      return `${i + 1}. ruta: ${page.path}\n   título: ${page.title}\n   extracto: ${excerpt}`;
    })
    .join("\n\n");

  return `Sos el filtro de calidad de un bot que responde en subreddits uruguayos. Tu único trabajo es
evitar respuestas fuera de lugar. Rechazar es lo normal y lo barato; equivocarse respondiendo es caro.

PUBLICACIÓN
título: ${postTitle}
cuerpo: ${(postBody || "(sin cuerpo)").slice(0, 1500)}

PÁGINAS CANDIDATAS DEL SITIO
${candidates}

Decidí si ALGUNA de esas páginas contesta de verdad lo que esta persona está preguntando.

Marcá relevant=false si:
- la persona pide una opinión, una experiencia personal o una recomendación de alguien concreto
- el tema se parece pero la pregunta puntual no está contestada en el extracto
- la pregunta es sobre un caso particular que necesita datos que no tenemos
- la publicación es un desahogo, una noticia, un chiste o una queja, y no una pregunta
- la persona ya sabe la respuesta y está discutiendo otra cosa

Marcá relevant=true SOLO si alguien que abre esa página encuentra ahí la respuesta a la pregunta.

Respondé SOLO con un objeto JSON válido, sin markdown:
{"relevant": true|false, "path": "<la ruta elegida o vacío>", "confidence": <0 a 1>, "reason": "<una frase corta en español>"}`;
}

/**
 * Ask the judge. Any failure — no key, unparseable reply, a path that is not one of the candidates —
 * comes back as `relevant: false`. A gate that cannot reach its model must close, not open.
 */
export async function judgeRelevance(
  postTitle: string,
  postBody: string,
  pages: readonly RetrievedPage[]
): Promise<JudgeVerdict> {
  const no = (reason: string): JudgeVerdict => ({ relevant: false, path: "", confidence: 0, reason });
  if (!pages.length) return no("sin candidatas");

  const text = await askPlain(buildJudgePrompt(postTitle, postBody, pages));
  if (!text) return no("el juez no respondió");

  const parsed = parseJsonLoose(text);
  if (!parsed) return no("respuesta del juez no parseable");

  const relevant = parsed.relevant === true;
  const path = typeof parsed.path === "string" ? parsed.path.trim() : "";
  const confidence = clamp01(parsed.confidence);
  const reason = typeof parsed.reason === "string" ? parsed.reason.slice(0, 300) : "";

  if (!relevant) return { relevant: false, path, confidence, reason: reason || "el juez dijo que no" };
  // The judge may only choose from what it was shown. A hallucinated path would be posted as a link
  // to a page that does not exist.
  if (!pages.some((page) => page.path === path)) {
    return no(`el juez devolvió una ruta que no estaba entre las candidatas: ${path || "(vacía)"}`);
  }
  return { relevant: true, path, confidence, reason };
}
