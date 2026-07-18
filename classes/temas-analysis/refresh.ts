// Quarterly AI reading of "what Uruguayans consult about money", for the app's /mapa-de-temas.
// Mirrors classes/costs/refresh.ts: grounded Gemini call, never throws, returns an empty result
// (asOf: null / overview: []) on any failure so the previous good analysis keeps serving.
//
// This module interprets the DEMAND side only (the Reddit topic ranking). Content coverage and the
// gap list are computed deterministically in the app (app/utils/topicMap.ts) from our own guides —
// the backend has no access to the app's hub catalogue and should not guess it.
import { askGrounded, geminiConfigured, groundedHeadlines } from "../gemini";

/** One topic's AI read. `trend` reflects recent momentum vs. the historical volume. */
export interface TopicInsight {
  id: string;
  trend: "up" | "down" | "stable";
  insight: string;
}

export interface TemasAnalysis {
  /** 2-3 short paragraphs interpreting the quarter. */
  overview: string[];
  /** Per-topic read, keyed by the same topicId the app uses. */
  topics: TopicInsight[];
  /** Grounding sources cited by the model. */
  sources: Array<{ label: string; url: string }>;
  /** ISO timestamp of the last successful generation, or null when nothing usable came back. */
  asOf: string | null;
}

/** The demand snapshot fed into the prompt (read from the app DB by appTopics.ts). */
export interface AnalysisTopicInput {
  id: string;
  label: string;
  total: number;
  recent: number;
  samples: string[];
}

const TRENDS = new Set(["up", "down", "stable"]);

export function emptyTemasAnalysis(): TemasAnalysis {
  return { overview: [], topics: [], sources: [], asOf: null };
}

function buildPrompt(topics: AnalysisTopicInput[]): string {
  const rows = topics
    .map(
      (t) =>
        `- ${t.id} — ${t.label} | total ${t.total} | 90d ${t.recent} | ${t.samples.slice(0, 3).join(" / ")}`
    )
    .join("\n");
  return `Sos analista de finanzas personales en Uruguay. Te paso el ranking de los temas de dinero que MÁS consultan los uruguayos en Reddit, con el volumen total (histórico) y el reciente (últimos 90 días) de cada uno, y algunos ejemplos de consultas reales.

Datos (id | tema | volumen total | consultas 90 días | ejemplos):
${rows}

Con búsqueda real y citable sobre la coyuntura económica uruguaya reciente, analizá el trimestre. Respondé SOLO con un objeto JSON válido, sin markdown ni texto adicional, con este formato EXACTO:
{"overview": ["<párrafo 1: qué marca el trimestre, qué sube y qué baja, con contexto macro breve>", "<párrafo 2>"], "topics": [{"id": "<uno de los id de arriba, textual>", "trend": "up|down|stable", "insight": "<1 o 2 oraciones: por qué se mueve y qué significa para quien consulta>"}]}

Reglas: usá los id EXACTOS del listado. "trend" refleja el momentum reciente contra el volumen histórico. No inventes cifras que no puedas respaldar con la búsqueda. Escribí en español rioplatense, claro y sin tecnicismos. Máximo 3 párrafos de overview.`;
}

function parseJsonLoose(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

/**
 * Generate the quarterly analysis. Returns an empty result (asOf: null) when Gemini is not
 * configured, the reply is unparseable, or nothing usable is produced — the caller then keeps
 * the previously stored analysis.
 */
export async function refreshTemasAnalysis(
  topics: AnalysisTopicInput[]
): Promise<TemasAnalysis> {
  const empty = emptyTemasAnalysis();
  if (!geminiConfigured() || !topics.length) return empty;

  const reply = await askGrounded(buildPrompt(topics));
  if (!reply) return empty;

  const data = parseJsonLoose(reply.text);
  if (!data) return empty;

  const overview = Array.isArray(data.overview)
    ? (data.overview as unknown[]).map((p) => String(p ?? "").trim()).filter((p) => p.length >= 20).slice(0, 3)
    : [];
  if (!overview.length) return empty;

  const known = new Set(topics.map((t) => t.id));
  const rawTopics = Array.isArray(data.topics) ? (data.topics as Record<string, unknown>[]) : [];
  const seen = new Set<string>();
  const insights: TopicInsight[] = [];
  for (const row of rawTopics) {
    const id = String(row?.id ?? "").trim();
    if (!known.has(id) || seen.has(id)) continue;
    const trend = String(row?.trend ?? "stable").toLowerCase();
    const insight = String(row?.insight ?? "").trim();
    if (!insight) continue;
    seen.add(id);
    insights.push({ id, trend: (TRENDS.has(trend) ? trend : "stable") as TopicInsight["trend"], insight });
  }

  const sources = groundedHeadlines(reply, 6).map((h) => ({ label: h.source || h.title, url: h.link }));
  return { overview, topics: insights, sources, asOf: new Date().toISOString() };
}
