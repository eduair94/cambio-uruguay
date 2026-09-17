// Daily read of Mercado Libre's price guide for the model-years the used-car directory holds
// (see classes/autos/catalog/guide.ts). Private APP DB rows; sync_autos.ts publishes them.
import dotenv from "dotenv";
dotenv.config();
import fs from "fs";
import { appConnection, appDbConfigured } from "./classes/appdb";
import { crawlGuide, planGuideTargets, type CarGuideTarget } from "./classes/autos/catalog/guide";
import { loadGuideEntries, loadGuideTargets, saveGuideEntries } from "./classes/autos/store";
import { CarHarvestMetaModel } from "./classes/models/CarHarvestMeta";

const argument = (name: string): string | undefined =>
  process.argv.find(arg => arg.startsWith(`--${name}=`))?.slice(name.length + 3);

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const targetsFile = argument("targets");
  if (!dryRun && !appDbConfigured()) throw new Error("APP_MONGO_URI is required; refusing to use a different database");
  if (dryRun && !targetsFile) throw new Error("--dry-run needs --targets=<json file>");
  const now = new Date();
  const targets: CarGuideTarget[] = targetsFile
    ? JSON.parse(fs.readFileSync(targetsFile, "utf8").replace(/^\uFEFF/, ""))
    : await loadGuideTargets(now);
  const previous = dryRun ? new Map() : await loadGuideEntries();
  const planned = planGuideTargets(targets, previous, now);
  console.log(`[autos-guide] ${targets.length} model-years in the directory, ${planned.length} due`);
  const result = await crawlGuide(planned, {
    maxDurationMs: Number(process.env.AUTOS_GUIDE_MINUTES || 40) * 60_000,
    gapMs: Number(process.env.AUTOS_GUIDE_GAP_MS || 1_500),
  });
  const counts = result.entries.reduce<Record<string, number>>((bag, entry) => {
    bag[entry.status] = (bag[entry.status] ?? 0) + 1;
    return bag;
  }, {});
  console.log(`[autos-guide] ${result.requests} pages read ${JSON.stringify(counts)}${result.note ? `, ${result.note}` : ""}`);
  if (dryRun) {
    for (const entry of result.entries.slice(0, 10)) console.log(JSON.stringify(entry));
    return;
  }
  await saveGuideEntries(result.entries);
  const finishedAt = new Date().toISOString();
  await CarHarvestMetaModel.updateOne(
    { key: "uy-cars-guide" },
    { $set: { updatedAt: finishedAt, data: { finishedAt, targets: targets.length, due: planned.length, requests: result.requests, counts, note: result.note, ok: !result.note || result.note === "presupuesto agotado" } } },
    { upsert: true },
  );
}

main()
  .then(async () => {
    if (appDbConfigured()) await appConnection().close().catch(() => undefined);
    process.exit(0);
  })
  .catch(async error => {
    console.error("[autos-guide] failed:", error);
    if (appDbConfigured()) await appConnection().close().catch(() => undefined);
    process.exit(1);
  });
