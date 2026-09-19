import dotenv from "dotenv";
dotenv.config();
import { appConnection, appDbConfigured } from "./classes/appdb";
import { runWaterHarvest } from "./classes/utilities/water/run";
import { mongoWaterStore } from "./classes/utilities/water/store";

/** Daily: OSE's newest scheduled water interruptions. `--backfill` walks the whole archive (~20 min). */
async function main(): Promise<void> {
  if (!appDbConfigured()) throw new Error("APP_MONGO_URI required; no backend database fallback");
  const backfill = process.argv.includes("--backfill");
  const deadline = setTimeout(() => { console.error("[water-interruptions] deadline exceeded"); process.exit(1); },
    (backfill ? 45 : 10) * 60_000);
  try {
    await appConnection().asPromise();
    const result = await runWaterHarvest({ store: mongoWaterStore(), pages: backfill ? "all" : undefined });
    console.log(JSON.stringify({ backfill, ...result }));
  } finally { clearTimeout(deadline); await appConnection().close(); }
}
main().catch(error => { console.error("[water-interruptions] failed:", error instanceof Error ? error.message : "unknown"); process.exitCode = 1; });
