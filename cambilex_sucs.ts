import CambioCambilex from "./classes/cambios/cambilex";
import { MongooseServer } from "./classes/database";

async function main() {
  await MongooseServer.startConnectionPromise();
  const c = new CambioCambilex("cambilex");
  c.get_exchanges();
}

main();
