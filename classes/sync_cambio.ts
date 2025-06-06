import { Cambio } from "./cambio";
import { origins } from "./origins";

const sync_cambios = async () => {
  for (let origin in origins) {
    try {
      const cambio: Cambio = new origins[origin](origin);
      await cambio.sync_data();
    } catch (e) {
      console.error(e);
      console.log(origin, e.message);
      process.exit(1);
    }
  }
  console.log("Finish");
};

export { sync_cambios };
