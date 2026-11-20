// La ficha técnica de los monopatines de /monopatines-electricos-uruguay y de las bicicletas de
// /bicicletas-electricas-uruguay (pm2 `currency-movilidad-specs`, cada hora a los :01).
//
// La tarjeta de búsqueda de Mercado Libre llega sin atributos y la de las tiendas sólo con título y
// precio, así que el directorio no podía filtrar por autonomía, velocidad, potencia, peso ni carga
// soportada — lo primero que muestra cualquier tienda de monopatines. La ficha propia sí lo dice
// (medido el 2026-11-03: tabla completa en ML; texto rotulado en delcar, superbikers y las Shopify).
// Desde el 4/11/2026 lee también las bicicletas, con su perfil (classes/movilidad/specs/profiles.ts):
// rodado, cambios, batería removible, acelerador y motor central.
//
// Una corrida: (1) lee hasta MOVILIDAD_SPECS_MAX fichas pendientes de las dos categorías, a
// MOVILIDAD_SPECS_GAP_MS entre pedidos y con tope de reloj, y guarda CADA lectura en `movilidadspecs`
// — también la mala, para que la cola no se trabe (classes/movilidad/specs/queue.ts); (2) reaplica la
// ficha a todas las filas frescas con la misma función que usa la horaria de movilidad; (3) por
// categoría, guarda el snapshot del asesor y de las medianas por tipo, y el catálogo de modelos, que
// es lo único que leen las páginas.
//
// La ficha de Mercado Libre se pide al puente propio (:9656, `/product/<id>`): desde la IP del VPS la
// página de producto redirige al muro de login (medido 3/11/2026, ver classes/movilidad/specs/read.ts).
// A los :01, en el hueco de los consumidores horarios del puente, 60 fichas a 3 s son ~4 min.
import dotenv from "dotenv";
import "dotenv/config";
dotenv.config({ path: "app/.env", quiet: true });

import { appConnection, appDbConfigured } from "./classes/appdb";
import { MovilidadListingModel } from "./classes/models/MovilidadListing";
import { MovilidadSpecSnapshotModel } from "./classes/models/MovilidadSpecSnapshot";
import { enrichMovilidadRow } from "./classes/movilidad/specs/enrich";
import {
  MONOPATIN_CATEGORY,
  SPEC_CATEGORIES,
  type MovilidadSpecCategory,
} from "./classes/movilidad/specs/profiles";
import { orderTargets, type FichaQueueRow, type StoredFichaDoc } from "./classes/movilidad/specs/queue";
import { readFicha, type FichaTarget } from "./classes/movilidad/specs/read";
import { fichaUpdate } from "./classes/movilidad/specs/write";
import { buildSpecSnapshot, type SnapshotRow } from "./classes/movilidad/specs/snapshot";
import { loadFichaByListingId, MOVILIDAD_SPECS_COLLECTION, type StoredFichaMap } from "./classes/movilidad/store";
import { MovilidadModelModel } from "./classes/models/MovilidadModel";
import {
  buildModels,
  modelsRunIsThin,
  type ModelHistoryPoint,
  type ModelRow,
  type MovilidadModelDoc,
} from "./classes/movilidad/models/build";
import { claimedElsewhere, modelCategoryFilter } from "./classes/movilidad/models/category";
import { modelsRetireWrite, modelsWrites } from "./classes/movilidad/models/write";
import type { EquiparListingRow } from "./classes/equipar/listings";
import { sleep } from "./classes/rentals/net";

/** Igual que la página (`EQUIPAR_PRODUCTOS_STALE_DAYS`): un aviso no visto en 4 días no está en venta. */
const FRESH_DAYS = 4;
/** Igual que la API (`MONOPATIN_MODEL_STALE_DAYS`): la guarda de corrida flaca compara contra esto. */
const MODEL_FRESH_DAYS = 7;

const number = (name: string, fallback: number): number => {
  const value = Number(process.env[name]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

type ListingDoc = EquiparListingRow & { firstSeen?: string };

const toModelRow = (row: ListingDoc, fichas: StoredFichaMap): ModelRow => ({
  listingId: row.listingId,
  title: row.title,
  url: row.url,
  image: row.image,
  price: row.price,
  currency: row.currency,
  priceUyu: row.priceUyu,
  condition: row.condition,
  source: row.source,
  sellerName: row.sellerName,
  sellerKey: row.sellerKey,
  brand: row.brand,
  brandKey: row.brandKey,
  variant: row.variant,
  suspect: row.suspect,
  specs: row.specs ?? null,
  firstSeen: row.firstSeen,
  observedAt: row.observedAt,
  freeShipping: row.freeShipping,
  officialStore: row.officialStore,
  fichaModel: fichas.get(row.listingId)?.model ?? null,
});

const toSnapshotRow = (row: ListingDoc, modelSlug: string | null): SnapshotRow => ({
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
  modelSlug,
});

interface CategoryRun {
  category: MovilidadSpecCategory;
  models: MovilidadModelDoc[];
  thin: boolean;
  fresh: number;
  /** El modelo de cada aviso, o null: si la corrida es flaca, el que ya tenía guardado. */
  modelSlugOf: (row: ListingDoc) => string | null;
  dropped: number;
}

export async function main(): Promise<void> {
  if (!process.env.APP_MONGO_URI && process.env.MONGO_URI) process.env.APP_MONGO_URI = process.env.MONGO_URI;
  const dryRun = process.argv.includes("--dry-run");
  if (!appDbConfigured()) {
    throw new Error("[movilidad-specs] APP_MONGO_URI/MONGO_URI is missing — refusing to use a different database");
  }
  await appConnection().asPromise();

  const now = new Date();
  const cutoff = new Date(now.getTime() - FRESH_DAYS * 86_400_000).toISOString().slice(0, 10);
  const rows = (await MovilidadListingModel.find({
    category: { $in: [...SPEC_CATEGORIES] },
    lastSeen: { $gte: cutoff },
  })
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

  // Una sola cola para las dos categorías, con el mismo orden (tiendas y nunca leídos primero): el
  // presupuesto del puente es uno, y una bici sin leer pesa lo mismo que un monopatín sin leer.
  const queue: FichaQueueRow[] = rows
    .filter((row) => !row.suspect)
    .map((row) => ({ listingId: row.listingId, url: row.url, source: row.source, category: row.category }));
  const targets = orderTargets(queue, stored, now, number("MOVILIDAD_SPECS_MAX", 60));

  const summary = { fresh: rows.length, targets: targets.length, read: 0, withSpecs: 0, gone: 0, failed: 0, note: "" };
  const gapMs = number("MOVILIDAD_SPECS_GAP_MS", 3_000);
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
    const target2: FichaTarget = {
      listingId: target.listingId,
      url: target.url,
      source: target.source as "mercadolibre" | "store",
      category: target.category,
    };
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

  // El catálogo de modelos (classes/movilidad/models/), una categoría por vez. Monopatín primero: si
  // una bici armara el mismo slug que un monopatín, la URL ya era del monopatín y no se le pisa.
  const today = now.toISOString().slice(0, 10);
  const modelCutoff = new Date(now.getTime() - MODEL_FRESH_DAYS * 86_400_000).toISOString().slice(0, 10);
  const runs: CategoryRun[] = [];
  const claimedThisRun = new Map<string, MovilidadSpecCategory>();
  for (const category of SPEC_CATEGORIES) {
    const own = enriched.filter((row) => row.category === category);
    const built = buildModels(
      own.map((row) => toModelRow(row, fichas)),
      today,
      now.toISOString(),
      category
    );
    // Un slug que ya es de la otra categoría (en esta corrida o guardado) no se escribe acá.
    const storedOwners = (await MovilidadModelModel.find({ slug: { $in: built.models.map((model) => model.slug) } })
      .select({ _id: 0, slug: 1, category: 1 })
      .lean()
      .exec()) as unknown as Array<{ slug: string; category?: string | null }>;
    const taken = claimedElsewhere(category, built.models, storedOwners, claimedThisRun);
    const models = built.models.filter((model) => !taken.has(model.slug));
    for (const model of models) claimedThisRun.set(model.slug, category);

    const fresh = await MovilidadModelModel.countDocuments({
      ...modelCategoryFilter(category),
      lastSeen: { $gte: modelCutoff },
    }).exec();
    // Una corrida que arma muchos menos modelos que los guardados (la base vino a medias, cambió un
    // título en masa) no pisa nada: ni los modelos ni el enlace de cada aviso a su modelo.
    const thin = modelsRunIsThin(models.length, fresh);
    runs.push({
      category,
      models,
      thin,
      fresh,
      dropped: taken.size,
      modelSlugOf: (row) => {
        if (thin) return row.modelSlug ?? null;
        const slug = built.slugByListing.get(row.listingId) ?? null;
        return slug && !taken.has(slug) ? slug : null;
      },
    });
  }
  const runOf = new Map(runs.map((run) => [run.category, run]));
  const modelSlugOf = (row: ListingDoc): string | null => runOf.get(row.category as MovilidadSpecCategory)?.modelSlugOf(row) ?? null;

  if (!dryRun && enriched.length) {
    await MovilidadListingModel.bulkWrite(
      enriched.map((row) => ({
        updateOne: {
          filter: { listingId: row.listingId },
          update: {
            $set: {
              specs: row.specs ?? null,
              uyuPerKm: row.uyuPerKm ?? null,
              brand: row.brand,
              brandKey: row.brandKey,
              modelSlug: modelSlugOf(row),
            },
          },
        },
      })) as any,
      { ordered: false }
    );
  }

  const perCategory: Record<string, unknown> = {};
  for (const run of runs) {
    const own = enriched.filter((row) => row.category === run.category);
    const snapshot = buildSpecSnapshot(
      own.map((row) => toSnapshotRow(row, modelSlugOf(row))),
      now.toISOString(),
      run.category
    );
    if (!dryRun) {
      await MovilidadSpecSnapshotModel.updateOne({ key: run.category }, { $set: snapshot }, { upsert: true });
    }

    if (run.thin) {
      console.warn(
        `[movilidad-specs] ALERTA (${run.category}): ${run.models.length} modelos contra ${run.fresh} guardados; no se escriben`
      );
    } else if (!dryRun && run.models.length) {
      const prev = (await MovilidadModelModel.find({ slug: { $in: run.models.map((model) => model.slug) } })
        .select({ _id: 0, slug: 1, history: 1 })
        .lean()
        .exec()) as unknown as Array<{ slug: string; history?: ModelHistoryPoint[] }>;
      // Los modelos frescos de ESTA categoría que la corrida no armó quedan retirados (revisión final
      // de monopatines, 4/11). Acotado por categoría: sin eso, la vuelta de monopatín retiraba todas
      // las bicis, que tampoco "armó".
      await MovilidadModelModel.bulkWrite(
        [
          ...modelsWrites(run.models, new Map(prev.map((doc) => [doc.slug, doc.history ?? []]))),
          modelsRetireWrite(
            run.models.map((model) => model.slug),
            modelCutoff,
            modelCategoryFilter(run.category)
          ),
        ] as any,
        { ordered: true }
      );
    }
    if (run.dropped) {
      console.warn(`[movilidad-specs] ${run.category}: ${run.dropped} modelos con un slug que ya es de otra categoría`);
    }
    perCategory[run.category === MONOPATIN_CATEGORY ? "monopatin" : "bicicleta"] = {
      total: snapshot.stats.total,
      withFicha: snapshot.stats.withFicha,
      candidates: snapshot.candidates.length,
      over25: snapshot.stats.over25,
      models: run.models.length,
      indexable: run.models.filter((model) => model.indexable).length,
      thinModels: run.thin,
    };
  }

  // Si la mayoría de las páginas que contestan no traen ficha, ML cambió el marcado o sirve otra
  // página: avisarlo en el log antes de que el directorio se quede sin ficha nueva.
  if (summary.read >= 10 && summary.withSpecs < summary.read / 2) {
    console.warn(`[movilidad-specs] ALERTA: sólo ${summary.withSpecs} de ${summary.read} fichas leídas traen datos`);
  }
  console.log(`[movilidad-specs] ${JSON.stringify({ ...summary, dryRun, ...perCategory })}`);
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
