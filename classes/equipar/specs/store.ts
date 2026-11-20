// La colección privada de fichas de equipar (`equiparspecs`, APP DB) y qué escribe cada lectura.
//
// Misma regla que monopatines (classes/movilidad/specs/write.ts): toda lectura se guarda, buena o mala,
// y una lectura que no trae ficha nunca borra las filas buenas que ya estaban. Se guardan las filas
// crudas de la tabla de ML, no la interpretación: el parser se puede mejorar sin volver a leer.
import { appConnection } from "../../appdb";
import type { MlProductRead } from "../../movilidad/specs/read";
import type { StoredEquiparFicha } from "./enrich";

export const EQUIPAR_SPECS_COLLECTION = "equiparspecs";

export interface EquiparFichaUpdate {
  $set: Record<string, unknown>;
  $setOnInsert?: Record<string, unknown>;
  $inc?: Record<string, number>;
}

export function equiparFichaUpdate(
  target: { listingId: string; url: string; category: string },
  read: MlProductRead,
  triedAt: string
): EquiparFichaUpdate {
  const base = { listingId: target.listingId, url: target.url, category: target.category, lastTriedAt: triedAt };
  const hasRows = Object.keys(read.rows).length > 0;
  if (read.ok && hasRows) {
    return {
      $set: { ...base, ok: true, gone: false, failures: 0, readAt: triedAt, rows: read.rows, brand: read.brand, model: read.model },
    };
  }
  if (read.ok) {
    // La página contestó sin tabla: cuenta como leída (no vuelve a la cola por 45 días) y lo que estaba
    // guardado sigue ahí.
    return {
      $set: { ...base, ok: true, gone: false, failures: 0, readAt: triedAt },
      $setOnInsert: { rows: null, brand: null, model: null },
    };
  }
  return {
    $set: { ...base, ok: false, gone: read.gone },
    $setOnInsert: { rows: null, readAt: null },
    ...(read.gone ? {} : { $inc: { failures: 1 } }),
  };
}

/** Las fichas guardadas con filas para esos avisos. */
export async function loadEquiparFichas(ids: readonly string[]): Promise<Map<string, StoredEquiparFicha>> {
  if (!ids.length) return new Map();
  const docs = (await appConnection()
    .collection(EQUIPAR_SPECS_COLLECTION)
    .find(
      { listingId: { $in: [...ids] }, rows: { $ne: null } },
      { projection: { _id: 0, listingId: 1, rows: 1, brand: 1, model: 1 } }
    )
    .toArray()) as unknown as StoredEquiparFicha[];
  return new Map(docs.map((doc) => [doc.listingId, doc]));
}
