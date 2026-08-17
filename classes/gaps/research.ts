// Research a content gap, and prove the sources exist.
//
// Two providers, and the difference between them is entirely about citations.
//
// Gemini's grounded mode hands back `groundingChunks`: the pages the model ACTUALLY retrieved,
// which classes/gemini.ts resolves past Google's redirect wrapper. That is a strong guarantee —
// a URL in that list was fetched — and the whole repo's norm-checking is built on it.
//
// The Claude endpoint has WebSearch and WebFetch, which is a better researcher, but it returns
// prose: the URLs it names are claims, not evidence. A model that names a plausible IMPO URL it
// never opened produces a draft that looks sourced and is not, which is worse than an unsourced
// one because the checkbox invites you to skip the check.
//
// So the Claude path verifies the citations itself: every URL the model reports is fetched here,
// and one that does not answer 200 is moved out of the sources list and into an explicit
// "could not be verified" section. That is a different guarantee from Gemini's — "this page exists
// and is reachable" rather than "the model read this page" — and the draft says which it has.

import axios from "axios";
import { askClaudeJson, claudeSaturated } from "../claude";
import { askGrounded, groundedHeadlines } from "../gemini";
import { preferredProvider } from "../ai_text";
import type { GapCluster } from "./cluster";

/** Research is slow: web search plus several fetches. The server caps at 1 800 000. */
const RESEARCH_TIMEOUT_MS = 600000;
/** Per-source verification. A slow ministry site must not hold up the whole draft. */
const VERIFY_TIMEOUT_MS = 15000;
/** More than this and the draft is a link dump, not a starting point. */
const MAX_SOURCES = 12;

export interface ResearchSource {
  url: string;
  title: string;
  /** What the model says this source establishes. */
  says: string;
  /** Did WE fetch it and get a 200? */
  verified: boolean;
}

export interface Research {
  provider: "claude" | "gemini";
  text: string;
  sources: ResearchSource[];
  /**
   * How the sources were established. Different providers give different guarantees and the draft
   * must not blur them.
   */
  citationBasis: "modelo-abrió-la-página" | "url-verificada-por-nosotros";
}

const CLAUDE_SCHEMA = {
  type: "object",
  properties: {
    research: { type: "string" },
    sources: {
      type: "array",
      items: {
        type: "object",
        properties: {
          url: { type: "string" },
          title: { type: "string" },
          says: { type: "string" },
        },
        required: ["url", "title", "says"],
      },
    },
  },
  required: ["research", "sources"],
} as const;

export function researchPrompt(cluster: GapCluster): string {
  const questions = cluster.members
    .slice(0, 8)
    .map((member, i) => `${i + 1}. [r/${member.sub}] ${member.title}\n   ${(member.text || "").slice(0, 300)}`)
    .join("\n");

  return `Estas son preguntas reales que la gente hizo en subreddits uruguayos y que nuestro sitio no contesta.

${questions}

Investigá con búsqueda web y contestá para Uruguay, con normativa y fuentes oficiales cuando existan
(IMPO, DGI, BPS, BCU, Aduanas, MTSS). El campo "research" tiene que traer, en ese orden:

## La pregunta de fondo
Una o dos frases: qué están preguntando en realidad.

## Respuesta
Lo que se puede afirmar hoy, con la cifra o el plazo concreto cuando lo haya, y de dónde sale cada uno.

## Lo que depende del caso
Las variantes que cambian la respuesta.

## Lo que NO pude confirmar
Sé explícito. Todo lo que no encontraste en una fuente que hayas ABIERTO va acá, no arriba.

En "sources" poné SOLO páginas que hayas abierto de verdad con WebFetch, con la URL exacta. Vamos a
verificar una por una que existan: una URL inventada se detecta y deja el borrador peor que sin nada.

Reglas: no inventes cifras ni artículos de normas. Si una norma fue modificada, decí cuál es el
texto vigente. Español rioplatense. Sin tablas.`;
}

/** Does this URL actually exist? A GET, because several UY government sites answer 405 to HEAD. */
async function verify(url: string): Promise<boolean> {
  try {
    const res = await axios.get(url, {
      timeout: VERIFY_TIMEOUT_MS,
      signal: AbortSignal.timeout(VERIFY_TIMEOUT_MS + 2000),
      maxRedirects: 3,
      validateStatus: () => true,
      responseType: "text",
      transformResponse: (d) => d,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; CambioUruguayResearch/1.0)" },
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

async function researchWithClaude(cluster: GapCluster): Promise<Research | null> {
  interface Raw {
    research?: string;
    sources?: Array<{ url?: string; title?: string; says?: string }>;
  }

  const raw = await askClaudeJson<Raw>(researchPrompt(cluster), CLAUDE_SCHEMA as unknown as Record<string, unknown>, {
    allowedTools: ["WebSearch", "WebFetch"],
    timeoutMs: RESEARCH_TIMEOUT_MS,
  });
  if (!raw?.research?.trim()) return null;

  const candidates = (raw.sources ?? [])
    .filter((s): s is { url: string; title?: string; says?: string } => typeof s?.url === "string" && /^https?:\/\//i.test(s.url))
    .slice(0, MAX_SOURCES);

  // Verified in parallel: a dozen independent GETs, none of which depend on each other.
  const checked = await Promise.all(candidates.map((s) => verify(s.url)));

  return {
    provider: "claude",
    text: raw.research.trim(),
    sources: candidates.map((s, i) => ({
      url: s.url,
      title: (s.title || s.url).slice(0, 160),
      says: (s.says || "").slice(0, 300),
      verified: checked[i] === true,
    })),
    citationBasis: "url-verificada-por-nosotros",
  };
}

async function researchWithGemini(cluster: GapCluster): Promise<Research | null> {
  const reply = await askGrounded(researchPrompt(cluster));
  if (!reply?.text) return null;
  return {
    provider: "gemini",
    text: reply.text.trim(),
    // groundedHeadlines only returns chunks whose redirect actually resolved, so these are pages
    // the model really opened — a stronger claim than the Claude path can make, and marked as such.
    sources: groundedHeadlines(reply, MAX_SOURCES).map((headline) => ({
      url: headline.link,
      title: headline.title,
      says: headline.source,
      verified: true,
    })),
    citationBasis: "modelo-abrió-la-página",
  };
}

/**
 * Research the cluster with whichever provider is available. `null` when neither produced anything —
 * which the caller must treat as "try again tomorrow", never as "write an empty draft".
 */
export async function researchGap(cluster: GapCluster): Promise<Research | null> {
  if (preferredProvider() === "claude" && !claudeSaturated()) {
    const viaClaude = await researchWithClaude(cluster);
    if (viaClaude) return viaClaude;
    console.warn("[gaps] Claude no devolvió investigación — se prueba con Gemini");
  }
  return researchWithGemini(cluster);
}
