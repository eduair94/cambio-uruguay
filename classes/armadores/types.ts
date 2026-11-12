// El directorio de armadores de muebles (/armadores-de-muebles-montevideo): una fila por prestador
// o aviso, con su fuente siempre a la vista. Espejo en app/utils/armadores.ts (la página lee el
// mismo documento que escribe `sync_armadores.ts`).

/** De dónde sale la fila. Cada fuente afirma cosas distintas y la página lo dice. */
export type ArmadorSource = "editorial" | "google" | "facebook" | "mercadolibre";

/** Cinco zonas de Montevideo sobre los 62 barrios INE, más el área metropolitana. */
export type MontevideoZone = "centro" | "costa-este" | "este" | "norte" | "oeste";
export type ArmadorZone = MontevideoZone | "metropolitana";

/** Qué mueble cobra la tarifa. `null` en un precio = no lo dice (el precio de una tarjeta). */
export type ArmadorItem =
  | "ropero"
  | "cama"
  | "cucheta"
  | "comoda"
  | "mesa-de-luz"
  | "escritorio"
  | "rack"
  | "biblioteca"
  | "mesa"
  | "silla"
  | "cocina"
  | "bano"
  | "zapatera"
  | "cuna"
  | "exterior"
  | "colgado"
  | "desarmado"
  | "visita"
  | "hora"
  | "otro";

export type ArmadorService = "armado" | "desarmado" | "traslado" | "colgado" | "instalacion" | "reparacion";

export interface ArmadorPrice {
  item: ArmadorItem | null;
  /** La etiqueta tal como la publicó la fuente. */
  label: string;
  amount: number;
  /** Tope de un rango ("$ 800 a $ 1.200"); null si es un solo monto. */
  amountMax: number | null;
  currency: "UYU" | "USD";
  /** `ad`: el precio que el anunciante puso en la tarjeta — no dice de qué mueble ni qué incluye. */
  kind: "exact" | "from" | "range" | "ad";
  conditions: string | null;
  sourceUrl: string;
  /** Día (AAAA-MM-DD) en que se leyó, o la fecha que la propia fuente le pone al precio. */
  observedAt: string;
  /** `table`: tabla publicada; `ad-card`: tarjeta del aviso; `ad-text`: lista dentro del aviso. */
  origin: "table" | "ad-card" | "ad-text";
}

export interface ArmadorContact {
  type: "whatsapp" | "phone" | "email" | "instagram" | "facebook";
  value: string;
  sourceUrl: string;
}

export interface ArmadorBase {
  barrio: string | null;
  zone: ArmadorZone | null;
  department: string | null;
  /** Cómo se supo: coordenada de Google, barrio del aviso de ML, texto del aviso o relevamiento. */
  basis: "coordinates" | "ml-city" | "text" | "editorial" | null;
}

export interface ArmadorCoverage {
  /** El prestador DICE cubrir todo Montevideo. */
  allMontevideo: boolean;
  /** Barrios de Montevideo (o localidades metropolitanas) que nombra. */
  barrios: string[];
  /** Zonas derivadas de `barrios` (y de la base). */
  zones: ArmadorZone[];
  /** Lugares fuera de Montevideo que nombra ("Ciudad de la Costa", "Maldonado"). */
  outside: string[];
}

export interface ArmadorEntry {
  /** `ed:<slug>` | `g:<placeId>` | `fb:<id>` | `ml:<id>` */
  id: string;
  source: ArmadorSource;
  kind: "empresa" | "independiente" | "tienda" | "plataforma" | "aviso";
  /** Nombre comercial; en un aviso, su título. */
  name: string;
  summary: string | null;
  /** El enlace principal: la ficha de Google, el aviso, el sitio. */
  url: string;
  website: string | null;
  image: string | null;
  base: ArmadorBase;
  coverage: ArmadorCoverage;
  services: ArmadorService[];
  prices: ArmadorPrice[];
  /** La tarjeta trae un monto simbólico (< $ 150): «a consultar», fuera de toda estadística. */
  symbolicPrice: boolean;
  rating: { value: number; count: number; observedAt: string } | null;
  placeId: string | null;
  contacts: ArmadorContact[];
  /** El servicio sólo vale para lo comprado en esa tienda. */
  storeOnly: boolean;
  sources: Array<{ url: string; consultedAt: string; label: string }>;
  firstSeen: string;
  lastSeen: string;
}

export const ARMADORES_KEY = "mvd";

export interface ArmadorSnapshot {
  key: typeof ARMADORES_KEY;
  capturedAt: Date;
  /** Último día en que se leyó Google (semanal: cuota). */
  googleAt: string | null;
  /** Fecha del relevamiento editorial. */
  editorialReviewedAt: string | null;
  entries: ArmadorEntry[];
  counts: Record<string, number>;
  /** Qué fuente no corrió y por qué (se conservaron sus filas anteriores). */
  notes: string[];
}

/** Monto de tarjeta por debajo del cual el aviso dice "consultar" con un número. */
export const SYMBOLIC_PRICE_UYU = 150;
/** Días sin ver un aviso de FB/ML antes de sacarlo. */
export const AD_TTL_DAYS = 14;
/** Días sin ver un negocio de Google antes de sacarlo (la lectura es semanal). */
export const GOOGLE_TTL_DAYS = 30;
/** Días entre lecturas de Google Places. */
export const GOOGLE_EVERY_DAYS = 7;
