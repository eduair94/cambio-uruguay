import CambioScotiabank from "../../classes/cambios/scotiabank";
import { MongooseServer, withTimeout } from "../../classes/database";
import sentryInit from "../../sentry";

const main = async () => {
  sentryInit();
  await withTimeout(MongooseServer.startConnectionPromise(), 15000);
  console.time("sync");
  const cambio = new CambioScotiabank("scotiabank");
  await cambio.sync_data();
  console.timeEnd("sync");
  process.exit(0);
};

main().catch((error) => {
  console.error(
    "Scotiabank sync failed:",
    (error as Error).message
  );
  process.exit(1);
});
