import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import { appConnection, appDbConfigured } from "./classes/appdb";
import { analyzeOpportunities } from "./classes/propertyopportunities/analyze";
import { rentalOpportunityListings } from "./classes/propertyopportunities/rentalAdapter";
import { harvestSalesInfoCasas, type SaleHarvestResult } from "./classes/propertyopportunities/sales";
import {
  loadRentalMarket, loadSaleListings, loadSaleReadMeta, operationSnapshot, rentalCoverage,
  saveOpportunitySnapshot, saveSaleHarvest, salesCoverage, validateSaleHarvest, saleHarvestRefusal,
} from "./classes/propertyopportunities/store";
import { fetchUsdUyuRate } from "./classes/rentals/rate";

async function main(): Promise<void> {
  if (!appDbConfigured()) throw new Error("APP_MONGO_URI is required; refusing to use a different database");
  const dryRun = process.argv.includes("--dry-run");
  const analyzeOnly = process.argv.includes("--analyze-only");
  const capturedFile = process.argv.find(arg => arg.startsWith("--sales-snapshot="))?.slice("--sales-snapshot=".length);
  const reportFile = process.argv.find(arg => arg.startsWith("--report="))?.slice("--report=".length);
  const previousSales = await loadSaleReadMeta();
  const previousSalesRead = Date.parse(previousSales?.readAt || "");
  const rate = await fetchUsdUyuRate();
  if (!(rate > 0)) throw new Error("No current USD/UYU reference; keeping previous analyses");
  let harvest: SaleHarvestResult | null = null;
  if (capturedFile) harvest = JSON.parse(fs.readFileSync(capturedFile, "utf8").replace(/^\uFEFF/, ""));
  else if (!analyzeOnly && (process.argv.includes("--force-sales") ||
    !Number.isFinite(previousSalesRead) || Date.now() - previousSalesRead > 20 * 3_600_000)) {
    harvest = await harvestSalesInfoCasas({
      maxPages: Number(process.env.PROPERTY_OPPORTUNITIES_SALE_PAGES || 500),
      maxDurationMs: 20 * 60_000,
      onProgress: (pages, listings) => console.log(`[opportunities] sales: ${pages} pages, ${listings} listings`),
    });
  }
  const now = new Date().toISOString();
  if (harvest) {
    validateSaleHarvest(harvest, now);
    const refusal = saleHarvestRefusal(harvest, previousSales);
    if (refusal) throw new Error(refusal);
    if (!dryRun) await saveSaleHarvest(harvest, now);
  }
  const [rentals, storedSales, saleMeta] = await Promise.all([
    loadRentalMarket(), loadSaleListings(), loadSaleReadMeta(),
  ]);
  // Dry-run uses the same merge as an upsert without touching the collection.
  const sales = new Map(storedSales.map(row => [row.id, row]));
  for (const row of harvest?.listings || []) sales.set(row.id, row);
  const result = analyzeOpportunities([...rentalOpportunityListings(rentals.rows), ...sales.values()], { now, usdUyu: rate });
  const rentSnapshot = operationSnapshot(result, "rent", rentals.meta?.generatedAt || now, rentalCoverage(rentals.meta));
  const saleSnapshot = operationSnapshot(result, "sale", harvest?.readAt || saleMeta?.readAt || now,
    harvest ? salesCoverage(harvest) : saleMeta?.coverage || []);
  if (reportFile) fs.writeFileSync(reportFile, JSON.stringify({ dryRun, rent: rentSnapshot, sale: saleSnapshot }, null, 2));
  console.log(JSON.stringify({ dryRun, generatedAt: now, stats: result.stats, sources: saleSnapshot.coverage }));
  if (!dryRun) {
    await saveOpportunitySnapshot(rentSnapshot);
    await saveOpportunitySnapshot(saleSnapshot);
  }
}

main().then(async () => { await appConnection().close(); process.exit(0); }).catch(async error => {
  console.error(`[opportunities] ${error instanceof Error ? error.message : "Refresh failed"}`);
  if (appDbConfigured()) await appConnection().close().catch(() => {});
  process.exit(1);
});
