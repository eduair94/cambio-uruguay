// La ficha técnica de las heladeras, lavarropas, televisores y aires de /equipar-casa-uruguay (pm2
// `currency-equipar-specs`, cada hora a los :40).
//
// La tarjeta de búsqueda de Mercado Libre llega sin atributos, así que el directorio no podía filtrar
// por litros, kilos, pulgadas ni frigorías, que es como se elige un electrodoméstico. La ficha propia
// sí lo dice, y muy regular (medido el 4/11/2026, ver classes/equipar/specs/fields.ts).
//
// Una corrida: (1) lee hasta EQUIPAR_SPECS_MAX fichas de ML pendientes por el puente (:9656,
// `/product/<id>`; desde la IP del VPS la página de producto da el muro de login), a
// EQUIPAR_SPECS_GAP_MS entre pedidos y con tope de reloj, y guarda CADA lectura en `equiparspecs` —
// también la mala, con la misma cola con espera que monopatines (classes/movilidad/specs/queue.ts);
// (2) reaplica la ficha a todas las filas frescas de esas categorías con la misma función que usa
// `sync_equipar.ts`; (3) guarda el snapshot del asesor por categoría (`equiparspecsnapshots`).
//
// Tiendas y Facebook no se leen en v1: de ellos queda lo que dice el título.
//
// A los :40 por el puente compartido: celulares corre a los :37 (8 búsquedas, ~1 min) y motos a los
// :44; 40 fichas a 3 s son ~2 min. Las demás horarias del puente: :01 fichas de movilidad, :07
// movilidad, :23 sillas, :29 autos, :47 alquileres, :53 equipar.
import dotenv from "dotenv";
import "dotenv/config";
dotenv.config({ path: "app/.env", quiet: true });

import { appConnection, appDbConfigured } from "./classes/appdb";
import { EquiparListingModel } from "./classes/models/EquiparListing";
import { EquiparSpecSnapshotModel } from "./classes/models/EquiparSpecSnapshot";
import { enrichEquiparRow } from "./classes/equipar/specs/enrich";
import { EQUIPAR_FICHA_CATEGORIES, type EquiparFicha } from "./classes/equipar/specs/fields";
import { buildEquiparFichaSnapshot } from "./classes/equipar/specs/snapshot";
import { EQUIPAR_SPECS_COLLECTION, equiparFichaUpdate, loadEquiparFichas } from "./classes/equipar/specs/store";
import { orderTargets, type FichaQueueRow, type StoredFichaDoc } from "./classes/movilidad/specs/queue";
import { readMlProductRows } from "./classes/movilidad/specs/read";
import type { EquiparListingRow } from "./classes/equipar/listings";
import { sleep } from "./classes/rentals/net";

/** Igual que la página (`EQUIPAR_PRODUCTOS_STALE_DAYS`): un aviso no visto en 4 días no está en venta. */
const FRESH_DAYS = 4;

const number = (name: string, fallback: number): number => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

type ListingDoc = EquiparListingRow & { ficha?: EquiparFicha | null };

export async function main(): Promise<void> {
  if (!process.env.APP_MONGO_URI && process.env.MONGO_URI) process.env.APP_MONGO_URI = process.env.MONGO_URI;
  const dryRun = process.argv.includes("--dry-run");
  if (!appDbConfigured()) {
    throw new Error("[equipar-specs] APP_MONGO_URI/MONGO_URI is missing — refusing to use a different database");
  }
  await appConnection().asPromise();

  const now = new Date();
  const cutoff = new Date(now.getTime() - FRESH_DAYS * 86_400_000).toISOString().slice(0, 10);
  const rows = (await EquiparListingModel.find({
    category: { $in: [...EQUIPAR_FICHA_CATEGORIES] },
    lastSeen: { $gte: cutoff },
  })
    .lean()
    .exec()) as unknown as ListingDoc[];

  const specsCollection = appConnection().collection(EQUIPAR_SPECS_COLLECTION);
  const storedDocs = (await specsCollection
    .find(
      { listingId: { $in: rows.map((row) => row.listingId) } },
      { projection: { _id: 0, listingId: 1, ok: 1, gone: 1, failures: 1, readAt: 1, lastTriedAt: 1 } }
    )
    .toArray()) as unknown as StoredFichaDoc[];
  const stored = new Map(storedDocs.map((doc) => [doc.listingId, doc]));

  // Sólo Mercado Libre en v1: `orderTargets` ya saltea Facebook y los avisos sin id de producto.
  const queue: FichaQueueRow[] = rows
    .filter((row) => !row.suspect && row.source === "mercadolibre")
    .map((row) => ({ listingId: row.listingId, url: row.url, source: row.source, category: row.category }));
  const targets = orderTargets(queue, stored, now, number("EQUIPAR_SPECS_MAX", 40));

  const summary = { fresh: rows.length, targets: targets.length, read: 0, withRows: 0, gone: 0, failed: 0, note: "" };
  const gapMs = number("EQUIPAR_SPECS_GAP_MS", 3_000);
  const deadline = Date.now() + number("EQUIPAR_SPECS_MINUTES", 5) * 60_000;
  let networkFailures = 0;

  for (const target of targets) {
    if (Date.now() >= deadline) {
      summary.note = "presupuesto de tiempo agotado";
      break;
    }
    if (networkFailures >= 5) {
      summary.note = "cinco pedidos seguidos sin respuesta";
      break;
    }
    const read = await readMlProductRows(target.url);
    const triedAt = new Date().toISOString();
    if (read.ok) {
      networkFailures = 0;
      summary.read++;
      if (Object.keys(read.rows).length) summary.withRows++;
    } else if (read.gone) {
      networkFailures = 0;
      summary.gone++;
    } else {
      networkFailures++;
      summary.failed++;
      if (read.failure) summary.note = read.failure;
    }
    if (!dryRun) {
      await specsCollection.updateOne(
        { listingId: target.listingId },
        equiparFichaUpdate({ listingId: target.listingId, url: target.url, category: target.category ?? "" }, read, triedAt),
        { upsert: true }
      );
    }
    await sleep(gapMs);
  }

  const fichas = await loadEquiparFichas(rows.map((row) => row.listingId));
  const enriched = rows.map((row) => enrichEquiparRow(row, fichas.get(row.listingId)));

  if (!dryRun && enriched.length) {
    await EquiparListingModel.bulkWrite(
      enriched.map((row) => ({
        updateOne: {
          filter: { listingId: row.listingId },
          update: { $set: { ficha: row.ficha ?? null, brand: row.brand, brandKey: row.brandKey } },
        },
      })) as any,
      { ordered: false }
    );
  }

  const perCategory: Record<string, { total: number; withFicha: number }> = {};
  for (const category of EQUIPAR_FICHA_CATEGORIES) {
    const snapshot = buildEquiparFichaSnapshot(category, enriched, now.toISOString());
    perCategory[category] = { total: snapshot.total, withFicha: snapshot.withFicha };
    if (!dryRun) {
      await EquiparSpecSnapshotModel.updateOne({ key: category }, { $set: snapshot }, { upsert: true });
    }
  }

  if (summary.read >= 10 && summary.withRows < summary.read / 2) {
    console.warn(`[equipar-specs] ALERTA: sólo ${summary.withRows} de ${summary.read} fichas leídas traen la tabla`);
  }
  console.log(`[equipar-specs] ${JSON.stringify({ ...summary, dryRun, ...perCategory })}`);
}

if (require.main === module) {
  main()
    .then(async () => {
      await appConnection().close().catch(() => undefined);
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("[equipar-specs] fallo", error instanceof Error ? error.message : error);
      await appConnection().close().catch(() => undefined);
      process.exit(1);
    });
}
