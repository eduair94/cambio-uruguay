import fs from "fs";
import { Cambio } from "./cambio";
import { origins } from "./origins";

interface SyncOriginResult {
  origin: string;
  status: "success" | "error";
  duration: number;
  error?: string;
}

// Delay between processing each origin (ms) to reduce CPU spikes
const ORIGIN_DELAY_MS = 500;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sync_cambios = async () => {
  const syncResults: SyncOriginResult[] = [];
  let successCount = 0;
  let errorCount = 0;

  const originKeys = Object.keys(origins);
  for (let i = 0; i < originKeys.length; i++) {
    const origin = originKeys[i];
    const startTime = Date.now();
    try {
      const cambio: Cambio = new (origins as any)[origin](origin);
      await cambio.sync_data();
      const duration = Date.now() - startTime;
      syncResults.push({ origin, status: "success", duration });
      successCount++;
    } catch (e: any) {
      const duration = Date.now() - startTime;
      console.error(e);
      console.log(origin, e.message);
      syncResults.push({ origin, status: "error", duration, error: e.message || "Unknown error" });
      errorCount++;
    }

    // Throttle between origins to reduce CPU pressure
    if (i < originKeys.length - 1) {
      await delay(ORIGIN_DELAY_MS);
    }
  }

  // Store the current date and time of the sync
  const date = new Date();
  const dateString = date.toISOString();
  const syncFilePath = "last_sync.txt";
  const syncResultsPath = "last_sync_results.json";

  try {
    fs.writeFileSync(syncFilePath, dateString, "utf8");
    console.log(`Sync completed at: ${date.toLocaleDateString()} ${date.toLocaleTimeString()}`);
    console.log(`Sync timestamp saved to: ${syncFilePath}`);
    console.log(`Results: ${successCount} success, ${errorCount} errors out of ${syncResults.length} origins`);
  } catch (error) {
    console.error("Error saving sync timestamp:", error);
  }

  // Save detailed per-origin sync results
  try {
    const resultsData = {
      timestamp: dateString,
      summary: {
        total: syncResults.length,
        success: successCount,
        errors: errorCount,
      },
      origins: syncResults,
    };
    fs.writeFileSync(syncResultsPath, JSON.stringify(resultsData, null, 2), "utf8");
    console.log(`Sync results saved to: ${syncResultsPath}`);
  } catch (error) {
    console.error("Error saving sync results:", error);
  }

  console.log("Finish");
};

export { sync_cambios };

