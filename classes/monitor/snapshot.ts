// La foto del grupo: qué publica hoy cada casa del monitor, una fila por casa y moneda. Puro.
//
// Cuenta el precio de MOSTRADOR (`''`) y, si la casa no lo publica, el de BILLETE. Quedan afuera
// los precios que no son de mostrador —mayoristas (INTERBANCARIO, PROMED.FONDO, CABLE) y
// condicionados a tener cuenta (EBROU, TRANSFERENCIA)— y el BCU, que no es una casa.
import { auditAgainstPeers, implausibleReason } from "../rate_plausibility";
import type { Quote, SnapshotRow } from "./types";

const COUNTER_TYPES = ["", "BILLETE"];

/** El tipo de una cotización como lo compara el monitor (la foto y el ledger, igual). */
export function normalizeType(type: string | null | undefined): string {
  return String(type ?? "").trim().toUpperCase();
}

export function groupQuotes(
  rows: readonly SnapshotRow[],
  group: ReadonlySet<string>,
  codes: ReadonlySet<string>
): Map<string, Quote[]> {
  const chosen = new Map<string, Quote>();
  for (const row of rows) {
    const code = String(row.code ?? "").toUpperCase();
    const type = normalizeType(row.type);
    if (row.origin === "bcu" || !group.has(row.origin) || !codes.has(code)) continue;
    const rank = COUNTER_TYPES.indexOf(type);
    if (rank < 0) continue;
    const buy = Number(row.buy);
    const sell = Number(row.sell);
    if (!(buy > 0) && !(sell > 0)) continue;
    const key = `${row.origin}|${code}`;
    const current = chosen.get(key);
    if (current && COUNTER_TYPES.indexOf(current.type) <= rank) continue;
    chosen.set(key, { origin: row.origin, code, type, buy: buy > 0 ? buy : 0, sell: sell > 0 ? sell : 0 });
  }
  const out = new Map<string, Quote[]>();
  for (const quote of chosen.values()) {
    const list = out.get(quote.code) ?? [];
    list.push(quote);
    out.set(quote.code, list);
  }
  return out;
}

/**
 * Saca de la foto lo que no puede ser un precio: compra mayor que venta, y lo que la auditoría
 * contra las otras casas marca como imposible (una coma perdida del lado de la VENTA pasa la regla
 * por fila y queda en la foto hasta que la auditoría del final del sync la borra; el monitor puede
 * leer en ese rato).
 */
export function plausibleRows<T extends SnapshotRow>(rows: readonly T[]): T[] {
  // auditAgainstPeers devuelve las filas agrupadas por moneda y tipo, no en el orden de entrada:
  // cada fila lleva su índice para volver a encontrarla.
  const judged = auditAgainstPeers(rows.map((row, index) => ({ ...row, type: row.type ?? "", index })));
  const impossible = new Set(
    judged.filter((row) => row.verdict.level === "imposible").map((row) => (row as unknown as { index: number }).index)
  );
  return rows.filter((row, i) => !implausibleReason(row) && !impossible.has(i));
}
