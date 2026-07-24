import CambioSantander from "../../classes/cambios/santander";
import { MongooseServer, withTimeout } from "../../classes/database";
import sentryInit from "../../sentry";

const main = async () => {
  sentryInit();
  await withTimeout(MongooseServer.startConnectionPromise(), 15000);
  console.time("sync");
  const cambio = new CambioSantander("santander");
  await cambio.sync_data();
  console.timeEnd("sync");
  process.exit(0);
};

main().catch((error) => {
  console.error("Santander sync failed:", (error as Error).message);
  process.exit(1);
});
