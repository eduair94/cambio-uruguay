// Guardrails between "what the researcher came back with" and "what the public page serves".
//
// Two failure modes this exists to prevent, both seen elsewhere in this repo:
//
//  1. THE THIN PULL. A run where the endpoint saturated after three lenders, or where most sites
//     were down, produces a snapshot that is technically valid and mostly empty. Writing it would
//     silently replace a full set of verified facts with three of them. So a run that verified far
//     fewer lenders than the last good one is refused outright — the same rule
//     classes/bankos/store.ts applies to the discount map.
//
//  2. THE SILENT REWRITE. A model having a bad day can flip a dozen booleans at once. A run where
//     most of the catalogue "changed" is not a week of news, it is a malfunction, so it is refused
//     too. The threshold is deliberately generous: real weeks change one or two lenders.
//
// Both refusals keep the previous snapshot, which the page keeps serving with its own "verificado
// el …" date visible. Stale and honest beats fresh and wrong.
import type { LenderFactPatch, LoanTierChange, LoanTierSnapshot } from "./types";
import type { LoanLenderSeed } from "./catalog";

/** A run that re-verified less than this share of the catalogue cannot replace a fuller one. */
export const MIN_VERIFIED_RATIO = 0.5;
/** A run where more than this share of re-verified lenders "changed" is treated as a malfunction. */
export const MAX_CHANGE_RATIO = 0.6;

export interface MergeDecision {
  accept: boolean;
  reason: string;
  changes: LoanTierChange[];
}

const FIELD_LABELS: Record<string, string> = {
  teaPct: "la TEA publicada",
  teaMaxPct: "el techo del rango de tasa",
  ivaOnInterest: "si el IVA va aparte",
  publishesCft: "si publica el CFT",
  clearing: "a quién le presta estando en el clearing",
  minIncomeUyu: "el ingreso mínimo exigido",
  maxAmountUyu: "el monto máximo",
  maxTermMonths: "el plazo máximo",
  onlineEndToEnd: "si el trámite es 100% online",
  disbursementHours: "cuánto tarda en desembolsar",
  payrollDeductionRequired: "si exige retención de haberes",
  earlyRepaymentFree: "si se puede cancelar antes sin multa",
  originationFee: "los gastos de otorgamiento",
  insuranceMandatory: "si el seguro es obligatorio",
  bcu: "su situación ante el BCU",
  membershipRequired: "si hay que asociarse",
};

/** Fields whose change is worth telling the reader about, in the order they read best. */
const WATCHED = Object.keys(FIELD_LABELS) as (keyof LenderFactPatch)[];

function describe(field: string, before: unknown, after: unknown): string {
  const label = FIELD_LABELS[field] ?? field;
  if (field === "teaPct" || field === "teaMaxPct") {
    if (before == null) return `${label}: ahora publica ${after}%`;
    if (after == null) return `${label}: dejó de publicarla (antes ${before}%)`;
    return `${label}: ${before}% → ${after}%`;
  }
  if (typeof before === "boolean" || typeof after === "boolean") {
    return `${label}: ${before ? "sí" : "no"} → ${after ? "sí" : "no"}`;
  }
  return `${label}: ${before ?? "sin dato"} → ${after ?? "sin dato"}`;
}

/**
 * Week-over-week diff against the previous snapshot's patch for the same lender.
 *
 * Compared against the previous SNAPSHOT rather than against the app's seed catalogue on purpose:
 * the root and the app are separate TS programs and cannot import across (see the repo's global
 * constraints), and week-over-week is the diff a reader actually wants — "qué cambió esta semana",
 * not "qué cambió desde que escribimos la página".
 */
export function diffPatches(
  previous: readonly LenderFactPatch[],
  next: readonly LenderFactPatch[],
  lenders: readonly LoanLenderSeed[]
): LoanTierChange[] {
  const prevById = new Map(previous.map((p) => [p.id, p]));
  const nameById = new Map(lenders.map((l) => [l.id, l.name]));
  const changes: LoanTierChange[] = [];

  for (const patch of next) {
    const before = prevById.get(patch.id);
    if (!before) continue; // first time we verified this lender — nothing to compare against
    const bits: string[] = [];
    for (const field of WATCHED) {
      const a = before[field];
      const b = patch[field];
      if (b === undefined) continue; // the pass said nothing about this field
      if (a === undefined) continue; // we had nothing to compare
      if (JSON.stringify(a) !== JSON.stringify(b)) bits.push(describe(field, a, b));
    }
    if (patch.changeNote && !bits.length) bits.push(patch.changeNote);
    if (bits.length) {
      changes.push({
        id: patch.id,
        name: nameById.get(patch.id) ?? patch.id,
        text: bits.join(" · "),
      });
    }
  }
  return changes;
}

/** Should this run replace the stored snapshot? */
export function evaluateRun(
  previous: LoanTierSnapshot | null,
  patches: readonly LenderFactPatch[],
  lenders: readonly LoanLenderSeed[]
): MergeDecision {
  const changes = diffPatches(previous?.patches ?? [], patches, lenders);

  if (!patches.length) {
    return { accept: false, reason: "la corrida no verificó ningún prestamista", changes: [] };
  }

  const ratio = patches.length / Math.max(1, lenders.length);
  if (previous && ratio < MIN_VERIFIED_RATIO && patches.length < previous.verified) {
    return {
      accept: false,
      reason: `solo se verificaron ${patches.length}/${lenders.length} prestamistas y el snapshot anterior tenía ${previous.verified} — no se pisa`,
      changes,
    };
  }

  const changeRatio = changes.length / Math.max(1, patches.length);
  if (previous && changeRatio > MAX_CHANGE_RATIO) {
    return {
      accept: false,
      reason: `cambiaron ${changes.length} de ${patches.length} fichas en una semana: eso no es novedad, es un error — se conserva lo anterior`,
      changes,
    };
  }

  return { accept: true, reason: `${patches.length}/${lenders.length} verificados`, changes };
}

/**
 * Carry forward the previous week's patch for any lender this run could not verify.
 *
 * Without this, a lender whose site was down for one run would lose its verified facts and fall
 * back to the seed values from whenever the page was written — a silent regression that looks
 * exactly like a successful refresh.
 */
export function carryForward(
  previous: readonly LenderFactPatch[],
  fresh: readonly LenderFactPatch[]
): LenderFactPatch[] {
  const freshIds = new Set(fresh.map((p) => p.id));
  return [...fresh, ...previous.filter((p) => !freshIds.has(p.id))];
}
