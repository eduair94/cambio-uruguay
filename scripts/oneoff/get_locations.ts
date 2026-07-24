import { Cambio } from "../../classes/cambio";
import { cambio_info } from "../../classes/cambioInfo";
import { MongooseServer, withTimeout } from "../../classes/database";
import { locationOrigins } from "../../classes/origins";

async function main() {
  // Every getLocations() write goes through MongooseServer, whose model calls
  // buffer against an unopened connection and time out after 10s if nothing
  // ever calls connect() first — mirrors the explicit wait in add_new.ts.
  await withTimeout(MongooseServer.startConnectionPromise(), 15000);
  const report: Array<Record<string, unknown>> = [];
  for (let origin in locationOrigins) {
    console.log(origin);
    const exchange: Cambio = new locationOrigins[origin](origin);
    const sourceUrl = String((exchange as any).bcu || "");
    if (!sourceUrl.includes("nroinst=") && origin !== "oca") {
      report.push({ origin, status: "skipped", reason: "no location source" });
      continue;
    }

    try {
      const before = await cambio_info.getMarkets({ origin });
      const departments = await exchange.getLocations();
      const after = await cambio_info.getMarkets({ origin });
      report.push({
        origin,
        status: "ok",
        beforeActive: before.filter((entry: any) => entry.status !== 0).length,
        afterActive: after.filter((entry: any) => entry.status !== 0).length,
        closed: after.filter((entry: any) => entry.status === 0).length,
        departments,
      });
    } catch (e) {
      console.error(origin, (e as Error).message);
      report.push({
        origin,
        status: "error",
        error: (e as Error).message,
      });
    }
  }
  console.log("LOCATION_SYNC_REPORT", JSON.stringify(report));
}

// The open Mongoose connection keeps the event loop alive after main()
// resolves, so the script never returns to the shell — force exit once done.
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
