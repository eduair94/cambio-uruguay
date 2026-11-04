// El documento precalculado que leen /monopatines-electricos-uruguay y /bicicletas-electricas-uruguay
// (uno por categoría, `key` = la categoría): los candidatos del asesor "¿Cuál te conviene?" y las
// medianas de cada tipo para "Qué esperar de cada tipo".
//
// Se arma al final de cada corrida de currency-movilidad-specs y el pedido sólo lo lee (regla del
// dueño desde el 19/9/2026: lo que procesa la base se precalcula). Las medianas cuentan sólo lo que
// dice la ficha o la descripción del vendedor, no lo que se leyó del título: un título se escribe
// para vender y su lectura es la más frágil.
import { hasFichaSpecs } from "./parse";
import { BICICLETA_CATEGORY, MONOPATIN_CATEGORY, type MovilidadSpecCategory } from "./profiles";
import type { MonopatinSpecs, NumericSpecField } from "./types";

export const MONOPATIN_SNAPSHOT_KEY = MONOPATIN_CATEGORY;
export const BICICLETA_SNAPSHOT_KEY = BICICLETA_CATEGORY;
/** Una mediana con menos datos que esto describe a tres avisos, no a un tipo. */
export const STATS_MIN_N = 5;
const TITLE_MAX = 140;

/** Lo que el snapshot necesita de una fila de `movilidadlistings` ya enriquecida. */
export interface SnapshotRow {
  listingId: string;
  title: string;
  url: string;
  image: string | null;
  price: number;
  currency: "UYU" | "USD";
  priceUyu: number;
  condition: "new" | "used";
  source: "store" | "mercadolibre" | "facebook";
  sellerName: string;
  brand: string;
  variant: string;
  variantLabel: string;
  suspect: boolean;
  specs: MonopatinSpecs | null;
  uyuPerKm: number | null;
  /** La página del modelo (classes/movilidad/models/), si el aviso pertenece a uno. */
  modelSlug?: string | null;
}

export type CandidateSpecs = Omit<MonopatinSpecs, "from">;

export interface AdvisorCandidate {
  id: string;
  title: string;
  url: string;
  image: string | null;
  price: number;
  currency: "UYU" | "USD";
  priceUyu: number;
  condition: "new" | "used";
  source: "store" | "mercadolibre" | "facebook";
  sellerName: string;
  brand: string;
  variant: string;
  specs: CandidateSpecs;
  /** "Ver el modelo" en el asesor: sólo cuando el aviso tiene página de modelo. */
  modelSlug?: string;
}

export interface SpecStatsRow {
  variant: string;
  label: string;
  /** Avisos de ese tipo (no sospechosos), tengan o no ficha. */
  n: number;
  rangeKm: number | null;
  maxSpeedKmh: number | null;
  motorW: number | null;
  weightKg: number | null;
  maxLoadKg: number | null;
  chargeHours: number | null;
  batteryWh: number | null;
  wheelInches: number | null;
  /** Sólo con sentido en bicicleta; en monopatín queda en null. */
  gears: number | null;
}

export interface MonopatinSpecSnapshot {
  key: MovilidadSpecCategory;
  generatedAt: string;
  candidates: AdvisorCandidate[];
  stats: {
    byVariant: SpecStatsRow[];
    all: SpecStatsRow;
    /** Avisos con algún dato de ficha (no sólo del título). */
    withFicha: number;
    /** Avisos no sospechosos. */
    total: number;
    /** Avisos cuya ficha declara una velocidad máxima. */
    withSpeed: number;
    /** De esos, cuántos declaran más de 25 km/h (el tope de Montevideo y San José). */
    over25: number;
  };
}

const STAT_FIELDS = [
  "rangeKm",
  "maxSpeedKmh",
  "motorW",
  "weightKg",
  "maxLoadKg",
  "chargeHours",
  "batteryWh",
  "wheelInches",
  "gears",
] as const satisfies readonly NumericSpecField[];

function median(values: number[]): number | null {
  if (values.length < STATS_MIN_N) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  const value = sorted.length % 2 ? sorted[middle]! : (sorted[middle - 1]! + sorted[middle]!) / 2;
  return Math.round(value * 10) / 10;
}

/** El valor del campo sólo si lo dijo la ficha o la descripción. */
const declared = (specs: MonopatinSpecs | null, field: NumericSpecField): number | null =>
  specs && specs[field] !== null && specs.from[field] && specs.from[field] !== "titulo" ? specs[field] : null;

function statsOf(rows: readonly SnapshotRow[], variant: string, label: string): SpecStatsRow {
  const stats: SpecStatsRow = {
    variant,
    label,
    n: rows.length,
    rangeKm: null,
    maxSpeedKmh: null,
    motorW: null,
    weightKg: null,
    maxLoadKg: null,
    chargeHours: null,
    batteryWh: null,
    wheelInches: null,
    gears: null,
  };
  for (const field of STAT_FIELDS) {
    stats[field] = median(rows.map((row) => declared(row.specs, field)).filter((value): value is number => value !== null));
  }
  return stats;
}

function candidateSpecs(specs: MonopatinSpecs): CandidateSpecs {
  const { from: _from, ...rest } = specs;
  return rest;
}

export function buildSpecSnapshot(
  rows: readonly SnapshotRow[],
  generatedAt: string,
  category: MovilidadSpecCategory = MONOPATIN_CATEGORY
): MonopatinSpecSnapshot {
  const honest = rows.filter((row) => !row.suspect);
  const withFicha = honest.filter((row) => row.source !== "facebook" && hasFichaSpecs(row.specs));

  const variants = new Map<string, { label: string; rows: SnapshotRow[] }>();
  for (const row of honest) {
    const bucket = variants.get(row.variant) ?? { label: row.variantLabel, rows: [] };
    bucket.rows.push(row);
    variants.set(row.variant, bucket);
  }

  const speeds = honest.map((row) => declared(row.specs, "maxSpeedKmh")).filter((value): value is number => value !== null);

  return {
    key: category,
    generatedAt,
    candidates: withFicha
      .map((row) => ({
        id: row.listingId,
        title: row.title.slice(0, TITLE_MAX),
        url: row.url,
        image: row.image,
        price: row.price,
        currency: row.currency,
        priceUyu: row.priceUyu,
        condition: row.condition,
        source: row.source,
        sellerName: row.sellerName,
        brand: row.brand,
        variant: row.variant,
        specs: candidateSpecs(row.specs!),
        ...(row.modelSlug ? { modelSlug: row.modelSlug } : {}),
      }))
      .sort((a, b) => a.priceUyu - b.priceUyu || a.id.localeCompare(b.id)),
    stats: {
      byVariant: [...variants.entries()].map(([variant, bucket]) => statsOf(bucket.rows, variant, bucket.label)),
      all: statsOf(honest, "todos", "Todos"),
      withFicha: withFicha.length,
      total: honest.length,
      withSpeed: speeds.length,
      over25: speeds.filter((speed) => speed > 25).length,
    },
  };
}
