// The weekly legal-fact refresh. The AI's job here is to NOTICE a change, not to make one.
//
// Every proposal runs three deterministic gates before it can touch a value:
//   1. its source must be an official domain (a newspaper is not the law),
//   2. its value must be inside the plausible range for that fact,
//   3. if it DIFFERS from what we publish, it is not published — the last-good value stays and
//      the fact id goes to pendingReview for a human.
// So the worst an hallucination can do is nag us. It cannot put a wrong number in front of
// somebody about to pay it. We have shipped wrong import figures once; not twice.
import { aiService } from "../ai_service";
import { FACT_RANGES, OFFICIAL_HOSTS } from "./baseline";
import type { AduanaDoc, AduanaFact, Source } from "./types";

interface Proposal {
  id: string;
  value: number | string;
  sourceUrl: string;
  article?: string;
}

const isOfficial = (url: string): boolean => {
  try {
    const host = new URL(url).hostname;
    return OFFICIAL_HOSTS.some((h) => host === h || host.endsWith(`.${h}`));
  } catch {
    return false;
  }
};

const inRange = (id: string, value: number | string): boolean => {
  if (typeof value !== "number") return true;
  const range = FACT_RANGES[id];
  if (!range) return false; // a numeric fact with no declared range is not publishable
  return value >= range[0] && value <= range[1];
};

function parseProposals(raw: unknown): Proposal[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (p): p is Proposal =>
      !!p &&
      typeof (p as Proposal).id === "string" &&
      typeof (p as Proposal).sourceUrl === "string" &&
      ["number", "string"].includes(typeof (p as Proposal).value)
  );
}

/**
 * The gate. Pure and synchronous — every test in tests/aduana/norms.test.ts hits this function
 * directly, because this is the whole thing that stands between an AI proposal and a published
 * number. `current` and the return value share the same fact ids/order; only `value` and
 * `verifiedAt` ever change, and only when a proposal is officially sourced, in range, AND equal
 * to what we already publish (a real change of law is confirmed by a human, never by us).
 */
export function applyProposals(
  current: AduanaFact[],
  raw: unknown,
  _sources: Source[]
): { facts: AduanaFact[]; pendingReview: string[] } {
  const proposals = parseProposals(raw);
  const pendingReview: string[] = [];
  const today = new Date().toISOString().slice(0, 10);

  const facts = current.map((fact) => {
    const p = proposals.find((x) => x.id === fact.id);
    if (!p) return fact;

    if (!isOfficial(p.sourceUrl) || !inRange(fact.id, p.value)) {
      pendingReview.push(fact.id);
      return fact;
    }
    if (p.value !== fact.value) {
      pendingReview.push(fact.id); // a real change of law is confirmed by a human, never by us
      return fact;
    }
    return { ...fact, verifiedAt: today }; // confirmed — same value, fresh timestamp
  });

  return { facts, pendingReview };
}

/**
 * Ask the model, per current fact, whether the norm still says what we publish — and run every
 * answer through applyProposals before any of it can touch the page. Silent no-op without AI
 * credentials (AIService#classify returns null when unconfigured) or when the reply doesn't
 * parse: the doc comes back untouched, so the page keeps serving the last human-verified facts.
 * Never hand-repairs malformed model output — a throw anywhere in here just means "no update".
 */
export async function refreshNorms(doc: AduanaDoc): Promise<AduanaDoc> {
  if (!aiService.isConfigured()) return doc;

  try {
    const prompt = buildPrompt(doc);
    const raw = await aiService.classify(prompt, { maxTokens: 4000 });
    if (raw === null) return doc;

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw.trim());
    } catch {
      return doc;
    }

    const { facts, pendingReview } = applyProposals(doc.facts, parsed, doc.sources);
    if (pendingReview.length > 0) {
      console.warn("aduana norms: pendingReview (AI proposal did not clear the gate)", pendingReview);
    }
    return { ...doc, facts, pendingReview };
  } catch (error: any) {
    console.warn("refreshNorms error:", error?.message || error);
    return doc;
  }
}

/**
 * The grounded prompt: for every current fact, ask the model to confirm or propose a new value
 * against the norm it's already sourced to, and to answer ONLY with the JSON array applyProposals
 * expects. The model is never asked to invent a fact id or a source — only to re-check the ones
 * we already publish, against the article we already cite.
 */
function buildPrompt(doc: AduanaDoc): string {
  const sourceById = new Map(doc.sources.map((s) => [s.id, s]));
  const rows = doc.facts.map((f) => {
    const src = sourceById.get(f.sourceId);
    return {
      id: f.id,
      currentValue: f.value,
      norm: src?.norm ?? "",
      article: f.article ?? "",
      url: src?.url ?? "",
    };
  });

  return `Sos un verificador de normas aduaneras uruguayas. Para cada hecho de la lista, confirmá si el valor sigue vigente según la norma citada, buscando la fuente oficial (gub.uy o impo.com.uy).
Devolvé SOLO un JSON array, sin markdown, sin explicación, con un objeto por hecho:
[{"id":"<id>","value":<mismo tipo que currentValue>,"sourceUrl":"<url oficial gub.uy o impo.com.uy>","article":"<articulo>"}]
Si no encontrás la norma o no estás seguro, repetí el currentValue tal cual con la url ya provista.
No inventes ids nuevos. No devuelvas texto fuera del JSON.

HECHOS:
${JSON.stringify(rows, null, 2)}`;
}
