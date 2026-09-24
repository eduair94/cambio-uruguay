// Daily spare-parts reading for the buying advisor (/que-auto-comprar-uruguay): six parts per model
// on Mercado Libre Uruguay through the :9656 bridge (classes/autos/repuestosHarvest.ts). Private APP
// DB rows in `carpartsprices`; sync_autos.ts turns them into the published index.
//
//   node dist/sync_autos_parts.js                         due models, oldest reading first
//   node dist/sync_autos_parts.js --dry-run --models=a,b  read those models, print, write nothing
import dotenv from "dotenv";
dotenv.config();
import { appConnection, appDbConfigured } from "./classes/appdb";
import { harvestParts, planPartsTargets, type CarPartsTarget } from "./classes/autos/repuestosHarvest";
import { loadCarPartsRecords, loadCatalogMeta, saveCarPartsRecords } from "./classes/autos/store";
import { CarHarvestMetaModel } from "./classes/models/CarHarvestMeta";
import { fetchUsdUyuRate } from "./classes/rentals/rate";

const argument = (name: string): string | undefined =>
  process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);

/** The same floor as the advisor snapshot (classes/autos/advisor.ts): below it no model gets advice. */
const MIN_LISTINGS = 12;

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  if (!appDbConfigured()) throw new Error("APP_MONGO_URI is required; refusing to use a different database");
  const now = new Date();
  const usdUyu = await fetchUsdUyuRate();
  if (!(usdUyu > 0)) throw new Error("No current USD/UYU reference; parts in dollars cannot be converted");
  const meta = await loadCatalogMeta();
  const models: CarPartsTarget[] = (meta?.models ?? [])
    .filter(model => model.listings >= MIN_LISTINGS)
    .map(model => ({ marketSlug: model.slug, brand: model.brand, model: model.model, adverts: model.listings }));
  const only = argument("models")?.split(",").map(slug => slug.trim()).filter(Boolean);
  const previous = new Map((await loadCarPartsRecords()).map(record => [record.marketSlug, record] as const));
  const due = only
    ? models.filter(model => only.includes(model.marketSlug))
    : planPartsTargets(models, previous, now);
  // Arranque: mientras no se leyó ni la mitad de los modelos, la corrida dura más, para que el asesor
  // no pase una semana diciendo "todavía no relevamos". En régimen alcanza con 15 minutos: ~40
  // modelos por noche contra ~250 que se releen cada 14 días.
  const bootstrapping = previous.size < models.length / 2;
  const minutes = Number(process.env.AUTOS_PARTS_MINUTES || (bootstrapping ? 40 : 15));
  console.log(`[autos-parts] ${models.length} models with ${MIN_LISTINGS}+ adverts, ${previous.size} read before, ${due.length} due, ${minutes} min`);
  const result = await harvestParts(due, {
    usdUyu,
    now,
    gapMs: Number(process.env.AUTOS_PARTS_GAP_MS || 2_500),
    maxDurationMs: minutes * 60_000,
  });
  console.log(`[autos-parts] ${result.requests} searches, ${result.records.length} models read${result.note ? `, ${result.note}` : ""}`);
  if (dryRun) {
    for (const record of result.records.slice(0, 5)) console.log(JSON.stringify(record));
    return;
  }
  await saveCarPartsRecords(result.records);
  const finishedAt = new Date().toISOString();
  await CarHarvestMetaModel.updateOne(
    { key: "uy-cars-parts" },
    { $set: { updatedAt: finishedAt, data: {
      finishedAt, models: models.length, due: due.length, requests: result.requests, written: result.records.length,
      note: result.note, ok: result.note !== "puente sin respuesta",
    } } },
    { upsert: true },
  );
}

main()
  .then(async () => {
    if (appDbConfigured()) await appConnection().close().catch(() => undefined);
    process.exit(0);
  })
  .catch(async error => {
    console.error("[autos-parts] failed:", error);
    if (appDbConfigured()) await appConnection().close().catch(() => undefined);
    process.exit(1);
  });
