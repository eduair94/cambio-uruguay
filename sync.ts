import { Cambio } from "./classes/cambio";
import { MongooseServer } from "./classes/database";
import { sync_cambios } from "./classes/sync_cambio";
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const main = async () => {
  await MongooseServer.startConnectionPromise();
  console.time("sync");
  await sync_cambios();
  console.timeEnd("sync");
  process.exit(1);
};

main();
