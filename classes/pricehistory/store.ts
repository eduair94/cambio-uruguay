// Escritura del snapshot de /cambios-de-precio-uruguay. Separado de refresh.ts para que la parte que
// DECIDE (qué cambió, qué entra, qué se descarta) se pueda probar sin base de datos.
import { PriceChangeSnapshotModel } from "../models/PriceChangeSnapshot";
import type { PriceChangeSnapshot } from "./types";

export const PRICE_CHANGE_SNAPSHOT_KEY = "current";

/** Cuántos cambios tiene la foto publicada hoy: la referencia contra la que se mide una corrida flaca. */
export async function publishedChangeCount(): Promise<number | null> {
  const current = (await PriceChangeSnapshotModel.findOne({ key: PRICE_CHANGE_SNAPSHOT_KEY })
    .select({ _id: 0, changes: 1 })
    .lean()) as { changes?: unknown[] } | null;
  return current ? (Array.isArray(current.changes) ? current.changes.length : 0) : null;
}

/** Escribe la foto de hoy y su copia de archivo, en dos upserts por `key`. */
export async function writeSnapshot(snapshot: PriceChangeSnapshot): Promise<void> {
  await PriceChangeSnapshotModel.createIndexes();
  for (const key of [PRICE_CHANGE_SNAPSHOT_KEY, `day:${snapshot.day}`]) {
    await PriceChangeSnapshotModel.replaceOne({ key }, { ...snapshot, key }, { upsert: true });
  }
}

export async function pruneSnapshots(filter: Record<string, unknown>): Promise<number> {
  const { deletedCount } = await PriceChangeSnapshotModel.deleteMany(filter);
  return deletedCount ?? 0;
}
