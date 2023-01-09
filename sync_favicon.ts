import { Cambio } from "./classes/cambio";
import { MongooseServer } from "./classes/database";
import { sync_favicon } from "./classes/sync_favicon";
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const main = async () => {
  await MongooseServer.startConnectionPromise();
  console.log("Start sync favicon");
  console.time("sync");
  await sync_favicon();
  console.timeEnd("sync");
  process.exit(1);
};

main();
