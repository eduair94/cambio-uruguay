// Qué se está hablando ahora, y qué funciona en este sub.
//
// Las dos mitades del análisis previo, y son distintas a propósito:
//
//  - El PULSO del sub sale de Reddit, no del modelo. Qué llegó arriba este mes, con cuántos votos y
//    cuántos comentarios: es la evidencia de qué clase de pregunta hace hablar a esta gente. Un
//    modelo tiene opiniones sobre eso; el sub tiene datos.
//  - La ACTUALIDAD sale de una búsqueda web real. Sin eso, "temas del momento" significa temas del
//    momento en que se entrenó el modelo, que es exactamente cómo se publica una pregunta sobre
//    algo que pasó hace ocho meses y quedar como un bot.

import { askClaudeJson, claudeSaturated } from "../../claude";
import { fetchListing, fetchSubredditRules, type RedditPostRaw } from "../../reddit";

export interface SubPulse {
  /** Todo lo que ya se publicó y pudimos ver: la memoria contra la que se mide la novedad. */
  titles: string[];
  /** Los que mejor funcionaron, con sus números, como evidencia de qué engancha acá. */
  topPerforming: Array<{ title: string; score: number; comments: number; flair: string }>;
  /** Los flairs que la gente realmente usa, contados. */
  flairUsage: Array<{ flair: string; count: number }>;
  rules: string[];
}

export async function readSubPulse(sub: string): Promise<SubPulse> {
  const [nuevos, calientes, mes, anio, rules] = await Promise.all([
    fetchListing(sub, "new", { limit: 100 }),
    fetchListing(sub, "hot", { limit: 100 }),
    fetchListing(sub, "top", { limit: 100, t: "month" }),
    fetchListing(sub, "top", { limit: 100, t: "year" }),
    fetchSubredditRules(sub),
  ]);

  const all: RedditPostRaw[] = [...nuevos, ...calientes, ...mes, ...anio];
  const seen = new Map<string, RedditPostRaw>();
  for (const post of all) if (!seen.has(post.id)) seen.set(post.id, post);
  const unique = [...seen.values()];

  const flairCount = new Map<string, number>();
  for (const post of unique) {
    const flair = (post.linkFlair || "").trim();
    if (flair) flairCount.set(flair, (flairCount.get(flair) ?? 0) + 1);
  }

  return {
    titles: unique.map((post) => post.title),
    // Por comentarios, no por votos: el pedido es que genere interacción, y un post con 300 votos y
    // cuatro comentarios es una foto linda, no una conversación.
    topPerforming: [...unique]
      .sort((a, b) => b.numComments - a.numComments)
      .slice(0, 25)
      .map((post) => ({
        title: post.title,
        score: post.score,
        comments: post.numComments,
        flair: post.linkFlair || "",
      })),
    flairUsage: [...flairCount.entries()]
      .map(([flair, count]) => ({ flair, count }))
      .sort((a, b) => b.count - a.count),
    rules,
  };
}

export interface CurrentTopics {
  topics: Array<{ topic: string; why: string; source: string }>;
}

const TOPICS_SCHEMA = {
  type: "object",
  properties: {
    topics: {
      type: "array",
      items: {
        type: "object",
        properties: {
          topic: { type: "string", description: "el tema, en una frase" },
          why: { type: "string", description: "por qué está en conversación ahora" },
          source: { type: "string", description: "de dónde salió: medio, fecha" },
        },
        required: ["topic", "why", "source"],
      },
    },
  },
  required: ["topics"],
} as const;

/**
 * De qué se habla en Uruguay esta semana, buscado de verdad.
 *
 * Con WebSearch habilitado y `today` inyectado: preguntarle a un modelo "qué pasa ahora" sin
 * decirle qué día es hoy devuelve, con total seguridad, lo que pasaba cuando lo entrenaron.
 */
export async function currentTopics(today: string, model: "sonnet" | "opus" = "opus"): Promise<CurrentTopics["topics"]> {
  if (claudeSaturated()) return [];
  const result = await askClaudeJson<CurrentTopics>(
    `Hoy es ${today}. Buscá en la web qué se está hablando en Uruguay en los últimos siete días: ` +
      `noticias, cambios que afectan la vida cotidiana, cosas que la gente esté comentando. ` +
      `Interesa lo que le pasa a la gente común —precios, transporte, trabajo, servicios, clima, ` +
      `algo cultural— y NO interesa la política partidaria ni nada que divida por bandera. ` +
      `Devolvé entre cinco y ocho temas, cada uno con por qué está en conversación y de dónde lo sacaste. ` +
      `Si no encontrás nada reciente, devolvé la lista vacía en vez de inventar.`,
    TOPICS_SCHEMA as unknown as Record<string, unknown>,
    { allowedTools: ["WebSearch", "WebFetch"], timeoutMs: 240_000, model }
  );
  return result?.topics ?? [];
}
