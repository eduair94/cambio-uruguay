// Termómetro del mercado IT (pm2 `currency-charruadevs`): r/CharruaDevs → clasificación con Gemini
// → `charruadevstexts` + `charruadevssnapshots` en la base del APP → /mercado-it-uruguay.
//
// Por qué un cron del backend y no una Nitro task: el app corre en cluster ×2 y toda tarea
// programada ahí dispara dos veces (ver classes/cluster.ts y AGENTS.md). Este job es
// single-instance por construcción.
//
//   node dist/sync_charruadevs.js                 corrida diaria
//   node dist/sync_charruadevs.js --seed <dir>    siembra (texts.jsonl + state.json)
//   node dist/sync_charruadevs.js --authors <f>   pega autores sobre el corpus ya sembrado
//   node dist/sync_charruadevs.js --dry-run       calcula todo, no escribe estado ni snapshot
import dotenv from "dotenv";
dotenv.config();

import { appDbConfigured } from "./classes/appdb";
import { runRefresh } from "./classes/charruadevs/refresh";

async function main(): Promise<void> {
  if (!appDbConfigured()) {
    console.error(
      "[charruadevs] APP_MONGO_URI is not set — refusing to run. El corpus vive en la base del app " +
        "(copiar el MONGO_URI de app/.env); escribirlo en la del backend dejaría /mercado-it-uruguay vacía sin error."
    );
    process.exit(1);
  }
  const seedIdx = process.argv.indexOf("--seed");
  const seedDir = seedIdx >= 0 ? process.argv[seedIdx + 1] : undefined;
  if (seedIdx >= 0 && !seedDir) {
    console.error("[charruadevs] --seed necesita un directorio con texts.jsonl y state.json");
    process.exit(1);
  }
  const authorsIdx = process.argv.indexOf("--authors");
  const authorsFile = authorsIdx >= 0 ? process.argv[authorsIdx + 1] : undefined;
  if (authorsIdx >= 0 && !authorsFile) {
    console.error("[charruadevs] --authors necesita un .jsonl con { rid, author } por linea");
    process.exit(1);
  }
  try {
    const report = await runRefresh({ seedDir, authorsFile, dryRun: process.argv.includes("--dry-run") });
    console.log(`[charruadevs] ${JSON.stringify(report)}`);
    if (report.failed) console.warn(`[charruadevs] ${report.failed} textos sin etiqueta (Gemini); se reintentan en la próxima corrida`);
    if (report.reason && report.reason !== "dry-run") console.error(`[charruadevs] no se pisó el snapshot: ${report.reason}`);
    process.exit(report.wrote || report.reason === "dry-run" ? 0 : 1);
  } catch (err) {
    console.error("[charruadevs] falló:", err);
    process.exit(1);
  }
}

void main();
