import { Cambio } from "./classes/cambio";
import { MongooseServer } from "./classes/database";
import { origins } from "./classes/origins";

async function main() {
  // Every getLocations() write goes through MongooseServer, whose model calls
  // buffer against an unopened connection and time out after 10s if nothing
  // ever calls connect() first — mirrors the explicit wait in add_new.ts.
  await MongooseServer.startConnectionPromise();
  for (let origin in origins) {
    console.log(origin);
    const exchange: Cambio = new origins[origin](origin);
    try {
      await exchange.getLocations();
    } catch (e) {
      console.log(e.message);
    }
  }
}

// The open Mongoose connection keeps the event loop alive after main()
// resolves, so the script never returns to the shell — force exit once done.
main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
