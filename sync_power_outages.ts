import dotenv from "dotenv";
dotenv.config();
import { appConnection, appDbConfigured } from "./classes/appdb";
import { runPowerSample } from "./classes/utilities/power/run";
import { mongoPowerStore } from "./classes/utilities/power/store";

/** Every ten minutes: one UTE ECSE snapshot into the power-cut ledger. See docs/app/PROPERTY_ZONE_SERVICES.md. */
async function main(): Promise<void> {
  if (!appDbConfigured()) throw new Error("APP_MONGO_URI required; no backend database fallback");
  const deadline = setTimeout(() => { console.error("[power-outages] deadline exceeded"); process.exit(1); }, 4 * 60_000);
  try {
    await appConnection().asPromise();
    const result = await runPowerSample({ store: mongoPowerStore() });
    console.log(JSON.stringify(result));
  } finally { clearTimeout(deadline); await appConnection().close(); }
}
main().catch(error => { console.error("[power-outages] failed:", error instanceof Error ? error.message : "unknown"); process.exitCode = 1; });
