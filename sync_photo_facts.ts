// Mira las fotos de los avisos de alquiler y de venta que tienen galería y guarda, EN SOMBRA, qué
// muestran: qué ambiente es cada foto, si se ve balcón, patio, parrillero, piscina, aire, cocina
// integrada o mobiliario —siempre con la foto que lo muestra—, banderas internas (render, marca de
// agua, collage) y la mejor portada. No publica nada: escribe sólo `photofacts` y `photofactsmetas`
// (APP DB, privadas). Por qué en sombra y qué falta para publicar: docs/app/PHOTO_FACTS.md.
//
// Claude Haiku 5.5 con los créditos de API (classes/anthropic.ts), sin respaldo de Gemini a propósito:
// en el piloto contestó peor y costaba 1,7 veces más. Sin crédito, la corrida no hace nada.
//
//   --dry-run   arma la cola y la muestra; no baja fotos ni llama al modelo.
//   --probe=N   mira N avisos de punta a punta e imprime el resultado; no escribe nada.
import "./sentry_job";
import "dotenv/config";
import { anthropicConfigured, askClaudeWithImages } from "./classes/anthropic";
import { appConnection, appDbConfigured } from "./classes/appdb";
import { collectSubjects } from "./classes/photofacts/scan";
import { runPhotoFacts, type ModelAnswer, type PhotoFactsRow } from "./classes/photofacts/run";
import { PHOTO_FACTS_JSON_SCHEMA, PHOTO_FACTS_SCHEMA_VERSION, PHOTO_FACTS_SYSTEM, photoFactsPrompt } from "./classes/photofacts/schema";
import { monthSpendUsd, repeatedAcrossAdvertisers, saveFailure, savePhotoFacts, saveRunMeta } from "./classes/photofacts/store";
import type { PhotoSubject } from "./classes/photofacts/subjects";
import { preparePhotos, type PreparedPhoto } from "./classes/vision/photos";

const number = (name: string, fallback: number): number => {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) && raw > 0 ? raw : fallback;
};

const flag = (name: string): string | null => {
  const hit = process.argv.find(arg => arg === `--${name}` || arg.startsWith(`--${name}=`));
  return hit ? (hit.split("=")[1] ?? "") : null;
};

async function ask(subject: PhotoSubject, photos: PreparedPhoto[]): Promise<ModelAnswer | null> {
  const reply = await askClaudeWithImages(
    photoFactsPrompt({ vertical: subject.vertical, propertyType: subject.propertyType, photoCount: photos.length }),
    photos.map(photo => ({ data: photo.data, mimeType: photo.mimeType })),
    { system: PHOTO_FACTS_SYSTEM, schema: PHOTO_FACTS_JSON_SCHEMA, cacheSystem: true, effort: "low", maxTokens: 2_000, timeoutMs: 90_000 },
  );
  if (!reply || reply.value === undefined) return null;
  return { raw: reply.value, model: reply.model, costUsd: reply.costUsd, usage: reply.usage };
}

async function main(): Promise<void> {
  if (process.env.PHOTO_FACTS_ENABLED === "0") {
    console.log("[photo-facts] apagado (PHOTO_FACTS_ENABLED=0)");
    return;
  }
  if (!appDbConfigured()) throw new Error("APP_MONGO_URI is required; refusing to use a different database");
  const dryRun = flag("dry-run") !== null;
  const probeArg = flag("probe");
  const probe = probeArg === null ? 0 : Math.max(1, Number(probeArg) || 3);
  if (!dryRun && !anthropicConfigured()) {
    console.log("[photo-facts] sin clave de Claude utilizable: la corrida no hace nada");
    return;
  }
  await appConnection().asPromise();
  const now = new Date();
  const max = probe || number("PHOTO_FACTS_MAX", 40);
  const monthlyUsd = number("PHOTO_FACTS_MONTHLY_USD", 8);
  const spentUsd = await monthSpendUsd(now);
  if (!dryRun && !probe && spentUsd >= monthlyUsd) {
    console.log(`[photo-facts] tope del mes alcanzado: ~US$ ${spentUsd.toFixed(2)} de ${monthlyUsd}`);
    await saveRunMeta({ finishedAt: now.toISOString(), stop: "budget", monthUsd: spentUsd, monthlyUsd }, now);
    return;
  }
  // Un poco más de lo que se va a mirar: algunos no tienen fotos utilizables y se saltean gratis.
  const { subjects, states, scanned } = await collectSubjects(now, Math.ceil(max * 1.5));
  console.log(`[photo-facts] cola ${subjects.length} ${JSON.stringify(scanned)}; mes ~US$ ${spentUsd.toFixed(4)} de ${monthlyUsd}`);
  if (dryRun) {
    for (const subject of subjects.slice(0, 10)) {
      console.log(`  ${subject.id.padEnd(34)} ${subject.source.padEnd(12)} ${subject.department.padEnd(12)} ${subject.photos.length} fotos ${subject.freshAt}`);
    }
    return;
  }

  const results: Array<Record<string, unknown>> = [];
  const summary = await runPhotoFacts({
    subjects,
    prepare: subject => preparePhotos(subject.photos, { max: 6 }),
    ask,
    save: async (row: PhotoFactsRow) => {
      if (probe) {
        results.push({ id: row.subject.id, source: row.subject.source, photos: row.sent.map(p => [p.url, p.width, p.height, p.resized]), ...row.result, costUsd: row.answer.costUsd, usage: row.answer.usage });
        return;
      }
      await savePhotoFacts(row, new Date(), PHOTO_FACTS_SCHEMA_VERSION);
    },
    fail: async (subject, reason, costUsd) => {
      if (probe) {
        results.push({ id: subject.id, failed: reason, costUsd });
        return;
      }
      await saveFailure(subject, reason, costUsd, new Date(), states.get(subject.id)?.failures ?? 0);
    },
    max,
    deadline: Date.now() + number("PHOTO_FACTS_MINUTES", 8) * 60_000,
    monthlyUsd: probe ? Number.POSITIVE_INFINITY : monthlyUsd,
    spentUsd,
  });
  if (probe) {
    console.log(JSON.stringify({ summary, results }, null, 2));
    return;
  }
  const repeated = await repeatedAcrossAdvertisers().catch(error => {
    console.warn("[photo-facts] no pude contar fotos repetidas:", error instanceof Error ? error.message : error);
    return null;
  });
  const monthUsd = spentUsd + summary.costUsd;
  const finishedAt = new Date();
  await saveRunMeta({ finishedAt: finishedAt.toISOString(), ...summary, queued: subjects.length, scanned, monthUsd, monthlyUsd, repeated }, finishedAt);
  console.log(`[photo-facts] ${JSON.stringify({ ...summary, queued: subjects.length, monthUsd: Math.round(monthUsd * 1e4) / 1e4, repeated })}`);
}

main()
  .then(async () => {
    if (appDbConfigured()) await appConnection().close().catch(() => undefined);
    process.exit(0);
  })
  .catch(async error => {
    console.error("[photo-facts] fallo", error instanceof Error ? error.message : error);
    if (appDbConfigured()) await appConnection().close().catch(() => undefined);
    process.exit(1);
  });
