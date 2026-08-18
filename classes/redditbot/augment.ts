// Lo que la pregunta necesita y la página no dice.
//
// El bot arrancó pudiendo citar únicamente el sitio, y eso producía respuestas ciertas pero flacas:
// el primer comentario real terminó con "sobre subsidios para MIDES no tengo datos" porque la
// página no lo mencionaba, aunque el dato existe y es público. Contestar a medias cuando la
// respuesta está a un WebFetch de distancia no es prudencia, es una limitación autoimpuesta.
//
// LO QUE NO SE AFLOJA. La regla nunca fue "sólo lo que dice el sitio": fue "nada que no podamos
// rastrear a una fuente que descargamos". Esto agranda el conjunto de fuentes, no lo elimina. Lo
// que vuelve de acá es TEXTO DESCARGADO de URLs que pedimos nosotros y contestaron 200, y ese texto
// entra al mismo pool contra el que el validador compara cada cifra. Una afirmación que el modelo
// recuerde pero que ninguna fuente sostenga sigue sin poder publicarse.
//
// Y tiene un segundo uso que es la mitad del valor: lo que la investigación encuentra y la página
// no tenía es, exactamente, el material de una ampliación de esa página. Se guarda para eso.

import { askClaudeJson, claudeSaturated } from "../claude";
import { preferredProvider } from "../ai_text";
import { fetchSources } from "../gaps/sourceText";

/** La investigación es cara en tiempo, no en cuota: una llamada con búsqueda web. */
const TIMEOUT_MS = 420000;
const MAX_URLS = 5;
/** Por fuente, en el prompt del redactor. Alcanza para el párrafo que tiene el dato. */
const EVIDENCE_CHARS = 6000;

const SCHEMA = {
  type: "object",
  properties: {
    /** Qué pide la pregunta que el contexto no cubre. Vacío si el contexto alcanza. */
    missing: { type: "string" },
    findings: { type: "string" },
    sourceUrls: { type: "array", items: { type: "string" } },
  },
  required: ["missing", "findings", "sourceUrls"],
} as const;

export interface Augmentation {
  /** Qué le faltaba a la página para contestar esto. Vacío = no faltaba nada. */
  missing: string;
  /** Texto verificado que el redactor puede usar, ya recortado. Vacío si no hubo nada usable. */
  evidence: string;
  /** URLs que pedimos y contestaron 200. */
  sources: Array<{ url: string; title: string }>;
}

export const EMPTY_AUGMENTATION: Augmentation = { missing: "", evidence: "", sources: [] };

export function buildAugmentPrompt(question: string, context: string): string {
  return `Alguien preguntó esto en un subreddit uruguayo:

${question.slice(0, 1500)}

Este es el texto de la página de cambio-uruguay.com que vamos a enlazar al contestarle:

${context.slice(0, 9000)}

Decidí qué le falta a ese texto para contestar la pregunta COMPLETA, y sólo eso investigalo con
búsqueda web.

- "missing": en una frase, qué pide la pregunta que el texto de arriba no contesta. Si el texto
  alcanza para contestar todo, devolvé "" y no busques nada.
- "findings": lo que encontraste sobre ESE faltante, con las cifras y de dónde salen. Nada de
  repetir lo que ya dice el texto de arriba.
- "sourceUrls": SOLO las URLs que abriste de verdad con WebFetch. Las vamos a descargar una por una
  y a verificar que su texto contenga las cifras; una URL que no abriste se detecta.

Priorizá fuentes oficiales uruguayas (DGI, BPS, BCU, Aduanas, IMPO, MTSS, intendencias). Si el dato
no existe públicamente, decilo en "findings" en vez de estimarlo.`;
}

/**
 * Investigar el faltante. Nunca tira: sin Claude, sin cuota o sin fuentes descargables devuelve
 * vacío, y el redactor sigue con lo que tenía.
 */
export async function augmentContext(question: string, context: string): Promise<Augmentation> {
  if (preferredProvider() !== "claude" || claudeSaturated()) return EMPTY_AUGMENTATION;

  interface Raw {
    missing?: string;
    findings?: string;
    sourceUrls?: string[];
  }
  const raw = await askClaudeJson<Raw>(buildAugmentPrompt(question, context), SCHEMA as unknown as Record<string, unknown>, {
    allowedTools: ["WebSearch", "WebFetch"],
    timeoutMs: TIMEOUT_MS,
  });

  const missing = (raw?.missing ?? "").trim();
  if (!raw || !missing) return EMPTY_AUGMENTATION;

  const urls = (raw.sourceUrls ?? [])
    .filter((u) => typeof u === "string" && /^https?:\/\//i.test(u))
    .slice(0, MAX_URLS);
  if (!urls.length) {
    // Encontró un faltante pero no lo sostiene con nada: sirve para la ampliación futura, no para
    // esta respuesta.
    return { missing, evidence: "", sources: [] };
  }

  const fetched = await fetchSources(urls);
  const usable = fetched.filter((s) => s.ok && s.text.length > 200);
  if (!usable.length) return { missing, evidence: "", sources: [] };

  const evidence = usable
    .map((s) => `[fuente externa: ${s.url}]\n${s.text.slice(0, EVIDENCE_CHARS)}`)
    .join("\n\n---\n\n");

  return {
    missing,
    evidence,
    sources: usable.map((s) => ({ url: s.url, title: hostOf(s.url) })),
  };
}

const hostOf = (url: string): string => {
  try {
    return new URL(url).hostname.replace(/^www\./i, "");
  } catch {
    return url;
  }
};
