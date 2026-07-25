// Clears the image-identification cache. Needed once because an early version cached failed calls
// (HTTP 429) as "not identifiable", which would have kept those photos from ever being retried.
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "app/.env" });

import { ChairVisionGuessModel } from "../../classes/models/ChairVisionGuess";

async function main(): Promise<void> {
  process.env.APP_MONGO_URI = process.env.APP_MONGO_URI || process.env.MONGO_URI;
  const result = await ChairVisionGuessModel.deleteMany({ raw: { $in: [null, ""] } });
  console.log(`[chairs] cache de visión: ${result.deletedCount} filas sin respuesta real eliminadas`);
  process.exit(0);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
