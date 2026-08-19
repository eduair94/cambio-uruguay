// Monthly self-updating layer for the BCU "Tasas medias de interés" grid used by
// /adelanto-de-efectivo-tarjeta-de-credito.
//
// Same grounded-search + guardrail shape as classes/debt/refresh.ts and classes/costs/refresh.ts,
// with one difference that matters: the guard here is a PROOF, not a plausibility band.
//
// Ley 18.212 derives both caps arithmetically from the published average (× 1,55 and × 1,80), so
// the prompt asks for the average AND both caps as printed, and `validateTable` then checks that
// all six rows close to four decimals. A model that read the real table satisfies that trivially;
// a model that invented numbers does not. Deriving the caps ourselves would make the check
// vacuous, which is exactly why we ask for them separately and compare.
//
// Nothing that fails validation is ever stored: the previous good snapshot (or the verified
// baseline in table.ts) keeps serving. A stale-but-true table beats a fresh invented one on a
// page that tells people what they will be charged.
import { askGrounded, geminiConfigured } from "../gemini";
import {
  BASELINE_TABLE,
  BCU_TABLE_URL,
  baselineTable,
  rowKey,
  validateTable,
  type BcuRateRow,
  type BcuRateTable,
} from "./table";

const PROMPT = `Buscá con búsqueda web real y citable la tabla vigente de "Tasas medias de interés" que publica el Banco Central del Uruguay (Ley 18.212, artículo 340 de la R.N.R.C.S.F.). El documento oficial está en ${BCU_TABLE_URL} y declara al pie desde qué fecha rigen las tasas.

Necesito ÚNICAMENTE la columna: Familias > Consumo > SIN autorización de descuento, y dentro del bloque "RESTO DE PRÉSTAMOS - PARA UN CAPITAL MENOR A 2:000.000 DE UI".

Para cada una de estas seis filas necesito TRES números tal como están impresos: la tasa media, el tope de tasa y el tope de mora, todos en porcentaje anual efectivo:
1. Moneda nacional no reajustable, menor a 10.000 UI, hasta 366 días.
2. Moneda nacional no reajustable, menor a 10.000 UI, 367 días o más.
3. Moneda nacional no reajustable, 10.000 UI o más, hasta 366 días.
4. Moneda nacional no reajustable, 10.000 UI o más, 367 días o más.
5. Dólares USA, menor a 10.000 UI, hasta 366 días.
6. Dólares USA, menor a 10.000 UI, 367 días o más.

Respondé SOLO con un objeto JSON válido, sin texto ni markdown, con números sin el signo % y con punto decimal:
{"periodo": "<el trimestre que nombra el documento, por ejemplo 'abril-junio de 2026'>", "vigenteDesde": "<AAAA-MM-DD desde el que rigen>", "filas": [{"moneda": "UYU"|"USD", "tramo": "menor10kUI"|"mayor10kUI", "cortoPlazo": true|false, "media": <num>, "tope": <num>, "topeMora": <num>}]}

No calcules ni completes ningún número: copiá los tres valores tal como figuran en la tabla. Si no encontrás la tabla vigente o alguna fila, devolvé {"filas": []}. No inventes.`;

function parseJsonLoose(text: string): Record<string, unknown> | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
}

export interface RefreshOutcome {
  table: BcuRateTable;
  /** `true` when the reply passed validation and the table was actually refreshed. */
  updated: boolean;
  /** Why a candidate was rejected, for the cron log. Empty on success. */
  problems: string[];
}

/** Shape the model's rows into our own, dropping anything unrecognisable. */
export function shapeRows(raw: unknown): BcuRateRow[] {
  if (!Array.isArray(raw)) return [];
  const out: BcuRateRow[] = [];
  for (const r of raw as Array<Record<string, unknown>>) {
    if (!r || typeof r !== "object") continue;
    const currency = r.moneda === "USD" ? "USD" : r.moneda === "UYU" ? "UYU" : null;
    const bracket = r.tramo === "menor10kUI" || r.tramo === "mayor10kUI" ? r.tramo : null;
    if (!currency || !bracket || typeof r.cortoPlazo !== "boolean") continue;
    const nums = [r.media, r.tope, r.topeMora];
    if (!nums.every((n) => typeof n === "number" && Number.isFinite(n))) continue;
    out.push({
      currency,
      bracket,
      cortoPlazo: r.cortoPlazo,
      media: r.media as number,
      tope: r.tope as number,
      topeMora: r.topeMora as number,
    });
  }
  return out;
}

/**
 * Build a candidate table from a parsed reply. Exported so the whole guard chain is testable
 * without a network call or an API key.
 */
export function candidateFrom(data: Record<string, unknown> | null, now: string): BcuRateTable | null {
  if (!data) return null;
  const rows = shapeRows(data.filas);
  if (!rows.length) return null;
  return {
    periodo: typeof data.periodo === "string" ? data.periodo.trim() : "",
    vigenteDesde: typeof data.vigenteDesde === "string" ? data.vigenteDesde.trim() : "",
    rows,
    asOf: now,
    sources: [{ label: "BCU — Tasas medias de interés", url: BCU_TABLE_URL }],
  };
}

/** True when the candidate says the same thing the table we already hold does. */
export function sameAs(a: BcuRateTable, b: BcuRateTable): boolean {
  if (a.vigenteDesde !== b.vigenteDesde) return false;
  const key = (r: BcuRateRow) => `${rowKey(r)}:${r.media}:${r.tope}:${r.topeMora}`;
  const A = a.rows.map(key).sort().join("|");
  const B = b.rows.map(key).sort().join("|");
  return A === B;
}

/**
 * Fetch + prove the current BCU table.
 *
 * `previous` is whatever is already stored; it is returned untouched whenever the refresh cannot
 * do better, so a failed run is a no-op rather than a regression.
 */
export async function refreshBcuRates(previous: BcuRateTable | null, now: string): Promise<RefreshOutcome> {
  const current = previous ?? baselineTable();
  if (!geminiConfigured()) {
    return { table: current, updated: false, problems: ["no GEMINI_API_KEY"] };
  }

  const reply = await askGrounded(PROMPT);
  if (!reply) return { table: current, updated: false, problems: ["no reply from grounded search"] };

  const candidate = candidateFrom(parseJsonLoose(reply.text), now);
  if (!candidate) return { table: current, updated: false, problems: ["unparseable or empty reply"] };

  const check = validateTable(candidate);
  if (!check.ok) return { table: current, updated: false, problems: check.problems };

  // A candidate that merely restates what we hold is not an update — but it IS a confirmation,
  // so refresh `asOf` to record that the table was checked today.
  if (sameAs(candidate, current)) {
    return { table: { ...current, asOf: now }, updated: false, problems: [] };
  }

  // Never accept a table that claims to take effect BEFORE the one we already hold: the BCU only
  // moves forward, so an earlier date means the model found an archived page.
  if (candidate.vigenteDesde < current.vigenteDesde) {
    return {
      table: current,
      updated: false,
      problems: [`candidate vigenteDesde ${candidate.vigenteDesde} predates stored ${current.vigenteDesde}`],
    };
  }

  return { table: candidate, updated: true, problems: [] };
}

export { BASELINE_TABLE, baselineTable };
