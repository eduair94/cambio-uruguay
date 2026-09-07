// 215 llamadas a `compararArticulo` con el bbox nacional, y NO una sola a
// `compararCanasta`.
//
// La tentación es real: la canasta entera entra en una llamada de 65 s contra
// los ~2,3 min de este barrido. Pero imputa (ver `parse.ts`), su matriz tiene
// 6 claves de columna duplicadas —`"Ta - Ta  | Cerro "`, `"Super XXI | Super
// XXI"`…— y por lo tanto no se puede unir a locales de forma fiable.
//
// Este endpoint, en cambio, devuelve observaciones reales: para el artículo 1
// volvieron 670 filas de 749 locales posibles, y la ausencia significa
// ausencia. Hay un tripwire en `tests/precios/no_imputed_endpoint.test.ts` para
// que nadie reintroduzca el otro por eficiencia.
//
// La unión al catálogo se midió sobre esas 670 filas: coordenada exacta 100 %,
// nombre+dirección 100 %, cero huérfanas. Se prueba la coordenada primero
// porque no depende de espacios ni de mayúsculas.
import { fetchJson, NATIONAL_BBOX, SIPC_BASE } from "./net";
import { parsePrice, parseSourceDay, rejectionReason } from "./parse";
import type { PrecioObservation, PrecioRawRow, PrecioStore } from "./types";

export type StoreIndex = { byCoord: Map<string, PrecioStore>; byName: Map<string, PrecioStore> };

const coordKey = (lat: unknown, lon: unknown): string | null => {
  const a = Number(lat);
  const b = Number(lon);
  if (!Number.isFinite(a) || !Number.isFinite(b) || a === 0 || b === 0) return null;
  return `${a.toFixed(5)},${b.toFixed(5)}`;
};

const nameKey = (name: unknown, address: unknown): string =>
  `${String(name ?? "").trim().toLowerCase()}|${String(address ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase()}`;

export function storeIndex(stores: PrecioStore[]): StoreIndex {
  const byCoord = new Map<string, PrecioStore>();
  const byName = new Map<string, PrecioStore>();
  for (const store of stores) {
    const key = coordKey(store.lat, store.lon);
    if (key && !byCoord.has(key)) byCoord.set(key, store);
    const alias = nameKey(store.name, store.address);
    if (!byName.has(alias)) byName.set(alias, store);
  }
  return { byCoord, byName };
}

export function matchStore(index: StoreIndex, row: PrecioRawRow): PrecioStore | null {
  const key = coordKey(row?.x, row?.y);
  if (key) {
    const hit = index.byCoord.get(key);
    if (hit) return hit;
  }
  return index.byName.get(nameKey(row?.name, row?.direccion)) || null;
}

/**
 * Filas -> observaciones. Descarta lo que no es una observación y dice por qué;
 * cuando el mismo local aparece dos veces para el mismo artículo se conserva la
 * fila con fecha más reciente (medido: 3 coordenadas repetidas en 670 filas).
 */
export function observationsFor(
  articleId: number,
  rows: PrecioRawRow[],
  index: StoreIndex
): { observations: PrecioObservation[]; rejected: string[] } {
  const rejected: string[] = [];
  const best = new Map<string, PrecioObservation>();

  for (const row of rows || []) {
    const reason = rejectionReason(row);
    if (reason) {
      rejected.push(`${String(row?.name ?? "?").trim()}: ${reason}`);
      continue;
    }
    const store = matchStore(index, row);
    const observation: PrecioObservation = {
      articleId,
      storeId: store ? store.id : null,
      declarationId: Number(row.id),
      price: parsePrice(row.precio) as number,
      sourceDay: parseSourceDay(row.fecha) as string,
      storeName: String(row.name ?? "").trim(),
      address: String(row.direccion ?? "").trim(),
      lat: store ? store.lat : Number.isFinite(Number(row.x)) ? Number(row.x) : null,
      lon: store ? store.lon : Number.isFinite(Number(row.y)) ? Number(row.y) : null,
    };
    const key = store ? `s${store.id}` : `d${observation.declarationId}`;
    const previous = best.get(key);
    if (!previous || observation.sourceDay > previous.sourceDay) best.set(key, observation);
  }

  return { observations: [...best.values()], rejected };
}

/** Las filas de un artículo en todo el país, o null si el origen no contestó. */
export async function sweepArticle(articleId: number): Promise<PrecioRawRow[] | null> {
  return fetchJson<PrecioRawRow[]>(`${SIPC_BASE}/compararArticulo`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_articulo: String(articleId), ...NATIONAL_BBOX }),
  });
}
