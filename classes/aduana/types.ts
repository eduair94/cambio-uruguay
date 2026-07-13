// Shapes for the customs problem hub (/problemas-con-la-aduana-uruguay).
//
// One AduanaDoc is the whole public payload: the legal facts (each one sourced), the twelve
// problem procedures, and the Reddit testimonies that back them. It is stored as a single Mongo
// document and served whole — the data set is small and always read in full.

export type BucketId =
  | "retenido"
  | "factura-exigida"
  | "roto-o-incompleto"
  | "cobro-abusivo"
  | "franquicia-agotada"
  | "supera-monto"
  | "prohibido-o-restringido"
  | "decomiso-subasta"
  | "comercial-vs-personal"
  | "encomienda-regalo"
  | "demora-extrema"
  | "mudanza-y-viajero";

export const BUCKET_IDS: BucketId[] = [
  "retenido",
  "factura-exigida",
  "roto-o-incompleto",
  "cobro-abusivo",
  "franquicia-agotada",
  "supera-monto",
  "prohibido-o-restringido",
  "decomiso-subasta",
  "comercial-vs-personal",
  "encomienda-regalo",
  "demora-extrema",
  "mudanza-y-viajero",
];

/** A norm we cite. `url` MUST be the PDF, never an Aduanas HTML stub page. */
export interface Source {
  id: string;
  title: string;
  norm: string; // 'Decreto 50/026'
  url: string;
  checkedAt: string; // ISO date
  /**
   * Whether this source IS the law (a ley, decreto, RG or CAROU article) or is an official page
   * that merely DESCRIBES what the DNA/URSEC/MEF says it does (a portal page, a trámite, a FAQ).
   * This is what the page's "verificado contra la norma" badge keys off — never a magic-string
   * check on a fact's `article` text. A fact sourced to a `pagina-oficial` source is the DNA's
   * (or MEF's, or URSEC's) claim about the rule, not the rule itself, however precise-looking its
   * `article` field reads (e.g. "num. 3" is exactly as plausible-looking as a real ley article).
   */
  kind: "norma" | "pagina-oficial";
}

/**
 * One legal fact. `origin` records whether a human or the AI put the current value there.
 *
 * The two timestamps are NOT interchangeable and the page must not render them as if they were:
 *  - `verifiedAt` is HUMAN-ONLY. It means somebody opened the decree and read the number. The
 *    weekly AI refresh never writes it (classes/aduana/norms.ts) — a machine's re-read is not a
 *    human's verification, and a page whose every date is a model's shrug is worse than a page
 *    with an honestly old date.
 *  - `aiCheckedAt` is what the weekly refresh writes when a GROUNDED model re-read the norm and
 *    found the same value. It is a freshness signal, not a trust signal ("último control
 *    automático", never "verificado contra la norma").
 */
export interface AduanaFact {
  id: string; // 'franquicia.tope_anual_usd'
  label: string;
  value: number | string;
  unit?: "USD" | "dias" | "pct" | "kg";
  sourceId: string; // → Source.id
  article?: string; // 'art. 15'
  verifiedAt: string; // ISO date — written by a human only
  aiCheckedAt?: string; // ISO date — written by the weekly grounded re-check only
  origin: "baseline" | "ai";
}

/** A cited testimony. Text is trimmed, never rewritten. */
export interface Quote {
  text: string;
  author: string;
  date: string; // 'YYYY-MM-DD'
  score: number;
  permalink: string;
}

/**
 * The AI's verdict on ONE piece of corpus text, keyed to the postId/commentId it came from.
 * The model only ever answers this closed question; every count and every choice of quote is
 * then made by pure, deterministic code (see classes/aduana/classify.ts#aggregate). A text that
 * is not about a real customs problem yields no AduanaLabel at all — `labelText` returns `null`.
 */
export interface AduanaLabel {
  key: string; // → the source postId/commentId, unique like corpus.ts's own dedupe key
  bucket: BucketId;
  outcome: "resuelto" | "pago" | "perdio" | "sin-resolver";
  lesson: string; // <=140 chars, what to learn from this case
  confident: boolean; // false when the model itself doubts the bucket — never counted or quoted
}

/** One problem bucket: what the norm says, what to do, and the claim template. */
export interface ProblemEntry {
  id: BucketId;
  title: string;
  symptom: string; // what the user would say happened to them
  norm: string; // plain-language statement of the rule
  sourceIds: string[];
  steps: string[]; // numbered plan of action
  deadline?: string; // legal deadline, when one exists
  claimBody?: "courier" | "dna" | "defensa-consumidor" | "ursec";
  claimTemplate?: string; // {{tracking}}, {{fecha}}, {{descripcion}} placeholders
  verified: boolean; // false → the page says "no lo pudimos verificar"
}

export interface AduanaDoc {
  facts: AduanaFact[];
  problems: ProblemEntry[];
  quotes: Partial<Record<BucketId, Quote[]>>;
  counts: Partial<Record<BucketId, number>>;
  sources: Source[];
  /** Fact ids the AI wanted to change and we did NOT publish. Surfaced in logs and /estado. */
  pendingReview: string[];
  updatedAt: string | null;
}
