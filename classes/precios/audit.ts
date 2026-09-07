// La tercera guarda, y mira un eje que las otras dos NO PUEDEN ver.
//
// `plausibility.ts` juzga una fila contra las demás filas del mismo artículo, y
// `staleness.ts` juzga su antigüedad. Ninguna de las dos ve esto: un local cuya
// GÓNDOLA ENTERA está 3× arriba de la mediana nacional. Fila por fila cada
// precio cae dentro de la banda del artículo —medido: con p10/3–p90×3 no se
// rechaza casi nada—, así que las dos primeras guardas lo dejan pasar en verde;
// el error sólo aparece mirando todas las filas de ese local juntas, y es un
// error de unidad o de carga, no un súper caro.
//
// Corre al cierre, con todo el país escrito, porque es el único momento en que
// existe la mediana nacional por artículo.
//
// No manda Telegram: `TELEGRAM_ADMIN_CHAT_ID` está vacío en el VPS y
// `notifyAdmin` no llega a nadie. El veredicto va al log y a la respuesta de la
// API.
import type { PrecioFreshness } from "./staleness";
import type { PrecioObservation } from "./types";

export type PrecioScoredRow = PrecioObservation & {
  verdict: "ok" | "suspect" | "reject";
  freshness: PrecioFreshness;
};

export interface ShelfVerdict {
  storeId: number;
  storeName: string;
  n: number;
  ratio: number;
  severity: "ok" | "warn" | "grave";
  note: string;
}

/** Menos artículos que esto y el cociente es ruido. */
export const SHELF_MIN_ARTICLES = 8;
export const SHELF_WARN_RATIO = 1.5;
export const SHELF_GRAVE_RATIO = 2.5;

/**
 * Un veredicto por local: la mediana de (precio del local / mediana nacional
 * del artículo) sobre todos los artículos que ese local declara.
 *
 * Se mide en las dos direcciones. Una góndola entera 3× por DEBAJO no es una
 * ganga, es la misma clase de error, y encima es la que gana el ranking.
 */
export function auditShelves(rows: PrecioScoredRow[], medians: Map<number, number>): ShelfVerdict[] {
  const byStore = new Map<number, { name: string; ratios: number[] }>();

  for (const row of rows) {
    if (row.storeId === null || row.verdict === "reject") continue;
    const median = medians.get(row.articleId);
    if (!median || !Number.isFinite(median) || median <= 0) continue;
    const entry = byStore.get(row.storeId) || { name: row.storeName, ratios: [] };
    entry.ratios.push(row.price / median);
    byStore.set(row.storeId, entry);
  }

  const verdicts: ShelfVerdict[] = [];
  for (const [storeId, entry] of byStore) {
    const sorted = entry.ratios.sort((a, b) => a - b);
    const ratio = sorted[Math.floor(sorted.length / 2)];
    if (sorted.length < SHELF_MIN_ARTICLES) {
      verdicts.push({
        storeId,
        storeName: entry.name,
        n: sorted.length,
        ratio,
        severity: "ok",
        note: `muestra insuficiente para juzgar la góndola (${sorted.length} artículos)`,
      });
      continue;
    }
    const drift = Math.max(ratio, 1 / ratio);
    const severity = drift >= SHELF_GRAVE_RATIO ? "grave" : drift >= SHELF_WARN_RATIO ? "warn" : "ok";
    verdicts.push({
      storeId,
      storeName: entry.name,
      n: sorted.length,
      ratio,
      severity,
      note:
        severity === "ok"
          ? `góndola en línea con el país (×${ratio.toFixed(2)})`
          : `góndola entera desplazada ×${ratio.toFixed(2)} sobre ${sorted.length} artículos: probable error de unidad o de carga`,
    });
  }

  return verdicts.sort((a, b) => Math.abs(Math.log(b.ratio)) - Math.abs(Math.log(a.ratio)));
}
