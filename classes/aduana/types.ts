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
}

/** One legal fact. `origin` records whether a human or the AI put the current value there. */
export interface AduanaFact {
  id: string; // 'franquicia.tope_anual_usd'
  label: string;
  value: number | string;
  unit?: "USD" | "dias" | "pct" | "kg";
  sourceId: string; // → Source.id
  article?: string; // 'art. 15'
  verifiedAt: string;
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
