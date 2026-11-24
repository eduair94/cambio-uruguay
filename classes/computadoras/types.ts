// Las formas de `/computadoras-usadas-uruguay`. Las PÚBLICAS (lo que se escribe en
// `computercatalog`, `computerparts` y `computermetas`) tienen su espejo escrito a mano en
// `app/utils/computadorasPublic.ts`: un campo que cambia acá y no allá deja a la página leyendo
// `undefined` sin que nada falle.

export type ComputerSource = "facebook" | "mercadolibre";

export type MachineKind = "notebook" | "desktop" | "all-in-one" | "mini-pc";
export type PartKind = "gpu" | "cpu" | "ram" | "storage" | "motherboard" | "psu" | "combo";
export type ComputerKind = MachineKind | PartKind;

export const MACHINE_KINDS: readonly MachineKind[] = ["notebook", "desktop", "all-in-one", "mini-pc"];
export const isMachineKind = (kind: ComputerKind | null | undefined): kind is MachineKind =>
  !!kind && (MACHINE_KINDS as readonly string[]).includes(kind);

export type PartRole = "cpu" | "gpu" | "ram" | "storage" | "motherboard" | "psu" | "case";

export type Condition = "new" | "like-new" | "good" | "fair";

export type Fault =
  | "no-enciende"
  | "no-da-video"
  | "para-repuesto"
  | "pantalla"
  | "teclado"
  | "bateria"
  | "bloqueada"
  | "sin-disco"
  | "sin-cargador"
  | "falla";

export type Verdict = "muy-por-debajo" | "por-debajo" | "parejo" | "por-encima";

/** De dónde sale un dato: el título, la descripción de la ficha, o el selector de la plataforma. */
export type Basis = "title" | "description" | "facebook" | "mercadolibre";

export type RamType = "ddr3" | "ddr4" | "ddr5";

export interface CpuIdentity {
  brand: "intel" | "amd" | "apple";
  /** `core-i5`, `core-ultra-7`, `ryzen-5`, `apple-m`, `celeron`, `xeon`, `fx`… */
  family: string;
  /** El modelo exacto («12400F», «5700G», «M2 Pro»); null cuando el texto sólo dice «i7». */
  model: string | null;
  /** La identidad que se valúa (`cpu:i5-12400f`); null sin modelo exacto. */
  slug: string | null;
  label: string;
  generation: number | null;
  socket: string | null;
  ramType: RamType | null;
  /** Procesador de notebook (sufijo U/H/HS/HX/P/G7…). */
  mobile: boolean;
  /** Año aproximado de lanzamiento de la SERIE, no del modelo exacto. */
  year: number | null;
}

export interface GpuIdentity {
  brand: "nvidia" | "amd" | "intel" | "apple";
  /** «RTX 3060 Ti», «RX 580»; null en una integrada sin nombre. */
  model: string | null;
  /** `gpu:rtx-3060-ti`, `gpu:rtx-3060-12gb`; null en integradas. */
  slug: string | null;
  /** La identidad sin VRAM de un modelo que se vende con dos memorias (`gpu:rtx-3060`). */
  baseSlug: string | null;
  label: string;
  vramGb: number | null;
  integrated: boolean;
  /** Placa de notebook («RTX 4050» en una laptop, «GTX 970M», «MX450»): no se vende suelta. */
  mobile: boolean;
  year: number | null;
}

export type DriveType = "nvme" | "ssd" | "hdd" | "emmc" | "unknown";

export interface Drive {
  type: DriveType;
  gb: number;
}

export interface ComputerSpecs {
  kind: ComputerKind | null;
  /** Por qué no es una computadora ni una pieza (`tv`, `consola`, `lote`, `multi`…). */
  rejectReason: string | null;
  brand: string | null;
  cpu: (CpuIdentity & { basis: Basis }) | null;
  /** `inferred`: la integrada se deduce del procesador; el aviso no dice si hay además una dedicada. */
  gpu: (GpuIdentity & { basis: Basis; inferred?: boolean }) | null;
  ramGb: number | null;
  ramType: RamType | null;
  /** El tipo de RAM no lo dice el aviso: se deduce del procesador. */
  ramTypeInferred: boolean;
  storage: Drive[];
  psuWatts: number | null;
  chipset: string | null;
  screenInches: number | null;
  includes: { monitor: boolean; monitorInches: number | null; peripherals: boolean };
  faults: Fault[];
  condition: Condition | null;
  basis: Partial<Record<"ram" | "storage" | "psu" | "chipset" | "screen", Basis>>;
  /** Notebook: la línea (`macbook-air`, `thinkpad`), su etiqueta, el modelo que la sigue y, en Mac, el año del título. */
  line?: string | null;
  lineLabel?: string | null;
  model?: string | null;
  modelYear?: number | null;
}

/** Lo que una fuente entrega de un aviso, antes de leerlo. Privado (`computerlistings`). */
export interface RawComputerListing {
  /** `fb-<id>` / `ml-<MLU…>`. */
  slug: string;
  source: ComputerSource;
  sourceId: string;
  url: string;
  title: string;
  price: number;
  currency: "UYU" | "USD";
  image: string | null;
  /** La ciudad o departamento que da el origen. */
  location: string | null;
  /** Categoría de Mercado Libre (`MLU1649`…), o la de Marketplace. */
  category: string | null;
  /** ML: «Nuevo»/«Usado». */
  condition: string | null;
  /** ML: tienda oficial. */
  officialStore: boolean;
  /** Vendedor de ML (para contar vendedores distintos en una mediana; nunca se publica el de FB). */
  sellerId: string | null;
  firstSeen: string;
  lastSeen: string;
}

/** La ficha de Facebook de un aviso. Privada (`computerfbdetails`). */
export interface FacebookComputerDetail {
  id: string;
  readAt: string;
  found: boolean;
  description: string | null;
  /** `attribute_data` del aviso: `Condition` → `used_like_new`, `Brand`, `Operating System`… */
  attributes: Record<string, string>;
  /** `creation_time` del aviso, en ISO. */
  createdAt: string | null;
  /** Vendido, pausado o borrado al leer la ficha. */
  gone: boolean;
}

export interface PriceStat {
  medianUsd: number;
  p25Usd: number;
  minUsd: number;
  n: number;
}

export interface PartRow {
  slug: string;
  role: PartRole;
  label: string;
  facts: {
    year?: number | null;
    socket?: string | null;
    ramType?: string | null;
    vramGb?: number | null;
    gb?: number | null;
    driveType?: string | null;
    watts?: number | null;
    chipset?: string | null;
    brand?: string | null;
  };
  new: (PriceStat & { sellers: number; cheapest: { title: string; url: string; priceUsd: number; image: string | null } | null }) | null;
  used: PriceStat | null;
  inCatalog: number;
  history: Array<{ day: string; newUsd: number | null; usedUsd: number | null }>;
  updatedAt: string;
}

/** Un precio de una pieza sola, nueva o usada, visto hoy. */
export interface PartObservation {
  slug: string;
  role: PartRole;
  label: string;
  facts: PartRow["facts"];
  condition: "new" | "used";
  priceUsd: number;
  sellerId: string;
  title: string;
  url: string;
  image: string | null;
}

export interface ValuedPart {
  role: PartRole;
  label: string;
  slug: string | null;
  estimated: boolean;
  newUsd: number | null;
  usedUsd: number | null;
  newN: number;
  usedN: number;
  /** Pieza supuesta sin precio usado: entra al total usado al nuevo más barato del cuartil. */
  usedFromNew: boolean;
}

export interface Valuation {
  parts: ValuedPart[];
  newTotalUsd: number | null;
  usedTotalUsd: number | null;
  newPartialUsd: number;
  usedPartialUsd: number;
  missingNew: string[];
  missingUsed: string[];
  ratio: number | null;
  /** Contra qué se compara: las piezas usadas, las nuevas, o las computadoras iguales del directorio. */
  reference: "used" | "new" | "comparables" | null;
  verdict: Verdict | null;
  sameNew: { label: string; medianUsd: number; n: number } | null;
}

export interface Comparables {
  label: string;
  medianUsd: number;
  n: number;
  basis: "cpu+gpu" | "cpu" | "model" | "line" | "part";
}

/** Un aviso que pide bastante menos que su referencia (classes/computadoras/opportunity.ts). */
export interface Opportunity {
  tier: "solida" | "exploratoria";
  reference: "used" | "comparables" | "part";
  referenceUsd: number;
  referenceLabel: string;
  n: number;
  savingsUsd: number;
  savingsPct: number;
}

/** La fila pública: espejo de `ComputerPublicListing` (`app/utils/computadorasPublic.ts`). */
export interface ComputerCatalogRow {
  slug: string;
  source: ComputerSource;
  url: string;
  title: string;
  image: string | null;
  kind: ComputerKind;
  kindGroup: "computer" | "part";
  price: number;
  currency: "UYU" | "USD";
  priceUsd: number;
  priceUyu: number;
  currencyInferred: boolean;
  department: string | null;
  city: string | null;
  condition: Condition | null;
  sellerType: "tienda" | "particular" | null;
  brand: string | null;
  cpu: (Omit<CpuIdentity, never> & { basis: Basis }) | null;
  cpuBrand: CpuIdentity["brand"] | null;
  cpuFamily: string | null;
  gpu: (Omit<GpuIdentity, "baseSlug" | "mobile"> & { basis: Basis }) | null;
  gpuSlug: string | null;
  gpuDedicated: boolean | null;
  ramGb: number | null;
  ramType: RamType | null;
  storage: Drive[];
  storageGb: number | null;
  hasSsd: boolean | null;
  screenInches: number | null;
  psuWatts: number | null;
  chipset: string | null;
  includes: ComputerSpecs["includes"];
  faults: Fault[];
  detailRead: boolean;
  specCount: number;
  valuation: Valuation | null;
  comparables: Comparables | null;
  line: string | null;
  lineLabel: string | null;
  model: string | null;
  modelYear: number | null;
  opportunity: Opportunity | null;
  firstSeen: string;
  lastSeen: string;
  publishedAt: string;
}

export interface Preset {
  id: string;
  label: string;
  description: string;
  parts: Array<{ role: PartRole; label: string; slug: string; newUsd: number | null }>;
  totalUsd: number | null;
  missing: string[];
}

export interface SourceRun {
  id: string;
  label: string;
  ok: boolean;
  note: string;
  lastOkAt: string | null;
}

export interface ComputerMeta {
  generatedAt: string;
  freshDays: number;
  usdUyu: number;
  counts: {
    total: number;
    computers: number;
    parts: number;
    facebook: number;
    mercadolibre: number;
    withValuation: number;
    withNewTotal: number;
    withUsedTotal: number;
    opportunities?: number;
    detailRead: number;
  };
  sources: SourceRun[];
  partsPriced: number;
  presets: Preset[];
}

/** Un aviso deja de publicarse si no se lo vio en estos días (la horaria nunca retira por ausencia). */
export const COMPUTER_FRESH_DAYS = 4;
export const COMPUTER_META_ID = "uy-computadoras";

// ---------------------------------------------------------------------------------------------
// El informe de precios de notebooks: espejo de `ComputerPublicNotebookReport`.

export interface ReportCell {
  id: string;
  label: string;
  n: number;
  medianUsd: number;
  p25Usd: number;
  p75Usd: number;
}

export interface NotebookBudget {
  id: string;
  label: string;
  minUsd: number;
  maxUsd: number | null;
  n: number;
  ramGb: number | null;
  ramShare: number | null;
  ssdShare: number | null;
  dedicatedShare: number;
  families: Array<{ label: string; n: number }>;
  lines: Array<{ label: string; n: number }>;
}

export interface NotebookReport {
  generatedAt: string;
  total: number;
  minSample: number;
  ladderSample: number;
  headline: { medianUsd: number; p25Usd: number; p75Usd: number; appleShare: number; dedicatedShare: number; under300Share: number };
  priceBands: Array<{ id: string; label: string; minUsd: number; maxUsd: number | null; n: number }>;
  brands: ReportCell[];
  families: ReportCell[];
  generations: Array<ReportCell & { family: string; generation: number; year: number | null }>;
  macLadder: Array<ReportCell & { line: string; step: string; kind: "year" | "chip"; order: number }>;
  ram: Array<ReportCell & { gb: number }>;
  gpus: ReportCell[];
  models: Array<ReportCell & { line: string }>;
  usedVsNew: Array<{ id: string; label: string; usedUsd: number; usedN: number; newUsd: number; newN: number; share: number }>;
  budgets: NotebookBudget[];
}

export const NOTEBOOK_REPORT_ID = "uy-computadoras-notebooks";
