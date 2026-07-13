// The public shape. A problem with zero Reddit evidence still ships — the norm and the procedure
// are the point; the testimonies are corroboration, not the content.
import type { AduanaDoc, AduanaFact, ProblemEntry, Quote, Source } from "./types";

const STALE_MS = 14 * 24 * 60 * 60 * 1000;

export interface PublicAduanaPayload {
  facts: AduanaFact[];
  problems: Array<ProblemEntry & { quotes: Quote[]; reports: number }>;
  sources: Source[];
  updatedAt: string | null;
  stale: boolean;
}

export function buildAduanaPayload(doc: AduanaDoc): PublicAduanaPayload {
  return {
    facts: doc.facts,
    problems: doc.problems.map((p: ProblemEntry) => ({
      ...p,
      quotes: doc.quotes[p.id] ?? [],
      reports: doc.counts[p.id] ?? 0,
    })),
    sources: doc.sources,
    updatedAt: doc.updatedAt,
    stale: !doc.updatedAt || Date.now() - new Date(doc.updatedAt).getTime() > STALE_MS,
  };
}
