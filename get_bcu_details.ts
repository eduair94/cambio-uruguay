import BCU_Details from "./classes/bcu_details";
import { MongooseServer } from "./classes/database";
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

const main = async () => {
  await MongooseServer.startConnectionPromise();
  const x = new BCU_Details();
  x.sync_data();
};

main();
