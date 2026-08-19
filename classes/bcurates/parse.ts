// Deterministic parser for the BCU "Tasas medias de interés" PDF, once its text has been
// extracted. Pure: text in, table out — so the whole thing is testable against a real fixture
// without a network call.
//
// WHY NOT GROUNDED SEARCH: it was tried first and it does not work for this document. Asked for
// the table at its canonical URL, the model returned the FEBRUARY–APRIL **2022** edition — an
// archived copy of the same address, four years stale. The Ley 18.212 check caught it (26,81 ×
// 1,55 = 41,55, not the 38,95 it reported) and the job correctly refused to store it, but a guard
// that rejects every answer is a job that never updates. So the source is now the PDF itself.
//
// The layout is stable because the BCU regenerates it from the same template every month. Rather
// than trusting fixed offsets, the parse anchors on the document's own headings and on the fact
// that the two "sin autorización de descuento" consumer columns are the LAST two figures on the
// moneda-nacional rows. Anything that does not line up returns null and the caller keeps the
// table it already had.

import { capsFromMedia, type BcuRateRow, type BcuRateTable, BCU_TABLE_URL } from "./table";

const MONTHS: Record<string, string> = {
  enero: "01",
  febrero: "02",
  marzo: "03",
  abril: "04",
  mayo: "05",
  junio: "06",
  julio: "07",
  agosto: "08",
  setiembre: "09",
  septiembre: "09",
  octubre: "10",
  noviembre: "11",
  diciembre: "12",
};

/** "Periodo: ABRIL - JUNIO de 2026" → "abril–junio de 2026". */
export function parsePeriodo(text: string): string {
  const m = text.match(/Periodo:\s*([A-ZÁÉÍÓÚÑ]+)\s*-\s*([A-ZÁÉÍÓÚÑ]+)\s+de\s+(\d{4})/i);
  if (!m) return "";
  const lower = (s: string) => s.toLowerCase();
  return `${lower(m[1]!)}–${lower(m[2]!)} de ${m[3]}`;
}

/** "vigentes a partir del 1º de agosto de 2026" → "2026-08-01". */
export function parseVigenteDesde(text: string): string {
  const m = text.match(/vigentes\s+a\s+partir\s+del\s+(\d{1,2})[ºo°]?\s+de\s+([a-záéíóú]+)\s+de\s+(\d{4})/i);
  if (!m) return "";
  const month = MONTHS[m[2]!.toLowerCase()];
  if (!month) return "";
  return `${m[3]}-${month}-${String(m[1]).padStart(2, "0")}`;
}

/** Every `12.3456%` on a line, as numbers, in reading order. */
function percentsOn(line: string): number[] {
  return [...line.matchAll(/(\d+(?:\.\d+)?)%/g)].map((m) => Number(m[1]));
}

/**
 * Slice the text between two headings. The BCU repeats "Tope tasa" and "Tope mora" once per
 * capital bracket, so every lookup is scoped to its section first.
 */
function section(text: string, from: RegExp, to: RegExp | null): string {
  const start = text.search(from);
  if (start < 0) return "";
  const rest = text.slice(start);
  if (!to) return rest;
  const end = rest.slice(1).search(to);
  return end < 0 ? rest : rest.slice(0, end + 1);
}

/**
 * The two consumer figures on a moneda-nacional row.
 *
 * The row runs Grandes | Medianas | Pequeñas | micro <500k | micro ≥500k | consumo CON descuento
 * <10k | CON descuento ≥10k | SIN descuento <10k | SIN descuento ≥10k, and vivienda moves to the
 * reajustable row — so the two we want are the last two on the line. Requiring at least eight
 * figures is what stops a truncated or re-flowed row from being read as a valid one.
 */
function sinDescuentoPair(line: string): [number, number] | null {
  const nums = percentsOn(line);
  if (nums.length < 8) return null;
  const a = nums[nums.length - 2];
  const b = nums[nums.length - 1];
  if (typeof a !== "number" || typeof b !== "number") return null;
  return [a, b];
}

/** First line inside `block` that starts with the given row marker and carries figures. */
function rowLine(block: string, marker: RegExp): string | null {
  for (const line of block.split("\n")) {
    if (marker.test(line) && /%/.test(line)) return line;
  }
  return null;
}

export interface ParseResult {
  table: BcuRateTable | null;
  problems: string[];
}

/**
 * Parse the extracted text into the six rows the page needs.
 *
 * Only the "PARA UN CAPITAL MENOR A 2:000.000 DE UI" bracket is read: a consumer credit card is
 * never above two million UI. The caps are taken from the document (not derived), so that
 * `validateTable` can still prove them against Ley 18.212 afterwards — deriving them here would
 * make that check vacuous.
 */
export function parseBcuText(text: string, carryUsd: readonly BcuRateRow[]): ParseResult {
  const problems: string[] = [];

  const periodo = parsePeriodo(text);
  const vigenteDesde = parseVigenteDesde(text);
  if (!periodo) problems.push("no se encontró el período");
  if (!vigenteDesde) problems.push("no se encontró la fecha de vigencia");

  const menor2M = section(
    text,
    /PARA UN CAPITAL MENOR A 2:000\.000 DE UI/i,
    /PARA UN CAPITAL MAYOR O IGUAL/i
  );
  if (!menor2M) {
    problems.push("no se encontró la sección de capital menor a 2:000.000 UI");
    return { table: null, problems };
  }

  const topeTasa = section(menor2M, /Tope tasa/i, /Tope mora/i);
  const topeMora = section(menor2M, /Tope mora/i, null);
  if (!topeTasa || !topeMora) {
    problems.push("no se encontraron los bloques de tope de tasa y de mora");
    return { table: null, problems };
  }

  // Moneda nacional no reajustable: the "días" line is "hasta 366 días", "más" is "367 o más".
  const pick = (block: string, marker: RegExp, label: string): [number, number] | null => {
    const line = rowLine(block, marker);
    if (!line) {
      problems.push(`no se encontró la fila ${label}`);
      return null;
    }
    const pair = sinDescuentoPair(line);
    if (!pair) problems.push(`la fila ${label} no trae suficientes columnas`);
    return pair;
  };

  const tasaCorto = pick(topeTasa, /^días\b/i, "tope tasa · hasta 366 días");
  const tasaLargo = pick(topeTasa, /^más\b/i, "tope tasa · 367 días o más");
  const moraCorto = pick(topeMora, /^días\b/i, "tope mora · hasta 366 días");
  const moraLargo = pick(topeMora, /^más\b/i, "tope mora · 367 días o más");

  if (!tasaCorto || !tasaLargo || !moraCorto || !moraLargo) return { table: null, problems };

  // The averages block sits above the caps and carries the same column order.
  const medias = section(text, /TASAS MEDIAS DE INTER/i, /TOPES M[ÁA]XIMOS/i);
  const mediaCorto = pick(medias, /^días\b/i, "tasas medias · hasta 366 días");
  const mediaLargo = pick(medias, /^más\b/i, "tasas medias · 367 días o más");
  if (!mediaCorto || !mediaLargo) return { table: null, problems };

  const rows: BcuRateRow[] = [
    {
      currency: "UYU",
      bracket: "menor10kUI",
      cortoPlazo: true,
      media: mediaCorto[0],
      tope: tasaCorto[0],
      topeMora: moraCorto[0],
    },
    {
      currency: "UYU",
      bracket: "mayor10kUI",
      cortoPlazo: true,
      media: mediaCorto[1],
      tope: tasaCorto[1],
      topeMora: moraCorto[1],
    },
    {
      currency: "UYU",
      bracket: "menor10kUI",
      cortoPlazo: false,
      media: mediaLargo[0],
      tope: tasaLargo[0],
      topeMora: moraLargo[0],
    },
    {
      currency: "UYU",
      bracket: "mayor10kUI",
      cortoPlazo: false,
      media: mediaLargo[1],
      tope: tasaLargo[1],
      topeMora: moraLargo[1],
    },
  ];

  // The dollar rows are CARRIED FORWARD, not parsed, and that is deliberate.
  //
  // Identifying them from the document is not safely possible: the USD rows have a different
  // column count from the peso rows (no "con autorización" columns, no ≥10.000 UI split), so
  // counting from either end is guesswork — and the Ley 18.212 arithmetic cannot break the tie,
  // because the VIVIENDA cell satisfies it just as well as the consumo one (6,00 × 1,55 = 9,30).
  // The law proves a cell is valid, never which cell it is.
  //
  // Since the page renders only the peso caps, refreshing four of six rows deterministically is
  // strictly better than refreshing none — and a wrong USD row would be worse than a stale one.
  rows.push(...carryUsd.filter((r) => r.currency === "USD").map((r) => ({ ...r })));

  return {
    table: {
      periodo,
      vigenteDesde,
      rows,
      asOf: null,
      sources: [{ label: "BCU — Tasas medias de interés", url: BCU_TABLE_URL }],
    },
    problems,
  };
}
