// Tipos y constantes del termómetro de r/CharruaDevs (job currency-charruadevs → /mercado-it-uruguay).
export const SUB = "CharruaDevs";

export const THEMES = [
  "ia",
  "despidos",
  "busqueda",
  "junior",
  "sueldos",
  "dolar_costos",
  "exterior",
  "saturacion",
  "entrevistas",
  "estudio",
  "condiciones",
  "emigrar",
  "empresas_uy",
  "emprender",
  "otro",
] as const;
export type Theme = (typeof THEMES)[number];
/** Los temas que se miden: "otro" no dice nada de la conversación. */
export const RATE_THEMES: readonly Theme[] = THEMES.filter((t) => t !== "otro");

export const AI_VIEWS = ["amenaza", "herramienta", "hype", "mixto"] as const;
export type AiView = (typeof AI_VIEWS)[number];

export const EVENTS = ["busca", "consiguio", "despedido", "contrata", "ninguno"] as const;
export type LifeEvent = (typeof EVENTS)[number];

export const PERSONAS = [
  "estudiante",
  "junior",
  "semisenior",
  "senior",
  "empresa_reclutador",
  "cambio_carrera",
  "desconocido",
] as const;
export type Persona = (typeof PERSONAS)[number];

export type Kind = "post" | "comment";

export interface Label {
  rel: boolean;
  stance: number | null;
  themes: Theme[];
  ai: AiView | null;
  event: LifeEvent;
  persona?: Persona;
}

/** Un documento de `charruadevstexts`. Sin autor a propósito. */
export interface CharruaText {
  rid: string;
  kind: Kind;
  thread: string;
  title: string;
  body: string;
  createdAt: Date;
  month: string;
  score: number;
  comments?: number;
  flair?: string | null;
  rel: boolean;
  stance: number | null;
  themes: Theme[];
  ai: AiView | null;
  event: LifeEvent;
  persona?: Persona;
  gone: boolean;
  url: string;
  model: string;
}

export const LEX_KEYS = ["no_hay_laburo", "saturado", "despidos", "reemplazo_ia", "ia_menciones", "optimismo"] as const;
export type LexKey = (typeof LEX_KEYS)[number];

/** Una fila mensual que el job no puede recalcular sin volver a bajar el mes entero. */
export interface MonthRow {
  m: string;
  posts: number;
  comments: number;
  candidates: number;
  classified: number;
  lex: Record<LexKey, number>;
  lexN: number;
}

export interface HarvestState {
  months: MonthRow[];
  seededAt?: string;
  lastRunAt?: string;
}

/** Forma cruda de Arctic Shift (sólo los campos que usamos). */
export interface ArcticPost {
  id: string;
  created_utc: number;
  title: string;
  selftext?: string;
  author?: string;
  score?: number;
  num_comments?: number;
  link_flair_text?: string | null;
  permalink?: string;
  removed_by_category?: string | null;
}

export interface ArcticComment {
  id: string;
  link_id: string;
  parent_id?: string;
  created_utc: number;
  body: string;
  author?: string;
  score?: number;
}
