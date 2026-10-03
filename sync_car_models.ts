// Daily, budgeted: the Wikipedia summary and verified YouTube videos of the models the used-car
// directory holds (classes/autos/modelInfo/). APP DB `carmodelinfos`, read as is by the advert page
// and the model's price page. `--dry-run` reads and prints, writes nothing; `--only=slug,slug`
// reads just those models (with --dry-run, the way to try it on the VPS before a deploy).
import "dotenv/config";
import { appConnection, appDbConfigured } from "./classes/appdb";
import { mergeModelInfo, planModelInfoTargets, type CarModelReading, type CarModelTarget } from "./classes/autos/modelInfo/refresh";
import type { CarModelInfoRecord } from "./classes/autos/modelInfo/types";
import { findModelWiki } from "./classes/autos/modelInfo/wikipedia";
import { findModelVideos } from "./classes/autos/modelInfo/youtube";
import { CarHarvestMetaModel } from "./classes/models/CarHarvestMeta";
import { CarMarketSnapshotModel } from "./classes/models/CarMarketSnapshot";
import { CarModelInfoModel } from "./classes/models/CarModelInfo";

const argument = (name: string): string | undefined =>
  process.argv.find((arg) => arg.startsWith(`--${name}=`))?.slice(name.length + 3);
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function loadTargets(): Promise<CarModelTarget[]> {
  const docs = await CarMarketSnapshotModel.find({})
    .select({ _id: 0, key: 1, "snapshot.brand": 1, "snapshot.model": 1, "snapshot.listings": 1 })
    .lean();
  return docs
    .map((doc) => ({
      marketSlug: String(doc.key),
      brand: String(doc.snapshot?.brand ?? ""),
      model: String(doc.snapshot?.model ?? ""),
      listings: Number(doc.snapshot?.listings ?? 0),
    }))
    .filter((target) => target.brand && target.model);
}

async function main(): Promise<void> {
  const dryRun = process.argv.includes("--dry-run");
  const only = argument("only")?.split(",").map((slug) => slug.trim()).filter(Boolean) ?? [];
  if (!appDbConfigured()) throw new Error("APP_MONGO_URI is required; refusing to use a different database");
  const now = new Date();
  const budget = Number(process.env.AUTOS_MODELINFO_MAX || 40);
  const gapMs = Number(process.env.AUTOS_MODELINFO_GAP_MS || 3_000);

  const targets = await loadTargets();
  const previous = new Map<string, CarModelInfoRecord>(
    ((await CarModelInfoModel.find({}).select({ _id: 0, __v: 0 }).lean()) as CarModelInfoRecord[]).map((record) => [record.marketSlug, record]),
  );
  const planned = only.length
    ? targets.filter((target) => only.includes(target.marketSlug))
    : planModelInfoTargets(targets, previous, now, budget);
  console.log(`[autos-models] ${targets.length} models, ${previous.size} read before, ${planned.length} due`);
  // appModel is a lazy Proxy: its `.collection` is not usable before the first query, so the
  // index goes through the connection, the way classes/autos/store.ts does it.
  if (!dryRun) await appConnection().collection("carmodelinfos").createIndex({ marketSlug: 1 }, { unique: true });

  const counts = { wiki: 0, noWiki: 0, videos: 0, noVideos: 0, failed: 0 };
  for (const [index, target] of planned.entries()) {
    if (index > 0) await sleep(gapMs);
    const reading: CarModelReading = { wiki: undefined, videos: undefined };
    try {
      reading.wiki = await findModelWiki(target.brand, target.model);
    } catch (error: any) {
      console.warn(`[autos-models] ${target.marketSlug} wikipedia: ${error?.message || error}`);
    }
    try {
      reading.videos = await findModelVideos(target.brand, target.model);
    } catch (error: any) {
      console.warn(`[autos-models] ${target.marketSlug} youtube: ${error?.message || error}`);
    }
    if (reading.wiki) counts.wiki++;
    else if (reading.wiki === null) counts.noWiki++;
    if (reading.videos?.length) counts.videos++;
    else if (reading.videos) counts.noVideos++;
    if (reading.wiki === undefined || reading.videos === undefined) counts.failed++;
    const record = mergeModelInfo(target, previous.get(target.marketSlug), reading, new Date());
    if (dryRun) {
      console.log(JSON.stringify({ slug: target.marketSlug, wiki: record.wiki ? `${record.wiki.lang}: ${record.wiki.title}` : record.wiki, videos: record.videos.map((video) => `${video.title} — ${video.channel}`) }, null, 1));
      continue;
    }
    await CarModelInfoModel.replaceOne({ marketSlug: target.marketSlug }, record, { upsert: true });
  }
  console.log(`[autos-models] done ${JSON.stringify(counts)}`);
  if (dryRun) return;
  const finishedAt = new Date().toISOString();
  await CarHarvestMetaModel.updateOne(
    { key: "uy-cars-models" },
    { $set: { updatedAt: finishedAt, data: { finishedAt, models: targets.length, due: planned.length, counts, ok: counts.failed < Math.max(1, planned.length / 2) } } },
    { upsert: true },
  );
}

main()
  .then(async () => {
    await appConnection().close().catch(() => undefined);
    process.exit(0);
  })
  .catch(async (error) => {
    console.error("[autos-models] failed:", error);
    if (appDbConfigured()) await appConnection().close().catch(() => undefined);
    process.exit(1);
  });
