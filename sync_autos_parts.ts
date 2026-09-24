// Daily spare-parts reading for the buying advisor (/que-auto-comprar-uruguay): six parts per model
// on Mercado Libre Uruguay through the :9656 bridge (classes/autos/repuestosHarvest.ts). Private APP
// DB rows in `carpartsprices`; sync_autos.ts turns them into the published index.
//
//   node dist/sync_autos_parts.js                         due models, oldest reading first
//   node dist/sync_autos_parts.js --dry-run --models=a,b  read those models, print, write nothing
import dotenv from "dotenv";
dotenv.config();
import { appConnection, appDbConfigured } from "./classes/appdb";
import { harvestParts, planPartsTargets, shouldReplacePartsRecord, type CarPartsTarget } from "./classes/autos/repuestosHarvest";
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
  // Los hermanos salen de TODO el catálogo, no sólo de los modelos con 12+ avisos: un "C4 Cactus"
  // con pocos avisos igual tiene que impedir que sus repuestos se cuenten como del C4.
  const byBrand = new Map<string, string[]>();
  for (const model of meta?.models ?? []) byBrand.set(model.brand, [...(byBrand.get(model.brand) ?? []), model.model]);
  for (const model of models) model.siblings = (byBrand.get(model.brand) ?? []).filter(name => name !== model.model);
  const only = argument("models")?.split(",").map(slug => slug.trim()).filter(Boolean);
  const previous = new Map((await loadCarPartsRecords()).map(record => [record.marketSlug, record] as const));
  const due = only
    ? models.filter(model => only.includes(model.marketSlug))
    : planPartsTargets(models, previous, now);
  // Diez minutos: el hueco del puente entre :11 y :21. El ritmo lo dan las tres corridas por día.
  const minutes = Number(process.env.AUTOS_PARTS_MINUTES || 10);
  console.log(`[autos-parts] ${models.length} models with ${MIN_LISTINGS}+ adverts, ${previous.size} read before, ${due.length} due, ${minutes} min`);
  const result = await harvestParts(due, {
    usdUyu,
    now,
    gapMs: Number(process.env.AUTOS_PARTS_GAP_MS || 2_000),
    maxDurationMs: minutes * 60_000,
  });
  console.log(`[autos-parts] ${result.requests} searches, ${result.records.length} models read${result.note ? `, ${result.note}` : ""}`);
  if (dryRun) {
    for (const record of result.records.slice(0, 5)) console.log(JSON.stringify(record));
    return;
  }
  // Una lectura flaca no pisa una buena (classes/autos/repuestosHarvest.ts): el modelo queda con su
  // relevamiento anterior y, como su fecha no cambia, se vuelve a pedir en la corrida siguiente.
  const kept = result.records.filter(record => shouldReplacePartsRecord(previous.get(record.marketSlug), record));
  if (kept.length < result.records.length) {
    console.log(`[autos-parts] ${result.records.length - kept.length} lecturas flacas no pisan la anterior`);
  }
  await saveCarPartsRecords(kept);
  const finishedAt = new Date().toISOString();
  await CarHarvestMetaModel.updateOne(
    { key: "uy-cars-parts" },
    { $set: { updatedAt: finishedAt, data: {
      finishedAt, models: models.length, due: due.length, requests: result.requests, written: kept.length,
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
