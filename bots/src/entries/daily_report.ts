// Cron entry: generate the daily report once and publish to all configured
// channels + Telegram subscribers + Twitter. Run by pm2 at ~09:00 local.
//   DRY_RUN=1 logs instead of sending. FORCE=1 bypasses the daily dedup.
import "dotenv/config";
import { httpCambioApi } from "cambio-uruguay-mcp/api";
import { loadConfig } from "../config.js";
import { normalizeLang, type Lang } from "../format/i18n.js";
import { formatDailyTelegram, formatDailyTwitter } from "../format/messages.js";
import { publishDaily } from "../publish/index.js";
import { buildDailyData } from "../report/data.js";
import { summarize } from "../report/ai.js";
import { fetchImage, ogImageUrl } from "../report/image.js";
import { connectMongo, disconnectMongo } from "../store/mongo.js";
import { deactivate, listActive } from "../store/subscribers.js";
import { markRanToday, wasRunToday } from "../store/job_state.js";

async function main(): Promise<void> {
  const cfg = loadConfig();
  await connectMongo(cfg.mongoUri).catch((e) => console.error("mongo connect failed:", e));

  if (!cfg.force && (await wasRunToday("daily"))) {
    console.log("daily report already sent today; use FORCE=1 to override. Skipping.");
    return;
  }

  const api = httpCambioApi(cfg.apiBaseUrl);
  const data = await buildDailyData(api, cfg);
  if (data.currencies.length === 0) {
    console.error("no currency data; aborting daily report.");
    return;
  }

  const telegramSubscribers = await listActive("telegram").catch(() => []);

  // AI summary for the default language + any subscriber languages.
  const langs = new Set<Lang>([normalizeLang(cfg.defaultLang), ...telegramSubscribers.map((s) => normalizeLang(s.language))]);
  const aiByLang: Record<string, string> = {};
  for (const l of langs) aiByLang[l] = await summarize(api, l);

  const url = ogImageUrl(cfg.siteBaseUrl, cfg.defaultLang);
  const buffer = cfg.twitter ? await fetchImage(url) : null;

  if (cfg.dryRun) {
    const lang = normalizeLang(cfg.defaultLang);
    console.log("\n----- DRY_RUN daily preview (telegram) -----");
    console.log(formatDailyTelegram(data, aiByLang[lang] ?? "", lang));
    console.log("\n----- DRY_RUN daily preview (twitter) -----");
    console.log(formatDailyTwitter(data, lang));
    console.log("-------------------------------------------\n");
  }

  const res = await publishDaily({ cfg, data, aiByLang, telegramSubscribers, image: { url, buffer } });

  if (res.deactivated.length) await deactivate("telegram", res.deactivated).catch(() => undefined);
  await markRanToday("daily").catch(() => undefined);

  console.log(`daily report done. channels=${res.channels.join(",") || "none"} dmSent=${res.dmSent} deactivated=${res.deactivated.length}`);
}

main()
  .catch((err) => {
    console.error("daily report fatal:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectMongo().catch(() => undefined);
  });
