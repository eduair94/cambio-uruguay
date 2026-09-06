import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import { appConnection, appDbConfigured } from "./classes/appdb";
import { analyzeOpportunities } from "./classes/propertyopportunities/analyze";
import { rentalOpportunityListings } from "./classes/propertyopportunities/rentalAdapter";
import { harvestSalesInfoCasas, type SaleHarvestResult } from "./classes/propertyopportunities/sales";
import {
  loadRentalMarket, loadSaleCatalogInputs, loadSaleReadMeta, operationSnapshot, rentalCoverage,
  saveOpportunitySnapshot, saveSaleHarvest, saleAnalysisCoverage, validateSaleHarvest, saleHarvestRefusal,
} from "./classes/propertyopportunities/store";
import { fetchUsdUyuRate } from "./classes/rentals/rate";
import { buildSaleCatalog, mergeSaleCatalogInputs, saleOpportunityInputs } from "./classes/propertysales/project";
import { casaswebHarvestRefusal, loadCasaswebSaleReadMeta, publishSaleCatalog, saveCasaswebSaleHarvest } from "./classes/propertysales/store";
import { enrichCasaswebSaleDetails, harvestCasaswebSales, type CasaswebSaleHarvest } from "./classes/propertysales/casasweb";

async function main(): Promise<void> {
  if (!appDbConfigured()) throw new Error("APP_MONGO_URI is required; refusing to use a different database");
  const dryRun = process.argv.includes("--dry-run");
  const analyzeOnly = process.argv.includes("--analyze-only");
  const capturedFile = process.argv.find(arg => arg.startsWith("--sales-snapshot="))?.slice("--sales-snapshot=".length);
  const reportFile = process.argv.find(arg => arg.startsWith("--report="))?.slice("--report=".length);
  const casaswebFile = process.argv.find(arg => arg.startsWith("--casasweb-snapshot="))?.slice("--casasweb-snapshot=".length);
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
  let casasweb: CasaswebSaleHarvest | null = null;
  const previousCasasweb = await loadCasaswebSaleReadMeta();
  if (casaswebFile) casasweb = JSON.parse(fs.readFileSync(casaswebFile, "utf8").replace(/^\uFEFF/, ""));
  else if (!analyzeOnly && process.env.PROPERTY_SALES_CW_ENABLED !== "0" &&
    (!previousCasasweb || Date.now() - Date.parse(previousCasasweb.readAt) > 20 * 3_600_000)) {
    try {
      casasweb = await harvestCasaswebSales({ onProgress: (pages, listings) => {
        if (pages % 20 === 0) console.log(`[sales] Casasweb: ${pages} pages, ${listings} listings`);
      } });
      if (casasweb.ok) casasweb = await enrichCasaswebSaleDetails(casasweb, { previous: (await loadSaleCatalogInputs()).map(row => row.listing) });
    } catch { console.warn("[sales] Casasweb source failed; keeping its previous readings"); }
  }
  if (casasweb) {
    const refusal = casaswebHarvestRefusal(casasweb, new Date().toISOString(), previousCasasweb);
    if (refusal) {
      if (casaswebFile) throw new Error(refusal);
      console.warn(`[sales] ${refusal}; keeping its previous readings`); casasweb = null;
    } else if (!dryRun) await saveCasaswebSaleHarvest(casasweb, new Date().toISOString());
  }
  const analysisNow = new Date().toISOString();
  const [rentals, storedSales, saleMeta] = await Promise.all([
    loadRentalMarket(), loadSaleCatalogInputs(), loadSaleReadMeta(),
  ]);
  // Dry-run uses the same merge as an upsert without touching the collection.
  const sales = mergeSaleCatalogInputs(storedSales, [...harvest?.listings || [], ...casasweb?.listings || []],
    [...harvest?.unavailableIds || [], ...casasweb?.unavailableIds || []]);
  const rentalInputs = rentalOpportunityListings(rentals.rows);
  const saleInputs = saleOpportunityInputs(sales, analysisNow, rate);
  const result = analyzeOpportunities([...rentalInputs, ...saleInputs], { now: analysisNow, usdUyu: rate });
  const rentSnapshot = operationSnapshot(result, "rent", rentals.meta?.generatedAt || analysisNow, rentalCoverage(rentals.meta, rentalInputs, analysisNow));
  const saleCoverage = saleAnalysisCoverage(saleInputs, analysisNow);
  const saleReadAt = saleCoverage.map(row => row.lastRead).sort((a, b) => Date.parse(a) - Date.parse(b)).at(-1);
  const saleSnapshot = operationSnapshot(result, "sale", saleReadAt || saleMeta?.readAt || analysisNow, saleCoverage);
  const saleCatalog = dryRun ? buildSaleCatalog(sales, analysisNow, rate).meta
    : await publishSaleCatalog(sales, analysisNow, rate);
  if (reportFile) fs.writeFileSync(reportFile, JSON.stringify({ dryRun, rent: rentSnapshot, sale: saleSnapshot, saleCatalog }, null, 2));
  console.log(JSON.stringify({ dryRun, generatedAt: analysisNow, stats: result.stats, sources: saleSnapshot.coverage, saleCatalog }));
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
