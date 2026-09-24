// Seguimiento de precios de alquileres, viviendas en venta y autos usados: una serie diaria por
// cohorte ("cada producto") y la variación de la misma oferta. Lee los catálogos públicos de la APP DB
// (nunca una cosecha) y escribe `marketseries`, `marketseriesmetas` y el historial privado
// `marketpricelogs`. Diseño: docs/superpowers/specs/2026-09-18-seguimiento-de-precios-design.md.
// Operación: docs/app/MARKET_SERIES.md.
//
//   --dry-run                lee y calcula, no escribe nada.
//   --only=alquiler,autos    sólo esos mercados.
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "app/.env" });

import { appConnection, appDbConfigured } from "./classes/appdb";
import { refreshMarketSeries } from "./classes/marketseries/refresh";
import { MARKET_VERTICALS, type MarketVertical } from "./classes/marketseries/types";

function parseOnly(argv: readonly string[]): MarketVertical[] | undefined {
  const flag = argv.find(arg => arg.startsWith("--only="));
  if (!flag) return undefined;
  const wanted = flag
    .slice("--only=".length)
    .split(",")
    .map(value => value.trim());
  const unknown = wanted.filter(value => !(MARKET_VERTICALS as readonly string[]).includes(value));
  if (unknown.length) throw new Error(`--only desconocido: ${unknown.join(", ")}`);
  return wanted as MarketVertical[];
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const only = parseOnly(process.argv);
  // Mismo mapeo explícito que sync_price_events.ts: el app llama MONGO_URI a su propia base, y el
  // puente de la raíz exige APP_MONGO_URI para no escribir nunca la base equivocada.
  process.env.APP_MONGO_URI = process.env.APP_MONGO_URI || process.env.MONGO_URI;
  if (!appDbConfigured()) {
    console.error("[market-series] APP_MONGO_URI/MONGO_URI is missing — refusing to write the wrong DB");
    process.exit(1);
  }
  const results = await refreshMarketSeries({ dryRun, only });
  for (const result of results) {
    const excluded =
      Object.entries(result.excluded)
        .map(([reason, count]) => `${reason}=${count}`)
        .join(" ") || "-";
    const status = result.error ? `ERROR ${result.error}` : result.skipped ? `SALTEADO ${result.skipped}` : "ok";
    console.log(
      `[market-series] ${result.vertical}: ${status} observaciones=${result.observations} avisos=${result.adverts} ` +
        `unidades=${result.groups} cohortes=${result.cohorts} logs=${result.logsWritten}${result.logsSkipped ? ` (${result.logsSkipped} ya movidos por la cosecha)` : ""} podados=${result.logsPruned} excluidos: ${excluded}`,
    );
    for (const line of result.sample) console.log(`[market-series]   ${line}`);
  }
  if (dryRun) console.log("[market-series] --dry-run: no se escribió nada");
  await appConnection()
    .close()
    .catch(() => undefined);
  process.exit(results.some(result => result.error || result.skipped) ? 1 : 0);
}

main().catch(error => {
  console.error("[market-series] fatal", error);
  process.exit(1);
});
