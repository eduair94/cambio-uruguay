// /cambios-de-precio-uruguay: qué bajó y qué subió de precio en los últimos días, por vertical.
//
// NO escribe historial — lo leen las tres colecciones que ya lo guardan (`pricewatchoffers`,
// `carlistings.priceHistory`, `marketpricelogs`) y este job sólo las recorre para publicar una foto.
// Recorrerlas son ~100k documentos: es trabajo de job, no de visita (regla del usuario 2026-09-19,
// "los análisis que procesan la base se calculan de forma periódica y se guardan").
//
// Un flag: --dry-run lee, arma la foto y la imprime, sin escribir ni podar.
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "app/.env" });

import { appDbConfigured } from "./classes/appdb";
import { runPriceChanges } from "./classes/pricehistory/refresh";

async function main(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const dryRun = process.argv.includes("--dry-run");

  // El app llama a esta variable MONGO_URI en su propio .env; el puente de la raíz exige
  // APP_MONGO_URI para que un job nunca pueda escribir la base equivocada por accidente.
  process.env.APP_MONGO_URI = process.env.APP_MONGO_URI || process.env.MONGO_URI;
  if (!appDbConfigured()) {
    console.error("[price-changes] APP_MONGO_URI/MONGO_URI is missing — refusing to write the wrong DB");
    process.exit(1);
  }

  const result = await runPriceChanges({ today, dryRun });

  for (const vertical of result.snapshot.verticals) {
    console.log(
      `[price-changes] ${vertical.vertical}: ${vertical.tracked} avisos, ${vertical.withHistory} con historia, ` +
        `${vertical.drops} bajas, ${vertical.rises} subas, desde ${vertical.trackingSince ?? "-"}`
    );
  }
  console.log(`[price-changes] ${result.snapshot.day} publicables=${result.snapshot.changes.length} ventana=${result.snapshot.windowDays}d`);

  if (dryRun) {
    for (const change of result.snapshot.changes.slice(0, 8)) {
      console.log(
        `[price-changes]   ${change.vertical} ${change.direction} ${change.pct}% ` +
          `${change.currency} ${change.from} -> ${change.to} (${change.at}) ${change.title.slice(0, 60)}`
      );
    }
    console.log("[price-changes] --dry-run: no se escribió nada");
    process.exit(0);
  }
  if (!result.written) {
    console.error(`[price-changes] no se publicó: ${result.reason}`);
    process.exit(1);
  }
  console.log(`[price-changes] publicado; ${result.pruned} fotos viejas borradas`);
  process.exit(0);
}

main().catch((error) => {
  console.error("[price-changes] falló la corrida", error);
  process.exit(1);
});
