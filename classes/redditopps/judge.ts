// El juez de la cola: de las candidatas de cada hilo, ¿alguna contesta lo que se pidió?
//
// Gemini con salida estructurada, de a lotes de 10 hilos. Lo que NO hace, y es deliberado:
//
//  - No redacta la respuesta. Medido el 4/9/2026: 0 de 14 comentarios de una pasada servían como
//    salían. La card da la página, el motivo y el ángulo; el texto lo escribe una persona.
//  - No elige una página que no le dimos. La ruta tiene que ser una de las candidatas; si no, el
//    veredicto se vuelve "no recomendar". Una ruta inventada en una card manda a un 404.
//  - No adivina ante un fallo. Si la llamada vuelve vacía, el lote entero queda sin juzgar y se
//    reintenta mañana; un hilo que el modelo se olvidó de devolver, también.
import { askJSON, GEMINI_MODEL } from "../gemini";
import type { RedditPostRaw } from "../reddit";
import type { Candidate } from "./candidates";
import { decodeEntities } from "./text";

export interface JudgeItem {
  post: RedditPostRaw;
  candidates: Candidate[];
}

export interface Verdict {
  postId: string;
  recommend: boolean;
  path: string | null;
  confidence: number;
  reason: string;
  angle: string;
}

export type AskJson = <T>(prompt: string, schema: unknown, opts?: { system?: string; model?: string; temperature?: number }) => Promise<T | null>;

/** Debajo de esto un "sí" del juez no se muestra: es un "tal vez", y una cola de tal veces no se lee. */
export const MIN_CONFIDENCE = 0.6;
export const JUDGE_BATCH = 10;
const REASON_MAX = 160;
const ANGLE_MAX = 200;
const BODY_MAX = 900;

/** El modelo del juez. Fijable aparte para que un cambio de los demás jobs no cambie la cola. */
export function oppsJudgeModel(): string {
  return (process.env.REDDIT_OPPS_MODEL || GEMINI_MODEL).trim();
}

export const JUDGE_SYSTEM = `Sos quien decide qué hilos de Reddit de subreddits uruguayos vale la pena contestar con UN enlace de cambio-uruguay.com, un sitio uruguayo con directorios (alquileres, autos, motos, celulares, muebles y electrodomésticos), comparadores y guías de plata y trámites.

Recomendás un hilo SOLO si la persona está pidiendo algo concreto y una de las páginas candidatas le da justo eso: avisos para elegir, precios, un cálculo, los pasos de un trámite. Si la página habla del tema pero no contesta lo que se pidió, no.

NO recomiendes: desahogos o quejas sin pregunta, noticias, política, chistes, avisos de venta o de servicios, hilos sobre la vida personal o la salud de alguien, ni hilos donde el enlace sería forzado. Ante la duda, no.

Para cada hilo devolvé: id; recommend; path (exactamente una de sus candidatas, o null); confidence de 0 a 1; reason (una línea: qué pide y por qué esa página lo contesta); angle (una línea: qué dato o paso concreto de la página aportar al responder, sin inventar cifras). Español rioplatense, sin emojis.`;

export const JUDGE_SCHEMA = {
  type: "OBJECT",
  properties: {
    verdicts: {
      type: "ARRAY",
      items: {
        type: "OBJECT",
        properties: {
          id: { type: "STRING" },
          recommend: { type: "BOOLEAN" },
          path: { type: "STRING", nullable: true },
          confidence: { type: "NUMBER" },
          reason: { type: "STRING" },
          angle: { type: "STRING" },
        },
        required: ["id", "recommend", "confidence", "reason", "angle"],
        propertyOrdering: ["id", "recommend", "path", "confidence", "reason", "angle"],
      },
    },
  },
  required: ["verdicts"],
};

const oneLine = (text: string, max: number): string => {
  const flat = text.replace(/\s+/g, " ").trim();
  return flat.length > max ? `${flat.slice(0, max - 1).trim()}…` : flat;
};

/** El prompt de un lote. Sin autor: no hace falta para decidir y no tiene por qué salir de Reddit. */
export function buildJudgePrompt(items: readonly JudgeItem[]): string {
  const blocks = items.map(({ post, candidates }) => {
    const body = oneLine(decodeEntities(post.selftext), BODY_MAX) || "(sin texto: sólo título o imagen)";
    const pages = candidates.map((c) => `  - ${c.path} — ${c.title}: ${oneLine(c.describe, 260)}`).join("\n");
    return [
      `### id: ${post.id}`,
      `r/${post.sub}${post.linkFlair ? ` · flair: ${post.linkFlair}` : ""}`,
      `Título: ${oneLine(decodeEntities(post.title), 300)}`,
      `Texto: ${body}`,
      `Candidatas:\n${pages}`,
    ].join("\n");
  });
  return `Juzgá estos ${items.length} hilos. Devolvé un veredicto por cada id.\n\n${blocks.join("\n\n")}`;
}

interface RawVerdict {
  id?: unknown;
  recommend?: unknown;
  path?: unknown;
  confidence?: unknown;
  reason?: unknown;
  angle?: unknown;
}

/** Un veredicto crudo, contra las candidatas de SU hilo. `null` si no se puede leer. */
export function normalizeVerdict(raw: RawVerdict, allowed: ReadonlySet<string>): Verdict | null {
  if (typeof raw.id !== "string" || !raw.id) return null;
  const conf = typeof raw.confidence === "number" && Number.isFinite(raw.confidence) ? raw.confidence : 0;
  const path = typeof raw.path === "string" && allowed.has(raw.path) ? raw.path : null;
  const recommend = raw.recommend === true && path !== null;
  return {
    postId: raw.id,
    recommend,
    path: recommend ? path : null,
    confidence: Math.min(1, Math.max(0, conf)),
    reason: oneLine(typeof raw.reason === "string" ? raw.reason : "", REASON_MAX),
    angle: oneLine(typeof raw.angle === "string" ? raw.angle : "", ANGLE_MAX),
  };
}

/**
 * Juzga un lote. `null` cuando la llamada falló entera (cuota, 503, JSON roto): el llamador no
 * guarda nada de ese lote. Un hilo que falta en la respuesta tampoco aparece en el mapa.
 */
export async function judgeBatch(items: readonly JudgeItem[], ask: AskJson = askJSON): Promise<Map<string, Verdict> | null> {
  if (!items.length) return new Map();
  const res = await ask<{ verdicts?: RawVerdict[] }>(buildJudgePrompt(items), JUDGE_SCHEMA, {
    system: JUDGE_SYSTEM,
    model: oppsJudgeModel(),
    temperature: 0.1,
  });
  if (!res || !Array.isArray(res.verdicts)) return null;

  const allowedFor = new Map(items.map((i) => [i.post.id, new Set(i.candidates.map((c) => c.path))] as const));
  const out = new Map<string, Verdict>();
  for (const raw of res.verdicts) {
    const allowed = typeof raw?.id === "string" ? allowedFor.get(raw.id) : undefined;
    if (!allowed || out.has(raw.id as string)) continue;
    const verdict = normalizeVerdict(raw, allowed);
    if (verdict) out.set(verdict.postId, verdict);
  }
  return out;
}
