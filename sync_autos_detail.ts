// Lee la ficha propia de los avisos de Mercado Libre que el directorio ya tiene guardados, con
// presupuesto y por orden de utilidad (classes/autos/detailQueue.ts). No publica nada: deja la ficha
// en `carlistings.detail` y de ahí la toman sync_autos.ts (versión, banderas) y la página de riesgo
// (la descripción, que es donde el vendedor dice lo que tiene el auto).
//
// Medido el 2026-09-18: 122 fichas de 16.865 avisos de ML. A 400 lecturas por corrida horaria el
// atraso entero se cubre en dos días y después esto es mantenimiento de lo que entra cada día.
import dotenv from "dotenv";
dotenv.config();
import { appConnection, appDbConfigured } from "./classes/appdb";
import { fetchUsdUyuRate } from "./classes/chairs/catalog";
import { detailTargets, queueSummary } from "./classes/autos/detailQueue";
import { fetchCarDetails } from "./classes/autos/detail";
import { declaredRisks } from "./classes/autos/risk";
import { loadStoredCars, saveCarDetails } from "./classes/autos/store";
import { CarHarvestMetaModel } from "./classes/models/CarHarvestMeta";

const number = (name: string, fallback: number): number => {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
};

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  if (!dryRun && !appDbConfigured()) throw new Error("APP_MONGO_URI is required; refusing to use a different database");
  const now = new Date();
  const usdUyu = await fetchUsdUyuRate();
  const stored = await loadStoredCars(now);
  const targets = detailTargets(stored, { now, usdUyu, refreshDays: number("AUTOS_DETAIL_REFRESH_DAYS", 0) });
  const summary = queueSummary(targets);
  const withDetail = stored.filter(doc => doc.detail).length;
  console.log(`[autos-detail] ${stored.length} avisos vigentes, ${withDetail} con ficha; cola ${targets.length} ${JSON.stringify(summary)}`);
  if (dryRun) {
    for (const target of targets.slice(0, 10)) console.log(`  ${target.reason.padEnd(8)} ${target.permalink}`);
    return;
  }
  const max = number("AUTOS_DETAIL_MAX", 400);
  const result = await fetchCarDetails(targets, {
    max,
    maxDurationMs: number("AUTOS_DETAIL_MINUTES", 25) * 60_000,
  });
  await saveCarDetails(result, now.toISOString());
  // Lo que esta corrida le agregó al sitio: fichas nuevas, y cuántas traen un riesgo declarado.
  let withRisk = 0;
  let withVersion = 0;
  for (const detail of result.details.values()) {
    if (detail.version) withVersion++;
    if (declaredRisks("", detail.description).length) withRisk++;
  }
  console.log(`[autos-detail] ${result.details.size} fichas leídas (${withVersion} con versión, ${withRisk} declaran algo), ${result.gone.length} caídas, ${result.failed} fallidas`);
  const finishedAt = new Date().toISOString();
  await CarHarvestMetaModel.updateOne(
    { key: "uy-cars-detail" },
    {
      $set: {
        updatedAt: finishedAt,
        data: {
          finishedAt, listings: stored.length, withDetail, queued: targets.length, queue: summary,
          read: result.details.size, withVersion, withRisk, gone: result.gone.length, failed: result.failed,
          ok: result.details.size > 0 || targets.length === 0,
        },
      },
    },
    { upsert: true },
  );
}

main()
  .then(async () => {
    if (appDbConfigured()) await appConnection().close().catch(() => undefined);
    process.exit(0);
  })
  .catch(async error => {
    console.error("[autos-detail] failed:", error);
    if (appDbConfigured()) await appConnection().close().catch(() => undefined);
    process.exit(1);
  });
