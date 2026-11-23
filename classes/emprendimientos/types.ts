// Tipos del directorio de emprendimientos de Instagram. Ver
// docs/superpowers/specs/2026-11-23-emprendimientos-instagram-design.md y docs/app/EMPRENDIMIENTOS.md.

/** De dónde conocimos una cuenta. Ninguna fuente publica sola: toda cuenta se lee y se clasifica. */
export type SourceKind = "uruguay-emprendedor" | "reddit" | "colaboracion" | "mencion" | "sugerencia" | "semilla" | "web";

export interface SourceRef {
  kind: SourceKind;
  /** Día (YYYY-MM-DD, Montevideo) en que la fuente la nombró por primera vez. */
  day: string;
  /** Enlace público de la fuente (la ficha de Uruguay Emprendedor, el hilo de Reddit). */
  url?: string | null;
  /** Lo que la fuente dice, corto: el título del hilo, el nombre en la ficha. */
  label?: string | null;
  /** La cuenta desde la que llegó (colaboración o mención). */
  via?: string | null;
  /** Lo que la fuente sabe del rubro y el lugar, como pista para la clasificación. */
  rubroHint?: string | null;
  departamentoHint?: string | null;
  /** Texto de la fuente (descripción de la ficha, el comentario), recortado. Nunca se publica. */
  text?: string | null;
}

export interface ProfilePost {
  code: string;
  /** El dueño del post: en una colaboración no es la cuenta del perfil. */
  owner: string;
  reel: boolean;
  /** YYYY-MM-DD, del `alt` de la grilla; null si el alt no la trae. */
  date: string | null;
  /** La foto de la grilla (640 px, firmada: vence en días). */
  image: string | null;
  /** Lo que Instagram describe de la foto («Puede ser una imagen de…»), sin la fecha. */
  alt: string | null;
}

export type ReadStatus = "ok" | "missing" | "private" | "unreadable";

export interface ProfileRead {
  status: ReadStatus;
  handle: string;
  fullName: string;
  biography: string;
  /** Destinos de los enlaces de la bio, ya desenvueltos de l.instagram.com. */
  links: string[];
  followers: number | null;
  following: number | null;
  profilePic: string | null;
  posts: ProfilePost[];
  /** ISO. */
  readAt: string;
}

export const TIPOS = ["emprendimiento", "marca-grande", "personal", "medio-o-comunidad", "tienda-colectiva", "otro"] as const;
export type Tipo = (typeof TIPOS)[number];
export const URUGUAYA = ["si", "no", "dudoso"] as const;
export type Uruguaya = (typeof URUGUAYA)[number];
export const OFRECE = ["productos", "servicios", "ambos"] as const;
export type Ofrece = (typeof OFRECE)[number];
export const ENVIOS = ["todo-el-pais", "local", "no-dice"] as const;
export type Envios = (typeof ENVIOS)[number];

export interface Classification {
  tipo: Tipo;
  uruguaya: Uruguaya;
  rubro: string;
  etiquetas: string[];
  resumen: string;
  ofrece: Ofrece;
  envios: Envios;
  departamento: string | null;
  barrio: string | null;
  raro: boolean;
  /** El rubro excluido que la cuenta vende (préstamos, réplicas…), o null. */
  riesgo: string | null;
  model: string;
  /** ISO. */
  at: string;
  /** Hash del nombre + bio leídos: si no cambian, no se vuelve a clasificar (salvo a los 60 días). */
  inputHash: string;
}

export const STATES = [
  "pendiente",
  "publicada",
  "rechazada",
  "inexistente",
  "privada",
  "inactiva",
  "curadora",
  "baja",
] as const;
export type CandidateState = (typeof STATES)[number];

export interface Candidate {
  handle: string;
  state: CandidateState;
  /** Por qué está en ese estado, en castellano, para el log y el informe. */
  reason: string | null;
  sources: SourceRef[];
  firstSeenAt: string;
  /** La última lectura con perfil (status ok). */
  profile: ProfileRead | null;
  lastReadAt: string | null;
  lastReadStatus: ReadStatus | null;
  /** Lecturas seguidas sin perfil, contadas sólo en corridas donde Instagram contestó. */
  unreadableStreak: number;
  /** Lecturas seguidas que dijeron "no existe" o "privada". */
  goneStreak: number;
  classification: Classification | null;
  listedAt: string | null;
  /**
   * Sólo curadoras: los códigos de posts cuyo texto ya se leyó buscando @menciones (una feria o
   * una tienda colectiva etiqueta a las marcas que muestra). Se guardan para no releerlos.
   */
  minedCodes?: string[];
}

/** El texto de un post leído para la bola de nieve: quién lo publicó y qué dice. */
export interface PostCaption {
  code: string;
  owner: string;
  text: string;
}

/** Una ficha pública: lo único que lee la API. Se arma campo por campo en `listing.ts`. */
export interface PublicPost {
  code: string;
  reel: boolean;
  date: string | null;
  image: string;
}

export interface PublicSource {
  kind: SourceKind;
  label: string;
  url: string | null;
}

export interface EmprendimientoListing {
  handle: string;
  name: string;
  summary: string;
  rubro: string;
  tags: string[];
  departamento: string | null;
  barrio: string | null;
  envios: Envios;
  ofrece: Ofrece;
  raro: boolean;
  /** Sin sitio propio en la bio: se vende por Instagram (y WhatsApp). */
  soloInstagram: boolean;
  /** Dominio del sitio propio, si lo hay (sin ruta). */
  website: string | null;
  whatsapp: boolean;
  followers: number | null;
  profilePic: string | null;
  posts: PublicPost[];
  lastPostAt: string | null;
  postsLast90: number;
  sources: PublicSource[];
  /** ISO: cuándo entró al directorio y cuándo se leyó por última vez. */
  listedAt: string;
  readAt: string;
  /** ISO: cuándo vence la primera foto firmada (la API no sirve fotos vencidas). */
  photosExpireAt: string | null;
  /** Texto normalizado (sin tildes, minúsculas) para la búsqueda. */
  search: string;
}

export interface SourceStatus {
  /** Última lectura buena de la fuente (ISO), o null si nunca contestó. */
  at: string | null;
  found: number;
  note: string | null;
}

export interface RunSummary {
  at: string;
  reads: number;
  ok: number;
  classified: number;
  listed: number;
  unlisted: number;
  discovered: number;
  note: string | null;
}

/** La memoria del job entre corridas. Nunca la sirve la API. */
export interface MetaState {
  /** Hilos de Reddit cuyos comentarios ya se leyeron → cantidad de comentarios de ese momento. */
  redditThreads: Record<string, number>;
  /** Fichas de Uruguay Emprendedor ya leídas → día. */
  ueRead: Record<string, string>;
  /** Fichas del último listado que todavía no se leyeron, con su departamento. */
  ueQueue: { slug: string; departamento: string; name: string }[];
  /** Por dónde va la rotación de búsquedas web (índice en `webQueries()`). */
  webCursor?: number;
}

export interface EmprendimientoMeta {
  key: "current";
  generatedAt: string;
  listed: number;
  byRubro: Record<string, number>;
  byDepartamento: Record<string, number>;
  candidates: Record<string, number>;
  sources: Record<string, SourceStatus>;
  lastRun: RunSummary | null;
  state: MetaState;
}
