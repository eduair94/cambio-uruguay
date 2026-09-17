import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import { appConnection, appDbConfigured } from "./classes/appdb";
import { analyzeCars } from "./classes/autos/analyze";
import { fetchCarDetails } from "./classes/autos/detail";
import { carKey, enrichCarListing } from "./classes/autos/enrich";
import { buildMarketSnapshots } from "./classes/autos/market";
import { buildCarCatalog, buildOpportunitySnapshot, CAR_CATALOG_FRESH_DAYS } from "./classes/autos/project";
import { harvestMercadoLibreCars } from "./classes/autos/sources/mercadolibre";
import {
  collapseRefusal, loadCatalogMeta, loadHarvestMeta, loadOpportunityStats, loadStoredCars, loadVocabularies,
  mergeVocabularies, publishCarCatalog, publishCarMarkets, saveCarDetails, saveCarHarvest, saveCarOpportunitySnapshot,
  saveHarvestMeta, saveRefusal, saveVocabularies,
} from "./classes/autos/store";
import type { CarDetail, CarHarvestResult, CarListing, CarModelVocabulary, StoredCar } from "./classes/autos/types";
import { fetchUsdUyuRate } from "./classes/rentals/rate";

const argument = (name: string): string | undefined =>
  process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);

function storedFromHarvest(harvest: CarHarvestResult): StoredCar[] {
  return harvest.listings.map(listing => ({
    key: carKey(listing.id, listing.source), firstSeen: listing.observedAt, lastSeen: listing.observedAt, listing,
    priceHistory: [{ price: listing.price, currency: listing.currency, observedAt: listing.observedAt }],
    retiredAt: null, missedFullSweeps: 0, detail: null,
  }));
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const fast = process.argv.includes("--fast");
  let analyzeOnly = process.argv.includes("--analyze-only");
  const reportFile = argument("report");
  const snapshotFile = argument("harvest-snapshot");
  const saveHarvestFile = argument("save-harvest");
  // Replaying an old harvest into production would move lastSeen back and un-retire adverts
  // the real world has since dropped; only a --dry-run may read one.
  if (snapshotFile && !dryRun) throw new Error("--harvest-snapshot requires --dry-run");
  if (!dryRun && !appDbConfigured()) throw new Error("APP_MONGO_URI is required; refusing to use a different database");
  const mlDisabled = process.env.AUTOS_ML_ENABLED === "0";
  if (mlDisabled && !snapshotFile) {
    console.log("[autos] AUTOS_ML_ENABLED=0: skipping Mercado Libre, analysing stored adverts only");
    analyzeOnly = true;
  }
  const now = new Date();
  const usdUyu = await fetchUsdUyuRate();
  if (!(usdUyu > 0)) throw new Error("No current USD/UYU reference; keeping previous publication");

  let harvest: CarHarvestResult | null = null;
  if (snapshotFile) harvest = JSON.parse(fs.readFileSync(snapshotFile, "utf8").replace(/^\uFEFF/, ""));
  else if (!analyzeOnly) {
    harvest = await harvestMercadoLibreCars({
      mode: fast ? "fast" : "full",
      // Sequential and spaced on purpose: a burst makes the shared bridge fall back to its proxy for
      // 10 minutes for every job (see CAR_HARVEST_RETRY). ~1,750 pages take about two hours.
      maxRequests: Number(process.env.AUTOS_ML_MAX_REQUESTS || (fast ? 800 : 4_000)),
      maxDurationMs: (fast ? 20 : 150) * 60_000,
      concurrency: Number(process.env.AUTOS_ML_CONCURRENCY || 1),
      gapMs: Number(process.env.AUTOS_ML_GAP_MS || 1_500),
      onProgress: message => console.log(message),
    });
    console.log(`[autos] harvest ${harvest.mode}: ${harvest.listings.length} adverts, ${harvest.requests} requests, ${harvest.failedPages} failed pages, ${harvest.cooldowns} outage waits${harvest.note ? `, ${harvest.note}` : ""}`);
  }
  if (harvest && saveHarvestFile) fs.writeFileSync(saveHarvestFile, JSON.stringify(harvest));

  let vocabularies: CarModelVocabulary[] = dryRun ? [] : await loadVocabularies();
  if (harvest) vocabularies = mergeVocabularies(vocabularies, harvest.vocabularies);
  if (harvest && !dryRun) {
    const saved = await saveCarHarvest(harvest);
    await saveVocabularies(vocabularies, harvest.finishedAt);
    await saveHarvestMeta(harvest);
    console.log(`[autos] stored ${saved.upserted} adverts, retired ${saved.retired}`);
  }
  const stored = dryRun ? (harvest ? storedFromHarvest(harvest) : []) : await loadStoredCars(now);
  const trimsByModel = new Map(vocabularies.map(vocabulary => [`${vocabulary.brandId}|${vocabulary.modelId}`, vocabulary.trims]));
  const enrich = (doc: StoredCar, detail: CarDetail | null): CarListing => enrichCarListing(doc.listing, {
    usdUyu, trims: trimsByModel.get(`${doc.listing.brandId}|${doc.listing.modelId}`) ?? [],
    firstSeen: doc.firstSeen, lastSeen: doc.lastSeen, priceHistory: doc.priceHistory ?? [], detail,
  });
  let listings = stored.map(doc => enrich(doc, doc.detail));
  const details = new Map(listings.filter(listing => listing.detail).map(listing => [listing.key, listing.detail!] as [string, CarDetail]));
  let analysis = analyzeCars(listings, { now, details, vocabularies: trimsByModel });

  if (analysis.needsDetail.length && !mlDisabled) {
    const byKey = new Map(listings.map(listing => [listing.key, listing]));
    const fetched = await fetchCarDetails(
      analysis.needsDetail.map(key => byKey.get(key)!).map(listing => ({ key: listing.key, permalink: listing.permalink })),
      { max: Number(process.env.AUTOS_DETAIL_MAX || (fast ? 120 : 400)), maxDurationMs: (fast ? 8 : 20) * 60_000 },
    );
    console.log(`[autos] advert pages: ${fetched.details.size} read, ${fetched.gone.length} gone, ${fetched.failed} failed`);
    if (!dryRun) await saveCarDetails(fetched, new Date().toISOString());
    const gone = new Set(fetched.gone);
    listings = stored.filter(doc => !gone.has(doc.key)).map(doc => enrich(doc, fetched.details.get(doc.key) ?? doc.detail));
    for (const [key, detail] of fetched.details) details.set(key, detail);
    analysis = analyzeCars(listings, { now, details, vocabularies: trimsByModel });
  }

  const generatedAt = new Date().toISOString();
  const lastFull = dryRun ? null : await loadHarvestMeta("uy-cars-last-full");
  const lastRun = dryRun ? null : await loadHarvestMeta("uy-cars");
  const catalog = buildCarCatalog(listings, analysis, {
    now, generatedAt, usdUyu,
    lastFullReadAt: (lastFull?.lastOkAt as string | undefined) ?? (harvest?.mode === "full" ? harvest.finishedAt : null),
    lastReadAt: (lastRun?.finishedAt as string | undefined) ?? harvest?.finishedAt ?? null,
    reportedTotal: (lastFull?.reportedTotal as number | undefined) ?? harvest?.reportedTotal ?? null,
    sources: [],
  });
  const markets = buildMarketSnapshots(listings, { now, generatedAt, freshDays: CAR_CATALOG_FRESH_DAYS });
  const snapshot = buildOpportunitySnapshot(analysis, { generatedAt, usdUyu });
  console.log(`[autos] catalog ${catalog.listings.length}, models ${markets.length}, opportunities ${snapshot.items.length}`, JSON.stringify(analysis.stats));

  if (reportFile) {
    fs.writeFileSync(reportFile, JSON.stringify({ dryRun, catalogMeta: catalog.meta, markets: markets.slice(0, 30), snapshot }, null, 2));
  }
  if (dryRun) return;

  const previousCatalog = await loadCatalogMeta();
  const catalogRefusal = collapseRefusal(previousCatalog?.listings, catalog.listings.length, "catálogo");
  if (catalogRefusal) console.warn(`[autos] ${catalogRefusal}`);
  else {
    await publishCarCatalog(catalog.listings, catalog.meta);
    if (markets.length) await publishCarMarkets(markets);
    else console.log("[autos] sin modelos con avisos frescos suficientes; se saltea la publicación de mercados");
  }
  const previousStats = await loadOpportunityStats();
  const snapshotRefusal = collapseRefusal(previousStats?.input, snapshot.stats.input, "oportunidades");
  if (snapshotRefusal) console.warn(`[autos] ${snapshotRefusal}`);
  else await saveCarOpportunitySnapshot(snapshot);

  const refusalText = [catalogRefusal, snapshotRefusal].filter((reason): reason is string => !!reason).join(" · ") || null;
  await saveRefusal(refusalText, generatedAt);
}

main()
  .then(async () => {
    if (appDbConfigured()) await appConnection().close().catch(() => undefined);
    process.exit(0);
  })
  .catch(async error => {
    console.error("[autos] failed:", error);
    if (appDbConfigured()) await appConnection().close().catch(() => undefined);
    process.exit(1);
  });
