// Cron entry: generate the daily report once and publish to all configured
// channels + Telegram subscribers + Twitter. Run by pm2 at ~09:00 local.
//   DRY_RUN=1 logs instead of sending. FORCE=1 bypasses the daily dedup.
//
// Desde 2026-09 el cuerpo lleva además UNA "guía del día" (`format/guides.ts`):
// el resumen ya difunde las cifras del dólar; las guías son lo que la gente
// comparte y nada las mostraba en Telegram/Discord. Se elige acá, una sola vez
// por corrida, y viaja al canal y a todos los DMs; la rotación sólo avanza si
// Telegram publicó de verdad (ni en DRY_RUN ni sin credenciales), la misma regla
// que `content_promo.ts`, para que una semana de pruebas no queme el catálogo.
import "dotenv/config";
import { httpCambioApi } from "cambio-uruguay-mcp/api";
import { loadConfig } from "../config.js";
import { DAILY_GUIDES } from "../format/guides.js";
import { normalizeLang, type Lang } from "../format/i18n.js";
import { formatDailyTelegram, formatDailyTwitter, TG_PHOTO_CAPTION_MAX } from "../format/messages.js";
import { publishDaily } from "../publish/index.js";
import { buildDailyData } from "../report/data.js";
import { summarize } from "../report/ai.js";
import { fetchImage, ogImageUrl } from "../report/image.js";
import { markGuidePosted, pickNextGuide } from "../store/guide_state.js";
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

  // Una guía por corrida. Si la lectura de Mongo falla el reporte sale igual,
  // sin guía: el bloque es un extra, nunca un motivo para no publicar.
  const guide = await pickNextGuide(DAILY_GUIDES).catch((e) => {
    console.error("guide pick failed (report goes out without it):", e);
    return undefined;
  });
  const extras = { guide, siteBaseUrl: cfg.siteBaseUrl };

  if (cfg.dryRun) {
    const lang = normalizeLang(cfg.defaultLang);
    const caption = formatDailyTelegram(data, aiByLang[lang] ?? "", lang, TG_PHOTO_CAPTION_MAX, extras);
    console.log(`\n----- DRY_RUN daily preview (telegram, ${caption.length}/${TG_PHOTO_CAPTION_MAX} chars) -----`);
    console.log(caption);
    console.log(`(guide of the day: ${guide?.slug ?? "none"})`);
    console.log("\n----- DRY_RUN daily preview (twitter) -----");
    console.log(formatDailyTwitter(data, lang));
    console.log("-------------------------------------------\n");
  }

  const res = await publishDaily({ cfg, data, aiByLang, telegramSubscribers, image: { url, buffer }, guide });

  if (res.deactivated.length) await deactivate("telegram", res.deactivated).catch(() => undefined);
  await markRanToday("daily").catch(() => undefined);

  // La rotación avanza sólo con un posteo REAL en el canal: en DRY_RUN el
  // publicador devuelve 200 sin llamar a la API, así que `channels` lo incluye
  // igual y hay que mirar la bandera aparte.
  if (guide && !cfg.dryRun && res.channels.includes("telegram")) {
    await markGuidePosted(guide.slug).catch(() => undefined);
  }

  console.log(
    `daily report done. channels=${res.channels.join(",") || "none"} dmSent=${res.dmSent} deactivated=${res.deactivated.length} guide=${guide?.slug ?? "none"}`
  );
}

main()
  .catch((err) => {
    console.error("daily report fatal:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await disconnectMongo().catch(() => undefined);
  });
