// El parseo es la primera guarda, no una conveniencia.
//
// `compararCanasta` rellena cada hueco de su matriz con un promedio nacional
// marcado `(*)` y sin fecha: medido el 2026-09-07, "Nalga vacuna con hueso"
// (artículo 114) tiene 28 observaciones reales y la matriz muestra el mismo
// "$509.32 (*)" en 722 de 722 locales, con 694 celdas sin fecha. Cualquier
// ranking construido sobre eso ordena promedios, no góndolas — y por eso los
// totales de canasta del propio comparador oficial se aplastan a 1,18× mientras
// los artículos sueltos se abren hasta 4,86×.
//
// De ahí sale la regla que este módulo hace cumplir, y que vale para TODA fila
// que entre al pipeline, venga del endpoint que venga: sin precio numérico
// propio y sin fecha propia, no es una observación.
import type { PrecioRawRow, PrecioUnit } from "./types";

/** Precio numérico, o null si la celda no es una observación real. */
export function parsePrice(raw: unknown): number | null {
  if (typeof raw !== "string") return null;
  const text = raw.trim();
  if (!text) return null;
  // La marca de imputación del origen. Nunca se convierte en número.
  if (text.includes("(*)")) return null;
  if (!/^\$\s*\d/.test(text)) return null;
  const value = Number(text.replace(/[^0-9.]/g, ""));
  if (!Number.isFinite(value) || value <= 0) return null;
  return value;
}

/** `"06/09/26"` -> `"2026-09-06"`, o null si no hay fecha propia. */
export function parseSourceDay(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const match = raw.trim().match(/^(\d{2})\/(\d{2})\/(\d{2})$/);
  if (!match) return null;
  const [, dd, mm, yy] = match;
  const month = Number(mm);
  const day = Number(dd);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  return `20${yy}-${mm}-${dd}`;
}

const UNIT_WORDS: ReadonlyArray<[RegExp, PrecioUnit]> = [
  [/mililitro/i, "ml"],
  [/litro/i, "l"],
  [/kilogramo|\bkgs?\b/i, "kg"],
  [/gramo|\bgrs?\b/i, "g"],
  [/unidad/i, "un"],
];

/** Cantidad y unidad del envase, para poder comparar precio por unidad. */
export function parseUnit(raw: unknown): { qty: number | null; unit: PrecioUnit | null } {
  if (typeof raw !== "string" || !raw.trim()) return { qty: null, unit: null };
  const qtyMatch = raw.match(/(\d+(?:[.,]\d+)?)/);
  const parsed = qtyMatch ? Number(qtyMatch[1].replace(",", ".")) : NaN;
  const hit = UNIT_WORDS.find(([pattern]) => pattern.test(raw));
  return { qty: Number.isFinite(parsed) ? parsed : null, unit: hit ? hit[1] : null };
}

/** Motivo por el que la fila no es una observación, o null cuando lo es. */
export function rejectionReason(row: PrecioRawRow): string | null {
  if (typeof row?.precio === "string" && row.precio.includes("(*)")) {
    return "precio imputado por el origen (marca `(*)`): es un promedio nacional, no el precio de este local";
  }
  if (parsePrice(row?.precio) === null) return `precio ilegible: ${JSON.stringify(row?.precio)}`;
  if (parseSourceDay(row?.fecha) === null) {
    return "la fila no trae fecha propia, así que no se puede medir su antigüedad";
  }
  return null;
}
