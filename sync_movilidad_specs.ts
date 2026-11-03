// La ficha técnica de los monopatines de /monopatines-electricos-uruguay (pm2
// `currency-movilidad-specs`, cada hora a los :49).
//
// La tarjeta de búsqueda de Mercado Libre llega sin atributos y la de las tiendas sólo con título y
// precio, así que el directorio no podía filtrar por autonomía, velocidad, potencia, peso ni carga
// soportada — lo primero que muestra cualquier tienda de monopatines. La ficha propia sí lo dice
// (medido el 2026-11-03: tabla completa en ML; texto rotulado en delcar, superbikers y las Shopify).
//
// Una corrida: (1) lee hasta MOVILIDAD_SPECS_MAX fichas pendientes, a MOVILIDAD_SPECS_GAP_MS entre
// pedidos y con tope de reloj, y guarda CADA lectura en `movilidadspecs` — también la mala, para que
// la cola no se trabe (classes/movilidad/specs/queue.ts); (2) reaplica la ficha a todas las filas
// frescas de monopatín con la misma función que usa la horaria de movilidad; (3) guarda el snapshot
// del asesor y de las medianas por tipo, que es lo único que la página lee.
//
// Mercado Libre se lee por la misma IP que currency-autos-detail (:11) y currency-rentals-ml-detail
// (:35, hasta 10 min); a los :49, 90 fichas a 2,5 s son ~4 min.
import dotenv from "dotenv";
import "dotenv/config";
dotenv.config({ path: "app/.env", quiet: true });

import { appConnection, appDbConfigured } from "./classes/appdb";
import { MovilidadListingModel } from "./classes/models/MovilidadListing";
import { MovilidadSpecSnapshotModel } from "./classes/models/MovilidadSpecSnapshot";
import { enrichMovilidadRow, MONOPATIN_CATEGORY } from "./classes/movilidad/specs/enrich";
import { orderTargets, type FichaQueueRow, type StoredFichaDoc } from "./classes/movilidad/specs/queue";
import { readFicha } from "./classes/movilidad/specs/read";
import { fichaUpdate } from "./classes/movilidad/specs/write";
import { buildSpecSnapshot, MONOPATIN_SNAPSHOT_KEY, type SnapshotRow } from "./classes/movilidad/specs/snapshot";
import { loadFichaByListingId, MOVILIDAD_SPECS_COLLECTION } from "./classes/movilidad/store";
import type { EquiparListingRow } from "./classes/equipar/listings";
import { sleep } from "./classes/rentals/net";

/** Igual que la página (`EQUIPAR_PRODUCTOS_STALE_DAYS`): un aviso no visto en 4 días no está en venta. */
const FRESH_DAYS = 4;

const number = (name: string, fallback: number): number => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

type ListingDoc = EquiparListingRow & { firstSeen?: string };

export async function main(): Promise<void> {
  if (!process.env.APP_MONGO_URI && process.env.MONGO_URI) process.env.APP_MONGO_URI = process.env.MONGO_URI;
  const dryRun = process.argv.includes("--dry-run");
  if (!appDbConfigured()) {
    throw new Error("[movilidad-specs] APP_MONGO_URI/MONGO_URI is missing — refusing to use a different database");
  }
  await appConnection().asPromise();

  const now = new Date();
  const cutoff = new Date(now.getTime() - FRESH_DAYS * 86_400_000).toISOString().slice(0, 10);
  const rows = (await MovilidadListingModel.find({ category: MONOPATIN_CATEGORY, lastSeen: { $gte: cutoff } })
    .lean()
    .exec()) as unknown as ListingDoc[];

  const specsCollection = appConnection().collection(MOVILIDAD_SPECS_COLLECTION);
  const storedDocs = (await specsCollection
    .find(
      { listingId: { $in: rows.map((row) => row.listingId) } },
      { projection: { _id: 0, listingId: 1, ok: 1, gone: 1, failures: 1, readAt: 1, lastTriedAt: 1 } }
    )
    .toArray()) as unknown as StoredFichaDoc[];
  const stored = new Map(storedDocs.map((doc) => [doc.listingId, doc]));

  const queue: FichaQueueRow[] = rows
    .filter((row) => !row.suspect)
    .map((row) => ({ listingId: row.listingId, url: row.url, source: row.source }));
  const targets = orderTargets(queue, stored, now, number("MOVILIDAD_SPECS_MAX", 90));

  const summary = { fresh: rows.length, targets: targets.length, read: 0, withSpecs: 0, gone: 0, failed: 0, note: "" };
  const gapMs = number("MOVILIDAD_SPECS_GAP_MS", 2_500);
  const deadline = Date.now() + number("MOVILIDAD_SPECS_MINUTES", 8) * 60_000;
  let networkFailures = 0;

  for (const target of targets) {
    if (Date.now() >= deadline) {
      summary.note = "presupuesto de tiempo agotado";
      break;
    }
    // Sólo cuentan las fallas sin respuesta: un aviso borrado es una respuesta, y cortar por eso es
    // exactamente la traba de Casasweb.
    if (networkFailures >= 5) {
      summary.note = "cinco pedidos seguidos sin respuesta o sin ficha";
      break;
    }
    const target2 = { listingId: target.listingId, url: target.url, source: target.source as "mercadolibre" | "store" };
    const read = await readFicha(target2);
    const triedAt = new Date().toISOString();
    if (read.ok) {
      networkFailures = 0;
      summary.read++;
      if (read.specs) summary.withSpecs++;
    } else if (read.gone) {
      networkFailures = 0;
      summary.gone++;
    } else {
      // Sin respuesta, o una página sin ficha (un desafío anti-bot): las dos cuentan para el corte.
      networkFailures++;
      summary.failed++;
      if (read.failure) summary.note = read.failure;
    }
    // Toda lectura se GUARDA (classes/movilidad/specs/write.ts), y ninguna que no traiga ficha borra
    // la ficha buena que ya estaba.
    if (!dryRun) {
      await specsCollection.updateOne({ listingId: target.listingId }, fichaUpdate(target2, read, triedAt), { upsert: true });
    }
    await sleep(gapMs);
  }

  // Todas las filas frescas, leídas hoy o antes: la misma función que usa la horaria de movilidad.
  const fichas = await loadFichaByListingId(rows.map((row) => row.listingId));
  const enriched = rows.map((row) => enrichMovilidadRow(row, fichas.get(row.listingId)));
  if (!dryRun && enriched.length) {
    await MovilidadListingModel.bulkWrite(
      enriched.map((row) => ({
        updateOne: {
          filter: { listingId: row.listingId },
          update: { $set: { specs: row.specs ?? null, uyuPerKm: row.uyuPerKm ?? null, brand: row.brand, brandKey: row.brandKey } },
        },
      })) as any,
      { ordered: false }
    );
  }

  const snapshot = buildSpecSnapshot(
    enriched.map(
      (row): SnapshotRow => ({
        listingId: row.listingId,
        title: row.title,
        url: row.url,
        image: row.source === "facebook" ? null : row.image,
        price: row.price,
        currency: row.currency,
        priceUyu: row.priceUyu,
        condition: row.condition,
        source: row.source,
        sellerName: row.sellerName,
        brand: row.brand,
        variant: row.variant,
        variantLabel: row.variantLabel,
        suspect: row.suspect,
        specs: row.specs ?? null,
        uyuPerKm: row.uyuPerKm ?? null,
      })
    ),
    now.toISOString()
  );
  if (!dryRun) {
    await MovilidadSpecSnapshotModel.updateOne({ key: MONOPATIN_SNAPSHOT_KEY }, { $set: snapshot }, { upsert: true });
  }

  // Si la mayoría de las páginas que contestan no traen ficha, ML cambió el marcado o sirve otra
  // página: avisarlo en el log antes de que el directorio se quede sin ficha nueva.
  if (summary.read >= 10 && summary.withSpecs < summary.read / 2) {
    console.warn(`[movilidad-specs] ALERTA: sólo ${summary.withSpecs} de ${summary.read} fichas leídas traen datos`);
  }
  console.log(
    `[movilidad-specs] ${JSON.stringify({
      ...summary,
      dryRun,
      candidates: snapshot.candidates.length,
      withFicha: snapshot.stats.withFicha,
      total: snapshot.stats.total,
      over25: snapshot.stats.over25,
    })}`
  );
}

if (require.main === module) {
  main()
    .then(async () => {
      await appConnection().close().catch(() => undefined);
      process.exit(0);
    })
    .catch(async (error) => {
      console.error("[movilidad-specs] fallo", error instanceof Error ? error.message : error);
      await appConnection().close().catch(() => undefined);
      process.exit(1);
    });
}
