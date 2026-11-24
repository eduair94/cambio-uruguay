// Lo que cuesta armarla: cada pieza de la PC con su precio nuevo y usado de hoy, los dos totales
// (sólo completos) y el veredicto. Para lo que no se arma (notebook, all-in-one, Mac, mini PC), la
// comparación es contra las iguales usadas y contra la misma nueva.
//
// Las tres reglas que no son de forma:
//  1. Un total sólo existe si TODAS sus piezas tienen precio. Sin eso, la suma baja por faltarle
//     piezas y una PC parece barata por lo que el aviso no dice (la canasta emparejada de PRECIOS.md).
//  2. Las piezas SUPUESTAS (mother por socket, fuente por placa, gabinete) se cuentan en el total
//     usado a su precio usado si lo hay y, si no, al nuevo más barato del cuartil (`usedFromNew`):
//     es una cota de arriba del valor usado y la página lo dice. Una pieza DECLARADA sin precio usado
//     deja al total usado sin calcular.
//  3. Sin veredicto con moneda deducida o con una falla declarada: comparar «no enciende» contra
//     piezas que andan no dice nada.
//  4. El veredicto compara un usado contra USADOS (sus piezas usadas o las computadoras iguales).
//     Contra el precio nuevo sólo se publica el porcentaje: pedir el 40 % de lo que sale nueva es lo
//     normal de un usado, no una ganga (23/11/2026: 20 de los 27 «muy por debajo» de la primera
//     corrida eran piezas usadas comparadas contra la nueva).
import { partsOf } from "./parts";
import { round } from "./text";
import type { Comparables, ComputerSpecs, PartRow, Valuation, ValuedPart, Verdict } from "./types";

export const VERDICT_BANDS = { muyPorDebajo: 0.6, porDebajo: 0.9, parejo: 1.1 } as const;

export function verdictOf(ratio: number | null): Verdict | null {
  if (ratio === null || !Number.isFinite(ratio) || ratio <= 0) return null;
  if (ratio < VERDICT_BANDS.muyPorDebajo) return "muy-por-debajo";
  if (ratio < VERDICT_BANDS.porDebajo) return "por-debajo";
  if (ratio <= VERDICT_BANDS.parejo) return "parejo";
  return "por-encima";
}

export interface ValuationInput {
  specs: ComputerSpecs;
  priceUsd: number;
  table: ReadonlyMap<string, PartRow>;
  comparables: Comparables | null;
  /** La misma máquina nueva hoy (notebooks con el mismo procesador). */
  sameNew: Valuation["sameNew"];
  /** Moneda deducida: sin veredicto. */
  currencyInferred: boolean;
}

const rowFor = (table: ReadonlyMap<string, PartRow>, slug: string | null | undefined, altSlug?: string | null): PartRow | null =>
  (slug && table.get(slug)) || (altSlug && table.get(altSlug)) || null;

/** El precio de una pieza en la tabla, con la regla de la pieza supuesta. */
function valued(table: ReadonlyMap<string, PartRow>, need: ReturnType<typeof partsOf>[number]): ValuedPart & { usedFromNew: boolean } {
  const exact = need.slug ? table.get(need.slug) ?? null : null;
  const alt = need.altSlug ? table.get(need.altSlug) ?? null : null;
  const newRow = exact?.new ? exact : alt?.new ? alt : null;
  const usedRow = exact?.used ? exact : alt?.used ? alt : null;
  const newUsd = newRow?.new ? round((need.pricing === "p25" ? newRow.new.p25Usd : newRow.new.medianUsd) * need.scale) : null;
  let usedUsd = usedRow?.used ? round(usedRow.used.medianUsd * need.scale) : null;
  let usedFromNew = false;
  if (usedUsd === null && need.estimated && newRow?.new) {
    usedUsd = round(newRow.new.p25Usd * need.scale);
    usedFromNew = true;
  }
  return {
    role: need.role,
    label: need.label,
    slug: (newRow ?? usedRow ?? exact ?? alt)?.slug ?? need.slug,
    estimated: need.estimated,
    newUsd,
    usedUsd,
    newN: newRow?.new?.n ?? 0,
    usedN: usedFromNew ? 0 : (usedRow?.used?.n ?? 0),
    usedFromNew,
  };
}

const MACHINES_NOT_BUILT = new Set(["notebook", "all-in-one", "mini-pc"]);

export function valueListing(input: ValuationInput): Valuation | null {
  const { specs } = input;
  if (!specs.kind) return null;
  const noVerdict = input.currencyInferred || specs.faults.length > 0;

  if (MACHINES_NOT_BUILT.has(specs.kind)) {
    const reference = input.comparables && input.comparables.n >= 4 ? input.comparables.medianUsd : null;
    const ratio = reference ? input.priceUsd / reference : null;
    if (!reference && !input.sameNew) return null;
    return {
      parts: [],
      newTotalUsd: null,
      usedTotalUsd: null,
      newPartialUsd: 0,
      usedPartialUsd: 0,
      missingNew: [],
      missingUsed: [],
      ratio: ratio ? Math.round(ratio * 1000) / 1000 : null,
      reference: reference ? "comparables" : null,
      verdict: noVerdict ? null : verdictOf(ratio),
      sameNew: input.sameNew,
    };
  }

  // Una pieza suelta: contra la misma pieza usada y nueva.
  if (specs.kind !== "desktop" && specs.kind !== "combo") {
    return null;
  }

  const needs = partsOf(specs);
  if (!needs.length) return null;
  const parts = needs.map((need) => valued(input.table, need));
  const missingNew = parts.filter((part) => part.newUsd === null).map((part) => part.label);
  const missingUsed = parts.filter((part) => part.usedUsd === null).map((part) => part.label);
  const sum = (values: Array<number | null>): number => round(values.reduce<number>((total, value) => total + (value ?? 0), 0));
  const newTotalUsd = missingNew.length ? null : sum(parts.map((part) => part.newUsd));
  const usedTotalUsd = missingUsed.length ? null : sum(parts.map((part) => part.usedUsd));
  // Sin total de piezas (el aviso no dice el disco, la RAM o el procesador exacto), la comparación es
  // contra las PCs iguales del directorio: mismo procesador y misma placa, ≥ 4 avisos.
  // Prioridad: sus piezas usadas, después las PCs iguales (las dos son usados y dan veredicto), y
  // recién al final el total nuevo, que da sólo el porcentaje.
  const comparables = input.comparables && input.comparables.n >= 4 ? input.comparables.medianUsd : null;
  const reference = usedTotalUsd ?? comparables ?? newTotalUsd;
  const ratio = reference ? input.priceUsd / reference : null;
  return {
    parts,
    newTotalUsd,
    usedTotalUsd,
    newPartialUsd: sum(parts.map((part) => part.newUsd)),
    usedPartialUsd: sum(parts.map((part) => part.usedUsd)),
    missingNew,
    missingUsed,
    ratio: ratio ? Math.round(ratio * 1000) / 1000 : null,
    reference: usedTotalUsd ? "used" : comparables ? "comparables" : newTotalUsd ? "new" : null,
    verdict: noVerdict || !(usedTotalUsd || comparables) ? null : verdictOf(ratio),
    sameNew: null,
  };
}

/** Una pieza suelta contra su misma identidad. */
export function valuePart(input: { slug: string | null; altSlug?: string | null; label: string; role: ValuedPart["role"]; priceUsd: number; table: ReadonlyMap<string, PartRow>; noVerdict: boolean }): Valuation | null {
  const row = rowFor(input.table, input.slug, input.altSlug);
  if (!row || (!row.new && !row.used)) return null;
  const part: ValuedPart & { usedFromNew: boolean } = {
    role: input.role,
    label: input.label,
    slug: row.slug,
    estimated: false,
    newUsd: row.new?.medianUsd ?? null,
    usedUsd: row.used?.medianUsd ?? null,
    newN: row.new?.n ?? 0,
    usedN: row.used?.n ?? 0,
    usedFromNew: false,
  };
  const reference = row.used ? row.used.medianUsd : row.new ? row.new.medianUsd : null;
  const ratio = reference ? input.priceUsd / reference : null;
  return {
    parts: [part],
    newTotalUsd: part.newUsd,
    usedTotalUsd: part.usedUsd,
    newPartialUsd: part.newUsd ?? 0,
    usedPartialUsd: part.usedUsd ?? 0,
    missingNew: part.newUsd === null ? [part.label] : [],
    missingUsed: part.usedUsd === null ? [part.label] : [],
    ratio: ratio ? Math.round(ratio * 1000) / 1000 : null,
    reference: row.used ? "used" : row.new ? "new" : null,
    verdict: input.noVerdict || !row.used ? null : verdictOf(ratio),
    sameNew: row.new ? { label: row.label, medianUsd: row.new.medianUsd, n: row.new.n } : null,
  };
}
