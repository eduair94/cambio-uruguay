// Turn a cluster of unanswered Reddit questions into a page spec, in three passes.
//
//   1. IN SCOPE?  — cheap classification against the site's actual subjects. Runs first because
//      everything after it costs research, and a page outside our coverage should cost nothing.
//   2. RESEARCH   — Claude with WebSearch, asked for prose AND the URLs it opened.
//   3. WRITE      — a second call that receives THE DOWNLOADED TEXT of those URLs and writes the
//      page from it.
//
// Pass 3 is the one that makes automatic publishing defensible. Asking a model to "cite its
// sources" produces citations; handing it the bytes and telling it those are the only figures it
// may use produces a page whose numbers are already in evidence before validation runs. Without
// it, `validatePageSpec` would reject nearly everything and the pipeline would be a lottery it
// mostly loses.

import { askClaudeJson, claudeSaturated } from "../claude";
import { askStructured, preferredProvider } from "../ai_text";
import { fetchSources } from "./sourceText";
import { OUT_OF_SCOPE, topicByKey, topicList } from "./topics";
import type { PageSource, PageSpec } from "./pageSpec";
import type { GapCluster } from "./cluster";

const RESEARCH_TIMEOUT_MS = 600000;
const WRITE_TIMEOUT_MS = 420000;
/** More than this and the write prompt stops fitting anything useful per source. */
const MAX_SOURCES = 8;
/** Per source, in the write prompt. Enough for the article that holds the figure. */
const EVIDENCE_CHARS = 12000;

// ---------------------------------------------------------------------------- 1. scope

const SCOPE_SCHEMA = {
  type: "object",
  properties: {
    inScope: { type: "boolean" },
    topic: { type: "string" },
    question: { type: "string" },
    reason: { type: "string" },
  },
  required: ["inScope", "topic", "question", "reason"],
} as const;

export interface ScopeVerdict {
  inScope: boolean;
  topic: string;
  /** The underlying question, phrased once and well — the seed of the page's title. */
  question: string;
  reason: string;
}

export function buildScopePrompt(cluster: GapCluster): string {
  const questions = cluster.members
    .slice(0, 8)
    .map((m, i) => `${i + 1}. [r/${m.sub}] ${m.title}\n   ${(m.text || "").slice(0, 240)}`)
    .join("\n");

  return `cambio-uruguay.com es un sitio uruguayo sobre plata: cotizaciones, importación, bancos,
crédito, impuestos, vivienda, inversión, derechos del consumidor y costo de vida.

Estas personas preguntaron lo mismo en subreddits uruguayos y el sitio no lo contesta:

${questions}

TEMÁTICAS DEL SITIO
${topicList()}

FUERA DE ALCANCE, aunque parezcan de plata:
${OUT_OF_SCOPE.map((x) => `- ${x}`).join("\n")}

Decidí si corresponde que ESTE sitio tenga una página que conteste esto.

inScope=false si el tema no cae claramente en una de las temáticas, si la respuesta depende del caso
particular de una persona, si pide recomendar algo concreto para contratar, o si es una pregunta de
opinión o experiencia y no de hecho.

"question" es la pregunta de fondo, redactada UNA vez y bien, como la escribiría alguien que la
entendió. "topic" es la clave de la temática.`;
}

export async function classifyScope(cluster: GapCluster): Promise<ScopeVerdict> {
  const no = (reason: string): ScopeVerdict => ({ inScope: false, topic: "", question: "", reason });
  const parsed = await askStructured<Record<string, unknown>>(
    buildScopePrompt(cluster),
    SCOPE_SCHEMA as unknown as Record<string, unknown>
  );
  if (!parsed) return no("el clasificador no respondió");

  const inScope = parsed.inScope === true;
  const topic = typeof parsed.topic === "string" ? parsed.topic.trim() : "";
  const reason = typeof parsed.reason === "string" ? parsed.reason.slice(0, 300) : "";
  if (!inScope) return { inScope: false, topic, question: "", reason: reason || "fuera de alcance" };
  // A topic key the model made up means it did not really place the question; treat as out of scope
  // rather than filing the page under a section that does not exist.
  if (!topicByKey(topic)) return no(`temática inventada: "${topic}"`);

  const question = typeof parsed.question === "string" ? parsed.question.trim() : "";
  if (!question) return no("no formuló la pregunta de fondo");
  return { inScope: true, topic, question, reason };
}

// ---------------------------------------------------------------------------- 2. research

const RESEARCH_SCHEMA = {
  type: "object",
  properties: {
    findings: { type: "string" },
    sourceUrls: { type: "array", items: { type: "string" } },
  },
  required: ["findings", "sourceUrls"],
} as const;

function buildResearchPrompt(question: string, cluster: GapCluster): string {
  const quotes = cluster.members
    .slice(0, 6)
    .map((m) => `- [r/${m.sub}] ${m.title}`)
    .join("\n");

  return `Investigá esta pregunta para Uruguay, con búsqueda web:

${question}

Viene de estos hilos reales:
${quotes}

Buscá y ABRÍ las fuentes oficiales que correspondan (IMPO para normas, DGI, BPS, BCU, Aduanas,
MTSS, URSEC, intendencias). Si una cifra o un plazo aparece, quiero saber de qué artículo o de qué
página sale.

En "findings" escribí todo lo que encontraste, con las cifras y sus fuentes, y una sección final
explícita con lo que NO pudiste confirmar.

En "sourceUrls" van SOLO las URLs que realmente abriste con WebFetch. Las vamos a descargar una por
una y a verificar que el texto contenga las cifras: una URL que no abriste se detecta.`;
}

async function research(question: string, cluster: GapCluster): Promise<{ findings: string; urls: string[] } | null> {
  interface Raw {
    findings?: string;
    sourceUrls?: string[];
  }
  const raw = await askClaudeJson<Raw>(
    buildResearchPrompt(question, cluster),
    RESEARCH_SCHEMA as unknown as Record<string, unknown>,
    { allowedTools: ["WebSearch", "WebFetch"], timeoutMs: RESEARCH_TIMEOUT_MS }
  );
  if (!raw?.findings?.trim()) return null;
  const urls = (raw.sourceUrls ?? []).filter((u) => typeof u === "string" && /^https?:\/\//i.test(u)).slice(0, MAX_SOURCES);
  return { findings: raw.findings.trim(), urls };
}

// ---------------------------------------------------------------------------- 3. write

const PAGE_SCHEMA = {
  type: "object",
  properties: {
    slug: { type: "string" },
    title: { type: "string" },
    navLabel: { type: "string" },
    navKey: { type: "string" },
    icon: { type: "string" },
    description: { type: "string" },
    intro: { type: "string" },
    sections: {
      type: "array",
      items: {
        type: "object",
        properties: { heading: { type: "string" }, body: { type: "array", items: { type: "string" } } },
        required: ["heading", "body"],
      },
    },
    faqs: {
      type: "array",
      items: {
        type: "object",
        properties: { question: { type: "string" }, answer: { type: "string" } },
        required: ["question", "answer"],
      },
    },
    keywords: { type: "array", items: { type: "string" } },
    notConfirmed: { type: "array", items: { type: "string" } },
    sourceTitles: {
      type: "array",
      items: {
        type: "object",
        properties: { url: { type: "string" }, title: { type: "string" } },
        required: ["url", "title"],
      },
    },
  },
  required: ["slug", "title", "navLabel", "navKey", "icon", "description", "intro", "sections", "faqs", "keywords", "notConfirmed", "sourceTitles"],
} as const;

function buildWritePrompt(
  question: string,
  findings: string,
  sources: ReadonlyArray<{ url: string; text: string }>,
  correction?: string
): string {
  const evidence = sources
    .map((s, i) => `--- FUENTE ${i + 1}: ${s.url}\n${s.text.slice(0, EVIDENCE_CHARS)}`)
    .join("\n\n");

  return `Escribí una página para cambio-uruguay.com que conteste esto:

${question}

TU INVESTIGACIÓN
${findings}

TEXTO DESCARGADO DE LAS FUENTES — es lo ÚNICO de donde pueden salir las cifras
${evidence}

REGLA DURA, se verifica por código y si falla no se publica nada:
**Ningún número de la página puede faltar en el texto de arriba.** Ni cifras, ni porcentajes, ni
plazos, ni artículos de normas, ni años. Si una cifra que querías usar no está en el texto
descargado, no la escribas: mandala a "notConfirmed" y seguí sin ella.

CÓMO ESCRIBIR
- Español rioplatense, de vos (tenés, podés, fijate). NUNCA tuteo.
- Empezá contestando. El "intro" tiene que resolver la duda en su primer párrafo, no anunciarla.
- Prosa. Nada de viñetas, emojis, negritas ni "es importante destacar" / "en resumen".
- Cada sección: un encabezado concreto y 2 o 3 párrafos que digan algo. Mínimo 4 secciones.
- Decí lo que contradice la creencia común; esa suele ser la parte útil.
- "notConfirmed": todo lo que no está respaldado por el texto descargado. Sé explícito, se publica.
- "faqs": 4 a 6 preguntas que la gente hace de verdad, con respuestas de 2 o 3 oraciones.

CAMPOS
- slug: kebab-case, descriptivo, terminado en "-uruguay" si aplica. Sin acentos ni ñ.
- navKey: camelCase corto y único.
- icon: un icono "mdi-…" que exista.
- description: máximo 165 caracteres.
- keywords: 6 a 10 formas en que alguien buscaría esto.
- sourceTitles: un título legible para cada URL de arriba.${correction ? `\n\nCORRECCIÓN OBLIGATORIA — el intento anterior falló:\n${correction}` : ""}`;
}

export interface AuthoredPage {
  spec: PageSpec;
  findings: string;
}

/**
 * Research the cluster and write the page. `null` when the pipeline could not produce one — which
 * the caller must treat as "not today", never as "publish what we have".
 */
export async function authorPage(
  cluster: GapCluster,
  scope: ScopeVerdict,
  correction?: string
): Promise<AuthoredPage | null> {
  if (preferredProvider() !== "claude" || claudeSaturated()) {
    console.warn("[gaps] la generación de páginas necesita Claude (WebSearch); no se intenta con Gemini");
    return null;
  }

  const found = await research(scope.question, cluster);
  if (!found) return null;
  if (!found.urls.length) {
    console.warn("[gaps] la investigación no devolvió ninguna URL — sin fuentes no se publica");
    return null;
  }

  const fetched = await fetchSources(found.urls);
  const usable = fetched.filter((source) => source.ok && source.text.length > 200);
  if (usable.length < 2) {
    console.warn(`[gaps] sólo ${usable.length} de ${found.urls.length} fuentes se pudieron descargar con texto`);
    return null;
  }

  const raw = await askClaudeJson<Record<string, any>>(
    buildWritePrompt(scope.question, found.findings, usable, correction),
    PAGE_SCHEMA as unknown as Record<string, unknown>,
    { allowedTools: [], timeoutMs: WRITE_TIMEOUT_MS }
  );
  if (!raw) return null;

  const titles = new Map<string, string>(
    (raw.sourceTitles ?? [])
      .filter((s: any) => typeof s?.url === "string")
      .map((s: any) => [s.url, String(s.title ?? s.url).slice(0, 160)])
  );

  const sources: PageSource[] = fetched.map((source) => ({
    url: source.url,
    title: titles.get(source.url) || source.url,
    text: source.text,
    verified: source.ok,
  }));

  const spec: PageSpec = {
    slug: String(raw.slug ?? "").trim(),
    title: String(raw.title ?? "").trim(),
    navLabel: String(raw.navLabel ?? "").trim(),
    navKey: String(raw.navKey ?? "").trim(),
    icon: String(raw.icon ?? "").trim(),
    description: String(raw.description ?? "").trim(),
    intro: String(raw.intro ?? "").trim(),
    sections: (raw.sections ?? []).map((s: any) => ({
      heading: String(s?.heading ?? "").trim(),
      body: (s?.body ?? []).map((p: any) => String(p ?? "").trim()).filter(Boolean),
    })),
    faqs: (raw.faqs ?? []).map((f: any) => ({
      question: String(f?.question ?? "").trim(),
      answer: String(f?.answer ?? "").trim(),
    })),
    keywords: (raw.keywords ?? []).map((k: any) => String(k ?? "").trim().toLowerCase()).filter(Boolean),
    notConfirmed: (raw.notConfirmed ?? []).map((n: any) => String(n ?? "").trim()).filter(Boolean),
    sources,
  };

  return { spec, findings: found.findings };
}
