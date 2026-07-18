// The public shape. A problem with zero Reddit evidence still ships — the norm and the procedure
// are the point; the testimonies are corroboration, not the content.
import type { AduanaDoc, AduanaFact, ProblemEntry, Quote, Source } from "./types";

const STALE_MS = 14 * 24 * 60 * 60 * 1000;

/**
 * A fact as served to the app. When it carries a live auto-published override, `autoPublished` is
 * true and the machine-update metadata rides along, so the page can badge it "actualizado
 * automáticamente, sin verificación humana" (and NEVER "verificado contra la norma") and, if it
 * wants, show what it changed from. `origin: 'ai'` already flags an overridden fact; these fields
 * add the context. Absent fields ⇒ a normal baseline/human fact.
 */
export interface PublicAduanaFact extends AduanaFact {
  autoPublished?: boolean;
  publishedAt?: string;
  prevValue?: number | string;
  overrideSources?: string[];
}

export interface PublicAduanaPayload {
  facts: PublicAduanaFact[];
  problems: Array<ProblemEntry & { quotes: Quote[]; reports: number }>;
  sources: Source[];
  updatedAt: string | null;
  stale: boolean;
  /** Fact ids the weekly grounded re-check is disputing, still awaiting a human look — see
   * AduanaDoc.pendingReview. A fact flagged here must never render as confidently "verificado
   * contra la norma" without also surfacing that the automated check disagrees. */
  pendingReview: string[];
}

export function buildAduanaPayload(doc: AduanaDoc): PublicAduanaPayload {
  // `doc` is the MERGED doc (loadAduanaDoc): its facts already carry override VALUES, and
  // `doc.overrides` holds only the LIVE (non-discharged) overrides. Attach their metadata by id.
  const overrideById = new Map((doc.overrides ?? []).map((o) => [o.id, o]));
  return {
    facts: doc.facts.map((f: AduanaFact): PublicAduanaFact => {
      const o = overrideById.get(f.id);
      return o
        ? { ...f, autoPublished: true, publishedAt: o.publishedAt, prevValue: o.prevValue, overrideSources: o.sources }
        : f;
    }),
    problems: doc.problems.map((p: ProblemEntry) => ({
      ...p,
      quotes: doc.quotes[p.id] ?? [],
      reports: doc.counts[p.id] ?? 0,
    })),
    sources: doc.sources,
    updatedAt: doc.updatedAt,
    stale: !doc.updatedAt || Date.now() - new Date(doc.updatedAt).getTime() > STALE_MS,
    pendingReview: doc.pendingReview,
  };
}
