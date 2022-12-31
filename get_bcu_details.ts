import BCU_Details from "./classes/bcu_details";
import { Cambio } from "./classes/cambio";
import { MongooseServer } from "./classes/database";
import { sync_cambios } from "./classes/sync_cambio";
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const main = async () => {
  await MongooseServer.startConnectionPromise();
  const x = new BCU_Details();
  x.sync_data();
};

main();
