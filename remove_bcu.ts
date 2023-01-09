import { cambio_info } from "./classes/cambioInfo";
import { MongooseServer } from "./classes/database";

async function main() {
  await MongooseServer.startConnectionPromise();
  await cambio_info.remove_bcu();
}

main();
