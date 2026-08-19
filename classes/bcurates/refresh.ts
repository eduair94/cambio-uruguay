// Monthly self-updating layer for the BCU "Tasas medias de interés" grid used by
// /adelanto-de-efectivo-tarjeta-de-credito.
//
// The source is the OFFICIAL PDF, fetched and parsed deterministically — not a grounded search.
// Grounded search was implemented first and measurably does not work here: asked for the table at
// its canonical URL it returned the FEBRUARY–APRIL 2022 edition, an archived copy of the same
// address. The Ley 18.212 check caught it (26,81 × 1,55 = 41,55, not the 38,95 it reported), so
// nothing wrong was ever stored — but a guard that rejects every answer is a job that never
// updates. See classes/bcurates/parse.ts.
//
// The chain is: fetch → extract text (unpdf) → parse → PROVE against Ley 18.212 → compare with
// what we already hold. Anything that fails at any step leaves the stored table untouched: a
// stale-but-true table beats a fresh invented one on a page that tells people what they will
// be charged.
import axios from "axios";
import * as https from "node:https";
import * as tls from "node:tls";

import { BCU_CERT_CHAIN } from "./certs";
import { parseBcuText } from "./parse";
import {
  BASELINE_TABLE,
  BCU_TABLE_URL,
  baselineTable,
  rowKey,
  validateTable,
  type BcuRateRow,
  type BcuRateTable,
} from "./table";

/**
 * bcu.gub.uy serves its leaf certificate WITHOUT the intermediates, so Node rejects it with
 * "unable to verify the first certificate" (curl succeeds only because it ships its own bundle).
 * The two missing intermediates are bundled next to this file and ADDED to Node's roots — the
 * chain still has to reach a trusted root, so this is not `rejectUnauthorized: false`.
 */
export function bcuAgent(): https.Agent {
  return new https.Agent({ ca: [...tls.rootCertificates, BCU_CERT_CHAIN] });
}

/** Fetch the PDF and pull its text out. Isolated so the refresh logic can be tested without IO. */
export async function fetchBcuText(url: string = BCU_TABLE_URL): Promise<string> {
  const res = await axios.get<ArrayBuffer>(url, {
    responseType: "arraybuffer",
    timeout: 30000,
    httpsAgent: bcuAgent(),
    headers: { "User-Agent": "cambio-uruguay/1.0 (+https://cambio-uruguay.com)" },
  });
  // unpdf ships a CommonJS build, so a plain require works from this CJS backend.
  const { extractText, getDocumentProxy } = require("unpdf");
  const pdf = await getDocumentProxy(new Uint8Array(res.data as ArrayBuffer));
  const { text } = await extractText(pdf, { mergePages: true });
  return String(text || "");
}

/**
 * Rates move by points between months, never by multiples. A candidate that disagrees with the
 * stored table by more than this on any row is treated as a mis-parse rather than as news.
 */
export const MAX_RELATIVE_MOVE = 0.5;

export function movedTooFar(candidate: BcuRateTable, previous: BcuRateTable): string[] {
  const prev = new Map(previous.rows.map((r) => [rowKey(r), r]));
  const problems: string[] = [];
  for (const row of candidate.rows) {
    const before = prev.get(rowKey(row));
    if (!before || before.media <= 0) continue;
    const move = Math.abs(row.media - before.media) / before.media;
    if (move > MAX_RELATIVE_MOVE) {
      problems.push(`${rowKey(row)}: media pasó de ${before.media} a ${row.media} (${Math.round(move * 100)} %)`);
    }
  }
  return problems;
}

export interface RefreshOutcome {
  table: BcuRateTable;
  /** `true` when the reply passed validation and the table was actually refreshed. */
  updated: boolean;
  /** Why a candidate was rejected, for the cron log. Empty on success. */
  problems: string[];
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

  let text: string;
  try {
    text = await fetchBcuText();
  } catch (e: any) {
    return { table: current, updated: false, problems: [`no se pudo bajar el PDF: ${e?.message || e}`] };
  }
  if (!text.trim()) return { table: current, updated: false, problems: ["el PDF no devolvió texto"] };

  const { table: parsed, problems } = parseBcuText(text, current.rows);
  if (!parsed) return { table: current, updated: false, problems };

  const candidate: BcuRateTable = { ...parsed, asOf: now };

  const check = validateTable(candidate);
  if (!check.ok) return { table: current, updated: false, problems: check.problems };

  const drift = movedTooFar(candidate, current);
  if (drift.length) return { table: current, updated: false, problems: drift };

  // Confirmed unchanged — still worth persisting, so `asOf` records that it was checked today.
  if (sameAs(candidate, current)) {
    return { table: { ...current, asOf: now }, updated: false, problems: [] };
  }

  // The BCU only supersedes forward; an earlier date means an archived document.
  if (candidate.vigenteDesde < current.vigenteDesde) {
    return {
      table: current,
      updated: false,
      problems: [`la vigencia ${candidate.vigenteDesde} es anterior a la almacenada ${current.vigenteDesde}`],
    };
  }

  return { table: candidate, updated: true, problems: [] };
}

export { BASELINE_TABLE, baselineTable };
