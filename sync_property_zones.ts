import dotenv from "dotenv";
dotenv.config();
import { appConnection, appDbConfigured } from "./classes/appdb";
import { refreshPropertyZones } from "./classes/propertyzones/refresh";
import { withZoneRefreshLease } from "./classes/propertyzones/store";

async function main(): Promise<void> {
  if (!appDbConfigured()) throw new Error("APP_MONGO_URI required; no backend database fallback");
  const dryRun = process.argv.includes("--dry-run");
  const deadline = setTimeout(() => { console.error("[property-zones] total run deadline exceeded"); process.exit(1); }, 25 * 60_000);
  try {
    const execute = () => refreshPropertyZones({ dryRun, forceSources: process.argv.includes("--force-sources") });
    const result = dryRun ? await execute() : await withZoneRefreshLease(execute);
    console.log(JSON.stringify({ dryRun, generatedAt: result.market?.generatedAt, properties: result.market?.observations,
      scannedRows: result.market?.scannedRows, cohorts: result.market?.buckets.length,
      officialZones: result.context.geometry.zones.length, crimePeriodTo: result.context.crime?.periodTo,
      servicesDataAsOf: result.context.services?.dataAsOf, errors: result.errors }));
    if (result.errors.length) process.exitCode = 1;
  } finally { clearTimeout(deadline); await appConnection().close(); }
}
main().catch(() => { console.error("[property-zones] refresh failed; inspect source availability and APP database connection"); process.exitCode = 1; });
