import { Cambio } from "./classes/cambio";
import { origins } from "./classes/origins";

async function main() {
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

main();
