// Armar la foto de las LRM a partir de los dos archivos oficiales del BCU, y decidir si se guarda.
//
// La planilla trae la historia entera en cada descarga, así que la regla es simple: una corrida que
// lee MENOS que la anterior, o que termina más atrás en el tiempo, no pisa nada. Lo que puede fallar
// por separado se resuelve por separado: si el calendario no se lee, la foto nueva lleva el de la
// anterior (la página filtra por fecha y no muestra una licitación ya pasada como «próxima»); si la
// hoja de Notas del Tesoro no se lee, lo mismo.
import axios from "axios";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";

import { bcuAgent, fetchBcuText } from "../bcurates/refresh";
import { parseCalendarText } from "./calendar";
import { latestByTerm, parseLrmSheet, parseTreasurySheet } from "./parse";
import { readXlsxSheets } from "./xlsx";
import {
  LRM_CALENDAR_URL,
  LRM_KEY,
  LRM_OPERATIONS_URL,
  LRM_SOURCE_PAGE_URL,
  type LrmCalendar,
  type LrmSnapshot,
  type TreasuryAuction,
} from "./types";

/** Por debajo de esto la hoja no es la planilla de siempre (trae ~1.380 filas desde 2019). */
export const MIN_AUCTIONS = 100;
/** Una corrida con menos del 90 % de las licitaciones guardadas perdió historia: no se guarda. */
export const MIN_SHARE_OF_PREVIOUS = 0.9;
/** Ventana de `recent`: un poco más de un año, para comparar contra el mismo mes del año pasado. */
export const RECENT_DAYS = 400;
/** Un plazo que no se licitó en este tiempo deja de figurar en `latest`. */
export const LATEST_MAX_AGE_DAYS = 365;

const shiftDays = (isoDay: string, days: number): string =>
  new Date(Date.parse(`${isoDay}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);

export interface LrmInputs {
  sheets: Map<string, import("./xlsx").SheetRow[]>;
  calendarText: string | null;
  operationsModified: string | null;
  now: Date;
}

export interface BuildOutcome {
  snapshot: LrmSnapshot | null;
  /** Por qué no hay foto, o qué parte se arrastró de la anterior. */
  notes: string[];
  rejected: { date: string; series: string; reason: string }[];
}

/** Pura: hojas y texto ya leídos → la foto. */
export function buildLrmSnapshot(inputs: LrmInputs, previous: LrmSnapshot | null): BuildOutcome {
  const notes: string[] = [];
  const lrmRows = inputs.sheets.get("LRM");
  if (!lrmRows) return { snapshot: null, notes: ["la planilla no trae la hoja «LRM»"], rejected: [] };
  const parsed = parseLrmSheet(lrmRows);
  if (parsed.problem) return { snapshot: null, notes: [parsed.problem], rejected: parsed.rejected };
  const newest = parsed.auctions[0]?.date;
  if (!newest) return { snapshot: null, notes: ["la hoja «LRM» no trae ninguna licitación válida"], rejected: parsed.rejected };

  let treasury: TreasuryAuction[] = parseTreasurySheet(inputs.sheets.get("NT MEF") ?? []);
  if (!treasury.length) {
    treasury = previous?.treasury ?? [];
    notes.push("la hoja «NT MEF» no se pudo leer: se conservan las Notas del Tesoro anteriores");
  }

  let calendar: LrmCalendar | null = inputs.calendarText ? parseCalendarText(inputs.calendarText) : null;
  if (!calendar) {
    calendar = previous?.calendar ?? null;
    notes.push("el calendario no se pudo leer: se conserva el anterior");
  }

  const since = shiftDays(newest, -LATEST_MAX_AGE_DAYS);
  const recentSince = shiftDays(newest, -RECENT_DAYS);
  const snapshot: LrmSnapshot = {
    key: LRM_KEY,
    capturedAt: inputs.now,
    sources: {
      operationsUrl: LRM_OPERATIONS_URL,
      operationsModified: inputs.operationsModified,
      calendarUrl: LRM_CALENDAR_URL,
      pageUrl: LRM_SOURCE_PAGE_URL,
    },
    latest: latestByTerm(parsed.auctions, since),
    recent: parsed.auctions.filter((a) => a.date >= recentSince),
    treasury,
    calendar,
    counts: { auctions: parsed.auctions.length, rejected: parsed.rejected.length },
  };
  return { snapshot, notes, rejected: parsed.rejected };
}

/** Por qué una foto nueva NO debe reemplazar a la guardada. Vacío = se guarda. */
export function refuseReasons(candidate: LrmSnapshot, previous: LrmSnapshot | null): string[] {
  const reasons: string[] = [];
  if (candidate.counts.auctions < MIN_AUCTIONS) {
    reasons.push(`sólo ${candidate.counts.auctions} licitaciones válidas (mínimo ${MIN_AUCTIONS})`);
  }
  const terms = new Set(candidate.latest.map((a) => a.termRef));
  if (!terms.has(30) || !terms.has(90)) reasons.push("faltan los plazos de 30 o 90 días, que se licitan todas las semanas");
  if (previous) {
    const candidateNewest = candidate.recent[0]?.date ?? "";
    const previousNewest = previous.recent?.[0]?.date ?? "";
    if (candidateNewest && previousNewest && candidateNewest < previousNewest) {
      reasons.push(`la planilla termina el ${candidateNewest}, antes que la guardada (${previousNewest}): es una copia vieja`);
    }
    const before = previous.counts?.auctions ?? 0;
    if (before && candidate.counts.auctions < before * MIN_SHARE_OF_PREVIOUS) {
      reasons.push(`la planilla trae ${candidate.counts.auctions} licitaciones contra ${before} guardadas`);
    }
  }
  return reasons;
}

/** Baja la planilla a un directorio temporal (el lector de ZIP trabaja sobre un archivo). */
export async function fetchOperationsSheets(): Promise<{
  sheets: Map<string, import("./xlsx").SheetRow[]>;
  modified: string | null;
}> {
  const res = await axios.get<ArrayBuffer>(LRM_OPERATIONS_URL, {
    responseType: "arraybuffer",
    timeout: 90_000,
    maxContentLength: 60 * 1024 * 1024,
    httpsAgent: bcuAgent(),
    headers: { "User-Agent": "cambio-uruguay/1.0 (+https://cambio-uruguay.com)" },
  });
  const dir = await mkdtemp(join(tmpdir(), "lrm-"));
  try {
    const file = join(dir, "operaciones.xlsx");
    await writeFile(file, Buffer.from(res.data as ArrayBuffer));
    const sheets = await readXlsxSheets(file, ["LRM", "NT MEF"]);
    const modified = typeof res.headers["last-modified"] === "string" ? res.headers["last-modified"] : null;
    return { sheets, modified };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

/** El texto del calendario, o `null` si no se pudo bajar (no es motivo para no guardar las tasas). */
export async function fetchCalendarText(): Promise<string | null> {
  try {
    const text = await fetchBcuText(LRM_CALENDAR_URL);
    return text.trim() ? text : null;
  } catch {
    return null;
  }
}
