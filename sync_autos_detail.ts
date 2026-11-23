// Lee la ficha propia de los avisos de Mercado Libre que el directorio ya tiene guardados, con
// presupuesto y por orden de utilidad (classes/autos/detailQueue.ts). No publica nada: deja la ficha
// en `carlistings.detail` y de ahí la toman sync_autos.ts (versión, banderas) y la página de riesgo
// (la descripción, que es donde el vendedor dice lo que tiene el auto).
//
// Medido el 2026-09-18: 122 fichas de 16.865 avisos de ML. A 400 lecturas por corrida horaria el
// atraso entero se cubre en dos días y después esto es mantenimiento de lo que entra cada día.
import "./sentry_job";
import "dotenv/config";
import { appConnection, appDbConfigured } from "./classes/appdb";
import { fetchUsdUyuRate } from "./classes/chairs/catalog";
import { detailTargets, queueSummary } from "./classes/autos/detailQueue";
import { fetchCarDetails } from "./classes/autos/detail";
import { declaredRisks } from "./classes/autos/risk";
import {
  inspectCarPhotos,
  needsRecheck,
  odometerContradicts,
  photoRejection,
  visionConfigured,
  type CarPhotoVerdict,
} from "./classes/autos/llm/vision";
import { looseMedians } from "./classes/autos/detailQueue";
import { loadStoredCars, saveCarDetails, saveCarPhotoChecks } from "./classes/autos/store";
import { CarHarvestMetaModel } from "./classes/models/CarHarvestMeta";
import type { CarDetail, StoredCar } from "./classes/autos/types";

const number = (name: string, fallback: number): number => {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
};

/**
 * A cuáles les miramos las fotos: los baratos contra su marca+modelo+año y los que declaran algo, que
 * son los dos casos donde una foto cambia la conclusión. Tope por corrida, y si Gemini no está
 * configurado no pasa nada: el veredicto es opcional en todo el pipeline.
 */
async function runVision(
  stored: readonly StoredCar[],
  fresh: ReadonlyMap<string, CarDetail>,
  usdUyu: number,
): Promise<VisionSummary> {
  const max = number("AUTOS_VISION_MAX", 30);
  if (!visionConfigured()) return { asked: 0, rejected: 0, odometerRead: 0, kmRejected: 0, rechecked: 0, costUsd: 0, skipped: "sin modelo configurado" };
  const medians = looseMedians(stored, usdUyu);
  // Presupuesto propio: el job es HORARIO y una tanda de visión sin techo lo hace solaparse consigo
  // mismo (medido: 25 llamadas con cuatro fotos se fueron a 25 minutos).
  const deadline = Date.now() + number("AUTOS_VISION_MINUTES", 8) * 60_000;
  const eligible = stored
    .map(doc => ({ doc, detail: fresh.get(doc.key) ?? doc.detail }))
    .filter(({ doc, detail }) => {
      if ((doc.photoCheck && !needsRecheck(doc.photoCheck)) || !detail?.pictures?.length) return false;
      const group = medians.get(`${doc.listing.brandId}|${doc.listing.modelId}|${doc.listing.year}`);
      const priceUsd = doc.listing.currency === "USD" ? doc.listing.price : doc.listing.price / Math.max(1, usdUyu);
      const cheap = !!group && priceUsd > 0 && 1 - priceUsd / group.price >= 0.12;
      return cheap || declaredRisks(doc.listing.title, detail.description).length > 0;
    });
  // Primero los que nunca se miraron; después los mirados con el esquema viejo, que no leía el tablero.
  const candidates = [...eligible.filter(({ doc }) => !doc.photoCheck), ...eligible.filter(({ doc }) => !!doc.photoCheck)].slice(0, max);
  const checks = new Map<string, CarPhotoVerdict>();
  const summary: VisionSummary = { asked: 0, rejected: 0, odometerRead: 0, kmRejected: 0, rechecked: 0, costUsd: 0, skipped: "" };
  for (const { doc, detail } of candidates) {
    if (Date.now() >= deadline) break;
    const verdict = await inspectCarPhotos({
      key: doc.key,
      title: doc.listing.title,
      brand: doc.listing.brand,
      model: doc.listing.model,
      year: doc.listing.year,
      trim: detail!.version ?? null,
      km: doc.listing.km,
      description: detail!.description,
      pictures: detail!.pictures ?? [],
    });
    if (!verdict) continue;
    checks.set(doc.key, verdict);
    if (doc.photoCheck) summary.rechecked++;
    // La misma regla que retira la oportunidad en classes/autos/analyze.ts, no otra.
    if (photoRejection(verdict, doc.listing.km)) summary.rejected++;
    if (verdict.odometerKm) summary.odometerRead++;
    if (odometerContradicts(verdict, doc.listing.km)) summary.kmRejected++;
    summary.costUsd += verdict.costUsd ?? 0;
  }
  await saveCarPhotoChecks(checks);
  summary.asked = checks.size;
  summary.costUsd = Math.round(summary.costUsd * 1e5) / 1e5;
  console.log(
    `[autos-detail] fotos revisadas ${checks.size} de ${candidates.length} candidatos (${summary.rechecked} con esquema viejo),` +
      ` ${summary.rejected} no pasan, ${summary.odometerRead} tableros leídos (${summary.kmRejected} contradicen los km), ~US$ ${summary.costUsd}`,
  );
  return summary;
}

interface VisionSummary {
  asked: number;
  rejected: number;
  odometerRead: number;
  kmRejected: number;
  rechecked: number;
  costUsd: number;
  skipped: string;
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  if (!dryRun && !appDbConfigured()) throw new Error("APP_MONGO_URI is required; refusing to use a different database");
  const now = new Date();
  const usdUyu = await fetchUsdUyuRate();
  const stored = await loadStoredCars(now);
  // Relee las fichas de más de 14 días. La ficha es la lectura PROPIA del teléfono que el vendedor
  // escribió en la descripción, y ese teléfono se deja de publicar a los 21 días de leído
  // (classes/autos/contacts/build.ts); también es donde un aviso vendido dice que ya no está activo.
  // ~1.400 fichas por día sobre 20.000 avisos, contra una capacidad de 400 por hora.
  const targets = detailTargets(stored, { now, usdUyu, refreshDays: number("AUTOS_DETAIL_REFRESH_DAYS", 14) });
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
  // 2. Mirar las fotos de los dudosos: los que están baratos contra su marca+modelo+año y los que
  // declaran algo. La IA acá no publica, filtra (classes/autos/llm/vision.ts).
  const vision = await runVision(stored, result.details, usdUyu);

  const finishedAt = new Date().toISOString();
  await CarHarvestMetaModel.updateOne(
    { key: "uy-cars-detail" },
    {
      $set: {
        updatedAt: finishedAt,
        data: {
          finishedAt, listings: stored.length, withDetail, queued: targets.length, queue: summary,
          read: result.details.size, withVersion, withRisk, gone: result.gone.length, failed: result.failed,
          vision,
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
