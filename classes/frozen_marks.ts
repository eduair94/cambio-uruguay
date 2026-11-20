// La marca `frozen` en las filas de HOY de la API: la pizarra que publica el mismo precio hace días.
//
// `rate_staleness.ts` ya lo medía al final de cada corrida del sync (`last_frozen_quotes.json`,
// `GET /frozen-quotes`), y el sitio lo pintaba como un chip al lado de la fila, pero la regla que
// corona "el mejor precio" no lo leía. Las bandas de esa regla (app/utils/marketOutlier.ts) separan
// un precio que no puede ser de mercado, no uno que dejó de moverse: el 2026-11-11 la compra del euro
// de cambio_principal llevaba 100 días en 45, a 1 % de la mejor viva y dentro de la banda, y el sitio
// la coronaba como la mejor compra. Marcar la fila en la respuesta es lo que la hace llegar a todos los
// que coronan —el sitio, el resumen de la IA y el MCP de los bots— sin que cada uno pida otro informe.
//
// La marca no borra ni esconde nada. La regla sólo le niega la corona a una pizarra quieta que iguala
// o mejora el mejor precio vivo; detrás de él sigue contada y rankeada, porque una pizarra quieta
// puede ser un precio real (ver rate_staleness.ts).

import fs from "fs";

export interface FrozenMark {
  origin: string;
  code: string;
  type?: string | null;
  buy: number | null;
  sell: number | null;
  daysFrozen: number;
}

interface FrozenReportFile {
  generatedAt?: string | null;
  quotes?: FrozenMark[];
}

interface MarkableRow {
  origin?: string;
  code: string;
  type?: string | null;
  buy?: number | null;
  sell?: number | null;
}

/** El informe lo reescribe el sync cada cinco minutos: uno más viejo que esto ya no describe hoy. */
export const MAX_REPORT_AGE_MS = 3 * 60 * 60 * 1000;

const FILE = "last_frozen_quotes.json";

const keyOf = (origin: string | undefined, code: string, type: string | null | undefined) =>
  `${origin}|${code}|${type || ""}`;

const num = (v: unknown): number | null => (typeof v === "number" && Number.isFinite(v) ? v : null);

/**
 * Las filas con `frozen: true` y `frozenDays` donde el informe dice que esa pizarra está quieta.
 *
 * Sólo si la fila trae EXACTAMENTE la compra y la venta del informe: el sync corre cada cinco
 * minutos, y una pizarra que se movió después del último informe ya no está quieta. Pura y sin
 * mutar: devuelve filas nuevas sólo donde marca.
 */
export function markFrozen<T extends MarkableRow>(rows: T[], marks: ReadonlyArray<FrozenMark>): T[] {
  if (!marks.length) return rows;
  const byKey = new Map(marks.map((m) => [keyOf(m.origin, m.code, m.type), m] as const));
  return rows.map((row) => {
    const mark = byKey.get(keyOf(row.origin, row.code, row.type));
    if (!mark || mark.buy !== num(row.buy) || mark.sell !== num(row.sell)) return row;
    return { ...row, frozen: true, frozenDays: mark.daysFrozen };
  });
}

let memo: { mtimeMs: number; generatedAt: number; quotes: FrozenMark[] } | null = null;

/** Las marcas del último informe, o ninguna si no hay informe o es viejo. Nunca lanza. */
export function currentFrozenMarks(now = Date.now()): FrozenMark[] {
  try {
    const { mtimeMs } = fs.statSync(FILE);
    if (!memo || memo.mtimeMs !== mtimeMs) {
      const report = JSON.parse(fs.readFileSync(FILE, "utf8")) as FrozenReportFile;
      memo = {
        mtimeMs,
        generatedAt: Date.parse(report.generatedAt ?? ""),
        quotes: Array.isArray(report.quotes) ? report.quotes : [],
      };
    }
    if (!Number.isFinite(memo.generatedAt) || now - memo.generatedAt > MAX_REPORT_AGE_MS) return [];
    return memo.quotes;
  } catch {
    // Sin archivo (primer arranque, o el sync no llegó a escribirlo): sin marca, como antes.
    return [];
  }
}
