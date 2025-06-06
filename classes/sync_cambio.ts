import fs from "fs";
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
    }
  }
  // Store in a file the current date and time of the sync that's easy to convert back to date later
  const date = new Date();
  const dateString = date.toISOString(); // ISO format is easy to convert back to Date
  const syncFilePath = "last_sync.txt";

  try {
    fs.writeFileSync(syncFilePath, dateString, "utf8");
    console.log(`Sync completed at: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
    console.log(`Sync timestamp saved to: ${syncFilePath}`);
  } catch (error) {
    console.error("Error saving sync timestamp:", error);
  }

  console.log("Finish");
};

export { sync_cambios };
