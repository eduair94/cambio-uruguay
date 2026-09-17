// Plan D — CyberLunes/Black Friday: ¿el descuento es real? Snapshot diario (y horario dentro de una
// ventana de evento) de cuántas ofertas propias bajaron de verdad contra su propio historial de
// hasta 60 días, y qué vendedores muestran precios de lista por encima de todo lo que registramos.
// Nunca escribe `pricewatchoffers` (lo escriben `sync_equipar.ts`/`sync_chairs.ts`); sólo lo lee.
//
// Dos flags:
//   --dry-run     lee y agrega, nunca escribe ni poda (ver classes/priceevents/refresh.ts).
//   --event-only  para el cron horario: si el calendario (classes/priceevents/calendar.ts) no marca
//                 un evento activo HOY, sale en 0 SIN CONECTAR A LA BASE — 24 corridas por hora, 365
//                 días al año, casi todas sin nada que hacer, no deben costar ni una conexión.
import dotenv from "dotenv";
dotenv.config();
dotenv.config({ path: "app/.env" });

import { appDbConfigured } from "./classes/appdb";
import { activeEvent } from "./classes/priceevents/calendar";
import { runPriceEvents } from "./classes/priceevents/refresh";

async function main(): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const eventOnly = process.argv.includes("--event-only");
  const dryRun = process.argv.includes("--dry-run");

  if (eventOnly && !activeEvent(today)) {
    console.log(`[price-events] --event-only: sin evento activo hoy (${today}) — no se conecta a la base`);
    process.exit(0);
  }

  // El app llama a esta variable MONGO_URI en su propio .env; el puente de la raíz exige
  // APP_MONGO_URI para que un job nunca pueda escribir la base equivocada por accidente. Mismo mapeo
  // explícito que sync_equipar.ts/sync_chairs.ts.
  process.env.APP_MONGO_URI = process.env.APP_MONGO_URI || process.env.MONGO_URI;
  if (!appDbConfigured()) {
    console.error("[price-events] APP_MONGO_URI/MONGO_URI is missing — refusing to write the wrong DB");
    process.exit(1);
  }

  const result = await runPriceEvents({ today, dryRun });

  console.log(
    `[price-events] ${result.today} evento=${result.event?.key ?? "ninguno"} ` +
      `verticales=${result.verticals.join(",") || "-"} leídas=${result.snapshot.analyzed} ` +
      `elegibles=${result.snapshot.eligible} trackingSince=${result.snapshot.trackingSince ?? "-"}`
  );

  if (dryRun) {
    console.log(
      `[price-events] --dry-run: no se escribió nada (current publicado: ${result.currentEligible ?? "ninguno"} elegibles)`
    );
    process.exit(0);
  }

  if (result.thin) {
    console.error(
      `[price-events] corrida flaca: ${result.snapshot.eligible} elegibles contra ${result.currentEligible} ya publicadas — se conserva el snapshot anterior`
    );
    process.exit(1);
  }

  console.log(`[price-events] publicado; ${result.pruned} instantáneas de más de 400 días borradas`);
  process.exit(0);
}

main().catch((error) => {
  console.error("[price-events] fallo", error);
  process.exit(1);
});
